import { sql, type SQLWrapper } from "drizzle-orm";
import type { ReferralFunnelRow } from "@shared/referrals";
import {
  authTokens,
  conversionEvents,
  integrations,
  posts,
  previewDrafts,
  referrals,
  users,
} from "../drizzle/schema";
import { isConfiguredAdminEmail } from "./adminIdentity";
import { getDb } from "./db";
import { hasPublishingReadyFacebookPage } from "./facebook";
import { summarizeFreeToPaidFunnel } from "./funnelStats";
import { PREVIEW_DAY1_KIND, PREVIEW_DAY3_KIND } from "./previewReminderEmail";

/** Window shown on the admin dashboard's Free-preview Funnel. */
export const FREE_PREVIEW_FUNNEL_DAYS = 30;

/** Automated assistant mail. These accounts are not customers. */
export const INTERNAL_ACCOUNT_DOMAIN = "mail.grokbot.com";

const TRIAL_REMINDER_KIND = "trial-ending";
const RENEWAL_REMINDER_KIND = "renewal";

export class AdminStatsUnavailableError extends Error {
  constructor() {
    super("Admin stats are unavailable");
    this.name = "AdminStatsUnavailableError";
  }
}

type Timestamp = Date | string;

export type StatsUser = {
  id: number;
  role: string;
  plan: string;
  subscriptionStatus: string | null;
  email: string | null;
  openId: string;
  loginMethod: string | null;
  createdAt: Timestamp;
};

export type StatsPost = {
  userId: number;
  status: string;
};

export type StatsIntegration = {
  userId: number;
  status: string;
  pageId: string | null;
  pageAccessToken: string | null;
};

export type StatsEvent = {
  userId: number | null;
  eventType: string;
  metadata: string | null;
  createdAt: Timestamp;
};

export type StatsToken = {
  email: string;
  createdAt: Timestamp;
  usedAt: Timestamp | null;
};

export type StatsPreviewDraft = {
  createdAt: Timestamp;
  emailRequestedAt: Timestamp | null;
  claimedAt: Timestamp | null;
};

export type EmailReminderCountRow = {
  kind: string;
  status: string;
  count: number;
  lastAccepted: Timestamp | null;
  lastAttempt: Timestamp | null;
};

export type EmailReminderStats = {
  trialExpirationWarnings: {
    sent: number;
    failed: number;
    lastRun: string | null;
  };
  renewalReminders: {
    sent: number;
    failed: number;
    lastRun: string | null;
  };
  previewDay1Reminders: {
    sent: number;
    failed: number;
    lastRun: string | null;
  };
  previewDay3Reminders: {
    sent: number;
    failed: number;
    lastRun: string | null;
  };
};

export type AdminStats = {
  generated_at: string;
  realAccounts: {
    count: number;
    latestCreatedAt: string | null;
  };
  subscriberFunnel: ReturnType<typeof buildSubscriberFunnel>;
  freePreviewFunnel: ReturnType<typeof buildFreePreviewFunnel>;
  emailReminders: EmailReminderStats;
};

function timestamp(value: Timestamp | null | undefined): number | null {
  if (value == null) return null;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function isOnOrAfter(value: Timestamp | null | undefined, sinceMs: number) {
  const time = timestamp(value);
  return time !== null && time >= sinceMs;
}

function latestIso(values: Array<Timestamp | null | undefined>): string | null {
  let latest = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    const time = timestamp(value);
    if (time !== null && time > latest) latest = time;
  }
  return Number.isFinite(latest) ? new Date(latest).toISOString() : null;
}

function emailDomain(email: string) {
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return "";
  return email.slice(at + 1);
}

function configuredOwnerEmail() {
  return process.env.OWNER_EMAIL?.trim().toLowerCase() ?? "";
}

function configuredOwnerOpenId() {
  return process.env.OWNER_OPEN_ID?.trim() ?? "";
}

/**
 * Accounts left out of the real-customer count.
 * Uses the existing admin role, configured admin address, and owner open id,
 * plus the owner address when it differs from the admin address, plus
 * automated mail at mail.grokbot.com.
 */
export function isInternalOrTestAccount(user: {
  role: string;
  email: string | null;
  openId: string;
}) {
  if (user.role === "admin") return true;
  const ownerOpenId = configuredOwnerOpenId();
  if (ownerOpenId && user.openId === ownerOpenId) return true;
  const email = user.email?.trim().toLowerCase() ?? "";
  if (!email) return false;
  if (isConfiguredAdminEmail(email)) return true;
  const ownerEmail = configuredOwnerEmail();
  if (ownerEmail && email === ownerEmail) return true;
  return emailDomain(email) === INTERNAL_ACCOUNT_DOMAIN;
}

export function summarizeRealAccounts(
  accounts: Array<{
    role: string;
    email: string | null;
    openId: string;
    createdAt: Timestamp;
  }>
) {
  let count = 0;
  let latest = Number.NEGATIVE_INFINITY;
  for (const account of accounts) {
    if (isInternalOrTestAccount(account)) continue;
    count += 1;
    const created = timestamp(account.createdAt);
    if (created !== null && created > latest) latest = created;
  }
  return {
    count,
    latestCreatedAt:
      count > 0 && Number.isFinite(latest)
        ? new Date(latest).toISOString()
        : null,
  };
}

/** All-time subscriber funnel, matching the admin dashboard cards. */
export function buildSubscriberFunnel(input: {
  users: Array<{
    id: number;
    role: string;
    plan: string;
    subscriptionStatus: string | null;
  }>;
  posts: Array<{ userId: number }>;
  integrations: StatsIntegration[];
  events: Array<{
    userId: number | null;
    eventType: string;
    metadata: string | null;
  }>;
  referrals?: ReferralFunnelRow[];
}) {
  const customerUsers = input.users.filter(user => user.role !== "admin");
  const customerIds = new Set(customerUsers.map(user => user.id));
  const upgradeFunnel = summarizeFreeToPaidFunnel(
    input.users.map(user => ({
      id: user.id,
      role: user.role,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
    })),
    input.events.map(event => ({
      userId: event.userId,
      eventType: event.eventType,
      metadata: event.metadata,
    })),
    input.referrals ?? []
  );
  return {
    accounts: customerUsers.length,
    freeAccounts: customerUsers.filter(user => user.plan === "free").length,
    activatedAccounts: new Set(
      input.posts
        .filter(post => customerIds.has(post.userId))
        .map(post => post.userId)
    ).size,
    facebookConnectionClicked: new Set(
      input.events
        .filter(event => event.eventType === "facebook_connection_clicked")
        .filter(event => event.userId !== null && customerIds.has(event.userId))
        .map(event => event.userId)
    ).size,
    connectedPages: new Set(
      input.integrations
        .filter(integration => hasPublishingReadyFacebookPage(integration))
        .filter(integration => customerIds.has(integration.userId))
        .map(integration => integration.userId)
    ).size,
    checkoutStarted: new Set(
      input.events
        .filter(event => event.eventType === "checkout_started")
        .filter(event => event.userId !== null && customerIds.has(event.userId))
        .map(event => event.userId)
    ).size,
    subscriptionTrials: customerUsers.filter(
      user => user.plan !== "free" && user.subscriptionStatus === "trialing"
    ).length,
    paidSubscribers: customerUsers.filter(
      user => user.plan !== "free" && user.subscriptionStatus === "active"
    ).length,
    ...upgradeFunnel,
  };
}

/** Last-30-day free-preview funnel, matching the admin dashboard cards. */
export function buildFreePreviewFunnel(input: {
  now: Date;
  periodDays?: number;
  tokens: StatsToken[];
  users: Array<{
    id: number;
    role: string;
    plan: string;
    loginMethod: string | null;
    createdAt: Timestamp;
  }>;
  posts: StatsPost[];
  integrations: StatsIntegration[];
  events: StatsEvent[];
  previewDrafts: StatsPreviewDraft[];
}) {
  const periodDays = input.periodDays ?? FREE_PREVIEW_FUNNEL_DAYS;
  const sinceMs = input.now.getTime() - periodDays * 24 * 60 * 60 * 1000;
  const freeAccessRequests = input.tokens.filter(
    token =>
      isOnOrAfter(token.createdAt, sinceMs) &&
      !isConfiguredAdminEmail(token.email)
  );
  const freeAccessOpened = input.tokens.filter(
    token =>
      token.usedAt !== null &&
      isOnOrAfter(token.usedAt, sinceMs) &&
      !isConfiguredAdminEmail(token.email)
  );
  const newFreeUsers = input.users.filter(
    user =>
      isOnOrAfter(user.createdAt, sinceMs) &&
      user.role !== "admin" &&
      user.plan === "free" &&
      user.loginMethod === "email_magic_link"
  );
  const newUserIds = new Set(newFreeUsers.map(user => user.id));
  const landingAccounts = { contractors: 0, hairdressers: 0 };

  for (const event of input.events) {
    if (
      event.eventType !== "free_account_created" ||
      event.userId === null ||
      !newUserIds.has(event.userId)
    ) {
      continue;
    }
    try {
      const metadata = event.metadata ? JSON.parse(event.metadata) : null;
      if (metadata?.landing === "contractors") landingAccounts.contractors += 1;
      if (metadata?.landing === "hairdressers")
        landingAccounts.hairdressers += 1;
    } catch {
      // Old or malformed metadata does not affect aggregate funnel counts.
    }
  }

  return {
    periodDays,
    previewsCreated: input.previewDrafts.filter(draft =>
      isOnOrAfter(draft.createdAt, sinceMs)
    ).length,
    // The preview-result email capture. Still one row per draft, stamped
    // when that visitor submits the email on the finished preview.
    previewsEmailRequested: input.previewDrafts.filter(
      draft =>
        draft.emailRequestedAt !== null &&
        isOnOrAfter(draft.emailRequestedAt, sinceMs)
    ).length,
    previewsClaimed: input.previewDrafts.filter(
      draft => draft.claimedAt !== null && isOnOrAfter(draft.claimedAt, sinceMs)
    ).length,
    freeAccessRequested: freeAccessRequests.length,
    freeAccessOpened: freeAccessOpened.length,
    freeAccountsCreated: newFreeUsers.length,
    facebookConnectionClicked: new Set(
      input.events
        .filter(
          event =>
            event.eventType === "facebook_connection_clicked" &&
            isOnOrAfter(event.createdAt, sinceMs) &&
            event.userId !== null &&
            newUserIds.has(event.userId)
        )
        .map(event => event.userId)
    ).size,
    connectedPages: new Set(
      input.integrations
        .filter(
          integration =>
            newUserIds.has(integration.userId) &&
            hasPublishingReadyFacebookPage(integration)
        )
        .map(integration => integration.userId)
    ).size,
    draftsCreated: new Set(
      input.posts
        .filter(post => newUserIds.has(post.userId))
        .map(post => post.userId)
    ).size,
    postsPublished: new Set(
      input.posts
        .filter(
          post => newUserIds.has(post.userId) && post.status === "published"
        )
        .map(post => post.userId)
    ).size,
    landingAccounts,
  };
}

export function emptyEmailReminderStats(): EmailReminderStats {
  return {
    trialExpirationWarnings: { sent: 0, failed: 0, lastRun: null },
    renewalReminders: { sent: 0, failed: 0, lastRun: null },
    previewDay1Reminders: { sent: 0, failed: 0, lastRun: null },
    previewDay3Reminders: { sent: 0, failed: 0, lastRun: null },
  };
}

function reminderBucket(rows: EmailReminderCountRow[], kind: string) {
  const matching = rows.filter(row => row.kind === kind);
  const sent = matching
    .filter(row => row.status === "accepted")
    .reduce((sum, row) => sum + row.count, 0);
  const failed = matching
    .filter(row => row.status === "failed" || row.status === "uncertain")
    .reduce((sum, row) => sum + row.count, 0);
  return {
    sent,
    failed,
    lastRun: latestIso(
      matching.flatMap(row => [row.lastAccepted, row.lastAttempt])
    ),
  };
}

/** Trial, renewal, and free-preview reminder counts from the account email outbox. */
export function summarizeEmailReminderRows(
  rows: EmailReminderCountRow[]
): EmailReminderStats {
  return {
    trialExpirationWarnings: reminderBucket(rows, TRIAL_REMINDER_KIND),
    renewalReminders: reminderBucket(rows, RENEWAL_REMINDER_KIND),
    previewDay1Reminders: reminderBucket(rows, PREVIEW_DAY1_KIND),
    previewDay3Reminders: reminderBucket(rows, PREVIEW_DAY3_KIND),
  };
}

export function readExecuteRows(
  result: unknown
): Array<Record<string, unknown>> {
  if (!Array.isArray(result) || result.length === 0) return [];
  const first: unknown = result[0];
  if (Array.isArray(first)) {
    return first.filter(
      (row): row is Record<string, unknown> =>
        row !== null && typeof row === "object"
    );
  }
  if (
    first !== null &&
    typeof first === "object" &&
    !("affectedRows" in first)
  ) {
    return result.filter(
      (row): row is Record<string, unknown> =>
        row !== null && typeof row === "object"
    );
  }
  return [];
}

function finiteCount(value: unknown) {
  const count = typeof value === "bigint" ? Number(value) : Number(value);
  return Number.isFinite(count) ? count : 0;
}

function normalizeEmailReminderRow(
  row: Record<string, unknown>
): EmailReminderCountRow {
  const lastAccepted = row.lastAccepted;
  const lastAttempt = row.lastAttempt;
  return {
    kind: typeof row.kind === "string" ? row.kind : "",
    status: typeof row.status === "string" ? row.status : "",
    count: finiteCount(row.count),
    lastAccepted:
      lastAccepted instanceof Date || typeof lastAccepted === "string"
        ? lastAccepted
        : null,
    lastAttempt:
      lastAttempt instanceof Date || typeof lastAttempt === "string"
        ? lastAttempt
        : null,
  };
}

export function isMissingRelation(error: unknown) {
  const codes: Array<string | number | undefined> = [];
  const messages: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (current instanceof Error) messages.push(current.message);
    if (typeof current !== "object") break;
    const record = current as {
      code?: string | number;
      errno?: number;
      message?: string;
      cause?: unknown;
    };
    codes.push(record.code, record.errno);
    if (typeof record.message === "string") messages.push(record.message);
    current = record.cause;
  }
  return (
    codes.includes(1146) ||
    codes.includes("ER_NO_SUCH_TABLE") ||
    messages.some(message => /doesn't exist|does not exist/i.test(message))
  );
}

export async function loadEmailReminderStats(db: {
  execute: (query: SQLWrapper) => Promise<unknown>;
}): Promise<EmailReminderStats> {
  try {
    const result = await db.execute(sql`
      SELECT kind, status, COUNT(*) AS count,
             MAX(acceptedAt) AS lastAccepted,
             MAX(lastAttemptAt) AS lastAttempt
      FROM account_email_delivery
      WHERE kind IN ('trial-ending', 'renewal', 'preview-day-1', 'preview-day-3')
      GROUP BY kind, status
    `);
    return summarizeEmailReminderRows(
      readExecuteRows(result).map(normalizeEmailReminderRow)
    );
  } catch (error) {
    if (isMissingRelation(error)) return emptyEmailReminderStats();
    throw error;
  }
}

export function assembleAdminStats(
  input: {
    users: StatsUser[];
    posts: StatsPost[];
    integrations: StatsIntegration[];
    events: StatsEvent[];
    referrals: ReferralFunnelRow[];
    tokens: StatsToken[];
    previewDrafts: StatsPreviewDraft[];
    emailReminders: EmailReminderStats;
  },
  now: Date
): AdminStats {
  return {
    generated_at: now.toISOString(),
    realAccounts: summarizeRealAccounts(input.users),
    subscriberFunnel: buildSubscriberFunnel(input),
    freePreviewFunnel: buildFreePreviewFunnel({ ...input, now }),
    emailReminders: input.emailReminders,
  };
}

/** Read-only aggregate used by GET /api/admin/stats. Does not write. */
export async function loadAdminStats(now = new Date()): Promise<AdminStats> {
  const db = await getDb();
  if (!db) throw new AdminStatsUnavailableError();

  const [
    userRows,
    postRows,
    integrationRows,
    eventRows,
    referralRows,
    tokenRows,
    previewRows,
    emailReminders,
  ] = await Promise.all([
    db
      .select({
        id: users.id,
        role: users.role,
        plan: users.plan,
        subscriptionStatus: users.subscriptionStatus,
        email: users.email,
        openId: users.openId,
        loginMethod: users.loginMethod,
        createdAt: users.createdAt,
      })
      .from(users),
    db
      .select({
        userId: posts.userId,
        status: posts.status,
      })
      .from(posts),
    db
      .select({
        userId: integrations.userId,
        status: integrations.status,
        pageId: integrations.pageId,
        pageAccessToken: integrations.pageAccessToken,
      })
      .from(integrations),
    db
      .select({
        userId: conversionEvents.userId,
        eventType: conversionEvents.eventType,
        metadata: conversionEvents.metadata,
        createdAt: conversionEvents.createdAt,
      })
      .from(conversionEvents),
    db
      .select({
        referrerUserId: referrals.referrerUserId,
        referredUserId: referrals.referredUserId,
        signupBonusPosts: referrals.signupBonusPosts,
        paidCreditStatus: referrals.paidCreditStatus,
        paidCreditCents: referrals.paidCreditCents,
      })
      .from(referrals),
    db
      .select({
        email: authTokens.email,
        createdAt: authTokens.createdAt,
        usedAt: authTokens.usedAt,
      })
      .from(authTokens),
    db
      .select({
        createdAt: previewDrafts.createdAt,
        emailRequestedAt: previewDrafts.emailRequestedAt,
        claimedAt: previewDrafts.claimedAt,
      })
      .from(previewDrafts),
    loadEmailReminderStats(db),
  ]);

  return assembleAdminStats(
    {
      users: userRows,
      posts: postRows,
      integrations: integrationRows,
      events: eventRows,
      referrals: referralRows,
      tokens: tokenRows,
      previewDrafts: previewRows,
      emailReminders,
    },
    now
  );
}
