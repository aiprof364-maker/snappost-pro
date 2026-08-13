import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import { parse as parseCookieHeader } from "cookie";
import { and, eq, gt, isNull } from "drizzle-orm";
import { authTokens, users, type User } from "../drizzle/schema";
import { getDb } from "./db";

export const SESSION_COOKIE = "snappost_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const MAGIC_LINK_MAX_AGE_MS = 15 * 60 * 1000;

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
    expiresAt: new Date(Date.now() + MAGIC_LINK_MAX_AGE_MS),
  });
  return rawToken;
}

export async function consumeMagicLinkToken(rawToken: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [token] = await db
    .select()
    .from(authTokens)
    .where(and(eq(authTokens.tokenHash, hash(rawToken)), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .limit(1);
  if (!token) return null;

  await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, token.id));
  const [existing] = await db.select().from(users).where(eq(users.email, token.email)).limit(1);
  if (existing) return existing;

  await db.insert(users).values({
    openId: independentOpenId(token.email),
    email: token.email,
    loginMethod: "email_magic_link",
    lastSignedIn: new Date(),
  });
  const [created] = await db.select().from(users).where(eq(users.email, token.email)).limit(1);
  return created ?? null;
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
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user ?? null;
  } catch {
    return null;
  }
}

export function sessionCookieMaxAge() {
  return SESSION_MAX_AGE_SECONDS * 1000;
}
