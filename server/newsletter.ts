import { createHmac, timingSafeEqual } from "crypto";

const UNSUBSCRIBE_ORIGIN = "https://snappostpro.com";

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

function unsubscribeSecret() {
  const secret =
    process.env.NEWSLETTER_UNSUBSCRIBE_SECRET ||
    process.env.AUTH_SESSION_SECRET ||
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Newsletter unsubscribe signing secret is not configured.");
  }

  return secret;
}

function sign(email: string) {
  return createHmac("sha256", unsubscribeSecret())
    .update(normalizedEmail(email))
    .digest("base64url");
}

/** Creates a durable, signed unsubscribe URL for one newsletter recipient. */
export function getNewsletterUnsubscribeUrl(email: string) {
  const url = new URL("/api/newsletter/unsubscribe", UNSUBSCRIBE_ORIGIN);
  url.searchParams.set("email", normalizedEmail(email));
  url.searchParams.set("token", sign(email));
  return url.toString();
}

/** Confirms that an unsubscribe request was signed for the stated email address. */
export function isValidNewsletterUnsubscribeRequest(email: string, token: string) {
  if (!email || !token) return false;

  const expected = Buffer.from(sign(email));
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
