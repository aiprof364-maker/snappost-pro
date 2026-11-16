import { PLAN_POST_LIMITS, PRODUCT_DOMAIN, PRODUCT_NAME, type PlanId } from "./const";

/**
 * Defaults for the referral program. Override them with env vars
 * (see server/referralConfig.ts) without changing call sites:
 * REFERRAL_SIGNUP_BONUS_POSTS, REFERRAL_MAX_SIGNUP_BONUSES,
 * REFERRAL_PAID_CREDIT_CENTS, REFERRAL_MAX_PAID_CREDITS.
 */
export const REFERRAL_DEFAULTS = {
  /** Extra free posts granted to the referrer for each rewarded signup. */
  signupBonusPosts: 2,
  /** How many signups can earn that bonus. Later signups are tracked only. */
  maxSignupBonuses: 10,
  /** Stripe customer-balance credit once the referred person pays. $19. */
  paidCreditCents: 1900,
  /** How many of those credits one referrer can receive. */
  maxPaidCredits: 12,
  currency: "usd",
} as const;

export type ReferralConfig = {
  signupBonusPosts: number;
  maxSignupBonuses: number;
  paidCreditCents: number;
  maxPaidCredits: number;
  currency: "usd";
};

const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{6,16}$/;

const PAID_OR_TRIAL_STATUSES = new Set(["active", "trialing", "past_due"]);

const SUBSCRIPTION_INVOICE_REASONS = new Set([
  "subscription_create",
  "subscription_cycle",
  "subscription_update",
  "subscription_threshold",
]);

export type ReferralParty = {
  id: number;
  email: string | null;
  role: string;
};

export type PaidCreditStatus = "pending" | "qualified" | "applied" | "skipped";

export function normalizeReferralCode(
  value: string | null | undefined
): string | null {
  const code = value?.trim().toUpperCase() ?? "";
  return REFERRAL_CODE_PATTERN.test(code) ? code : null;
}

/**
 * Collapse plus-aliases, and Gmail dots, so a person cannot refer a second
 * inbox they control. Other domains keep dots because those change delivery.
 */
export function canonicalEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return trimmed;
  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1);
  if (domain === "googlemail.com") domain = "gmail.com";
  local = local.split("+")[0] ?? "";
  if (!local) return trimmed;
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
}

export function evaluateReferralSignup(input: {
  referrer: ReferralParty | null;
  referred: ReferralParty;
  rewardedSignupCount: number;
  config?: ReferralConfig;
}):
  | { accept: false; reason: "missing_referrer" | "admin" | "self" | "same_email" }
  | { accept: true; bonusPosts: number } {
  if (!input.referrer) return { accept: false, reason: "missing_referrer" };
  if (input.referrer.role === "admin" || input.referred.role === "admin") {
    return { accept: false, reason: "admin" };
  }
  if (input.referrer.id === input.referred.id) {
    return { accept: false, reason: "self" };
  }
  const referrerEmail = canonicalEmail(input.referrer.email);
  const referredEmail = canonicalEmail(input.referred.email);
  if (referrerEmail && referredEmail && referrerEmail === referredEmail) {
    return { accept: false, reason: "same_email" };
  }
  const config = input.config ?? REFERRAL_DEFAULTS;
  const bonusPosts =
    input.rewardedSignupCount >= config.maxSignupBonuses
      ? 0
      : config.signupBonusPosts;
  return { accept: true, bonusPosts };
}

/**
 * A referred account earns the referrer a balance credit only after a real
 * subscription payment. Trials and $0 invoices stay pending.
 */
export function evaluatePaidCredit(input: {
  amountPaidCents: number;
  subscriptionStatus: string | null;
  billingReason: string | null;
  paidCreditStatus: PaidCreditStatus;
  appliedPaidCreditCount: number;
  referrerStripeCustomerId: string | null;
  referredStripeCustomerId: string | null;
  config?: ReferralConfig;
}):
  | { action: "ignore" }
  | { action: "skip"; reason: "same_customer" | "cap" }
  | { action: "qualify" }
  | { action: "apply"; amountCents: number; currency: "usd" } {
  if (
    input.paidCreditStatus === "applied" ||
    input.paidCreditStatus === "skipped"
  ) {
    return { action: "ignore" };
  }

  const config = input.config ?? REFERRAL_DEFAULTS;
  const qualifyingPayment =
    input.amountPaidCents > 0 &&
    !!input.billingReason &&
    SUBSCRIPTION_INVOICE_REASONS.has(input.billingReason) &&
    input.subscriptionStatus !== "trialing" &&
    (input.subscriptionStatus == null || input.subscriptionStatus === "active");
  const ready = input.paidCreditStatus === "qualified" || qualifyingPayment;
  if (!ready) return { action: "ignore" };

  if (
    input.referrerStripeCustomerId &&
    input.referredStripeCustomerId &&
    input.referrerStripeCustomerId === input.referredStripeCustomerId
  ) {
    return { action: "skip", reason: "same_customer" };
  }
  if (input.appliedPaidCreditCount >= config.maxPaidCredits) {
    return { action: "skip", reason: "cap" };
  }
  if (!input.referrerStripeCustomerId) return { action: "qualify" };
  return {
    action: "apply",
    amountCents: config.paidCreditCents,
    currency: config.currency,
  };
}

/** Negative amount: Stripe treats that as credit on the customer's balance. */
export function referralBalanceTransaction(input: {
  amountCents: number;
  currency: string;
  referralId: number;
  referredUserId: number;
}) {
  return {
    amount: -Math.abs(input.amountCents),
    currency: input.currency,
    description: "SnapPost Pro referral credit",
    metadata: {
      source: "referral",
      referralId: String(input.referralId),
      referredUserId: String(input.referredUserId),
    },
  };
}

export function referralPublicUrl(code: string) {
  return `https://${PRODUCT_DOMAIN}/?ref=${encodeURIComponent(code)}`;
}

export function formatReferralCredit(cents: number) {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

/**
 * Free lifetime allowance plus referral bonus posts. Paid plans keep their
 * monthly cap; banked bonus posts apply again only if the account is free.
 */
export function postCreationLimit(
  plan: "free" | PlanId,
  bonusFreePosts: number | null | undefined
): number | null {
  if (plan !== "free") return PLAN_POST_LIMITS[plan];
  const bonus = Number.isFinite(bonusFreePosts)
    ? Math.max(0, Math.floor(bonusFreePosts ?? 0))
    : 0;
  return (PLAN_POST_LIMITS.free ?? 0) + bonus;
}

/**
 * The SnapPost mark is only for the free plan. Paid plans, trials, and a
 * past-due subscription never qualify, even if an older draft has a marked copy.
 */
export function showsSnapPostMark(account: {
  plan?: string | null;
  subscriptionStatus?: string | null;
}) {
  if ((account.plan ?? "free") !== "free") return false;
  const status = (account.subscriptionStatus ?? "none").toLowerCase();
  return !PAID_OR_TRIAL_STATUSES.has(status);
}

const CAPTION_MAX = 2200;
/**
 * Current footer, plus the older "Made with SnapPost" line and its referral
 * suffix. The capture is the link after the dot, when one was stored.
 */
const FOOTER_PATTERN = /\n*Made with SnapPost(?: Pro)?(?:\s·\s(\S+))?\s*$/i;

/** Free-plan caption line when the account has no referral code. Same words as the image watermark. */
export const SNAPPOST_CAPTION_FOOTER = `Made with ${PRODUCT_NAME} · ${PRODUCT_DOMAIN}`;

function compactReferralTarget(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^https?:\/\//i, "");
}

export function snapPostCaptionFooter(referralUrl?: string | null) {
  const compact = compactReferralTarget(referralUrl);
  if (!compact) return SNAPPOST_CAPTION_FOOTER;
  return `Made with ${PRODUCT_NAME} · ${compact}`;
}

export function stripSnapPostCaptionFooter(caption: string) {
  return caption.replace(FOOTER_PATTERN, "").trimEnd();
}

/**
 * Adds the free-plan footer once. An existing SnapPost footer is replaced, and
 * a referral link already on that line is kept when no new link is supplied.
 * Paid and trial captions have the footer removed.
 */
export function withSnapPostCaptionFooter(
  caption: string,
  options: { include: boolean; referralUrl?: string | null }
) {
  const existingTarget = caption.match(FOOTER_PATTERN)?.[1] ?? null;
  const base = stripSnapPostCaptionFooter(caption).trim();
  if (!options.include) return base;
  const footer = snapPostCaptionFooter(
    compactReferralTarget(options.referralUrl) ?? existingTarget
  );
  const next = base ? `${base}\n\n${footer}` : footer;
  return next.length <= CAPTION_MAX ? next : base;
}

export function publishableCaption(
  caption: string | null | undefined,
  account: { plan?: string | null; subscriptionStatus?: string | null }
) {
  const text = caption ?? "";
  if (!showsSnapPostMark(account)) return stripSnapPostCaptionFooter(text);
  return withSnapPostCaptionFooter(text, { include: true });
}

export function publishableImageKey(
  post: {
    brandedImageKey?: string | null;
    markedImageKey?: string | null;
    originalImageKey?: string | null;
  },
  account: { plan?: string | null; subscriptionStatus?: string | null }
) {
  if (showsSnapPostMark(account) && post.markedImageKey) return post.markedImageKey;
  return post.brandedImageKey ?? post.originalImageKey ?? null;
}

type PresentablePost = {
  caption: string | null;
  brandedImageKey: string | null;
  brandedImageUrl: string | null;
  markedImageKey?: string | null;
  markedImageUrl?: string | null;
};

/** What the dashboard and publish preview may show for this account. */
export function presentPostForAccount<T extends PresentablePost>(
  post: T,
  account: { plan?: string | null; subscriptionStatus?: string | null }
): T {
  if (showsSnapPostMark(account)) {
    const caption =
      post.caption == null
        ? post.caption
        : withSnapPostCaptionFooter(post.caption, { include: true });
    if (!post.markedImageUrl) {
      return caption === post.caption ? post : { ...post, caption };
    }
    return {
      ...post,
      caption,
      brandedImageKey: post.markedImageKey ?? post.brandedImageKey,
      brandedImageUrl: post.markedImageUrl,
    };
  }
  return {
    ...post,
    caption: stripSnapPostCaptionFooter(post.caption ?? ""),
    markedImageKey: null,
    markedImageUrl: null,
  };
}

export function claimedPostImages(input: {
  account: { plan?: string | null; subscriptionStatus?: string | null };
  markedKey: string;
  markedUrl: string;
  cleanKey: string | null;
  cleanUrl: string | null;
}) {
  const cleanKey = input.cleanKey ?? input.markedKey;
  const cleanUrl = input.cleanUrl ?? input.markedUrl;
  if (!showsSnapPostMark(input.account)) {
    return {
      brandedImageKey: cleanKey,
      brandedImageUrl: cleanUrl,
      markedImageKey: null,
      markedImageUrl: null,
    };
  }
  return {
    brandedImageKey: cleanKey,
    brandedImageUrl: cleanUrl,
    markedImageKey: input.markedKey,
    markedImageUrl: input.markedUrl,
  };
}

export type ReferralFunnelRow = {
  referrerUserId: number;
  referredUserId: number;
  signupBonusPosts: number;
  paidCreditStatus: PaidCreditStatus;
  paidCreditCents: number;
};

export function summarizeReferralFunnel(
  rows: ReferralFunnelRow[],
  customerIds: ReadonlySet<number>
) {
  const visible = rows.filter(
    row =>
      customerIds.has(row.referrerUserId) && customerIds.has(row.referredUserId)
  );
  const paying = visible.filter(row =>
    ["qualified", "applied", "skipped"].includes(row.paidCreditStatus)
  );
  return {
    referralSignups: visible.length,
    referralBonusesGranted: visible.filter(row => row.signupBonusPosts > 0)
      .length,
    referralBonusPostsGranted: visible.reduce(
      (sum, row) => sum + row.signupBonusPosts,
      0
    ),
    referralPayingCustomers: paying.length,
    referralCreditsApplied: visible.filter(
      row => row.paidCreditStatus === "applied"
    ).length,
    referralCreditsWaiting: visible.filter(
      row => row.paidCreditStatus === "qualified"
    ).length,
  };
}
