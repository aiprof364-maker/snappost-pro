import { upgradeOfferLine } from "@shared/upgradeOffer";

const DAY_MS = 24 * 60 * 60 * 1000;

export const FREE_POSTS_USED_KINDS = [
  "free-posts-used-1",
  "free-posts-used-2",
  "free-posts-used-3",
] as const;

export type FreePostsUsedKind = (typeof FREE_POSTS_USED_KINDS)[number];

export const ONBOARDING_EMAIL_KINDS = [
  "onboarding-welcome",
  "onboarding-day-1",
  "onboarding-day-3",
  "onboarding-day-5",
] as const;

export type OnboardingEmailKind = (typeof ONBOARDING_EMAIL_KINDS)[number];

export const FREE_POSTS_EMAIL_STEPS: Array<{
  kind: FreePostsUsedKind;
  daysAfter: number;
  subject: string;
  intro: string;
}> = [
  {
    kind: "free-posts-used-1",
    daysAfter: 0,
    subject: "Your 3 free SnapPost Pro posts are ready — keep posting",
    intro: "Your 3 free posts are ready.",
  },
  {
    kind: "free-posts-used-2",
    daysAfter: 2,
    subject: "Your branded posts are waiting",
    intro: "Your branded posts are waiting.",
  },
  {
    kind: "free-posts-used-3",
    daysAfter: 5,
    subject: "Last step to keep posting with SnapPost Pro",
    intro: "This is the last step to keep posting with SnapPost Pro.",
  },
];

const STARTED_SUBSCRIPTION_STATUSES = new Set([
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "canceled",
  "paused",
]);

export function isFreePostsUsedKind(kind: string): kind is FreePostsUsedKind {
  return (FREE_POSTS_USED_KINDS as readonly string[]).includes(kind);
}

export function isOnboardingEmailKind(kind: string): kind is OnboardingEmailKind {
  return (ONBOARDING_EMAIL_KINDS as readonly string[]).includes(kind);
}

/** Quote a fixed list of internal campaign kinds for a SQL IN clause. */
export function sqlStringList(values: readonly string[]): string {
  return values.map(value => `'${value.replace(/'/g, "")}'`).join(", ");
}

export function freePostsEmailSchedule(exhaustedAt: Date) {
  return FREE_POSTS_EMAIL_STEPS.map(step => ({
    kind: step.kind,
    subject: step.subject,
    campaignKey: `${step.kind}:v1`,
    availableAt: new Date(exhaustedAt.getTime() + step.daysAfter * DAY_MS),
  }));
}

/**
 * Stop the sequence once this account has started a trial or a paid plan,
 * including after that subscription is canceled.
 */
export function shouldSkipFreePostsEmail(input: {
  plan: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId?: string | null;
}): boolean {
  if (input.stripeCustomerId) return true;
  if (input.plan === "starter" || input.plan === "pro") return true;
  const status = (input.subscriptionStatus ?? "none").toLowerCase();
  return STARTED_SUBSCRIPTION_STATUSES.has(status);
}

/** Pending onboarding mail is dropped once the free-posts sequence exists. */
export function shouldSuppressOnboardingEmail(input: {
  kind: string;
  hasFreePostsSequence: boolean;
}): boolean {
  return input.hasFreePostsSequence && isOnboardingEmailKind(input.kind);
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    character =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

function greetingName(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? escapeHtml(trimmed) : "there";
}

export function buildFreePostsUsedEmail(
  kind: FreePostsUsedKind,
  input: { userName?: string | null; trialEligible: boolean },
) {
  const step = FREE_POSTS_EMAIL_STEPS.find(item => item.kind === kind);
  if (!step) throw new Error("Unknown free-posts email");
  const offer = escapeHtml(upgradeOfferLine(input.trialEligible));
  return {
    subject: step.subject,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#172033;line-height:1.55"><p>Hi ${greetingName(input.userName)},</p><p>${escapeHtml(step.intro)}</p><p>${offer}</p><p style="margin:28px 0"><a href="https://snappostpro.com/pricing" style="background:#6366f1;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">Choose a plan</a></p><p>— SnapPost Pro</p><hr style="margin:30px 0;border:none;border-top:1px solid #ddd"><p style="font-size:12px;color:#666">Questions? Reply to this email or visit our <a href="https://snappostpro.com/contact">contact page</a>.</p></div>`,
  };
}
