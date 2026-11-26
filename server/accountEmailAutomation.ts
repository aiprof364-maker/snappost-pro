import cron from "node-cron";
import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { createMagicLinkToken } from "./auth";
import { getTrialEligibility } from "./db";
import { sendAccountEmail, type AccountEmailKind } from "./email";
import {
  ensurePreviewDraftSchema,
  issuePreviewReminderToken,
} from "./previewDrafts";
import {
  PREVIEW_REMINDER_KINDS,
  buildPreviewReminderCandidateQuery,
  buildPreviewReminderSignInUrl,
  isPreviewReminderKind,
  normalizeReminderEmail,
  previewReminderCampaignKey,
  previewReminderDeliveryMetadata,
  previewReminderEntityKey,
  previewReminderNextPath,
  previewReminderOptOutStatements,
  previewReminderSchedule,
  previewReminderSkipReason,
  previewReminderSuppressionQueries,
  previewReminderUnsubscribeUrl,
  rememberedPreviewReminderLink,
  type PreviewReminderAudience,
  type PreviewReminderKind,
} from "./previewReminderEmail";
import {
  FREE_POSTS_USED_KINDS,
  ONBOARDING_EMAIL_KINDS,
  freePostsEmailSchedule,
  isFreePostsUsedKind,
  shouldSkipFreePostsEmail,
  shouldSuppressOnboardingEmail,
  sqlStringList,
} from "./freePostsEmail";
import { getStripe } from "./stripe";

const ACCOUNT_EMAIL_LOCK = "snappost_account_email_dispatch_v1";
const ACCOUNT_EMAIL_ROLLOUT_KEY = "account-email-v1";
const MAX_DELIVERIES_PER_RUN = 50;
const MAX_ATTEMPTS = 5;
const RETRY_BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 8 * 60 * 60_000];

type AccountEmailStatus = "pending" | "processing" | "retry" | "accepted" | "failed" | "uncertain" | "cancelled";

type AccountDeliveryRow = RowDataPacket & {
  id: number;
  userId: number | null;
  recipientEmail: string | null;
  entityKey: string;
  campaignKey: string;
  kind: AccountEmailKind;
  status: AccountEmailStatus;
  attempts: number;
  firstAttemptAt: Date | string | null;
  email: string | null;
  name: string | null;
  plan: "free" | "starter" | "pro" | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  facebookPageId: string | null;
  freePostsSequenceCount: number | string | null;
  metadata: string | null;
};

let pool: Pool | null = null;
let ready = false;
let scheduled = false;
let lastRun: { at: string; status: "ok" | "failed" | "busy"; queued: number; accepted: number } | null = null;

function getPool() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) throw new Error("Account email database is not available");
  pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 4,
    queueLimit: 0,
    enableKeepAlive: true,
    timezone: "Z",
  });
  return pool;
}

function toDate(value: Date | string | null | undefined) {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function sanitizeErrorClass(error: unknown) {
  const candidate = error as { code?: unknown; name?: unknown; status?: unknown; statusCode?: unknown };
  const code = String(candidate?.code ?? candidate?.status ?? candidate?.statusCode ?? candidate?.name ?? "unknown")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 32);
  return code || "unknown";
}

function isKnownRejection(error: unknown) {
  const candidate = error as { status?: unknown; statusCode?: unknown; response?: { status?: unknown } };
  const status = Number(candidate?.status ?? candidate?.statusCode ?? candidate?.response?.status);
  return Number.isFinite(status) && status >= 400 && status < 500 && status !== 429;
}

async function ensureSchema(connection: PoolConnection | Pool) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS account_email_rollout (
      rolloutKey VARCHAR(64) NOT NULL,
      startedAt DATETIME NOT NULL,
      PRIMARY KEY (rolloutKey)
    ) ENGINE=InnoDB
  `);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS account_email_delivery (
      id INT NOT NULL AUTO_INCREMENT,
      userId INT NULL,
      recipientEmail VARCHAR(320) NULL,
      entityKey VARCHAR(191) NOT NULL,
      campaignKey VARCHAR(191) NOT NULL,
      kind VARCHAR(32) NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      attempts INT NOT NULL DEFAULT 0,
      availableAt DATETIME NOT NULL,
      nextAttemptAt DATETIME NULL,
      firstAttemptAt DATETIME NULL,
      lastAttemptAt DATETIME NULL,
      acceptedAt DATETIME NULL,
      providerMessageId VARCHAR(191) NULL,
      lastErrorClass VARCHAR(32) NULL,
      metadata TEXT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY account_email_entity_campaign_uq (entityKey, campaignKey),
      KEY account_email_dispatch_idx (status, nextAttemptAt),
      KEY account_email_user_idx (userId)
    ) ENGINE=InnoDB
  `);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS preview_reminder_opt_out (
      email VARCHAR(320) NOT NULL,
      createdAt DATETIME NOT NULL,
      PRIMARY KEY (email)
    ) ENGINE=InnoDB
  `);
}

async function withLock<T>(work: (connection: PoolConnection) => Promise<T>) {
  const connection = await getPool().getConnection();
  let acquired = false;
  let destroyConnection = false;
  try {
    await connection.query("SET time_zone = '+00:00'");
    const [lockRows] = await connection.execute<RowDataPacket[]>("SELECT GET_LOCK(?, 0) AS acquired", [ACCOUNT_EMAIL_LOCK]);
    acquired = Number(lockRows[0]?.acquired) === 1;
    if (!acquired) return { acquired: false as const };
    return { acquired: true as const, value: await work(connection) };
  } finally {
    if (acquired) {
      try { await connection.execute("SELECT RELEASE_LOCK(?)", [ACCOUNT_EMAIL_LOCK]); } catch { destroyConnection = true; }
    }
    if (destroyConnection) connection.destroy();
    else connection.release();
  }
}

export function getAccountEmailAutomationHealth() {
  return {
    version: "account-email-v1" as const,
    ready: ready && Boolean(process.env.RESEND_API_KEY),
    enabled: Boolean(process.env.RESEND_API_KEY),
    lastRun,
  };
}

export async function initializeAccountEmailAutomation() {
  try {
    await ensureSchema(getPool());
    ready = true;
    return true;
  } catch (error) {
    ready = false;
    console.error("[Account email] initialization failed", { code: sanitizeErrorClass(error) });
    return false;
  }
}

export async function queueAccountEmail(input: {
  userId?: number | null;
  recipientEmail?: string | null;
  entityKey: string;
  campaignKey: string;
  kind: AccountEmailKind;
  availableAt?: Date;
  metadata?: Record<string, unknown>;
}) {
  if (!(await initializeAccountEmailAutomation())) throw new Error("Account email outbox is unavailable");
  const availableAt = input.availableAt ?? new Date();
  await getPool().execute(
    `INSERT IGNORE INTO account_email_delivery
      (userId, recipientEmail, entityKey, campaignKey, kind, status, availableAt, nextAttemptAt, metadata)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [input.userId ?? null, input.recipientEmail ?? null, input.entityKey, input.campaignKey, input.kind, availableAt, availableAt, input.metadata ? JSON.stringify(input.metadata) : null],
  );
}

async function rolloutStartedAt(connection: PoolConnection, now: Date) {
  await connection.execute("INSERT IGNORE INTO account_email_rollout (rolloutKey, startedAt) VALUES (?, ?)", [ACCOUNT_EMAIL_ROLLOUT_KEY, now]);
  const [rows] = await connection.execute<RowDataPacket[]>("SELECT startedAt FROM account_email_rollout WHERE rolloutKey = ? LIMIT 1", [ACCOUNT_EMAIL_ROLLOUT_KEY]);
  return toDate(rows[0]?.startedAt) ?? now;
}

async function enqueueOnboarding(connection: PoolConnection, now: Date) {
  const rolloutAt = await rolloutStartedAt(connection, now);
  const [users] = await connection.execute<RowDataPacket[]>(
    "SELECT id, createdAt FROM users WHERE email IS NOT NULL AND createdAt >= ? AND createdAt <= ?",
    [rolloutAt, now],
  );
  const [suppressedRows] = await connection.execute<RowDataPacket[]>(
    `SELECT DISTINCT userId AS userId FROM account_email_delivery WHERE userId IS NOT NULL AND kind IN (${sqlStringList(FREE_POSTS_USED_KINDS)})`,
  );
  const suppressedUserIds = new Set(suppressedRows.map(row => Number(row.userId)));
  let queued = 0;
  for (const user of users) {
    if (suppressedUserIds.has(Number(user.id))) continue;
    const createdAt = toDate(user.createdAt);
    if (!createdAt) continue;
    const offsets: Array<[1 | 3 | 5, AccountEmailKind]> = [[1, "onboarding-day-1"], [3, "onboarding-day-3"], [5, "onboarding-day-5"]];
    for (const [days, kind] of offsets) {
      const availableAt = new Date(createdAt.getTime() + days * 24 * 60 * 60 * 1000);
      if (availableAt > now) continue;
      const [insert] = await connection.execute<ResultSetHeader>(
        `INSERT IGNORE INTO account_email_delivery
          (userId, entityKey, campaignKey, kind, status, availableAt, nextAttemptAt)
         VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
        [Number(user.id), `user:${user.id}`, `${kind}:v1`, kind, availableAt, availableAt],
      );
      queued += insert.affectedRows;
    }
  }
  return queued;
}

async function enqueueSubscriptionReminders(connection: PoolConnection, now: Date) {
  const stripe = getStripe();
  if (!stripe) return 0;
  const [users] = await connection.execute<RowDataPacket[]>(
    "SELECT id, stripeSubscriptionId, plan, subscriptionStatus FROM users WHERE email IS NOT NULL AND stripeSubscriptionId IS NOT NULL AND subscriptionStatus IN ('trialing', 'active')",
  );
  let queued = 0;
  for (const user of users) {
    try {
      const subscription = await stripe.subscriptions.retrieve(String(user.stripeSubscriptionId));
      if (subscription.status === "trialing" && subscription.trial_end) {
        const trialEnd = new Date(subscription.trial_end * 1000);
        const untilEnd = trialEnd.getTime() - now.getTime();
        if (untilEnd > 0 && untilEnd <= 36 * 60 * 60 * 1000) {
          const [insert] = await connection.execute<ResultSetHeader>(
            `INSERT IGNORE INTO account_email_delivery
             (userId, entityKey, campaignKey, kind, status, availableAt, nextAttemptAt, metadata)
             VALUES (?, ?, ?, 'trial-ending', 'pending', ?, ?, ?)`,
            [Number(user.id), `subscription:${subscription.id}`, `trial-ending:v1:${subscription.trial_end}`, now, now, JSON.stringify({ trialEndsAt: trialEnd.toISOString() })],
          );
          queued += insert.affectedRows;
        }
      }
      const periodEnd = Number((subscription as unknown as { current_period_end?: number }).current_period_end);
      if (subscription.status === "active" && Number.isFinite(periodEnd)) {
        const renewalAt = new Date(periodEnd * 1000);
        const untilRenewal = renewalAt.getTime() - now.getTime();
        if (untilRenewal > 0 && untilRenewal <= 36 * 60 * 60 * 1000) {
          const [insert] = await connection.execute<ResultSetHeader>(
            `INSERT IGNORE INTO account_email_delivery
             (userId, entityKey, campaignKey, kind, status, availableAt, nextAttemptAt, metadata)
             VALUES (?, ?, ?, 'renewal', 'pending', ?, ?, ?)`,
            [Number(user.id), `subscription:${subscription.id}`, `renewal:v1:${periodEnd}`, now, now, JSON.stringify({ renewalAt: renewalAt.toISOString() })],
          );
          queued += insert.affectedRows;
        }
      }
    } catch (error) {
      console.error("[Account email] subscription planning failed", { code: sanitizeErrorClass(error) });
    }
  }
  return queued;
}

function allowsMissingUser(kind: string) {
  return kind === "contact-owner-alert" || isPreviewReminderKind(kind);
}

function countOf(value: unknown) {
  const count = typeof value === "bigint" ? Number(value) : Number(value ?? 0);
  return Number.isFinite(count) ? count : 0;
}

async function suppressPreviewReminders(connection: PoolConnection) {
  for (const statement of previewReminderSuppressionQueries()) {
    await connection.query(statement);
  }
}

async function enqueuePreviewReminders(connection: PoolConnection, now: Date) {
  try {
    await ensurePreviewDraftSchema();
  } catch (error) {
    console.error("[Account email] preview reminder schema unavailable", {
      code: sanitizeErrorClass(error),
    });
    return 0;
  }
  let queued = 0;
  try {
    for (const kind of PREVIEW_REMINDER_KINDS) {
      const { sql, params } = buildPreviewReminderCandidateQuery(kind, now);
      const [rows] = await connection.execute<RowDataPacket[]>(sql, params);
      for (const row of rows) {
        const email = normalizeReminderEmail(String(row.email ?? ""));
        const requestedAt = toDate(row.emailRequestedAt as Date | string | null);
        if (!email || !requestedAt) continue;
        const schedule = previewReminderSchedule(requestedAt);
        const availableAt = kind === "preview-day-1" ? schedule.day1At : schedule.day3At;
        const [insert] = await connection.execute<ResultSetHeader>(
          `INSERT IGNORE INTO account_email_delivery
            (recipientEmail, entityKey, campaignKey, kind, status, availableAt, nextAttemptAt)
           VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
          [
            email,
            previewReminderEntityKey(email),
            previewReminderCampaignKey(kind),
            kind,
            availableAt,
            availableAt,
          ]
        );
        queued += insert.affectedRows;
      }
    }
  } catch (error) {
    console.error("[Account email] preview reminder planning failed", {
      code: sanitizeErrorClass(error),
    });
  }
  return queued;
}

async function loadPreviewReminderAudience(
  connection: PoolConnection,
  email: string,
  now: Date
): Promise<PreviewReminderAudience & { draftId: number | null }> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE LOWER(email) = ?) AS accounts,
       (SELECT COUNT(*) FROM auth_tokens WHERE LOWER(email) = ? AND usedAt IS NOT NULL) AS openedLinks,
       (SELECT COUNT(*) FROM posts p INNER JOIN users u ON u.id = p.userId WHERE LOWER(u.email) = ? AND p.status = 'published') AS publishedPosts,
       (SELECT COUNT(*) FROM preview_reminder_opt_out WHERE email = ?) AS optedOut,
       (SELECT id FROM preview_drafts WHERE requestedEmail = ? AND userId IS NULL AND expiresAt > ? ORDER BY emailRequestedAt DESC, id DESC LIMIT 1) AS draftId,
       (SELECT plan FROM users WHERE LOWER(email) = ? ORDER BY id ASC LIMIT 1) AS plan`,
    [email, email, email, email, email, now, email]
  );
  const row = rows[0] ?? {};
  const plan = row.plan === "starter" || row.plan === "pro" || row.plan === "free" ? row.plan : null;
  const draftId = Number(row.draftId);
  return {
    email,
    hasAccount: countOf(row.accounts) > 0,
    linkOpened: countOf(row.openedLinks) > 0,
    publishedPosts: countOf(row.publishedPosts),
    optedOut: countOf(row.optedOut) > 0,
    hasUnclaimedPreview: Number.isInteger(draftId) && draftId > 0,
    plan,
    draftId: Number.isInteger(draftId) && draftId > 0 ? draftId : null,
  };
}

async function mintPreviewReminderSignInUrl(
  kind: PreviewReminderKind,
  email: string,
  state: PreviewReminderAudience & { draftId: number | null }
) {
  let previewToken: string | null = null;
  let landing: string | null = null;
  if (state.draftId) {
    const issued = await issuePreviewReminderToken(state.draftId, email);
    if (issued) {
      previewToken = issued.token;
      landing = issued.landing;
    }
  }
  if (kind === "preview-day-1" && !previewToken) return null;
  const raw = await createMagicLinkToken(email);
  return buildPreviewReminderSignInUrl(
    raw,
    previewReminderNextPath({
      hasAccount: state.hasAccount || state.linkOpened,
      previewToken,
      landing,
    })
  );
}

/** Stop future preview reminders for this address and drop anything still queued. */
export async function optOutPreviewReminders(email: string) {
  const statements = previewReminderOptOutStatements(email);
  if (!statements.email.includes("@")) {
    throw new Error("Preview reminder opt-out email is invalid");
  }
  if (!(await initializeAccountEmailAutomation())) {
    throw new Error("Preview reminder opt-out is unavailable");
  }
  const now = new Date();
  await getPool().execute(statements.insertSql, [statements.email, now]);
  await getPool().execute(statements.cancelSql, [statements.email]);
}

export function buildDueAccountEmailQuery(now: Date) {
  return {
    sql: `SELECT d.id, d.userId, d.recipientEmail, d.entityKey, d.campaignKey, d.kind, d.status, d.attempts, d.firstAttemptAt,
                 COALESCE(d.recipientEmail, u.email) AS email, u.name, u.plan, u.subscriptionStatus, u.stripeCustomerId,
                 (SELECT i.pageId FROM integrations i WHERE i.userId = d.userId AND i.provider = 'facebook' ORDER BY i.id DESC LIMIT 1) AS facebookPageId,
                 (SELECT COUNT(*) FROM account_email_delivery seq WHERE seq.userId = d.userId AND seq.kind IN (${sqlStringList(FREE_POSTS_USED_KINDS)})) AS freePostsSequenceCount,
                 d.metadata
          FROM account_email_delivery d
          LEFT JOIN users u ON u.id = d.userId
          WHERE d.status IN ('pending', 'retry')
            AND (d.nextAttemptAt IS NULL OR d.nextAttemptAt <= ?)
          ORDER BY d.availableAt ASC, d.id ASC
          LIMIT ${MAX_DELIVERIES_PER_RUN}`,
    params: [now],
  };
}

function metadataDates(metadata: string | null) {
  try {
    const parsed = JSON.parse(metadata ?? "{}") as { trialEndsAt?: string; renewalAt?: string; subscriptionStatus?: "trialing" | "active"; contactId?: number };
    return {
      trialEndsAt: toDate(parsed.trialEndsAt),
      renewalAt: toDate(parsed.renewalAt),
      subscriptionStatus: parsed.subscriptionStatus,
      contactId: Number.isSafeInteger(parsed.contactId) ? parsed.contactId : undefined,
    };
  } catch {
    return {};
  }
}

async function suppressPendingOnboardingForFreePosts(connection: PoolConnection) {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT DISTINCT userId AS userId FROM account_email_delivery WHERE userId IS NOT NULL AND kind IN (${sqlStringList(FREE_POSTS_USED_KINDS)})`,
  );
  const ids = rows.map(row => Number(row.userId)).filter(id => Number.isInteger(id));
  if (ids.length === 0) return;
  await connection.execute(
    `UPDATE account_email_delivery
     SET status = 'cancelled', nextAttemptAt = NULL, lastErrorClass = 'superseded_by_free_posts'
     WHERE status IN ('pending', 'retry')
       AND kind IN (${sqlStringList(ONBOARDING_EMAIL_KINDS)})
       AND userId IN (${ids.join(",")})`,
  );
}

export async function queueFreePostsUsedSequence(userId: number, exhaustedAt = new Date()) {
  if (!(await initializeAccountEmailAutomation())) throw new Error("Account email outbox is unavailable");
  for (const step of freePostsEmailSchedule(exhaustedAt)) {
    await getPool().execute(
      `INSERT IGNORE INTO account_email_delivery
        (userId, entityKey, campaignKey, kind, status, availableAt, nextAttemptAt)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
      [userId, `user:${userId}`, step.campaignKey, step.kind, step.availableAt, step.availableAt],
    );
  }
  await getPool().execute(
    `UPDATE account_email_delivery
     SET status = 'cancelled', nextAttemptAt = NULL, lastErrorClass = 'superseded_by_free_posts'
     WHERE userId = ? AND status IN ('pending', 'retry') AND kind IN (${sqlStringList(ONBOARDING_EMAIL_KINDS)})`,
    [userId],
  );
}

async function deliverOne(connection: PoolConnection, delivery: AccountDeliveryRow, now: Date) {
  if (
    shouldSuppressOnboardingEmail({
      kind: delivery.kind,
      hasFreePostsSequence: Number(delivery.freePostsSequenceCount) > 0,
    }) ||
    (isFreePostsUsedKind(delivery.kind) &&
      shouldSkipFreePostsEmail({
        plan: delivery.plan,
        subscriptionStatus: delivery.subscriptionStatus,
        stripeCustomerId: delivery.stripeCustomerId,
      }))
  ) {
    await connection.execute(
      "UPDATE account_email_delivery SET status = 'cancelled', nextAttemptAt = NULL, lastErrorClass = ? WHERE id = ? AND status IN ('pending', 'retry')",
      [
        isFreePostsUsedKind(delivery.kind) ? "plan_started" : "superseded_by_free_posts",
        delivery.id,
      ],
    );
    return false;
  }
  if (!delivery.email || (!delivery.userId && !allowsMissingUser(delivery.kind))) {
    await connection.execute("UPDATE account_email_delivery SET status = 'cancelled', nextAttemptAt = NULL, lastErrorClass = 'recipient_unavailable' WHERE id = ?", [delivery.id]);
    return false;
  }
  const [claimed] = await connection.execute<ResultSetHeader>(
    `UPDATE account_email_delivery
     SET status = 'processing', attempts = attempts + 1, firstAttemptAt = COALESCE(firstAttemptAt, ?), lastAttemptAt = ?
     WHERE id = ? AND status IN ('pending', 'retry')`,
    [now, now, delivery.id],
  );
  if (claimed.affectedRows !== 1) return false;
  try {
    const dates = metadataDates(delivery.metadata);
    let trialEligible = false;
    if (isFreePostsUsedKind(delivery.kind) && delivery.userId && delivery.email) {
      try {
        const trial = await getTrialEligibility({
          userId: delivery.userId,
          email: delivery.email,
          facebookPageId: delivery.facebookPageId,
          stripeCustomerId: delivery.stripeCustomerId,
        });
        trialEligible = trial.eligible;
      } catch {
        trialEligible = false;
      }
    }
    let previewSend: {
      signInUrl: string;
      unsubscribeUrl: string;
      hasAccount: boolean;
      plan: "free" | "starter" | "pro" | null;
    } | null = null;
    if (isPreviewReminderKind(delivery.kind)) {
      const email = normalizeReminderEmail(delivery.email ?? "");
      const state = await loadPreviewReminderAudience(connection, email, now);
      const reason = previewReminderSkipReason(delivery.kind, state);
      if (reason) {
        await connection.execute(
          "UPDATE account_email_delivery SET status = 'cancelled', nextAttemptAt = NULL, lastErrorClass = ? WHERE id = ?",
          [reason, delivery.id]
        );
        return false;
      }
      let signInUrl = rememberedPreviewReminderLink(delivery.metadata);
      if (!signInUrl) {
        const minted = await mintPreviewReminderSignInUrl(delivery.kind, email, state);
        if (!minted) {
          await connection.execute(
            "UPDATE account_email_delivery SET status = 'cancelled', nextAttemptAt = NULL, lastErrorClass = 'preview_unavailable' WHERE id = ?",
            [delivery.id]
          );
          return false;
        }
        signInUrl = minted;
        await connection.execute(
          "UPDATE account_email_delivery SET metadata = ? WHERE id = ?",
          [previewReminderDeliveryMetadata(signInUrl), delivery.id]
        );
      }
      previewSend = {
        signInUrl,
        unsubscribeUrl: previewReminderUnsubscribeUrl(email),
        hasAccount: state.hasAccount || state.linkOpened,
        plan: state.plan,
      };
    }
    let contact: { name: string; email: string; message: string; ownerEmail: string } | undefined;
    if (delivery.kind === "contact-owner-alert") {
      if (!dates.contactId) throw new Error("contact_missing");
      const [contacts] = await connection.execute<RowDataPacket[]>(
        "SELECT name, email, message FROM contacts WHERE id = ? LIMIT 1",
        [dates.contactId],
      );
      const contactRow = contacts[0];
      if (!contactRow) throw new Error("contact_missing");
      contact = {
        name: String(contactRow.name),
        email: String(contactRow.email),
        message: String(contactRow.message),
        ownerEmail: delivery.email,
      };
    }
    const result = await sendAccountEmail(delivery.kind, {
      email: delivery.email,
      userName: delivery.name,
      plan: previewSend?.plan ?? delivery.plan,
      trialEligible,
      trialEndsAt: dates.trialEndsAt,
      renewalAt: dates.renewalAt,
      subscriptionStatus: dates.subscriptionStatus,
      contact,
      signInUrl: previewSend?.signInUrl,
      unsubscribeUrl: previewSend?.unsubscribeUrl,
      hasAccount: previewSend?.hasAccount,
    }, `snappost:account:${delivery.entityKey}:${delivery.campaignKey}`);
    await connection.execute(
      "UPDATE account_email_delivery SET status = 'accepted', acceptedAt = ?, providerMessageId = ?, nextAttemptAt = NULL, lastErrorClass = NULL, metadata = ? WHERE id = ?",
      [now, result.id, previewSend ? null : delivery.metadata, delivery.id],
    );
    return true;
  } catch (error) {
    const attempts = delivery.attempts + 1;
    const permanent = isKnownRejection(error);
    const terminal = permanent || attempts >= MAX_ATTEMPTS;
    const status = terminal ? (permanent ? "failed" : "uncertain") : "retry";
    const nextAttempt = terminal ? null : new Date(now.getTime() + RETRY_BACKOFF_MS[Math.min(attempts - 1, RETRY_BACKOFF_MS.length - 1)]);
    await connection.execute(
      "UPDATE account_email_delivery SET status = ?, nextAttemptAt = ?, lastErrorClass = ? WHERE id = ?",
      [status, nextAttempt, sanitizeErrorClass(error), delivery.id],
    );
    console.error("[Account email] delivery failed", { deliveryId: delivery.id, code: sanitizeErrorClass(error) });
    return false;
  }
}

export async function runAccountEmailAutomation(options: { now?: Date } = {}) {
  if (!process.env.RESEND_API_KEY || !(await initializeAccountEmailAutomation())) return { ran: false, queued: 0, accepted: 0 };
  const now = options.now ?? new Date();
  try {
    const lock = await withLock(async connection => {
      const [recovered] = await connection.execute<ResultSetHeader>(
        "UPDATE account_email_delivery SET status = 'retry', nextAttemptAt = ?, lastErrorClass = COALESCE(lastErrorClass, 'recovered') WHERE status = 'processing'",
        [now],
      );
      await suppressPendingOnboardingForFreePosts(connection);
      await suppressPreviewReminders(connection);
      const onboardingQueued = await enqueueOnboarding(connection, now);
      const subscriptionQueued = await enqueueSubscriptionReminders(connection, now);
      const previewQueued = await enqueuePreviewReminders(connection, now);
      const { sql, params } = buildDueAccountEmailQuery(now);
      const [due] = await connection.execute<AccountDeliveryRow[]>(sql, params);
      let accepted = 0;
      for (const delivery of due) if (await deliverOne(connection, delivery, now)) accepted += 1;
      return { queued: onboardingQueued + subscriptionQueued + previewQueued + recovered.affectedRows, accepted };
    });
    if (!lock.acquired) {
      lastRun = { at: now.toISOString(), status: "busy", queued: 0, accepted: 0 };
      return { ran: false, queued: 0, accepted: 0 };
    }
    const value = lock.value ?? { queued: 0, accepted: 0 };
    lastRun = { at: now.toISOString(), status: "ok", ...value };
    return { ran: true, ...value };
  } catch (error) {
    lastRun = { at: now.toISOString(), status: "failed", queued: 0, accepted: 0 };
    console.error("[Account email] automation run failed", { code: sanitizeErrorClass(error) });
    return { ran: false, queued: 0, accepted: 0 };
  }
}

export function scheduleAccountEmailAutomation() {
  if (scheduled) return false;
  cron.schedule("*/15 * * * *", () => { void runAccountEmailAutomation(); });
  scheduled = true;
  return true;
}

export async function startAccountEmailAutomationAfterListen() {
  scheduleAccountEmailAutomation();
  await initializeAccountEmailAutomation();
  void runAccountEmailAutomation();
}
