import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import { parse as parseCookieHeader } from "cookie";
import { and, eq, isNull } from "drizzle-orm";
import { authTokens, users, type User } from "../drizzle/schema";
import { accessLinkExpiresAt } from "@shared/accessLink";
import { isConfiguredAdminEmail } from "./adminIdentity";
import { getDb, logConversionEvent } from "./db";

export const SESSION_COOKIE = "snappost_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type MagicLinkConsumption =
  | { status: "ok"; user: User; accountCreated: boolean }
  | { status: "expired" }
  | { status: "invalid" };

export type MagicLinkAttribution = {
  landing?: "contractors" | "hairdressers";
};

function secretKey() {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("AUTH_SESSION_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

function independentOpenId(email: string) {
  return `email_${hash(normalizedEmail(email)).slice(0, 48)}`;
}

export async function createMagicLinkToken(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rawToken = randomBytes(32).toString("base64url");
  const normalized = normalizedEmail(email);
  await db.insert(authTokens).values({
    email: normalized,
    tokenHash: hash(rawToken),
    expiresAt: accessLinkExpiresAt(),
  });
  return rawToken;
}

function isDuplicateKey(error: unknown) {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const candidate = current as {
      code?: unknown;
      errno?: unknown;
      cause?: unknown;
    };
    if (candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062) {
      return true;
    }
    current = candidate.cause;
  }
  return false;
}

function linkExpiry(value: Date | string) {
  const expiry = value instanceof Date ? value : new Date(value);
  return Number.isNaN(expiry.getTime()) ? null : expiry;
}

/**
 * Opens an emailed access link. The same token stays valid until it expires,
 * so a second tap, a mail-scanner prefetch, or a short interruption can still
 * sign the person in. usedAt records the first successful open only.
 */
export async function consumeMagicLinkToken(
  rawToken: string,
  attribution: MagicLinkAttribution = {}
): Promise<MagicLinkConsumption> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [token] = await db
    .select()
    .from(authTokens)
    .where(eq(authTokens.tokenHash, hash(rawToken)))
    .limit(1);
  if (!token) return { status: "invalid" };
  const expiresAt = linkExpiry(token.expiresAt);
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    return { status: "expired" };
  }

  const openedAt = new Date();
  if (token.usedAt == null) {
    await db
      .update(authTokens)
      .set({ usedAt: openedAt })
      .where(and(eq(authTokens.id, token.id), isNull(authTokens.usedAt)));
  }

  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, token.email))
    .limit(1);
  let accountCreated = false;
  if (!user) {
    try {
      await db.insert(users).values({
        openId: independentOpenId(token.email),
        email: token.email,
        loginMethod: "email_magic_link",
        role: isConfiguredAdminEmail(token.email) ? "admin" : "user",
        emailVerified: true,
        lastSignedIn: openedAt,
      });
      accountCreated = true;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
    const [created] = await db
      .select()
      .from(users)
      .where(eq(users.email, token.email))
      .limit(1);
    if (!created) throw new Error("Could not create account from access link");
    user = created;
  }

  const role = isConfiguredAdminEmail(token.email) ? "admin" : user.role;
  await db
    .update(users)
    .set({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
      lastSignedIn: openedAt,
      role,
    })
    .where(eq(users.id, user.id));
  if (accountCreated) {
    await logConversionEvent(user.id, "free_account_created", {
      plan: "free",
      ...attribution,
    });
  }
  return {
    status: "ok",
    user: {
      ...user,
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
      lastSignedIn: openedAt,
      role,
    },
    accountCreated,
  };
}

export async function createSessionToken(user: User) {
  return new SignJWT({ userId: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function getSessionUser(req: Request): Promise<User | null> {
  const token = parseCookieHeader(req.headers.cookie ?? "")[SESSION_COOKIE];
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, secretKey());
    const userId = Number(verified.payload.userId);
    if (!Number.isInteger(userId)) return null;
    const db = await getDb();
    if (!db) return null;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user ?? null;
  } catch {
    return null;
  }
}

export function sessionCookieMaxAge() {
  return SESSION_MAX_AGE_SECONDS * 1000;
}
