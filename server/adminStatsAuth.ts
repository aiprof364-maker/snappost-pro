import { createHash, timingSafeEqual } from "node:crypto";
import { adminStatsToken } from "./_core/env";

/**
 * Compares two secrets without returning early on the first differing byte.
 * SHA-256 digests are a fixed length, so a shorter guess cannot skip the compare.
 */
export function secretsMatch(presented: string, expected: string): boolean {
  const presentedDigest = createHash("sha256")
    .update(presented, "utf8")
    .digest();
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(presentedDigest, expectedDigest);
}

export type AdminStatsAuth =
  | { status: "disabled" }
  | { status: "unauthorized" }
  | { status: "ok" };

/** The credential from `Authorization: Bearer <token>`, or null when it is absent. */
export function bearerCredential(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

/**
 * Disabled (404) when ADMIN_STATS_TOKEN is unset or blank.
 * Unauthorized (401) when a token is configured but the header does not match.
 */
export function authorizeAdminStatsRequest(
  authorizationHeader: string | undefined
): AdminStatsAuth {
  const expected = adminStatsToken();
  if (!expected) return { status: "disabled" };
  const presented = bearerCredential(authorizationHeader) ?? "";
  const matches = secretsMatch(presented, expected);
  if (!presented || !matches) return { status: "unauthorized" };
  return { status: "ok" };
}
