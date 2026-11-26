import { createHash, createHmac, timingSafeEqual } from "crypto";
import { previewReturnPath } from "@shared/previewHandoff";

/** Follow-ups for someone who asked to save a free preview and has not finished. */
export const PREVIEW_DAY1_KIND = "preview-day-1";
export const PREVIEW_DAY3_KIND = "preview-day-3";
export const PREVIEW_REMINDER_KINDS = [PREVIEW_DAY1_KIND, PREVIEW_DAY3_KIND] as const;
export type PreviewReminderKind = (typeof PREVIEW_REMINDER_KINDS)[number];

export const PREVIEW_REMINDER_DAY1_MS = 24 * 60 * 60 * 1000;
export const PREVIEW_REMINDER_DAY3_MS = 72 * 60 * 60 * 1000;
/** Keep the unclaimed photo past the day-3 link so the reminder can still open it. */
export const PREVIEW_REMINDER_HOLD_MS = 7 * 24 * 60 * 60 * 1000;
export const PREVIEW_REMINDER_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;
export const PREVIEW_REMINDER_CANDIDATE_LIMIT = 100;

const BOT_DOMAIN = "mail.grokbot.com";
const ORIGIN = "https://snappostpro.com";
const ENTITY_PREFIX = "preview-reminder:";

export type PreviewReminderAudience = {
  email: string;
  hasAccount: boolean;
  linkOpened: boolean;
  publishedPosts: number;
  optedOut: boolean;
  hasUnclaimedPreview: boolean;
  plan: "free" | "starter" | "pro" | null;
};

export function isPreviewReminderKind(kind: string): kind is PreviewReminderKind {
  return (PREVIEW_REMINDER_KINDS as readonly string[]).includes(kind);
}

export function normalizeReminderEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isPreviewReminderBotEmail(email: string) {
  const normalized = normalizeReminderEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at < 1 || at === normalized.length - 1) return false;
  return normalized.slice(at + 1) === BOT_DOMAIN;
}

/**
 * One row per person per reminder. The delivery entity key is only 191
 * characters, so the address is stored on recipientEmail and the unique key
 * is a hash of that address.
 */
export function previewReminderEntityKey(email: string) {
  const normalized = normalizeReminderEmail(email);
  const digest = createHash("sha256").update(normalized).digest("hex");
  return `${ENTITY_PREFIX}${digest}`;
}

export function previewReminderCampaignKey(kind: PreviewReminderKind) {
  return `${kind}:v1`;
}

/** Day 1 is 24 hours after the address was given. Day 3 is 72 hours after. */
export function previewReminderSchedule(emailRequestedAt: Date) {
  return {
    day1At: new Date(emailRequestedAt.getTime() + PREVIEW_REMINDER_DAY1_MS),
    day3At: new Date(emailRequestedAt.getTime() + PREVIEW_REMINDER_DAY3_MS),
  };
}

/**
 * Stop a reminder that should not go out.
 * Day 1 is only for someone who has not opened the link or created an account.
 * Day 3 also goes to an account that still has published zero posts.
 * A published post ends the sequence.
 */
export function previewReminderSkipReason(
  kind: PreviewReminderKind,
  audience: PreviewReminderAudience
):
  | "bot_address"
  | "unsubscribed"
  | "account_created"
  | "published"
  | "preview_unavailable"
  | null {
  if (isPreviewReminderBotEmail(audience.email)) return "bot_address";
  if (audience.optedOut) return "unsubscribed";
  if (audience.publishedPosts > 0) return "published";
  if (
    kind === PREVIEW_DAY3_KIND &&
    !audience.hasAccount &&
    !audience.linkOpened &&
    !audience.hasUnclaimedPreview
  ) {
    return "preview_unavailable";
  }
  if (kind === PREVIEW_DAY1_KIND) {
    if (audience.hasAccount || audience.linkOpened) return "account_created";
    if (!audience.hasUnclaimedPreview) return "preview_unavailable";
  }
  return null;
}

export function previewReminderNextPath(input: {
  hasAccount: boolean;
  previewToken: string | null;
  landing?: string | null;
}) {
  if (input.previewToken) {
    return previewReturnPath(input.previewToken, input.landing);
  }
  if (input.hasAccount) return "/dashboard";
  return "/preview";
}

export function buildPreviewReminderSignInUrl(rawAuthToken: string, nextPath: string) {
  const link = new URL("/api/auth/verify", ORIGIN);
  link.searchParams.set("token", rawAuthToken);
  const next = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";
  link.searchParams.set("next", next);
  return link.toString();
}

export function rememberedPreviewReminderLink(metadata: string | null) {
  try {
    const parsed = JSON.parse(metadata ?? "{}") as { signInUrl?: unknown };
    if (typeof parsed.signInUrl !== "string") return null;
    const url = new URL(parsed.signInUrl);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "snappostpro.com" ||
      url.pathname !== "/api/auth/verify" ||
      !url.searchParams.get("token")
    ) {
      return null;
    }
    return parsed.signInUrl;
  } catch {
    return null;
  }
}

export function previewReminderDeliveryMetadata(signInUrl: string) {
  return JSON.stringify({ signInUrl });
}

function candidateFilters(kind: PreviewReminderKind) {
  const shared = `
    p.requestedEmail IS NOT NULL
    AND p.requestedEmail LIKE '%@%'
    AND p.emailRequestedAt IS NOT NULL
    AND p.emailRequestedAt <= ?
    AND p.emailRequestedAt >= ?
    AND p.requestedEmail NOT LIKE '%@mail.grokbot.com'
    AND NOT EXISTS (
      SELECT 1 FROM preview_reminder_opt_out o WHERE o.email = p.requestedEmail
    )
    AND NOT EXISTS (
      SELECT 1 FROM account_email_delivery d
      WHERE d.recipientEmail = p.requestedEmail
        AND d.campaignKey = ?
    )`;
  if (kind === PREVIEW_DAY1_KIND) {
    return `${shared}
      AND NOT EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = p.requestedEmail)
      AND NOT EXISTS (
        SELECT 1 FROM auth_tokens t
        WHERE LOWER(t.email) = p.requestedEmail AND t.usedAt IS NOT NULL
      )
      AND EXISTS (
        SELECT 1 FROM preview_drafts open_draft
        WHERE open_draft.requestedEmail = p.requestedEmail
          AND open_draft.userId IS NULL
          AND open_draft.expiresAt > ?
      )`;
  }
  return `${shared}
    AND NOT EXISTS (
      SELECT 1 FROM posts published_post
      INNER JOIN users published_user ON published_user.id = published_post.userId
      WHERE LOWER(published_user.email) = p.requestedEmail
        AND published_post.status = 'published'
    )
    AND (
      EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = p.requestedEmail)
      OR EXISTS (
        SELECT 1 FROM preview_drafts open_draft
        WHERE open_draft.requestedEmail = p.requestedEmail
          AND open_draft.userId IS NULL
          AND open_draft.expiresAt > ?
      )
    )`;
}

/** People whose day-1 or day-3 reminder is due and has not been queued. */
export function buildPreviewReminderCandidateQuery(kind: PreviewReminderKind, now: Date) {
  const delay = kind === PREVIEW_DAY1_KIND ? PREVIEW_REMINDER_DAY1_MS : PREVIEW_REMINDER_DAY3_MS;
  const dueBefore = new Date(now.getTime() - delay);
  const oldest = new Date(now.getTime() - PREVIEW_REMINDER_LOOKBACK_MS);
  const params: Array<Date | string> = [
    dueBefore,
    oldest,
    previewReminderCampaignKey(kind),
  ];
  params.push(now);
  return {
    sql: `SELECT p.requestedEmail AS email, MIN(p.emailRequestedAt) AS emailRequestedAt
      FROM preview_drafts p
      WHERE ${candidateFilters(kind)}
      GROUP BY p.requestedEmail
      ORDER BY MIN(p.emailRequestedAt) ASC
      LIMIT ${PREVIEW_REMINDER_CANDIDATE_LIMIT}`,
    params,
  };
}

/** Cancel queued reminders once the person converts, unsubscribes, or is a bot. */
export function previewReminderSuppressionQueries() {
  const pending = "d.status IN ('pending', 'retry')";
  const kinds = "d.kind IN ('preview-day-1', 'preview-day-3')";
  return [
    `UPDATE account_email_delivery AS d
      SET d.status = 'cancelled', d.nextAttemptAt = NULL, d.lastErrorClass = 'account_created'
      WHERE d.kind = 'preview-day-1' AND ${pending}
        AND (
          EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = d.recipientEmail)
          OR EXISTS (
            SELECT 1 FROM auth_tokens t
            WHERE LOWER(t.email) = d.recipientEmail AND t.usedAt IS NOT NULL
          )
        )`,
    `UPDATE account_email_delivery AS d
      SET d.status = 'cancelled', d.nextAttemptAt = NULL, d.lastErrorClass = 'published'
      WHERE d.kind = 'preview-day-3' AND ${pending}
        AND EXISTS (
          SELECT 1 FROM posts published_post
          INNER JOIN users published_user ON published_user.id = published_post.userId
          WHERE LOWER(published_user.email) = d.recipientEmail
            AND published_post.status = 'published'
        )`,
    `UPDATE account_email_delivery AS d
      SET d.status = 'cancelled', d.nextAttemptAt = NULL, d.lastErrorClass = 'unsubscribed'
      WHERE ${kinds} AND ${pending}
        AND EXISTS (
          SELECT 1 FROM preview_reminder_opt_out o WHERE o.email = d.recipientEmail
        )`,
    `UPDATE account_email_delivery AS d
      SET d.status = 'cancelled', d.nextAttemptAt = NULL, d.lastErrorClass = 'bot_address'
      WHERE ${kinds} AND ${pending}
        AND d.recipientEmail LIKE '%@mail.grokbot.com'`,
  ];
}

export function previewReminderOptOutStatements(email: string) {
  const normalized = normalizeReminderEmail(email);
  return {
    email: normalized,
    insertSql:
      "INSERT IGNORE INTO preview_reminder_opt_out (email, createdAt) VALUES (?, ?)",
    cancelSql: `UPDATE account_email_delivery
      SET status = 'cancelled', nextAttemptAt = NULL, lastErrorClass = 'unsubscribed'
      WHERE recipientEmail = ?
        AND kind IN ('preview-day-1', 'preview-day-3')
        AND status IN ('pending', 'retry')`,
  };
}

function unsubscribeSecret() {
  const secret =
    process.env.NEWSLETTER_UNSUBSCRIBE_SECRET ||
    process.env.AUTH_SESSION_SECRET ||
    process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Preview reminder unsubscribe signing secret is not configured.");
  }
  return secret;
}

function signUnsubscribe(email: string) {
  return createHmac("sha256", unsubscribeSecret())
    .update(`preview-reminder:${normalizeReminderEmail(email)}`)
    .digest("base64url");
}

/** Signed one-click unsubscribe for these two reminders only. */
export function previewReminderUnsubscribeUrl(email: string) {
  const url = new URL("/api/preview-reminders/unsubscribe", ORIGIN);
  url.searchParams.set("email", normalizeReminderEmail(email));
  url.searchParams.set("token", signUnsubscribe(email));
  return url.toString();
}

export function isValidPreviewReminderUnsubscribe(email: string, token: string) {
  if (!email || !token) return false;
  let expected: string;
  try {
    expected = signUnsubscribe(email);
  } catch {
    return false;
  }
  const left = Buffer.from(expected);
  const right = Buffer.from(token);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Existing From identity, plus a postal line when SNAPPOST_POSTAL_ADDRESS is set. */
export function previewReminderSenderLines() {
  const lines = [
    "SnapPost Pro <noreply@snappostpro.com>",
    "https://snappostpro.com",
    "admin@snappostpro.com",
  ];
  const postal = process.env.SNAPPOST_POSTAL_ADDRESS ?? "";
  for (const line of postal.split(/\r?\n/)) {
    const trimmed = line.replace(/\s+/g, " ").trim();
    if (trimmed) lines.push(trimmed);
  }
  return lines;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    character =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!
  );
}

function assertSnapPostUrl(value: string, pathname: string) {
  const parsed = new URL(value);
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "snappostpro.com" ||
    parsed.pathname !== pathname
  ) {
    throw new Error("Invalid preview reminder URL");
  }
  return parsed.toString();
}

function day3Offer(input: { hasAccount: boolean; plan: PreviewReminderAudience["plan"] }) {
  if (input.plan === "starter" || input.plan === "pro") {
    return "Open SnapPost Pro and publish it when you are ready.";
  }
  if (input.hasAccount) {
    return "Your free account includes 3 posts. No card needed.";
  }
  return "A free account includes 3 posts. No card needed.";
}

/**
 * Short reminder copy for US contractors and salons.
 * One button. The footer is the sender line and the unsubscribe link.
 */
export function buildPreviewReminderEmail(
  kind: PreviewReminderKind,
  input: {
    signInUrl: string;
    unsubscribeUrl: string;
    hasAccount: boolean;
    plan?: PreviewReminderAudience["plan"];
  }
) {
  const signInUrl = assertSnapPostUrl(input.signInUrl, "/api/auth/verify");
  const unsubscribeUrl = assertSnapPostUrl(
    input.unsubscribeUrl,
    "/api/preview-reminders/unsubscribe"
  );
  const day1 = kind === PREVIEW_DAY1_KIND;
  const subject = day1
    ? "Your saved post is waiting"
    : "Your first post is one minute away";
  const button = day1 ? "Save my post" : "Finish my first post";
  const paragraphs = day1
    ? [
        "You already did the slow part. Your photo is a branded post, and it is saved.",
        "Writing a Facebook post after a long day is what usually gets pushed to tomorrow. This one is ready.",
        "Open the link to put it on a free account. You get 3 free posts, and you do not need a card. The link works for 24 hours.",
      ]
    : [
        "A Facebook post should not take the rest of your evening.",
        "Your first post is started. Finish it and publish when you are ready.",
        day3Offer({ hasAccount: input.hasAccount, plan: input.plan ?? null }),
        "The link works for 24 hours.",
      ];
  const sender = previewReminderSenderLines()
    .map(line => escapeHtml(line))
    .join("<br>");
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#172033;line-height:1.55"><p style="font-weight:700;color:#5747e8">SnapPost Pro</p>${paragraphs
    .map(paragraph => `<p>${escapeHtml(paragraph)}</p>`)
    .join("")}<p style="margin:28px 0"><a href="${escapeHtml(signInUrl)}" style="background:#5747e8;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">${button}</a></p><hr style="margin:30px 0;border:none;border-top:1px solid #ddd"><p style="font-size:12px;color:#64748b">You received this because you asked SnapPost Pro to email you a link to your free preview. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#5747e8">Unsubscribe</a></p><p style="font-size:12px;color:#64748b">Sender:<br>${sender}</p></div>`;
  return { subject, html };
}
