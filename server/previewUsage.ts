import { and, eq, sql } from "drizzle-orm";
import { previewDailyUsage } from "../drizzle/schema";
import { getDb } from "./db";
import { ensurePreviewDraftSchema, mysqlAffectedRows } from "./previewDrafts";

export type DailyUsageAction = "reserved" | "deny" | "insert" | "retry";

/**
 * Decide the next database step after an atomic "increment if under the cap"
 * attempt. A missing row is inserted. A row still under the cap is retried
 * once. A full day is denied.
 */
export function nextDailyUsageAction(input: {
  updatedRows: number;
  existingCount: number | null;
  cap: number;
}): DailyUsageAction {
  if (!Number.isInteger(input.cap) || input.cap < 1) return "deny";
  if (input.updatedRows > 0) return "reserved";
  if (input.existingCount === null) return "insert";
  if (input.existingCount < input.cap) return "retry";
  return "deny";
}

function updatedRows(result: unknown) {
  return mysqlAffectedRows(result);
}

function isDuplicateKey(error: unknown) {
  const codes: Array<string | number | undefined> = [];
  const messages: string[] = [];
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
    codes.includes(1062) ||
    codes.includes("ER_DUP_ENTRY") ||
    messages.some(message => /duplicate/i.test(message))
  );
}

async function incrementIfUnderCap(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  day: string,
  cap: number
) {
  const result = await db
    .update(previewDailyUsage)
    .set({ count: sql`${previewDailyUsage.count} + 1` })
    .where(
      and(
        eq(previewDailyUsage.day, day),
        sql`${previewDailyUsage.count} < ${cap}`
      )
    );
  return updatedRows(result);
}

async function countForDay(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  day: string
) {
  const [row] = await db
    .select({ count: previewDailyUsage.count })
    .from(previewDailyUsage)
    .where(eq(previewDailyUsage.day, day))
    .limit(1);
  return row ? Number(row.count) : null;
}

/** Reserve one anonymous caption before the model is called. Fails closed. */
export async function reservePreviewDailySlot(cap: number): Promise<{
  ok: boolean;
  day: string;
}> {
  const day = new Date().toISOString().slice(0, 10);
  if (!Number.isInteger(cap) || cap < 1) return { ok: false, day };
  await ensurePreviewDraftSchema();
  const db = await getDb();
  if (!db) return { ok: false, day };

  const updated = await incrementIfUnderCap(db, day, cap);
  const existingCount = updated > 0 ? null : await countForDay(db, day);
  const action = nextDailyUsageAction({
    updatedRows: updated,
    existingCount,
    cap,
  });
  if (action === "reserved") return { ok: true, day };
  if (action === "deny") return { ok: false, day };

  if (action === "insert") {
    try {
      await db.insert(previewDailyUsage).values({ day, count: 1 });
      return { ok: true, day };
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
  }

  const retried = await incrementIfUnderCap(db, day, cap);
  return { ok: retried > 0, day };
}

/** Return a reserved slot when the attempt failed before the model ran. */
export async function releasePreviewDailySlot(day: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(previewDailyUsage)
    .set({ count: sql`GREATEST(${previewDailyUsage.count} - 1, 0)` })
    .where(
      and(eq(previewDailyUsage.day, day), sql`${previewDailyUsage.count} > 0`)
    );
}
