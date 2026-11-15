import { customAlphabet } from "nanoid";
import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import {
  evaluatePaidCredit,
  evaluateReferralSignup,
  normalizeReferralCode,
  referralBalanceTransaction,
  referralPublicUrl,
  type PaidCreditStatus,
} from "@shared/referrals";
import { referrals, users, type User } from "../drizzle/schema";
import { getDb, logConversionEvent, updateUserSubscription } from "./db";
import { getReferralConfig } from "./referralConfig";
import { ensureReferralSchema } from "./referralSchema";

const createReferralCode = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8);

type BalanceClient = {
  customers: {
    create: (params: {
      email?: string;
      metadata?: Record<string, string>;
    }) => Promise<{ id: string }>;
    createBalanceTransaction: (
      customerId: string,
      params: {
        amount: number;
        currency: string;
        description: string;
        metadata: Record<string, string>;
      },
      options: { idempotencyKey: string }
    ) => Promise<{ id: string }>;
  };
  subscriptions: {
    retrieve: (id: string) => Promise<{ status: string }>;
  };
};

export type ReferralInvoice = {
  amount_paid?: number | null;
  billing_reason?: string | null;
  customer?: string | { id?: string | null } | null;
  subscription?: string | { id?: string | null } | null;
  parent?: {
    subscription_details?: {
      subscription?: string | { id?: string | null } | null;
    } | null;
  } | null;
};

function isDuplicateKey(error: unknown) {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const candidate = current as { code?: unknown; errno?: unknown; cause?: unknown };
    if (candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062) return true;
    current = candidate.cause;
  }
  return false;
}

function customerId(value: ReferralInvoice["customer"]) {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object" && typeof value.id === "string") return value.id;
  return null;
}

function subscriptionId(invoice: ReferralInvoice) {
  const direct = customerId(invoice.subscription ?? null);
  if (direct) return direct;
  return customerId(invoice.parent?.subscription_details?.subscription ?? null);
}

export async function ensureReferralCode(userId: number) {
  await ensureReferralSchema();
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  for (let attempt = 0; attempt < 5; attempt++) {
    const [existing] = await db
      .select({ referralCode: users.referralCode })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (existing?.referralCode) return existing.referralCode;

    const code = createReferralCode();
    try {
      await db
        .update(users)
        .set({ referralCode: code })
        .where(and(eq(users.id, userId), isNull(users.referralCode)));
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
  }

  const [created] = await db
    .select({ referralCode: users.referralCode })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!created?.referralCode) throw new Error("Could not assign a referral code");
  return created.referralCode;
}

export async function attributeReferralSignup(input: {
  referredUserId: number;
  referredEmail: string | null;
  code: string | null;
}) {
  const code = normalizeReferralCode(input.code);
  if (!code) return { status: "ignored" as const };

  await ensureReferralSchema();
  const db = await getDb();
  if (!db) return { status: "ignored" as const };
  const config = getReferralConfig();

  const result = await db.transaction(async tx => {
    const [referrer] = await tx
      .select()
      .from(users)
      .where(eq(users.referralCode, code))
      .limit(1);
    const [referred] = await tx
      .select()
      .from(users)
      .where(eq(users.id, input.referredUserId))
      .limit(1);
    if (!referred) return { status: "ignored" as const };

    const rewarded = referrer
      ? await tx
          .select({ id: referrals.id })
          .from(referrals)
          .where(
            and(
              eq(referrals.referrerUserId, referrer.id),
              gt(referrals.signupBonusPosts, 0)
            )
          )
      : [];
    const decision = evaluateReferralSignup({
      referrer: referrer
        ? { id: referrer.id, email: referrer.email, role: referrer.role }
        : null,
      referred: {
        id: referred.id,
        email: referred.email ?? input.referredEmail,
        role: referred.role,
      },
      rewardedSignupCount: rewarded.length,
      config,
    });
    if (!referrer || !decision.accept) {
      return {
        status: "rejected" as const,
        reason: decision.accept ? "missing_referrer" : decision.reason,
      };
    }

    try {
      await tx.insert(referrals).values({
        referrerUserId: referrer.id,
        referredUserId: referred.id,
        code,
        signupBonusPosts: decision.bonusPosts,
        paidCreditStatus: "pending",
      });
    } catch (error) {
      if (isDuplicateKey(error)) return { status: "duplicate" as const };
      throw error;
    }

    if (decision.bonusPosts > 0) {
      await tx
        .update(users)
        .set({
          bonusFreePosts: sql<number>`${users.bonusFreePosts} + ${decision.bonusPosts}`,
        })
        .where(eq(users.id, referrer.id));
    }

    return {
      status: "credited" as const,
      bonusPosts: decision.bonusPosts,
      referrerUserId: referrer.id,
    };
  });

  if (result.status === "credited") {
    await logConversionEvent(result.referrerUserId, "referral_signup", {
      referredUserId: input.referredUserId,
      bonusPosts: result.bonusPosts,
    }).catch(error => {
      console.error("[Referral] signup event was not recorded", error);
    });
  }
  return result;
}

async function applyCredit(input: {
  stripe: BalanceClient;
  referralId: number;
  referrerUserId: number;
  referredUserId: number;
  referrerStripeCustomerId: string;
  amountCents: number;
  currency: "usd";
}) {
  const params = referralBalanceTransaction({
    amountCents: input.amountCents,
    currency: input.currency,
    referralId: input.referralId,
    referredUserId: input.referredUserId,
  });
  const transaction = await input.stripe.customers.createBalanceTransaction(
    input.referrerStripeCustomerId,
    params,
    { idempotencyKey: `referral-credit-${input.referralId}` }
  );
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(referrals)
    .set({
      paidCreditStatus: "applied",
      paidCreditCents: input.amountCents,
      stripeBalanceTransactionId: transaction.id,
    })
    .where(
      and(eq(referrals.id, input.referralId), eq(referrals.paidCreditStatus, "qualified"))
    );
  await logConversionEvent(input.referrerUserId, "referral_paid_credit", {
    referredUserId: input.referredUserId,
    amountCents: input.amountCents,
    stripeBalanceTransactionId: transaction.id,
  }).catch(error => {
    console.error("[Referral] credit event was not recorded", error);
  });
}

async function setCreditStatus(
  referralId: number,
  status: PaidCreditStatus,
  from: PaidCreditStatus[]
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(referrals)
    .set({ paidCreditStatus: status })
    .where(
      and(eq(referrals.id, referralId), inArray(referrals.paidCreditStatus, from))
    );
}

export async function settleQualifiedCredits(
  referrerUserId: number,
  stripe: BalanceClient | null
) {
  if (!stripe) return;
  await ensureReferralSchema();
  const db = await getDb();
  if (!db) return;
  const [referrer] = await db
    .select()
    .from(users)
    .where(eq(users.id, referrerUserId))
    .limit(1);
  if (!referrer?.stripeCustomerId) return;

  const pending = await db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.referrerUserId, referrerUserId),
        eq(referrals.paidCreditStatus, "qualified")
      )
    );
  if (!pending.length) return;

  const applied = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(
      and(
        eq(referrals.referrerUserId, referrerUserId),
        eq(referrals.paidCreditStatus, "applied")
      )
    );

  let appliedCount = applied.length;
  for (const referral of pending) {
    const [referred] = await db
      .select({ stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, referral.referredUserId))
      .limit(1);
    const decision = evaluatePaidCredit({
      amountPaidCents: 0,
      subscriptionStatus: null,
      billingReason: null,
      paidCreditStatus: "qualified",
      appliedPaidCreditCount: appliedCount,
      referrerStripeCustomerId: referrer.stripeCustomerId,
      referredStripeCustomerId: referred?.stripeCustomerId ?? null,
      config: getReferralConfig(),
    });
    if (decision.action === "skip") {
      await setCreditStatus(referral.id, "skipped", ["qualified"]);
      continue;
    }
    if (decision.action !== "apply") continue;
    appliedCount += 1;
    await applyCredit({
      stripe,
      referralId: referral.id,
      referrerUserId,
      referredUserId: referral.referredUserId,
      referrerStripeCustomerId: referrer.stripeCustomerId,
      amountCents: decision.amountCents,
      currency: decision.currency,
    });
  }
}

export async function ensureReferrerCustomer(
  user: Pick<User, "id" | "email" | "stripeCustomerId">,
  stripe: BalanceClient
) {
  await ensureReferralSchema();
  const db = await getDb();
  if (!db) return user.stripeCustomerId ?? null;
  const qualified = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(
      and(eq(referrals.referrerUserId, user.id), eq(referrals.paidCreditStatus, "qualified"))
    )
    .limit(1);
  if (!qualified.length) return user.stripeCustomerId ?? null;

  let customerId = user.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId: String(user.id) },
    });
    customerId = customer.id;
    await updateUserSubscription(user.id, { stripeCustomerId: customerId });
  }
  await settleQualifiedCredits(user.id, stripe);
  return customerId;
}

export async function onReferralInvoicePaid(
  stripe: BalanceClient,
  invoice: ReferralInvoice
) {
  const referredStripeCustomerId = customerId(invoice.customer);
  if (!referredStripeCustomerId) return;
  await ensureReferralSchema();
  const db = await getDb();
  if (!db) return;

  const [referred] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, referredStripeCustomerId))
    .limit(1);
  if (!referred) return;

  const [referral] = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referredUserId, referred.id))
    .limit(1);
  if (!referral || referral.paidCreditStatus === "applied" || referral.paidCreditStatus === "skipped") {
    return;
  }

  let subscriptionStatus: string | null = null;
  const subscription = subscriptionId(invoice);
  if ((invoice.amount_paid ?? 0) > 0 && subscription) {
    try {
      subscriptionStatus = (await stripe.subscriptions.retrieve(subscription)).status;
    } catch {
      subscriptionStatus = null;
    }
  }

  const [referrer] = await db
    .select()
    .from(users)
    .where(eq(users.id, referral.referrerUserId))
    .limit(1);
  const applied = referrer
    ? await db
        .select({ id: referrals.id })
        .from(referrals)
        .where(
          and(
            eq(referrals.referrerUserId, referrer.id),
            eq(referrals.paidCreditStatus, "applied")
          )
        )
    : [];

  const decision = evaluatePaidCredit({
    amountPaidCents: invoice.amount_paid ?? 0,
    subscriptionStatus,
    billingReason: invoice.billing_reason ?? null,
    paidCreditStatus: referral.paidCreditStatus,
    appliedPaidCreditCount: applied.length,
    referrerStripeCustomerId: referrer?.stripeCustomerId ?? null,
    referredStripeCustomerId,
    config: getReferralConfig(),
  });

  if (decision.action === "ignore") return;
  if (decision.action === "skip") {
    await setCreditStatus(referral.id, "skipped", ["pending", "qualified"]);
    return;
  }
  if (decision.action === "qualify" || !referrer?.stripeCustomerId) {
    await setCreditStatus(referral.id, "qualified", ["pending", "qualified"]);
    return;
  }

  await setCreditStatus(referral.id, "qualified", ["pending", "qualified"]);
  await applyCredit({
    stripe,
    referralId: referral.id,
    referrerUserId: referrer.id,
    referredUserId: referred.id,
    referrerStripeCustomerId: referrer.stripeCustomerId,
    amountCents: decision.amountCents,
    currency: decision.currency,
  });
}

export async function getReferralDashboard(userId: number, stripe: BalanceClient | null) {
  await settleQualifiedCredits(userId, stripe).catch(error => {
    console.error("[Referral] pending credit was not applied", error);
  });
  const code = await ensureReferralCode(userId);
  const config = getReferralConfig();
  const db = await getDb();
  const rows = db
    ? await db.select().from(referrals).where(eq(referrals.referrerUserId, userId))
    : [];
  const bonusPostsEarned = rows.reduce((sum, row) => sum + row.signupBonusPosts, 0);
  const applied = rows.filter(row => row.paidCreditStatus === "applied");
  const waiting = rows.filter(row => row.paidCreditStatus === "qualified");
  return {
    code,
    url: referralPublicUrl(code),
    signupBonusPosts: config.signupBonusPosts,
    maxSignupBonuses: config.maxSignupBonuses,
    paidCreditCents: config.paidCreditCents,
    maxPaidCredits: config.maxPaidCredits,
    stats: {
      signups: rows.length,
      bonusPostsEarned,
      payingReferrals: rows.filter(row =>
        ["qualified", "applied", "skipped"].includes(row.paidCreditStatus)
      ).length,
      creditsApplied: applied.length,
      creditAppliedCents: applied.reduce((sum, row) => sum + row.paidCreditCents, 0),
      creditsWaiting: waiting.length,
    },
  };
}
