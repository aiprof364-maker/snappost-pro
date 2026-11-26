import { createHash, randomBytes } from "crypto";
import { and, desc, eq, gt, gte, isNull, lt, or, sql } from "drizzle-orm";
import { previewDrafts, posts, users } from "../drizzle/schema";
import { type PlanId } from "@shared/const";
import { carryPreviewBrand } from "@shared/previewHandoff";
import { postCreationLimit } from "@shared/referrals";
import { getDb } from "./db";
import { PREVIEW_REMINDER_HOLD_MS } from "./previewReminderEmail";
import { storageDelete } from "./storage";

const PREVIEW_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_EXPIRED_PREVIEWS_PER_CLEANUP = 25;
let previewSchemaPromise: Promise<void> | null = null;

export type PreviewLanding = "contractors" | "hairdressers" | undefined;

export class PreviewDraftError extends Error {
  code: "free_limit" | "plan_limit" | "unavailable";

  constructor(
    message: string,
    code: "free_limit" | "plan_limit" | "unavailable" = "unavailable",
  ) {
    super(message);
    this.name = "PreviewDraftError";
    this.code = code;
  }
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** The original browser token and a later reminder token both open one draft. */
function previewAccessMatch(token: string) {
  const hash = tokenHash(token);
  return or(
    eq(previewDrafts.tokenHash, hash),
    eq(previewDrafts.reminderTokenHash, hash)
  );
}

/** Stable key for anonymous conversion events. The raw preview token is never stored. */
export function anonymousPreviewDedupeKey(token: string) {
  return tokenHash(token);
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function usageStartForPlan(plan: "free" | PlanId): Date {
  return plan === "free" ? new Date(0) : startOfMonth();
}

function publicPreviewFields(draft: typeof previewDrafts.$inferSelect) {
  return {
    landing: draft.landing,
    originalImageUrl: draft.originalImageUrl,
    brandedImageUrl: draft.brandedImageUrl,
    hasWatermark: Boolean(
      draft.cleanImageKey && draft.cleanImageKey !== draft.brandedImageKey
    ),
    hasLogo: Boolean(draft.logoImageKey),
    businessName: draft.businessName ?? null,
    suburb: draft.suburb ?? null,
    caption: draft.caption,
    expiresAt: draft.expiresAt,
  };
}

/**
 * mysql2 hands Drizzle the driver tuple `[ResultSetHeader, fields]`.
 * Reading affectedRows only on the outer object treats every update as 0,
 * so a claim rolls back after it has already stamped the preview.
 */
export function mysqlAffectedRows(result: unknown): number {
  if (Array.isArray(result)) return mysqlAffectedRows(result[0]);
  if (
    result &&
    typeof result === "object" &&
    "affectedRows" in result &&
    typeof result.affectedRows === "number"
  ) {
    return result.affectedRows;
  }
  return 0;
}

/**
 * Railway starts the application process directly rather than a migration
 * command. This additive, idempotent DDL guarantees the new preview route is
 * never live against a database missing its only new table.
 */
export async function ensurePreviewDraftSchema() {
  if (previewSchemaPromise) return previewSchemaPromise;
  previewSchemaPromise = (async () => {
    const db = await getDb();
    if (!db) {
      throw new PreviewDraftError(
        "Preview storage is temporarily unavailable."
      );
    }
    await db.execute(
      sql.raw(`
      CREATE TABLE IF NOT EXISTS preview_drafts (
        id INT NOT NULL AUTO_INCREMENT,
        tokenHash VARCHAR(64) NOT NULL,
        landing VARCHAR(32) NULL,
        originalImageKey VARCHAR(256) NOT NULL,
        originalImageUrl VARCHAR(512) NOT NULL,
        logoImageKey VARCHAR(256) NULL,
        brandedImageKey VARCHAR(256) NOT NULL,
        brandedImageUrl VARCHAR(512) NOT NULL,
        caption TEXT NOT NULL,
        businessName VARCHAR(80) NULL,
        suburb VARCHAR(60) NULL,
        emailRequestedAt TIMESTAMP NULL,
        userId INT NULL,
        postId INT NULL,
        claimedAt TIMESTAMP NULL,
        expiresAt TIMESTAMP NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY preview_drafts_token_hash_uq (tokenHash),
        KEY preview_drafts_expiry_idx (expiresAt)
      ) ENGINE=InnoDB
    `)
    );
    // The first version required a logo. Keep an already deployed table in
    // sync so a visitor can now save a photo-only preview too.
    await db.execute(
      sql.raw(
        "ALTER TABLE preview_drafts MODIFY COLUMN logoImageKey VARCHAR(256) NULL"
      )
    );
    await ensurePreviewColumn(
      db,
      "ALTER TABLE preview_drafts ADD COLUMN businessName VARCHAR(80) NULL"
    );
    await ensurePreviewColumn(
      db,
      "ALTER TABLE preview_drafts ADD COLUMN suburb VARCHAR(60) NULL"
    );
    await ensurePreviewColumn(
      db,
      "ALTER TABLE preview_drafts ADD COLUMN cleanImageKey VARCHAR(256) NULL"
    );
    await ensurePreviewColumn(
      db,
      "ALTER TABLE preview_drafts ADD COLUMN cleanImageUrl VARCHAR(512) NULL"
    );
    await ensurePreviewColumn(
      db,
      "ALTER TABLE preview_drafts ADD COLUMN requestedEmail VARCHAR(320) NULL"
    );
    await ensurePreviewColumn(
      db,
      "ALTER TABLE preview_drafts ADD COLUMN reminderTokenHash VARCHAR(64) NULL"
    );
    await ensurePreviewIndex(
      db,
      "CREATE INDEX preview_drafts_requested_email_idx ON preview_drafts (requestedEmail, emailRequestedAt)"
    );
    await ensurePreviewIndex(
      db,
      "CREATE UNIQUE INDEX preview_drafts_reminder_token_uq ON preview_drafts (reminderTokenHash)"
    );
    // Same boot-time pattern as the referral columns: the daily cap table and
    // anonymous conversion events must exist even if migration 0013 has not run.
    await db.execute(
      sql.raw(`
      CREATE TABLE IF NOT EXISTS preview_daily_usage (
        day VARCHAR(10) NOT NULL,
        count INT NOT NULL,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (day)
      ) ENGINE=InnoDB
    `)
    );
    await db.execute(
      sql.raw("ALTER TABLE conversion_events MODIFY COLUMN userId INT NULL")
    );
  })().catch(error => {
    previewSchemaPromise = null;
    throw error;
  });
  return previewSchemaPromise;
}

function isDuplicateIndex(error: unknown) {
  const messages: string[] = [];
  const codes: Array<string | number | undefined> = [];
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth++) {
    if (current instanceof Error) messages.push(current.message);
    if (typeof current === "object") {
      const record = current as {
        code?: string;
        errno?: number;
        cause?: unknown;
      };
      codes.push(record.code, record.errno);
      current = record.cause;
      continue;
    }
    break;
  }
  return (
    codes.includes(1061) ||
    codes.includes("ER_DUP_KEYNAME") ||
    messages.some(message => /duplicate key name/i.test(message))
  );
}

/** Additive index for databases created before reminder lookups. */
async function ensurePreviewIndex(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  statement: string
) {
  try {
    await db.execute(sql.raw(statement));
  } catch (error) {
    if (isDuplicateIndex(error)) return;
    throw error;
  }
}

function isDuplicateColumn(error: unknown) {
  const messages: string[] = [];
  const codes: Array<string | number | undefined> = [];
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth++) {
    if (current instanceof Error) messages.push(current.message);
    if (typeof current === "object") {
      const record = current as {
        code?: string;
        errno?: number;
        cause?: unknown;
      };
      codes.push(record.code, record.errno);
      current = record.cause;
      continue;
    }
    break;
  }
  return (
    codes.includes(1060) ||
    codes.includes("ER_DUP_FIELDNAME") ||
    messages.some(message => /duplicate column/i.test(message))
  );
}

/** Additive column for databases created before business name and suburb. */
async function ensurePreviewColumn(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  statement: string
) {
  try {
    await db.execute(sql.raw(statement));
  } catch (error) {
    if (isDuplicateColumn(error)) return;
    throw error;
  }
}

/** Store the anonymous preview with a random token that is never persisted raw. */
export async function createPreviewDraft(input: {
  landing?: PreviewLanding;
  originalImageKey: string;
  originalImageUrl: string;
  logoImageKey?: string | null;
  brandedImageKey: string;
  brandedImageUrl: string;
  cleanImageKey?: string | null;
  cleanImageUrl?: string | null;
  caption: string;
  businessName?: string;
  suburb?: string;
}) {
  await ensurePreviewDraftSchema();
  const db = await getDb();
  if (!db)
    throw new PreviewDraftError("Preview storage is temporarily unavailable.");

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS);
  await db.insert(previewDrafts).values({
    tokenHash: tokenHash(token),
    landing: input.landing ?? null,
    originalImageKey: input.originalImageKey,
    originalImageUrl: input.originalImageUrl,
    logoImageKey: input.logoImageKey,
    brandedImageKey: input.brandedImageKey,
    brandedImageUrl: input.brandedImageUrl,
    cleanImageKey: input.cleanImageKey ?? null,
    cleanImageUrl: input.cleanImageUrl ?? null,
    caption: input.caption,
    businessName: input.businessName ?? null,
    suburb: input.suburb ?? null,
    expiresAt,
  });

  return {
    token,
    ...publicPreviewFields({
      landing: input.landing ?? null,
      originalImageUrl: input.originalImageUrl,
      logoImageKey: input.logoImageKey ?? null,
      brandedImageKey: input.brandedImageKey,
      brandedImageUrl: input.brandedImageUrl,
      cleanImageKey: input.cleanImageKey ?? null,
      businessName: input.businessName ?? null,
      suburb: input.suburb ?? null,
      caption: input.caption,
      expiresAt,
    } as typeof previewDrafts.$inferSelect),
  };
}

/** Return a still-active, unclaimed preview using only its opaque token. */
export async function getPublicPreviewDraft(token: string) {
  if (token.length < 32) return null;
  await ensurePreviewDraftSchema();
  const db = await getDb();
  if (!db)
    throw new PreviewDraftError("Preview storage is temporarily unavailable.");

  const [draft] = await db
    .select()
    .from(previewDrafts)
    .where(
      and(
        previewAccessMatch(token),
        isNull(previewDrafts.userId),
        gt(previewDrafts.expiresAt, new Date())
      )
    )
    .limit(1);

  return draft ? publicPreviewFields(draft) : null;
}

/** Save a visitor caption edit before the secure email-link handoff. */
export async function updatePublicPreviewCaption(input: {
  token: string;
  caption: string;
}) {
  await ensurePreviewDraftSchema();
  const db = await getDb();
  if (!db)
    throw new PreviewDraftError("Preview storage is temporarily unavailable.");

  const result = await db
    .update(previewDrafts)
    .set({ caption: input.caption })
    .where(
      and(
        previewAccessMatch(input.token),
        isNull(previewDrafts.userId),
        gt(previewDrafts.expiresAt, new Date())
      )
    );
  if (mysqlAffectedRows(result) !== 1) {
    throw new PreviewDraftError(
      "This preview has expired. Please create a new one."
    );
  }
  return { success: true } as const;
}

/**
 * Record the address that asked to save this preview.
 * The first request starts the reminder clock. Later requests keep that clock
 * and can correct the address. The photo stays available through the day-3 link.
 */
export async function markPreviewEmailRequested(token: string, email: string) {
  await ensurePreviewDraftSchema();
  const db = await getDb();
  if (!db)
    throw new PreviewDraftError("Preview storage is temporarily unavailable.");
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new PreviewDraftError("Preview storage is temporarily unavailable.");
  }

  const [existing] = await db
    .select({
      id: previewDrafts.id,
      emailRequestedAt: previewDrafts.emailRequestedAt,
      expiresAt: previewDrafts.expiresAt,
    })
    .from(previewDrafts)
    .where(
      and(
        previewAccessMatch(token),
        isNull(previewDrafts.userId),
        gt(previewDrafts.expiresAt, new Date())
      )
    )
    .limit(1);
  if (!existing) {
    throw new PreviewDraftError(
      "This preview has expired. Please create a new one."
    );
  }

  const holdUntil = new Date(Date.now() + PREVIEW_REMINDER_HOLD_MS);
  const currentExpiry = new Date(existing.expiresAt).getTime();
  const result = await db
    .update(previewDrafts)
    .set({
      emailRequestedAt: existing.emailRequestedAt ?? new Date(),
      requestedEmail: normalized,
      expiresAt: new Date(Math.max(currentExpiry, holdUntil.getTime())),
    })
    .where(
      and(eq(previewDrafts.id, existing.id), isNull(previewDrafts.userId))
    );
  if (mysqlAffectedRows(result) !== 1) {
    throw new PreviewDraftError(
      "This preview has expired. Please create a new one."
    );
  }
}

/**
 * Add a fresh access token for a reminder email without invalidating the
 * original link. Returns null when the draft was already claimed or expired.
 */
export async function issuePreviewReminderToken(draftId: number, email: string) {
  await ensurePreviewDraftSchema();
  const db = await getDb();
  if (!db) return null;
  const normalized = email.trim().toLowerCase();
  const [draft] = await db
    .select({
      id: previewDrafts.id,
      requestedEmail: previewDrafts.requestedEmail,
      userId: previewDrafts.userId,
      expiresAt: previewDrafts.expiresAt,
      landing: previewDrafts.landing,
    })
    .from(previewDrafts)
    .where(eq(previewDrafts.id, draftId))
    .limit(1);
  if (
    !draft ||
    draft.userId ||
    draft.requestedEmail !== normalized ||
    new Date(draft.expiresAt).getTime() <= Date.now()
  ) {
    return null;
  }
  const token = randomBytes(32).toString("base64url");
  const holdUntil = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const result = await db
    .update(previewDrafts)
    .set({
      reminderTokenHash: tokenHash(token),
      expiresAt: new Date(
        Math.max(new Date(draft.expiresAt).getTime(), holdUntil.getTime())
      ),
    })
    .where(
      and(
        eq(previewDrafts.id, draft.id),
        eq(previewDrafts.requestedEmail, normalized),
        isNull(previewDrafts.userId)
      )
    );
  if (mysqlAffectedRows(result) !== 1) return null;
  return { token, landing: draft.landing ?? null };
}

/**
 * Turn one anonymous preview into one saved draft after its owner opens the
 * email access link. The row claim and draft creation are one transaction,
 * so the same preview cannot be claimed twice.
 */
export async function getUnclaimedPreviewDraft(token: string) {
  if (token.length < 32) return null;
  await ensurePreviewDraftSchema();
  const db = await getDb();
  if (!db) return null;
  const [draft] = await db
    .select()
    .from(previewDrafts)
    .where(
      and(
        previewAccessMatch(token),
        isNull(previewDrafts.userId),
        gt(previewDrafts.expiresAt, new Date())
      )
    )
    .limit(1);
  return draft ?? null;
}

export async function claimPreviewDraft(input: {
  token: string;
  userId: number;
  caption?: string;
  brandedImageKey?: string;
  brandedImageUrl?: string;
  markedImageKey?: string | null;
  markedImageUrl?: string | null;
}) {
  await ensurePreviewDraftSchema();
  const db = await getDb();
  if (!db)
    throw new PreviewDraftError("Preview storage is temporarily unavailable.");

  return db.transaction(async tx => {
    const now = new Date();
    const claim = await tx
      .update(previewDrafts)
      .set({ userId: input.userId, claimedAt: now })
      .where(
        and(
          previewAccessMatch(input.token),
          isNull(previewDrafts.userId),
          gt(previewDrafts.expiresAt, now)
        )
      );

    if (mysqlAffectedRows(claim) !== 1) {
      const [existing] = await tx
        .select()
        .from(previewDrafts)
        .where(previewAccessMatch(input.token))
        .limit(1);
      if (existing?.userId === input.userId && existing.postId) {
        return { postId: existing.postId, alreadyClaimed: true } as const;
      }
      throw new PreviewDraftError(
        "This preview is no longer available. Please create a new one."
      );
    }

    const [draft] = await tx
      .select()
      .from(previewDrafts)
      .where(previewAccessMatch(input.token))
      .limit(1);
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);
    if (!draft || !user) {
      throw new PreviewDraftError(
        "We could not save this preview. Please try again."
      );
    }

    const plan = (user.plan ?? "free") as "free" | PlanId;
    const limit = postCreationLimit(plan, user.bonusFreePosts);
    if (limit !== null) {
      const [usage] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(
          and(
            eq(posts.userId, input.userId),
            gte(posts.createdAt, usageStartForPlan(plan))
          )
        );
      if (Number(usage?.count ?? 0) >= limit) {
        throw new PreviewDraftError(
          plan === "free"
            ? `You've reached the free limit of ${limit} posts. Your preview is still available until it expires.`
            : "You've reached this month's post limit. Your preview is still available until it expires.",
          plan === "free" ? "free_limit" : "plan_limit",
        );
      }
    }

    const created = await tx
      .insert(posts)
      .values({
        userId: input.userId,
        originalImageKey: draft.originalImageKey,
        originalImageUrl: draft.originalImageUrl,
        brandedImageKey: input.brandedImageKey ?? draft.brandedImageKey,
        brandedImageUrl: input.brandedImageUrl ?? draft.brandedImageUrl,
        markedImageKey: input.markedImageKey ?? null,
        markedImageUrl: input.markedImageUrl ?? null,
        caption: input.caption ?? draft.caption,
        status: "draft",
      })
      .$returningId();
    const postId = created[0]?.id;
    if (!postId) {
      throw new PreviewDraftError(
        "We could not save this preview. Please try again."
      );
    }

    const carried = carryPreviewBrand(user, draft);
    const brandUpdate: {
      logoKey?: string;
      businessName?: string;
      suburb?: string;
    } = {};
    if (!user.logoKey && draft.logoImageKey) {
      brandUpdate.logoKey = draft.logoImageKey;
    }
    if (carried.businessName) brandUpdate.businessName = carried.businessName;
    if (carried.suburb) brandUpdate.suburb = carried.suburb;
    if (Object.keys(brandUpdate).length > 0) {
      await tx
        .update(users)
        .set(brandUpdate)
        .where(eq(users.id, input.userId));
    }
    await tx
      .update(previewDrafts)
      .set({ postId })
      .where(eq(previewDrafts.id, draft.id));

    return { postId, alreadyClaimed: false } as const;
  });
}

/** Latest claimed preview details, used to prefill the brand setup step. */
export async function getLatestClaimedPreviewBrand(userId: number) {
  try {
    await ensurePreviewDraftSchema();
    const db = await getDb();
    if (!db) return null;
    const [draft] = await db
      .select({
        businessName: previewDrafts.businessName,
        suburb: previewDrafts.suburb,
      })
      .from(previewDrafts)
      .where(eq(previewDrafts.userId, userId))
      .orderBy(desc(previewDrafts.claimedAt))
      .limit(1);
    if (!draft) return null;
    return {
      businessName: draft.businessName ?? null,
      suburb: draft.suburb ?? null,
    };
  } catch (error) {
    console.warn("[Brand] Could not read a claimed preview", error);
    return null;
  }
}

/** Remove assets for expired, never-claimed previews. Claimed drafts stay in post history. */
export async function cleanupExpiredPreviewDrafts() {
  await ensurePreviewDraftSchema();
  const db = await getDb();
  if (!db) return 0;

  const expired = await db
    .select()
    .from(previewDrafts)
    .where(
      and(lt(previewDrafts.expiresAt, new Date()), isNull(previewDrafts.userId))
    )
    .limit(MAX_EXPIRED_PREVIEWS_PER_CLEANUP);

  for (const draft of expired) {
    await Promise.allSettled([
      storageDelete(draft.originalImageKey),
      storageDelete(draft.brandedImageKey),
      ...(draft.logoImageKey ? [storageDelete(draft.logoImageKey)] : []),
      ...(draft.cleanImageKey && draft.cleanImageKey !== draft.brandedImageKey
        ? [storageDelete(draft.cleanImageKey)]
        : []),
    ]);
    await db.delete(previewDrafts).where(eq(previewDrafts.id, draft.id));
  }
  return expired.length;
}

let cleanupTimer: NodeJS.Timeout | undefined;

/** Keep unclaimed images out of permanent storage without relying on Manus. */
export function startPreviewDraftCleanupAfterListen() {
  if (cleanupTimer) return;
  void cleanupExpiredPreviewDrafts().catch(error => {
    console.error("[Preview drafts] initial cleanup failed", error);
  });
  cleanupTimer = setInterval(
    () => {
      void cleanupExpiredPreviewDrafts().catch(error => {
        console.error("[Preview drafts] scheduled cleanup failed", error);
      });
    },
    6 * 60 * 60 * 1000
  );
  cleanupTimer.unref();
}
