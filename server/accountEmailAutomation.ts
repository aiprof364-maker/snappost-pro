import cron from "node-cron";
import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { getStripe } from "./stripe";
import { sendAccountEmail, type AccountEmailKind } from "./email";

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
  let queued = 0;
  for (const user of users) {
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

export function buildDueAccountEmailQuery(now: Date) {
  return {
    sql: `SELECT d.id, d.userId, d.recipientEmail, d.entityKey, d.campaignKey, d.kind, d.status, d.attempts, d.firstAttemptAt,
                 COALESCE(d.recipientEmail, u.email) AS email, u.name, u.plan, d.metadata
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

async function deliverOne(connection: PoolConnection, delivery: AccountDeliveryRow, now: Date) {
  if (!delivery.email || (!delivery.userId && delivery.kind !== "contact-owner-alert")) {
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
      plan: delivery.plan,
      trialEndsAt: dates.trialEndsAt,
      renewalAt: dates.renewalAt,
      subscriptionStatus: dates.subscriptionStatus,
      contact,
    }, `snappost:account:${delivery.entityKey}:${delivery.campaignKey}`);
    await connection.execute(
      "UPDATE account_email_delivery SET status = 'accepted', acceptedAt = ?, providerMessageId = ?, nextAttemptAt = NULL, lastErrorClass = NULL WHERE id = ?",
      [now, result.id, delivery.id],
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
      const onboardingQueued = await enqueueOnboarding(connection, now);
      const subscriptionQueued = await enqueueSubscriptionReminders(connection, now);
      const { sql, params } = buildDueAccountEmailQuery(now);
      const [due] = await connection.execute<AccountDeliveryRow[]>(sql, params);
      let accepted = 0;
      for (const delivery of due) if (await deliverOne(connection, delivery, now)) accepted += 1;
      return { queued: onboardingQueued + subscriptionQueued + recovered.affectedRows, accepted };
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
