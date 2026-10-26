import { Resend } from "resend";
import { getNewsletterMessage, type NewsletterKind } from "./newsletterContent";
import { getNewsletterUnsubscribeUrl } from "./newsletter";

const EMAIL_FROM = "SnapPost Pro <noreply@snappostpro.com>";
const ALERT_FROM = "SnapPost Pro Alerts <alerts@snappostpro.com>";

export type AcceptedEmail = { id: string };
export type AccountEmailKind =
  | "onboarding-welcome"
  | "onboarding-day-1"
  | "onboarding-day-3"
  | "onboarding-day-5"
  | "trial-ending"
  | "renewal"
  | "purchase"
  | "contact-owner-alert";
export type PurchaseConfirmationInput = {
  email: string;
  userName?: string | null;
  plan: "starter" | "pro";
  subscriptionStatus: "trialing" | "active";
  trialEndsAt?: Date | null;
  periodEndsAt?: Date | null;
};

let resendClient: Resend | null = null;

export function getSupportReplyTo() {
  return process.env.SUPPORT_REPLY_TO || "admin@snappostpro.com";
}

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY environment variable is not set. Email notifications will not work."
      );
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
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
      })[character]!
  );
}

function greetingName(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? escapeHtml(trimmed) : "there";
}

function dateText(value: Date | null | undefined) {
  return value
    ? value.toLocaleDateString("en-NZ", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
}

function acceptedEmailId(result: unknown): AcceptedEmail {
  const candidate = result as {
    data?: { id?: unknown };
    id?: unknown;
    error?: { message?: unknown } | null;
  };
  const id = candidate?.data?.id ?? candidate?.id;
  if (candidate?.error || typeof id !== "string" || !id) {
    throw new Error(
      typeof candidate?.error?.message === "string"
        ? candidate.error.message
        : "Resend did not accept the email."
    );
  }
  return { id };
}

async function sendAccountMessage(input: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
  replyTo?: string;
}): Promise<AcceptedEmail> {
  const result = await getResendClient().emails.send(
    {
      from: EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
  );
  return acceptedEmailId(result);
}

function accountFooter() {
  return `<hr style="margin:30px 0;border:none;border-top:1px solid #ddd"><p style="font-size:12px;color:#666">Questions? Reply to this email or visit our <a href="https://snappostpro.com/contact">contact page</a>.</p>`;
}

export async function sendMagicSignInLink(email: string, signInUrl: string) {
  return sendAccountMessage({
    to: email,
    subject: "Your secure SnapPost Pro access link",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#172033"><h2>Your SnapPost Pro access link</h2><p>Open the secure link below to access SnapPost Pro. It expires in 15 minutes and can only be used once.</p><p style="margin:28px 0"><a href="${escapeHtml(signInUrl)}" style="background:#5747e8;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700">Open SnapPost Pro</a></p><p style="font-size:12px;color:#64748b">If you did not request this email, you can safely ignore it.</p></div>`,
  });
}

export async function sendPurchaseConfirmation(
  input: PurchaseConfirmationInput,
  idempotencyKey?: string
) {
  const details =
    input.plan === "pro"
      ? { name: "Pro", posts: 300 }
      : { name: "Starter", posts: 30 };
  const trialEnd = dateText(input.trialEndsAt);
  const periodEnd = dateText(input.periodEndsAt);
  const statusCopy =
    input.subscriptionStatus === "trialing"
      ? `<p>Your 7-day trial is active${trialEnd ? ` through <strong>${trialEnd}</strong>` : ""}. You can manage or cancel your subscription from your dashboard.</p>`
      : `<p>Your <strong>${details.name}</strong> plan is active${periodEnd ? ` through <strong>${periodEnd}</strong>` : ""}.</p>`;
  return sendAccountMessage({
    to: input.email,
    subject: `Welcome to SnapPost Pro ${details.name}`,
    idempotencyKey,
    replyTo: getSupportReplyTo(),
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#172033"><h2>Welcome to SnapPost Pro, ${greetingName(input.userName)}!</h2>${statusCopy}<div style="background:#f5f5f5;padding:20px;border-radius:8px;margin:20px 0"><h3>Your plan includes</h3><ul><li><strong>${details.posts} branded posts per month</strong></li><li>AI-generated captions you can review and edit</li><li>Logo branding overlay</li><li>One connected Facebook Page</li><li>Saved post history</li></ul></div><p>Start creating a branded post when you are ready:</p><p><a href="https://snappostpro.com/dashboard" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Go to Dashboard</a></p>${accountFooter()}</div>`,
  });
}

export async function sendTrialExpirationWarning(
  email: string,
  userName: string | null | undefined,
  expirationDate: Date,
  idempotencyKey?: string
) {
  return sendAccountMessage({
    to: email,
    subject: "Your SnapPost Pro trial ends tomorrow",
    idempotencyKey,
    replyTo: getSupportReplyTo(),
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#172033"><h2>Your trial ends tomorrow, ${greetingName(userName)}</h2><p>Your 7-day SnapPost Pro trial ends on <strong>${dateText(expirationDate)}</strong>.</p><p>If you keep the subscription, Stripe will continue it under the plan you selected. You can manage or cancel it from your dashboard.</p><p><a href="https://snappostpro.com/dashboard" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Manage Subscription</a></p>${accountFooter()}</div>`,
  });
}

export async function sendRenewalReminder(
  email: string,
  userName: string | null | undefined,
  plan: "starter" | "pro",
  renewalDate: Date,
  idempotencyKey?: string
) {
  const planName = plan === "pro" ? "Pro" : "Starter";
  return sendAccountMessage({
    to: email,
    subject: `Your SnapPost Pro ${planName} plan renews tomorrow`,
    idempotencyKey,
    replyTo: getSupportReplyTo(),
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#172033"><h2>Subscription renewal reminder</h2><p>Your SnapPost Pro <strong>${planName}</strong> subscription renews on <strong>${dateText(renewalDate)}</strong>, ${greetingName(userName)}.</p><p>To view the current billing details or manage the subscription, open your dashboard.</p><p><a href="https://snappostpro.com/dashboard" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Manage Subscription</a></p>${accountFooter()}</div>`,
  });
}

export async function sendOnboardingDay1(
  email: string,
  userName: string | null | undefined,
  idempotencyKey?: string
) {
  return sendAccountMessage({
    to: email,
    subject: "Welcome to SnapPost Pro — connect your Facebook Page",
    idempotencyKey,
    replyTo: getSupportReplyTo(),
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#172033"><h2>Welcome to SnapPost Pro, ${greetingName(userName)}!</h2><p>Start by choosing the one Facebook Page where you want to publish. Then SnapPost Pro helps turn a real completed photo into a branded post with a caption you can review before publishing.</p><div style="background:#f5f5f5;padding:20px;border-radius:8px;margin:20px 0"><h3>Getting started in 3 steps</h3><ol><li><strong>Connect your Facebook Page</strong> — choose one business portfolio and one Page.</li><li><strong>Upload a completed photo</strong> — choose a photo of your work, product, space, or result.</li><li><strong>Review and publish</strong> — add your logo, review the SnapPost Pro-written caption, then manually publish when ready.</li></ol></div><p><a href="https://snappostpro.com/dashboard#facebook-section" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Connect your Facebook Page</a></p>${accountFooter()}</div>`,
  });
}

export async function sendOnboardingWelcome(
  email: string,
  userName: string | null | undefined,
  idempotencyKey?: string
) {
  return sendAccountMessage({
    to: email,
    subject: "Your SnapPost Pro account is ready — connect your Facebook Page",
    idempotencyKey,
    replyTo: getSupportReplyTo(),
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#172033"><h2>Your account is ready, ${greetingName(userName)}!</h2><p>Your first step is to choose the one Facebook Page where you want to publish. SnapPost Pro then helps you prepare a branded post from a real photo and a caption you can review before publishing.</p><div style="background:#f5f5f5;padding:20px;border-radius:8px;margin:20px 0"><h3>Start here</h3><ol><li><strong>Connect your Facebook Page</strong> — choose one business portfolio and one Page.</li><li><strong>Upload your logo and a real photo</strong> — add your logo if you have one.</li><li><strong>Review and publish</strong> — check the branded image and SnapPost Pro-written caption before you manually publish.</li></ol></div><div style="background:#eef5ff;padding:20px;border-radius:8px;margin:20px 0"><h3>No business Facebook Page yet?</h3><ol><li>In Facebook, open <a href="https://www.facebook.com/business/help/473994396650734">Meta’s Page-creation guide</a> and create a Page for your business.</li><li>Use Manus or another AI to help draft your Page name, short description and profile or cover-image ideas. Create and manage the actual Page yourself in Facebook so you stay in control.</li><li>Return here, connect Facebook, then choose that business portfolio and Page.</li></ol></div><p><a href="https://snappostpro.com/dashboard#facebook-section" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Connect your Facebook Page</a></p>${accountFooter()}</div>`,
  });
}

export async function sendOnboardingDay3(
  email: string,
  userName: string | null | undefined,
  idempotencyKey?: string
) {
  return sendAccountMessage({
    to: email,
    subject: "Connect your Page, then prepare your next Facebook post",
    idempotencyKey,
    replyTo: getSupportReplyTo(),
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#172033"><h2>Ready for your next post, ${greetingName(userName)}?</h2><p>First choose the Facebook Page you want to use. Then use SnapPost Pro whenever you have a completed photo to prepare for that Page.</p><div style="background:#f5f5f5;padding:20px;border-radius:8px;margin:20px 0"><h3>Useful checks before you publish</h3><ul><li>Connect the one business Page where you will publish.</li><li>Choose a finished photo you are comfortable showing on that Page.</li><li>Confirm the uploaded logo is the one you want on the image.</li><li>Review and edit the SnapPost Pro-written caption before manually publishing.</li></ul></div><p>Your photo stays yours. SnapPost Pro adds your logo and prepares the caption; it does not alter the finished work shown in the image.</p><p><a href="https://snappostpro.com/dashboard#facebook-section" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Connect your Page and create a post</a></p>${accountFooter()}</div>`,
  });
}

export async function sendOnboardingDay5(
  email: string,
  userName: string | null | undefined,
  plan: "free" | "starter" | "pro",
  idempotencyKey?: string
) {
  const details =
    plan === "free"
      ? { name: "Free", allowance: "3 branded posts total", upgrade: true }
      : plan === "pro"
        ? {
            name: "Pro",
            allowance: "300 branded posts per month",
            upgrade: false,
          }
        : {
            name: "Starter",
            allowance: "30 branded posts per month",
            upgrade: false,
          };
  const upgrade = details.upgrade
    ? `<div style="background:#fff3cd;padding:15px;border-radius:6px;margin:20px 0"><h3 style="margin-top:0">Ready to post more?</h3><p>You are on the Free plan with <strong>3 posts total</strong>. Starter includes 30 posts per month and Pro includes 300 posts per month.</p><a href="https://snappostpro.com/pricing" style="background:#ffc107;color:#333;padding:10px 20px;border-radius:6px;text-decoration:none">View Plans</a></div>`
    : "";
  return sendAccountMessage({
    to: email,
    subject: "Connect your Page and use your SnapPost Pro posts",
    idempotencyKey,
    replyTo: getSupportReplyTo(),
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#172033"><h2>Keep your Facebook Page up to date, ${greetingName(userName)}</h2><p>Choose the one Facebook Page you want to use, then prepare a post whenever you have a completed photo to share. Add your logo, review the SnapPost Pro-written caption, and manually publish when ready.</p><div style="background:#f5f5f5;padding:20px;border-radius:8px;margin:20px 0"><h3>Your current plan</h3><p><strong>${details.name} Plan:</strong> ${details.allowance}</p><ul><li>SnapPost Pro-written captions to review</li><li>Logo branding overlay</li><li>One connected Facebook Page</li><li>Post history</li></ul></div>${upgrade}<p><a href="https://snappostpro.com/dashboard#facebook-section" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Connect your Page and open SnapPost Pro</a></p>${accountFooter()}</div>`,
  });
}

export async function sendAccountEmail(
  kind: AccountEmailKind,
  input: {
    email: string;
    userName?: string | null;
    plan?: "free" | "starter" | "pro" | null;
    trialEndsAt?: Date | null;
    renewalAt?: Date | null;
    subscriptionStatus?: "trialing" | "active" | null;
    contact?: {
      name: string;
      email: string;
      message: string;
      ownerEmail: string;
    };
  },
  idempotencyKey: string
) {
  switch (kind) {
    case "onboarding-welcome":
      return sendOnboardingWelcome(input.email, input.userName, idempotencyKey);
    case "onboarding-day-1":
      return sendOnboardingDay1(input.email, input.userName, idempotencyKey);
    case "onboarding-day-3":
      return sendOnboardingDay3(input.email, input.userName, idempotencyKey);
    case "onboarding-day-5":
      return sendOnboardingDay5(
        input.email,
        input.userName,
        (input.plan ?? "free") as "free" | "starter" | "pro",
        idempotencyKey
      );
    case "trial-ending":
      return sendTrialExpirationWarning(
        input.email,
        input.userName,
        input.trialEndsAt ?? new Date(),
        idempotencyKey
      );
    case "renewal":
      return sendRenewalReminder(
        input.email,
        input.userName,
        input.plan === "pro" ? "pro" : "starter",
        input.renewalAt ?? new Date(),
        idempotencyKey
      );
    case "purchase":
      return sendPurchaseConfirmation(
        {
          email: input.email,
          userName: input.userName,
          plan: input.plan === "pro" ? "pro" : "starter",
          subscriptionStatus:
            input.subscriptionStatus === "trialing" ? "trialing" : "active",
          trialEndsAt: input.trialEndsAt,
          periodEndsAt: input.renewalAt,
        },
        idempotencyKey
      );
    case "contact-owner-alert": {
      if (!input.contact) throw new Error("Contact details are required");
      return sendContactFormNotification(
        input.contact.name,
        input.contact.email,
        input.contact.message,
        input.contact.ownerEmail,
        idempotencyKey
      );
    }
  }
}

export async function sendCronErrorAlert(
  jobName: string,
  errorClass: string,
  timestamp: Date
) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@snappostpro.com";
  const result = await getResendClient().emails.send({
    from: ALERT_FROM,
    to: adminEmail,
    subject: `Cron attention needed: ${escapeHtml(jobName)}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2>Cron job needs attention</h2><p><strong>Job:</strong> ${escapeHtml(jobName)}</p><p><strong>Time:</strong> ${escapeHtml(timestamp.toISOString())}</p><p><strong>Error class:</strong> ${escapeHtml(errorClass)}</p><p>Check the Railway logs and the relevant delivery ledger for details.</p></div>`,
  });
  return acceptedEmailId(result);
}

export async function sendContactFormNotification(
  name: string,
  email: string,
  message: string,
  ownerEmail: string,
  idempotencyKey?: string
) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  return sendAccountMessage({
    to: ownerEmail,
    replyTo: email,
    subject: `New contact form submission from ${safeName}`,
    idempotencyKey,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2>New Contact Form Submission</h2><div style="background:#f5f5f5;padding:20px;border-radius:8px;margin:20px 0"><p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p><p><strong>Message:</strong></p><p style="white-space:pre-wrap;background:#fff;padding:10px;border-radius:4px">${escapeHtml(message)}</p></div><p>Use Reply to respond directly to this person.</p></div>`,
  });
}

export class NewsletterSendError extends Error {
  constructor(
    message: string,
    public readonly ambiguous: boolean,
    public readonly permanent = false
  ) {
    super(message);
    this.name = "NewsletterSendError";
  }
}

export async function sendNewsletterMessage(input: {
  email: string;
  unsubscribeUrl: string;
  kind: NewsletterKind;
  issueIndex?: number;
  idempotencyKey: string;
}): Promise<{ id: string }> {
  const message = getNewsletterMessage(
    input.kind,
    input.unsubscribeUrl,
    input.issueIndex
  );
  const options = {
    idempotencyKey: input.idempotencyKey,
    signal: AbortSignal.timeout(30_000),
  };
  let result;
  try {
    result = await getResendClient().emails.send(
      {
        from: EMAIL_FROM,
        to: input.email,
        replyTo: getSupportReplyTo(),
        ...message,
        headers: {
          "List-Unsubscribe": `<${input.unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      },
      options
    );
  } catch {
    throw new NewsletterSendError(
      "Newsletter transport failed; provider acceptance is unknown.",
      true
    );
  }
  if (result.error || !result.data?.id) {
    const status = result.error?.statusCode;
    const errorName = result.error?.name;
    const ambiguous =
      !status ||
      status >= 500 ||
      errorName === "concurrent_idempotent_requests";
    const permanent = Boolean(
      status &&
        status >= 400 &&
        status < 500 &&
        status !== 429 &&
        errorName !== "concurrent_idempotent_requests"
    );
    throw new NewsletterSendError(
      "Resend did not confirm newsletter acceptance.",
      ambiguous,
      permanent
    );
  }
  return { id: result.data.id };
}

export async function sendNewsletterWelcome(
  email: string,
  unsubscribeUrl: string,
  idempotencyKey: string
) {
  return sendNewsletterMessage({
    email,
    unsubscribeUrl,
    kind: "welcome",
    idempotencyKey,
  });
}

export async function sendNewsletterSignupInvitation(email: string) {
  const unsubscribeUrl = getNewsletterUnsubscribeUrl(email);
  const result = await getResendClient().emails.send({
    from: EMAIL_FROM,
    to: email,
    replyTo: getSupportReplyTo(),
    subject: "Prepare your next Facebook post with SnapPost Pro",
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#172033;line-height:1.55"><p>Hi,</p><p>You subscribed to SnapPost Pro updates, so here is a closer look at the product.</p><p>When you have a completed photo of your work, product, space, or result, SnapPost Pro helps you prepare it for one selected Facebook Page:</p><ul><li>Upload your real completed photo</li><li>Add your logo overlay</li><li>Generate an AI caption you can edit</li><li>Review it, then publish when you are ready</li></ul><p style="margin:28px 0"><a href="https://snappostpro.com" style="background:#5747e8;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700">Start with 3 free posts</a></p><p>— SnapPost Pro</p><hr style="margin:30px 0;border:none;border-top:1px solid #ddd"><p style="font-size:12px;color:#64748b">You received this because you subscribed to SnapPost Pro updates. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#5747e8">Unsubscribe</a>.</p></div>`,
  });
  return acceptedEmailId(result);
}

export async function sendNewsletterSignupNotification(
  email: string,
  ownerEmail: string
) {
  const safeEmail = escapeHtml(email);
  const result = await getResendClient().emails.send({
    from: EMAIL_FROM,
    to: ownerEmail,
    subject: `New newsletter subscriber: ${safeEmail}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2>New Newsletter Subscriber</h2><p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p><p><strong>Source:</strong> snappostpro.com</p></div>`,
  });
  return acceptedEmailId(result);
}

export async function sendEmailVerification(
  email: string,
  userName: string | null | undefined,
  verificationToken: string
) {
  const verificationUrl = `https://snappostpro.com/verify-email?token=${encodeURIComponent(verificationToken)}`;
  return sendAccountMessage({
    to: email,
    subject: "Verify your SnapPost Pro email",
    replyTo: getSupportReplyTo(),
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2>Verify your email, ${greetingName(userName)}</h2><p>Please verify your email address to continue using SnapPost Pro.</p><p><a href="${verificationUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:bold">Verify Email</a></p><p style="color:#666;font-size:14px">Or copy this link into your browser:<br><code style="word-break:break-all">${verificationUrl}</code></p><p style="color:#999;font-size:12px">This link expires in 24 hours. If you did not request it, you can ignore this email.</p><hr style="margin:30px 0;border:none;border-top:1px solid #ddd"><p style="font-size:12px;color:#999">SnapPost Pro • Prepare completed photos with your logo and an editable AI caption for your Facebook Page.<br><a href="https://snappostpro.com" style="color:#5B4FFF;text-decoration:none">snappostpro.com</a></p></div>`,
  });
}

export { getResendClient };
