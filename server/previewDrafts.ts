import { createHash, randomBytes } from "crypto";
import { and, eq, gt, gte, isNull, lt, sql } from "drizzle-orm";
import { previewDrafts, posts, users } from "../drizzle/schema";
import { PLAN_POST_LIMITS, type PlanId } from "@shared/const";
import { getDb } from "./db";
import { storageDelete } from "./storage";

const PREVIEW_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_EXPIRED_PREVIEWS_PER_CLEANUP = 25;
let previewSchemaPromise: Promise<void> | null = null;

export type PreviewLanding = "contractors" | "hairdressers" | undefined;

export class PreviewDraftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreviewDraftError";
  }
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
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
    caption: draft.caption,
    expiresAt: draft.expiresAt,
  };
}

function affectedRows(result: unknown): number {
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
        logoImageKey VARCHAR(256) NOT NULL,
        brandedImageKey VARCHAR(256) NOT NULL,
        brandedImageUrl VARCHAR(512) NOT NULL,
        caption TEXT NOT NULL,
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
  })().catch(error => {
    previewSchemaPromise = null;
    throw error;
  });
  return previewSchemaPromise;
}

/** Store the anonymous preview with a random token that is never persisted raw. */
export async function createPreviewDraft(input: {
  landing?: PreviewLanding;
  originalImageKey: string;
  originalImageUrl: string;
  logoImageKey: string;
  brandedImageKey: string;
  brandedImageUrl: string;
  caption: string;
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
    caption: input.caption,
    expiresAt,
  });

  return {
    token,
    ...publicPreviewFields({
      landing: input.landing ?? null,
      originalImageUrl: input.originalImageUrl,
      brandedImageUrl: input.brandedImageUrl,
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
        eq(previewDrafts.tokenHash, tokenHash(token)),
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
        eq(previewDrafts.tokenHash, tokenHash(input.token)),
        isNull(previewDrafts.userId),
        gt(previewDrafts.expiresAt, new Date())
      )
    );
  if (affectedRows(result) !== 1) {
    throw new PreviewDraftError(
      "This preview has expired. Please create a new one."
    );
  }
  return { success: true } as const;
}

/** Record only that an email-access request followed a valid anonymous preview. */
export async function markPreviewEmailRequested(token: string) {
  await ensurePreviewDraftSchema();
  const db = await getDb();
  if (!db)
    throw new PreviewDraftError("Preview storage is temporarily unavailable.");

  const result = await db
    .update(previewDrafts)
    .set({ emailRequestedAt: new Date() })
    .where(
      and(
        eq(previewDrafts.tokenHash, tokenHash(token)),
        isNull(previewDrafts.userId),
        gt(previewDrafts.expiresAt, new Date())
      )
    );
  if (affectedRows(result) !== 1) {
    throw new PreviewDraftError(
      "This preview has expired. Please create a new one."
    );
  }
}

/**
 * Turn one anonymous preview into one saved draft after its owner opens the
 * one-time email link. The row claim and draft creation are one transaction,
 * so the same preview cannot be claimed twice.
 */
export async function claimPreviewDraft(input: {
  token: string;
  userId: number;
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
          eq(previewDrafts.tokenHash, tokenHash(input.token)),
          isNull(previewDrafts.userId),
          gt(previewDrafts.expiresAt, now)
        )
      );

    if (affectedRows(claim) !== 1) {
      const [existing] = await tx
        .select()
        .from(previewDrafts)
        .where(eq(previewDrafts.tokenHash, tokenHash(input.token)))
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
      .where(eq(previewDrafts.tokenHash, tokenHash(input.token)))
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
    const limit = PLAN_POST_LIMITS[plan];
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
            : "You've reached this month's post limit. Your preview is still available until it expires."
        );
      }
    }

    const created = await tx
      .insert(posts)
      .values({
        userId: input.userId,
        originalImageKey: draft.originalImageKey,
        originalImageUrl: draft.originalImageUrl,
        brandedImageKey: draft.brandedImageKey,
        brandedImageUrl: draft.brandedImageUrl,
        caption: draft.caption,
        status: "draft",
      })
      .$returningId();
    const postId = created[0]?.id;
    if (!postId) {
      throw new PreviewDraftError(
        "We could not save this preview. Please try again."
      );
    }

    if (!user.logoKey) {
      await tx
        .update(users)
        .set({ logoKey: draft.logoImageKey })
        .where(eq(users.id, input.userId));
    }
    await tx
      .update(previewDrafts)
      .set({ postId })
      .where(eq(previewDrafts.id, draft.id));

    return { postId, alreadyClaimed: false } as const;
  });
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
      storageDelete(draft.logoImageKey),
      storageDelete(draft.brandedImageKey),
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
