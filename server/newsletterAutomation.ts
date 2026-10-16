import crypto from "crypto";
import cron from "node-cron";
import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";
import {
  NewsletterSendError,
  sendCronErrorAlert,
  sendNewsletterMessage,
} from "./email";
import {
  NEWSLETTER_AUTOMATION_ENABLED,
  NEWSLETTER_WEEKLY_ISSUES,
} from "./newsletterContent";

const NEWSLETTER_DISPATCH_LOCK_NAME = "snappost_newsletter_dispatch_v1";
const NEWSLETTER_STATE_LOCK_NAME = "snappost_newsletter_state_v1";
const NZ_TIME_ZONE = "Pacific/Auckland";
const MAX_DELIVERIES_PER_RUN = 50;
const MAX_DELIVERY_ATTEMPTS = 5;
const AMBIGUOUS_RETRY_CUTOFF_MS = 23 * 60 * 60 * 1000;
const RETRY_BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 8 * 60 * 60_000];

export type NewsletterKind = "welcome" | "followup" | "weekly";
export type NewsletterDeliveryStatus =
  | "pending"
  | "processing"
  | "retry"
  | "sent"
  | "failed"
  | "uncertain"
  | "cancelled";

export type NewsletterSubscriptionResult = {
  created: boolean;
  subscriberId?: number;
};

export class NewsletterSubscriptionError extends Error {
  constructor(message = "Newsletter subscription could not be saved") {
    super(message);
    this.name = "NewsletterSubscriptionError";
  }
}

interface SubscriberRow extends RowDataPacket {
  id: number;
  status: "active" | "unsubscribed";
  createdAt: Date | string | null;
}

interface StateBackfillRow extends RowDataPacket {
  id: number;
  createdAt: Date | string | null;
}

interface DeliveryRow extends RowDataPacket {
  id: number;
  subscriberId: number;
  campaignKey: string;
  kind: NewsletterKind;
  issueIndex: number | null;
  status: NewsletterDeliveryStatus;
  attempts: number;
  firstAttemptAt: Date | string | null;
  lastAttemptAt: Date | string | null;
  lastErrorClass: string | null;
  ambiguousSince: Date | string | null;
  email: string;
  unsubscribeToken: string;
}

interface ActiveRecipientRow extends RowDataPacket {
  status: "active" | "unsubscribed";
  email: string;
  unsubscribeToken: string;
}

interface LockResult<T> {
  acquired: boolean;
  value?: T;
}

let newsletterPool: Pool | null = null;
let initializationPromise: Promise<boolean> | null = null;
let newsletterReady = false;
let newsletterCronScheduled = false;
let lastNewsletterSendStartedAt = 0;

/** Normalise all public newsletter addresses before the unique lookup. */
export function normalizeNewsletterEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * The content-owned feature flag is the primary kill switch. Tests and local
 * development additionally require an explicit opt-in, so no local process
 * accidentally sends a real message.
 */
export function isNewsletterAutomationEnabled(): boolean {
  if (!NEWSLETTER_AUTOMATION_ENABLED) return false;
  return (
    process.env.NODE_ENV === "production" ||
    process.env.NEWSLETTER_AUTOMATION_TEST_MODE === "true"
  );
}

/** Status intentionally omits subscriber, address, token, and delivery data. */
export function getNewsletterAutomationHealth() {
  return {
    version: "newsletter-v1" as const,
    ready: newsletterReady && Boolean(process.env.RESEND_API_KEY),
    enabled: isNewsletterAutomationEnabled(),
  };
}

function getNewsletterPool(): Pool {
  if (newsletterPool) return newsletterPool;
  if (!process.env.DATABASE_URL) {
    throw new NewsletterSubscriptionError("Newsletter database is not available");
  }

  // This pool is deliberately separate from Drizzle: GET_LOCK is connection
  // scoped, so each worker run keeps one dedicated MySQL connection end-to-end.
  newsletterPool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 4,
    queueLimit: 0,
    enableKeepAlive: true,
    timezone: "Z",
  });
  return newsletterPool;
}

async function ensureNewsletterSchemaOnConnection(connection: PoolConnection | Pool): Promise<void> {
  // New, additive tables only. Existing newsletterSubscribers is never altered.
  await connection.query(`
    CREATE TABLE IF NOT EXISTS newsletter_subscriber_state (
      subscriberId INT NOT NULL,
      unsubscribeToken VARCHAR(128) NOT NULL,
      activationAnchor DATETIME NOT NULL,
      welcomeEligible TINYINT(1) NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (subscriberId),
      UNIQUE KEY newsletter_state_token_uq (unsubscribeToken),
      KEY newsletter_state_anchor_idx (activationAnchor)
    ) ENGINE=InnoDB
  `);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS newsletter_delivery_ledger (
      id INT NOT NULL AUTO_INCREMENT,
      subscriberId INT NOT NULL,
      campaignKey VARCHAR(191) NOT NULL,
      kind VARCHAR(16) NOT NULL,
      issueIndex INT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      attempts INT NOT NULL DEFAULT 0,
      firstAttemptAt DATETIME NULL,
      lastAttemptAt DATETIME NULL,
      nextAttemptAt DATETIME NULL,
      sentAt DATETIME NULL,
      providerMessageId VARCHAR(191) NULL,
      lastErrorClass VARCHAR(32) NULL,
      ambiguousSince DATETIME NULL,
      uncertainAt DATETIME NULL,
      alertedAt DATETIME NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY newsletter_delivery_sub_campaign_uq (subscriberId, campaignKey),
      KEY newsletter_delivery_dispatch_idx (status, nextAttemptAt),
      KEY newsletter_delivery_subscriber_idx (subscriberId)
    ) ENGINE=InnoDB
  `);
}

export async function ensureNewsletterSchema(): Promise<void> {
  await ensureNewsletterSchemaOnConnection(getNewsletterPool());
}

async function withNewsletterLock<T>(
  lockName: string,
  timeoutSeconds: number,
  work: (connection: PoolConnection) => Promise<T>,
): Promise<LockResult<T>> {
  const connection = await getNewsletterPool().getConnection();
  let acquired = false;
  let destroyConnection = false;
  try {
    // Existing timestamps are UTC. Pin every connection that reads/writes them
    // rather than inheriting a Railway or local-server session timezone.
    await connection.query("SET time_zone = '+00:00'");
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT GET_LOCK(?, ?) AS acquired",
      [lockName, timeoutSeconds],
    );
    acquired = Number(rows[0]?.acquired) === 1;
    if (!acquired) return { acquired: false };
    return { acquired: true, value: await work(connection) };
  } finally {
    if (acquired) {
      try {
        const [releaseRows] = await connection.execute<RowDataPacket[]>(
          "SELECT RELEASE_LOCK(?) AS released",
          [lockName],
        );
        if (Number(releaseRows[0]?.released) !== 1) destroyConnection = true;
      } catch {
        // Never return a session that may still own an advisory lock to the pool.
        destroyConnection = true;
      }
    }
    if (destroyConnection) connection.destroy();
    else connection.release();
  }
}

function makeUnsubscribeToken(): string {
  // 32 random bytes encoded URL-safely (43 characters), persisted per subscriber.
  return crypto.randomBytes(32).toString("base64url");
}

function toDate(value: Date | string | null | undefined, fallback: Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

/**
 * Persist a public subscription atomically with its welcome outbox record.
 * Existing active and unsubscribed addresses are intentionally no-ops; a public
 * form must never reactivate an address or reset its automation timeline.
 */
export async function createNewsletterSubscription(emailInput: string): Promise<NewsletterSubscriptionResult> {
  const email = normalizeNewsletterEmail(emailInput);
  if (!email) throw new NewsletterSubscriptionError("Newsletter email is required");

  await ensureNewsletterSchema();
  const lock = await withNewsletterLock(NEWSLETTER_STATE_LOCK_NAME, 10, async connection => {
    await connection.beginTransaction();
    try {
      const [existingRows] = await connection.execute<SubscriberRow[]>(
        "SELECT id, status, createdAt FROM newsletterSubscribers WHERE email = ? LIMIT 1 FOR UPDATE",
        [email],
      );
      if (existingRows.length > 0) {
        await connection.commit();
        return { created: false } satisfies NewsletterSubscriptionResult;
      }

      const [inserted] = await connection.execute<ResultSetHeader>(
        "INSERT INTO newsletterSubscribers (email, status) VALUES (?, ?)",
        [email, "active"],
      );
      const subscriberId = Number(inserted.insertId);
      if (!Number.isSafeInteger(subscriberId) || subscriberId <= 0) {
        throw new NewsletterSubscriptionError("Newsletter subscriber was not persisted");
      }

      const activationAnchor = new Date();
      await connection.execute(
        `INSERT INTO newsletter_subscriber_state
          (subscriberId, unsubscribeToken, activationAnchor, welcomeEligible)
         VALUES (?, ?, ?, ?)`,
        [subscriberId, makeUnsubscribeToken(), activationAnchor, 1],
      );
      await connection.execute(
        `INSERT INTO newsletter_delivery_ledger
          (subscriberId, campaignKey, kind, status, nextAttemptAt)
         VALUES (?, ?, ?, ?, ?)`,
        [subscriberId, "welcome:v1", "welcome", "pending", activationAnchor],
      );
      await connection.commit();
      return { created: true, subscriberId } satisfies NewsletterSubscriptionResult;
    } catch (error) {
      try {
        await connection.rollback();
      } catch {
        // Preserve the original persistence error.
      }
      if (error instanceof NewsletterSubscriptionError) throw error;
      throw new NewsletterSubscriptionError();
    }
  });

  if (!lock.acquired || !lock.value) {
    throw new NewsletterSubscriptionError("Newsletter subscription is temporarily busy");
  }
  return lock.value;
}

async function backfillLegacySubscriberState(connection: PoolConnection): Promise<void> {
  // Subscriber plus state is committed in one transaction. A backfill reader
  // therefore sees either the old committed row or the complete new record,
  // never an in-between new signup to misclassify as legacy.
  for (;;) {
    const [missing] = await connection.execute<StateBackfillRow[]>(
      `SELECT n.id, n.createdAt
       FROM newsletterSubscribers n
       LEFT JOIN newsletter_subscriber_state s ON s.subscriberId = n.id
       WHERE s.subscriberId IS NULL
       ORDER BY n.id ASC
       LIMIT 250`,
    );
    if (missing.length === 0) return;

    for (const subscriber of missing) {
      await connection.execute(
        `INSERT IGNORE INTO newsletter_subscriber_state
          (subscriberId, unsubscribeToken, activationAnchor, welcomeEligible)
         VALUES (?, ?, ?, ?)`,
        [subscriber.id, makeUnsubscribeToken(), toDate(subscriber.createdAt, new Date()), 0],
      );
    }
  }
}

async function prepareNewsletterAutomation(): Promise<void> {
  await ensureNewsletterSchema();
  const lock = await withNewsletterLock(NEWSLETTER_DISPATCH_LOCK_NAME, 10, async connection => {
    await backfillLegacySubscriberState(connection);
  });
  if (!lock.acquired) throw new Error("Newsletter initialization lock was unavailable");
}

/**
 * Schema/backfill initialization is safe with the feature disabled. Startup
 * callers must await this before reporting health as ready; failures are held
 * in health instead of taking down the HTTP server.
 */
export async function initializeNewsletterAutomation(): Promise<boolean> {
  if (initializationPromise) return initializationPromise;
  initializationPromise = prepareNewsletterAutomation()
    .then(() => {
      newsletterReady = true;
      return true;
    })
    .catch(() => {
      newsletterReady = false;
      initializationPromise = null;
      // Do not include database errors: they can contain a connection URL.
      console.error("[Newsletter] automation initialization failed");
      return false;
    });
  return initializationPromise;
}

function nzDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: NZ_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? "";
  return {
    weekday: value("weekday"),
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour")) % 24,
    minute: Number(value("minute")),
  };
}

function isoDateFromUtcMillis(milliseconds: number): string {
  return new Date(milliseconds).toISOString().slice(0, 10);
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function nzCalendarWeek(now: Date): { weekStartMillis: number; weekStart: string } | null {
  const local = nzDateParts(now);
  const weekdayNumber =
    ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<string, number>)[
      local.weekday
    ];
  if (!weekdayNumber) return null;
  const localMidnightAsUtc = Date.UTC(local.year, local.month - 1, local.day);
  const weekStartMillis = localMidnightAsUtc - (weekdayNumber - 1) * 24 * 60 * 60 * 1000;
  return { weekStartMillis, weekStart: isoDateFromUtcMillis(weekStartMillis) };
}

function aucklandLocalDateTimeToUtc(year: number, month: number, day: number, hour: number): Date {
  // 09:00 is deliberately outside Auckland's DST transition hour. Deriving the
  // offset from Intl keeps the Tuesday trigger correct for both NZST and NZDT.
  const guessMillis = Date.UTC(year, month - 1, day, hour);
  const localAtGuess = nzDateParts(new Date(guessMillis));
  const offsetMillis =
    Date.UTC(
      localAtGuess.year,
      localAtGuess.month - 1,
      localAtGuess.day,
      localAtGuess.hour,
      localAtGuess.minute,
    ) - guessMillis;
  return new Date(guessMillis - offsetMillis);
}

/** Exported for deterministic tests of Auckland DST and calendar-week boundaries. */
export function getDueWeeklyCampaign(now: Date, acceptedWeeklyCount = 0):
  | { campaignKey: string; issueIndex: number; weekStart: string; scheduledAt: Date }
  | null {
  const local = nzDateParts(now);
  const weekdayNumber =
    ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<string, number>)[
      local.weekday
    ];
  if (!weekdayNumber || weekdayNumber === 1) {
    return null;
  }

  // Sunday-through-Tuesday-after-09:00 all belong to the same ISO-style NZ
  // calendar week. The date arithmetic is calendar-only, so DST cannot shift it.
  const week = nzCalendarWeek(now);
  if (!week) return null;
  const { weekStartMillis, weekStart } = week;
  const issueCount = NEWSLETTER_WEEKLY_ISSUES.length;
  if (issueCount < 1) return null;

  const tuesday = new Date(weekStartMillis + 24 * 60 * 60 * 1000);
  const scheduledAt = aucklandLocalDateTimeToUtc(
    tuesday.getUTCFullYear(),
    tuesday.getUTCMonth() + 1,
    tuesday.getUTCDate(),
    9,
  );
  if (now.getTime() < scheduledAt.getTime()) return null;

  const accepted = Math.max(0, Math.floor(acceptedWeeklyCount));
  const issueIndex = mod(accepted, issueCount);
  return {
    weekStart,
    issueIndex,
    // Unique per recipient and calendar week, even after acceptedCount advances.
    campaignKey: `weekly:v1:${weekStart}`,
    scheduledAt,
  };
}

async function cancelUnsubscribedDeliveries(connection: PoolConnection): Promise<void> {
  await connection.execute(
    `UPDATE newsletter_delivery_ledger d
     INNER JOIN newsletterSubscribers n ON n.id = d.subscriberId
     SET d.status = ?
     WHERE n.status <> ? AND d.status IN (?, ?, ?)`,
    ["cancelled", "active", "pending", "retry", "processing"],
  );
}

async function recoverAbandonedProcessing(connection: PoolConnection, now: Date): Promise<void> {
  // Once the dispatch lock is acquired, no previous worker remains live. A
  // processing record therefore has an unknown provider outcome and must keep
  // its ambiguity anchor even if a later response is a known rejection.
  await connection.execute(
    `UPDATE newsletter_delivery_ledger
     SET status = ?, nextAttemptAt = ?, lastErrorClass = COALESCE(lastErrorClass, ?),
         firstAttemptAt = COALESCE(firstAttemptAt, lastAttemptAt, ?),
         ambiguousSince = COALESCE(ambiguousSince, firstAttemptAt, lastAttemptAt, ?)
     WHERE status = ?`,
    ["retry", now, "ambiguous", now, now, "processing"],
  );
}

async function expireStaleWeeklyDeliveries(connection: PoolConnection, now: Date): Promise<void> {
  const week = nzCalendarWeek(now);
  if (!week) return;
  const weekExpression = "SUBSTRING_INDEX(SUBSTRING_INDEX(campaignKey, ':', 3), ':', -1)";
  // An ambiguous previous-week provider outcome can never be retried safely in
  // a later issue window; hold it for owner review instead of resending it.
  await connection.execute(
    `UPDATE newsletter_delivery_ledger
     SET status = ?, uncertainAt = COALESCE(uncertainAt, ?), nextAttemptAt = NULL
     WHERE kind = ? AND status IN (?, ?)
       AND ambiguousSince IS NOT NULL AND ${weekExpression} < ?`,
    ["uncertain", now, "weekly", "pending", "retry", week.weekStart],
  );
  // Known-unaccepted prior-week issues are not catch-up emails. Cancel them so
  // the following Tuesday can reserve the next valid campaign exactly once.
  await connection.execute(
    `UPDATE newsletter_delivery_ledger
     SET status = ?, nextAttemptAt = NULL
     WHERE kind = ? AND status IN (?, ?)
       AND ambiguousSince IS NULL AND ${weekExpression} < ?`,
    ["cancelled", "weekly", "pending", "retry", week.weekStart],
  );
  const [held] = await connection.execute<RowDataPacket[]>(
    "SELECT id FROM newsletter_delivery_ledger WHERE status = ? AND alertedAt IS NULL LIMIT 50",
    ["uncertain"],
  );
  for (const delivery of held) {
    await alertOnce(connection, Number(delivery.id), "uncertain provider acceptance requires review", now);
  }
}

async function enqueueWelcomeDeliveries(
  connection: PoolConnection,
  now: Date,
  subscriberId?: number,
): Promise<void> {
  const params: Array<string | number | Date> = ["active"];
  const subscriberClause = subscriberId ? " AND s.subscriberId = ?" : "";
  if (subscriberId) params.push(subscriberId);
  const [subscribers] = await connection.execute<RowDataPacket[]>(
    `SELECT s.subscriberId
     FROM newsletter_subscriber_state s
     INNER JOIN newsletterSubscribers n ON n.id = s.subscriberId
     WHERE n.status = ? AND LOWER(n.email) NOT LIKE '%@example.com'
       AND s.welcomeEligible = 1${subscriberClause}`,
    params,
  );
  for (const subscriber of subscribers) {
    await connection.execute(
      `INSERT IGNORE INTO newsletter_delivery_ledger
       (subscriberId, campaignKey, kind, status, nextAttemptAt)
       VALUES (?, ?, ?, ?, ?)`,
      [subscriber.subscriberId, "welcome:v1", "welcome", "pending", now],
    );
  }
}

async function enqueueFollowupDeliveries(
  connection: PoolConnection,
  now: Date,
  subscriberId?: number,
): Promise<void> {
  const dueAt = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  const params: Array<string | number | Date> = ["active", dueAt, "welcome:v1", "sent"];
  const subscriberClause = subscriberId ? " AND s.subscriberId = ?" : "";
  if (subscriberId) params.push(subscriberId);
  const [subscribers] = await connection.execute<RowDataPacket[]>(
    `SELECT s.subscriberId
     FROM newsletter_subscriber_state s
     INNER JOIN newsletterSubscribers n ON n.id = s.subscriberId
     WHERE n.status = ?
       AND LOWER(n.email) NOT LIKE '%@example.com'
       AND s.activationAnchor <= ?
       AND (
         s.welcomeEligible = 0 OR EXISTS (
           SELECT 1 FROM newsletter_delivery_ledger w
           WHERE w.subscriberId = s.subscriberId
             AND w.campaignKey = ?
             AND w.status = ?
         )
       )${subscriberClause}`,
    params,
  );
  for (const subscriber of subscribers) {
    await connection.execute(
      `INSERT IGNORE INTO newsletter_delivery_ledger
       (subscriberId, campaignKey, kind, status, nextAttemptAt)
       VALUES (?, ?, ?, ?, ?)`,
      [subscriber.subscriberId, "followup:v1", "followup", "pending", now],
    );
  }
}

async function enqueueWeeklyDeliveries(
  connection: PoolConnection,
  now: Date,
  subscriberId?: number,
): Promise<void> {
  const weekly = getDueWeeklyCampaign(now);
  if (!weekly) return;

  const followupCutoff = new Date(weekly.scheduledAt.getTime() - 4 * 24 * 60 * 60 * 1000);
  const subscriberClause = subscriberId ? " AND s.subscriberId = ?" : "";
  const [subscribers] = await connection.execute<RowDataPacket[]>(
    `SELECT s.subscriberId,
       (SELECT COUNT(*) FROM newsletter_delivery_ledger a
        WHERE a.subscriberId = s.subscriberId AND a.kind = 'weekly' AND a.status = 'sent') AS acceptedCount
     FROM newsletter_subscriber_state s
     INNER JOIN newsletterSubscribers n ON n.id = s.subscriberId
     INNER JOIN newsletter_delivery_ledger f
       ON f.subscriberId = s.subscriberId
      AND f.campaignKey = ?
      AND f.status = ?
      AND f.sentAt <= ?
     WHERE n.status = ?
       AND LOWER(n.email) NOT LIKE '%@example.com'
       AND NOT EXISTS (
         SELECT 1 FROM newsletter_delivery_ledger p
         WHERE p.subscriberId = s.subscriberId AND p.kind = 'weekly'
           AND p.status IN ('pending','retry','processing','uncertain')
       )
       AND NOT EXISTS (
         SELECT 1 FROM newsletter_delivery_ledger recent
         WHERE recent.subscriberId = s.subscriberId AND recent.kind = 'weekly'
           AND recent.status = 'sent' AND recent.sentAt > ?
       )${subscriberClause}`,
    ["followup:v1", "sent", followupCutoff, "active", followupCutoff, ...(subscriberId ? [subscriberId] : [])],
  );
  for (const subscriber of subscribers) {
    const recipientWeekly = getDueWeeklyCampaign(now, Number(subscriber.acceptedCount));
    if (!recipientWeekly) continue;
    await connection.execute(
      `INSERT IGNORE INTO newsletter_delivery_ledger
       (subscriberId, campaignKey, kind, issueIndex, status, nextAttemptAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        subscriber.subscriberId,
        recipientWeekly.campaignKey,
        "weekly",
        recipientWeekly.issueIndex,
        "pending",
        now,
      ],
    );
  }
}

async function markTooOldAmbiguousUncertain(
  connection: PoolConnection,
  delivery: DeliveryRow,
  now: Date,
): Promise<void> {
  const [updated] = await connection.execute<ResultSetHeader>(
    `UPDATE newsletter_delivery_ledger
     SET status = ?, uncertainAt = ?, nextAttemptAt = NULL
     WHERE id = ? AND status IN (?, ?)`,
    ["uncertain", now, delivery.id, "pending", "retry"],
  );
  if (updated.affectedRows > 0) {
    await alertOnce(connection, delivery.id, "ambiguous delivery requires owner review", now);
  }
}

async function selectDueDeliveries(
  connection: PoolConnection,
  now: Date,
  subscriberId?: number,
): Promise<DeliveryRow[]> {
  const subscriberClause = subscriberId ? " AND d.subscriberId = ?" : "";
  const params: Array<string | number | Date> = [
    "active",
    "pending",
    "retry",
    now,
    ...(subscriberId ? [subscriberId] : []),
    MAX_DELIVERIES_PER_RUN,
  ];
  const [rows] = await connection.execute<DeliveryRow[]>(
    `SELECT d.id, d.subscriberId, d.campaignKey, d.kind, d.issueIndex, d.status,
            d.attempts, d.firstAttemptAt, d.lastAttemptAt, d.lastErrorClass, d.ambiguousSince,
            n.email, s.unsubscribeToken
     FROM newsletter_delivery_ledger d
     INNER JOIN newsletterSubscribers n ON n.id = d.subscriberId
     INNER JOIN newsletter_subscriber_state s ON s.subscriberId = d.subscriberId
     WHERE n.status = ?
       AND LOWER(n.email) NOT LIKE '%@example.com'
       AND d.status IN (?, ?)
       AND (d.nextAttemptAt IS NULL OR d.nextAttemptAt <= ?)${subscriberClause}
     ORDER BY CASE d.kind WHEN 'welcome' THEN 1 WHEN 'followup' THEN 2 ELSE 3 END,
              d.createdAt ASC
     LIMIT ?`,
    params,
  );
  return rows;
}

function unsubscribeUrl(token: string): string {
  // newsletterContent validates this first-party HTTPS origin before rendering.
  const url = new URL("/api/newsletter/unsubscribe", "https://snappostpro.com");
  url.searchParams.set("token", token);
  return url.toString();
}

async function throttleNewsletterSend(): Promise<void> {
  const waitMs = Math.max(0, lastNewsletterSendStartedAt + 1000 - Date.now());
  if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
  lastNewsletterSendStartedAt = Date.now();
}

class KnownNewsletterProviderFailure extends Error {
  constructor() {
    super("Newsletter provider rejected the request");
    this.name = "KnownNewsletterProviderFailure";
  }
}

function acceptedProviderMessageId(result: unknown): string {
  const candidate = result as {
    id?: unknown;
    data?: { id?: unknown };
    error?: unknown;
  };
  // Resend's HTTP-resolved error shape must not be recorded as a send.
  if (candidate?.error) throw new KnownNewsletterProviderFailure();
  const id = candidate?.id ?? candidate?.data?.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new KnownNewsletterProviderFailure();
  }
  return id;
}

function errorClass(error: unknown): { type: "known" | "ambiguous"; permanent: boolean } {
  if (error instanceof NewsletterSendError) {
    return {
      type: error.ambiguous ? "ambiguous" : "known",
      permanent: error.permanent,
    };
  }
  if (error instanceof KnownNewsletterProviderFailure) {
    return { type: "known", permanent: false };
  }
  const response = error as { status?: unknown; statusCode?: unknown; response?: { status?: unknown } };
  const status = Number(response?.status ?? response?.statusCode ?? response?.response?.status);
  // A provider HTTP response is a known rejection. Transport exceptions (such
  // as a timeout after request bytes were sent) remain ambiguous.
  return {
    type: Number.isFinite(status) && status >= 400 ? "known" : "ambiguous",
    permanent: Number.isFinite(status) && status >= 400 && status < 500 && status !== 429,
  };
}

async function alertOnce(
  connection: PoolConnection,
  deliveryId: number,
  reason: string,
  now: Date,
): Promise<void> {
  const [claimed] = await connection.execute<ResultSetHeader>(
    `UPDATE newsletter_delivery_ledger
     SET alertedAt = ?
     WHERE id = ? AND alertedAt IS NULL`,
    [now, deliveryId],
  );
  if (claimed.affectedRows !== 1) return;
  try {
    await throttleNewsletterSend();
    // Keep alert text deliberately non-identifying. Owner can inspect the DB
    // ledger by id; logs and alert mail never receive an address or token.
    await sendCronErrorAlert(
      "newsletter-automation",
      `Newsletter delivery ${deliveryId} needs review: ${reason}.`,
      now,
    );
  } catch {
    // alertedAt is intentionally retained: alerts must not repeat forever.
    console.error("[Newsletter] owner alert delivery failed");
  }
}

async function recordDeliveryFailure(
  connection: PoolConnection,
  delivery: DeliveryRow,
  failure: { type: "known" | "ambiguous"; permanent: boolean },
  now: Date,
): Promise<void> {
  const attempts = delivery.attempts + 1;
  const hasAmbiguity = Boolean(delivery.ambiguousSince) || failure.type === "ambiguous";
  const ambiguityAnchor = hasAmbiguity ? toDate(delivery.firstAttemptAt, now) : null;
  if (failure.permanent || attempts >= MAX_DELIVERY_ATTEMPTS) {
    await connection.execute(
      `UPDATE newsletter_delivery_ledger
       SET status = ?, lastErrorClass = ?, nextAttemptAt = NULL,
           ambiguousSince = COALESCE(ambiguousSince, ?),
           uncertainAt = ?
       WHERE id = ?`,
      [hasAmbiguity ? "uncertain" : "failed", failure.type, ambiguityAnchor, hasAmbiguity ? now : null, delivery.id],
    );
    await alertOnce(
      connection,
      delivery.id,
      failure.permanent ? "permanent provider rejection" : "maximum retry attempts reached",
      now,
    );
    return;
  }

  const delay = RETRY_BACKOFF_MS[Math.min(attempts - 1, RETRY_BACKOFF_MS.length - 1)];
  await connection.execute(
    `UPDATE newsletter_delivery_ledger
     SET status = ?, lastErrorClass = ?, nextAttemptAt = ?,
         ambiguousSince = COALESCE(ambiguousSince, ?)
     WHERE id = ?`,
    ["retry", failure.type, new Date(now.getTime() + delay), ambiguityAnchor, delivery.id],
  );
}

async function deliverOne(
  connection: PoolConnection,
  delivery: DeliveryRow,
  now: Date,
): Promise<boolean> {
  const firstAttempt = toDate(delivery.firstAttemptAt, toDate(delivery.lastAttemptAt, now));
  if (
    delivery.ambiguousSince &&
    now.getTime() - firstAttempt.getTime() >= AMBIGUOUS_RETRY_CUTOFF_MS
  ) {
    await markTooOldAmbiguousUncertain(connection, delivery, now);
    return false;
  }

  const [claimed] = await connection.execute<ResultSetHeader>(
    `UPDATE newsletter_delivery_ledger
     SET status = ?, attempts = attempts + 1, lastAttemptAt = ?,
         firstAttemptAt = COALESCE(firstAttemptAt, ?)
     WHERE id = ? AND status IN (?, ?)`,
    ["processing", now, now, delivery.id, "pending", "retry"],
  );
  if (claimed.affectedRows !== 1) return false;

  await throttleNewsletterSend();
  // Re-read status immediately before the provider request so a queued retry
  // cannot send after a committed unsubscribe, including during throttle waits.
  const [recipients] = await connection.execute<ActiveRecipientRow[]>(
    `SELECT n.status, n.email, s.unsubscribeToken
     FROM newsletterSubscribers n
     INNER JOIN newsletter_subscriber_state s ON s.subscriberId = n.id
     WHERE n.id = ? LIMIT 1`,
    [delivery.subscriberId],
  );
  const recipient = recipients[0];
  if (!recipient || recipient.status !== "active" || recipient.email.toLowerCase().endsWith("@example.com")) {
    await connection.execute(
      "UPDATE newsletter_delivery_ledger SET status = ? WHERE id = ?",
      ["cancelled", delivery.id],
    );
    return false;
  }

  try {
    const providerResult = await sendNewsletterMessage({
      email: recipient.email,
      unsubscribeUrl: unsubscribeUrl(recipient.unsubscribeToken),
      kind: delivery.kind,
      ...(delivery.kind === "weekly" && delivery.issueIndex !== null
        ? { issueIndex: delivery.issueIndex }
        : {}),
      idempotencyKey: `snappost:${delivery.subscriberId}:${delivery.campaignKey}`,
    });
    const providerMessageId = acceptedProviderMessageId(providerResult);
    await connection.execute(
      `UPDATE newsletter_delivery_ledger
       SET status = ?, sentAt = ?, providerMessageId = ?, nextAttemptAt = NULL,
           lastErrorClass = NULL
       WHERE id = ?`,
      ["sent", now, providerMessageId, delivery.id],
    );
    return true;
  } catch (error) {
    await recordDeliveryFailure(connection, delivery, errorClass(error), now);
    return false;
  }
}

export type NewsletterRunResult = {
  ran: boolean;
  sent: number;
};

/**
 * Run the durable outbox. It holds one MySQL advisory lock across enqueue and
 * send work, making Railway replicas and overlapping deploys cooperative.
 */
export async function runNewsletterAutomation(options: {
  now?: Date;
  subscriberId?: number;
  } = {}): Promise<NewsletterRunResult> {
  if (!isNewsletterAutomationEnabled()) return { ran: false, sent: 0 };
  if (!process.env.RESEND_API_KEY) return { ran: false, sent: 0 };
  if (!newsletterReady && !(await initializeNewsletterAutomation())) {
    return { ran: false, sent: 0 };
  }

  const now = options.now ?? new Date();
  try {
    const lock = await withNewsletterLock(NEWSLETTER_DISPATCH_LOCK_NAME, 0, async connection => {
      await backfillLegacySubscriberState(connection);
      await cancelUnsubscribedDeliveries(connection);
      await recoverAbandonedProcessing(connection, now);
      await expireStaleWeeklyDeliveries(connection, now);
      await enqueueWelcomeDeliveries(connection, now, options.subscriberId);
      await enqueueFollowupDeliveries(connection, now, options.subscriberId);
      await enqueueWeeklyDeliveries(connection, now, options.subscriberId);

      let sent = 0;
      const due = await selectDueDeliveries(connection, now, options.subscriberId);
      for (const delivery of due) {
        if (await deliverOne(connection, delivery, now)) sent += 1;
      }
      return sent;
    });
    if (!lock.acquired) return { ran: false, sent: 0 };
    return { ran: true, sent: lock.value ?? 0 };
  } catch {
    // No provider/DB error object here: errors can expose provider details.
    console.error("[Newsletter] automation run failed");
    return { ran: false, sent: 0 };
  }
}

/** Attempt the persisted welcome immediately; a failed delivery remains queued. */
export async function attemptImmediateNewsletterWelcome(subscriberId: number): Promise<void> {
  if (!isNewsletterAutomationEnabled()) return;
  await runNewsletterAutomation({ subscriberId });
}

/** Validate an opaque unsubscribe token without returning subscriber metadata. */
export async function isValidNewsletterUnsubscribeToken(token: string): Promise<boolean> {
  if (!token || token.length < 32) return false;
  await ensureNewsletterSchema();
  const [rows] = await getNewsletterPool().execute<RowDataPacket[]>(
    "SELECT 1 AS valid FROM newsletter_subscriber_state WHERE unsubscribeToken = ? LIMIT 1",
    [token],
  );
  return rows.length > 0;
}

/** Mark a token-matched subscriber and every queued campaign as unsubscribed. */
export async function unsubscribeNewsletterByToken(token: string): Promise<boolean> {
  if (!token || token.length < 32) return false;
  await ensureNewsletterSchema();
  const lock = await withNewsletterLock(NEWSLETTER_STATE_LOCK_NAME, 10, async connection => {
    await connection.beginTransaction();
    try {
      const [matched] = await connection.execute<RowDataPacket[]>(
        "SELECT subscriberId FROM newsletter_subscriber_state WHERE unsubscribeToken = ? LIMIT 1 FOR UPDATE",
        [token],
      );
      const subscriberId = Number(matched[0]?.subscriberId);
      if (!Number.isSafeInteger(subscriberId) || subscriberId <= 0) {
        await connection.rollback();
        return false;
      }
      await connection.execute(
        "UPDATE newsletterSubscribers SET status = ? WHERE id = ?",
        ["unsubscribed", subscriberId],
      );
      await connection.execute(
        `UPDATE newsletter_delivery_ledger
         SET status = ?
         WHERE subscriberId = ? AND status IN (?, ?, ?)`,
        ["cancelled", subscriberId, "pending", "retry", "processing"],
      );
      await connection.commit();
      return true;
    } catch {
      try {
        await connection.rollback();
      } catch {
        // Preserve the safe failure result.
      }
      throw new NewsletterSubscriptionError("Newsletter unsubscribe could not be saved");
    }
  });
  if (!lock.acquired) throw new NewsletterSubscriptionError("Newsletter unsubscribe is temporarily busy");
  return Boolean(lock.value);
}

/** Compatibility path for internal/admin callers; public routes always use tokens. */
export async function unsubscribeNewsletterByEmail(emailInput: string): Promise<void> {
  const email = normalizeNewsletterEmail(emailInput);
  if (!email) return;
  await ensureNewsletterSchema();
  const lock = await withNewsletterLock(NEWSLETTER_STATE_LOCK_NAME, 10, async connection => {
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM newsletterSubscribers WHERE email = ? LIMIT 1",
      [email],
    );
    const subscriberId = Number(rows[0]?.id);
    if (!Number.isSafeInteger(subscriberId) || subscriberId <= 0) return;
    await connection.beginTransaction();
    try {
      await connection.execute("UPDATE newsletterSubscribers SET status = ? WHERE id = ?", ["unsubscribed", subscriberId]);
      await connection.execute(
        `UPDATE newsletter_delivery_ledger SET status = ?
         WHERE subscriberId = ? AND status IN (?, ?, ?)`,
        ["cancelled", subscriberId, "pending", "retry", "processing"],
      );
      await connection.commit();
    } catch (error) {
      try {
        await connection.rollback();
      } catch {
        // Preserve the persistence error for the caller.
      }
      throw error;
    }
  });
  if (!lock.acquired) throw new NewsletterSubscriptionError("Newsletter unsubscribe is temporarily busy");
}

/** Schedule native 15-minute ticks only after startup initialization succeeds. */
export function scheduleNewsletterAutomation(): boolean {
  if (!isNewsletterAutomationEnabled() || newsletterCronScheduled) return false;
  cron.schedule("*/15 * * * *", () => {
    void runNewsletterAutomation();
  });
  newsletterCronScheduled = true;
  return true;
}

/** Called after HTTP listen: initialise safely, schedule, then run catch-up. */
export async function startNewsletterAutomationAfterListen(): Promise<void> {
  // A transient first-start schema failure must recover on a later tick.
  scheduleNewsletterAutomation();
  const initialized = await initializeNewsletterAutomation();
  if (!initialized || !isNewsletterAutomationEnabled()) return;
  void runNewsletterAutomation();
}
