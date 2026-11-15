import { sql } from "drizzle-orm";
import { getDb } from "./db";

let schemaPromise: Promise<void> | null = null;

function errorCodes(error: unknown) {
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
  return { messages, codes };
}

function isAlreadyPresent(error: unknown) {
  const { messages, codes } = errorCodes(error);
  return (
    codes.includes(1060) ||
    codes.includes(1061) ||
    codes.includes("ER_DUP_FIELDNAME") ||
    codes.includes("ER_DUP_KEYNAME") ||
    messages.some(message =>
      /duplicate column|duplicate key name|already exists/i.test(message)
    )
  );
}

async function runIdempotent(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  statement: string
) {
  try {
    await db.execute(sql.raw(statement));
  } catch (error) {
    if (isAlreadyPresent(error)) return;
    throw error;
  }
}

/**
 * Railway boots the app directly, so these additive statements keep referral
 * columns available even when the SQL migration has not been run yet.
 */
export async function ensureReferralSchema() {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    const db = await getDb();
    if (!db || typeof db.execute !== "function") return;

    const statements = [
      "ALTER TABLE `users` ADD `referralCode` varchar(16)",
      "ALTER TABLE `users` ADD `bonusFreePosts` int NOT NULL DEFAULT 0",
      "ALTER TABLE `users` ADD `businessName` varchar(80)",
      "ALTER TABLE `users` ADD `suburb` varchar(60)",
      "ALTER TABLE `users` ADD `trade` varchar(60)",
      "ALTER TABLE `users` ADD `brandSetupSkipped` boolean NOT NULL DEFAULT false",
      "ALTER TABLE `users` ADD CONSTRAINT `users_referral_code_uq` UNIQUE (`referralCode`)",
      "ALTER TABLE `auth_tokens` ADD `referralCode` varchar(16)",
      "ALTER TABLE `posts` ADD `markedImageKey` varchar(256)",
      "ALTER TABLE `posts` ADD `markedImageUrl` varchar(512)",
      "ALTER TABLE `preview_drafts` ADD `cleanImageKey` varchar(256)",
      "ALTER TABLE `preview_drafts` ADD `cleanImageUrl` varchar(512)",
      `CREATE TABLE IF NOT EXISTS \`referrals\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`referrerUserId\` int NOT NULL,
        \`referredUserId\` int NOT NULL,
        \`code\` varchar(16) NOT NULL,
        \`signupBonusPosts\` int NOT NULL DEFAULT 0,
        \`paidCreditCents\` int NOT NULL DEFAULT 0,
        \`paidCreditStatus\` enum('pending','qualified','applied','skipped') NOT NULL DEFAULT 'pending',
        \`stripeBalanceTransactionId\` varchar(128),
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`referrals_referred_uq\` (\`referredUserId\`),
        KEY \`referrals_referrer_idx\` (\`referrerUserId\`)
      )`,
    ];
    for (const statement of statements) {
      await runIdempotent(db, statement);
    }
  })().catch(error => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}
