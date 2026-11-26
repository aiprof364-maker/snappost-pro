import { createHash } from "crypto";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PREVIEW_REMINDER_DAY1_MS,
  PREVIEW_REMINDER_DAY3_MS,
  PREVIEW_REMINDER_HOLD_MS,
  buildPreviewReminderCandidateQuery,
  buildPreviewReminderEmail,
  buildPreviewReminderSignInUrl,
  isPreviewReminderBotEmail,
  isValidPreviewReminderUnsubscribe,
  previewReminderCampaignKey,
  previewReminderEntityKey,
  previewReminderNextPath,
  previewReminderOptOutStatements,
  previewReminderSchedule,
  previewReminderSkipReason,
  previewReminderSuppressionQueries,
  previewReminderUnsubscribeUrl,
  rememberedPreviewReminderLink,
  type PreviewReminderAudience,
} from "./previewReminderEmail";

const send = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send } })),
}));

const requestedAt = new Date("2026-11-01T15:00:00.000Z");
const signInUrl =
  "https://snappostpro.com/api/auth/verify?token=abc&next=%2Fdashboard";
const audience = (
  overrides: Partial<PreviewReminderAudience> = {}
): PreviewReminderAudience => ({
  email: "owner@example.com",
  hasAccount: false,
  linkOpened: false,
  publishedPosts: 0,
  optedOut: false,
  hasUnclaimedPreview: true,
  plan: null,
  ...overrides,
});

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ data: { id: "accepted-email" } });
  process.env.RESEND_API_KEY = "test-key";
  process.env.AUTH_SESSION_SECRET = "preview-reminder-test-secret";
  delete process.env.SNAPPOST_POSTAL_ADDRESS;
  delete process.env.SUPPORT_REPLY_TO;
});

describe("preview reminder schedule", () => {
  it("sends day 1 at 24 hours and day 3 at 72 hours", () => {
    const schedule = previewReminderSchedule(requestedAt);
    expect(schedule.day1At.toISOString()).toBe("2026-11-02T15:00:00.000Z");
    expect(schedule.day3At.toISOString()).toBe("2026-11-04T15:00:00.000Z");
    expect(schedule.day1At.getTime() - requestedAt.getTime()).toBe(
      PREVIEW_REMINDER_DAY1_MS
    );
    expect(schedule.day3At.getTime() - requestedAt.getTime()).toBe(
      PREVIEW_REMINDER_DAY3_MS
    );
    expect(PREVIEW_REMINDER_HOLD_MS).toBeGreaterThan(
      PREVIEW_REMINDER_DAY3_MS + PREVIEW_REMINDER_DAY1_MS
    );
  });

  it("gives each person one stable key per reminder", () => {
    const digest = createHash("sha256").update("owner@example.com").digest("hex");
    expect(previewReminderEntityKey("  Owner@Example.com ")).toBe(
      `preview-reminder:${digest}`
    );
    expect(previewReminderEntityKey("owner@example.com").length).toBeLessThan(191);
    expect(previewReminderCampaignKey("preview-day-1")).toBe("preview-day-1:v1");
    expect(previewReminderCampaignKey("preview-day-3")).toBe("preview-day-3:v1");
  });
});

describe("preview reminder eligibility", () => {
  it("sends day 1 only before an account exists, and day 3 until a post is published", () => {
    expect(previewReminderSkipReason("preview-day-1", audience())).toBeNull();
    expect(
      previewReminderSkipReason(
        "preview-day-3",
        audience({ hasAccount: true, hasUnclaimedPreview: false, plan: "free" })
      )
    ).toBeNull();
    expect(
      previewReminderSkipReason("preview-day-3", audience({ hasAccount: false }))
    ).toBeNull();

    expect(
      previewReminderSkipReason("preview-day-1", audience({ hasAccount: true }))
    ).toBe("account_created");
    expect(
      previewReminderSkipReason("preview-day-1", audience({ linkOpened: true }))
    ).toBe("account_created");
    expect(
      previewReminderSkipReason(
        "preview-day-1",
        audience({ hasUnclaimedPreview: false })
      )
    ).toBe("preview_unavailable");
    expect(
      previewReminderSkipReason("preview-day-1", audience({ publishedPosts: 1 }))
    ).toBe("published");
    expect(
      previewReminderSkipReason(
        "preview-day-3",
        audience({ hasAccount: true, publishedPosts: 1, plan: "free" })
      )
    ).toBe("published");
    expect(
      previewReminderSkipReason("preview-day-3", audience({ optedOut: true }))
    ).toBe("unsubscribed");
    expect(
      previewReminderSkipReason(
        "preview-day-3",
        audience({ hasAccount: false, hasUnclaimedPreview: false })
      )
    ).toBe("preview_unavailable");
    expect(
      previewReminderSkipReason(
        "preview-day-1",
        audience({ email: "bot@mail.grokbot.com" })
      )
    ).toBe("bot_address");
  });

  it("skips bot mail and keeps real domains", () => {
    expect(isPreviewReminderBotEmail("Bot@Mail.Grokbot.com")).toBe(true);
    expect(isPreviewReminderBotEmail("owner@example.com")).toBe(false);
    expect(isPreviewReminderBotEmail("owner@notmail.grokbot.com")).toBe(false);
  });

  it("queues due people once, with a literal limit, and cancels conversions", () => {
    const now = new Date("2026-11-20T00:00:00.000Z");
    const day1 = buildPreviewReminderCandidateQuery("preview-day-1", now);
    const day3 = buildPreviewReminderCandidateQuery("preview-day-3", now);

    expect(day1.sql).toContain("LIMIT 100");
    expect(day1.sql).not.toContain("LIMIT ?");
    expect(day1.sql).toContain("d.recipientEmail = p.requestedEmail");
    expect(day1.sql).not.toContain("SHA2(");
    expect(day1.sql).toContain("preview_reminder_opt_out");
    expect(day1.sql).toContain("NOT LIKE '%@mail.grokbot.com'");
    expect(day1.sql).toContain("usedAt IS NOT NULL");
    expect(day1.sql).toContain("open_draft.userId IS NULL");
    expect(day1.params).toEqual([
      new Date("2026-11-19T00:00:00.000Z"),
      new Date("2026-11-06T00:00:00.000Z"),
      "preview-day-1:v1",
      now,
    ]);
    expect(day3.sql).toContain("published_post.status = 'published'");
    expect(day3.sql).toContain("open_draft.expiresAt > ?");
    expect(day3.params).toEqual([
      new Date("2026-11-17T00:00:00.000Z"),
      new Date("2026-11-06T00:00:00.000Z"),
      "preview-day-3:v1",
      now,
    ]);

    const suppression = previewReminderSuppressionQueries().join("\n");
    expect(suppression).toContain("account_created");
    expect(suppression).toContain("published");
    expect(suppression).toContain("unsubscribed");
    expect(suppression).toContain("bot_address");

    const optOut = previewReminderOptOutStatements(" Owner@Example.com ");
    expect(optOut.email).toBe("owner@example.com");
    expect(optOut.insertSql).toContain("INSERT IGNORE");
    expect(optOut.cancelSql).toContain("preview-day-1");
    expect(optOut.cancelSql).toContain("preview-day-3");
    expect(optOut.cancelSql).toContain("pending");
  });
});

function escaped(value: string) {
  return value.replace(/&/g, "&amp;");
}

describe("preview reminder copy", () => {
  function message(
    kind: "preview-day-1" | "preview-day-3",
    input: { hasAccount?: boolean; plan?: "free" | "starter" | "pro" | null } = {}
  ) {
    const unsubscribeUrl = previewReminderUnsubscribeUrl("owner@example.com");
    return buildPreviewReminderEmail(kind, {
      signInUrl,
      unsubscribeUrl,
      hasAccount: input.hasAccount ?? false,
      plan: input.plan,
    });
  }

  it("keeps day 1 to one button, a fresh link, and the saved-post note", () => {
    const email = message("preview-day-1");
    expect(email.subject).toBe("Your saved post is waiting");
    expect(email.html).toContain("Save my post");
    expect(email.html).toContain("3 free posts");
    expect(email.html).toContain("do not need a card");
    expect(email.html).toContain(escaped(signInUrl));
    expect(email.html.match(/display:inline-block/g)).toHaveLength(1);
    expect(email.html).toContain("The link works for 24 hours.");
    expect(email.html).not.toMatch(/tradies|suburb|favourite|colour|whilst/i);
  });

  it("nudges day 3 to publish, including a signed-up account with no posts", () => {
    const waiting = message("preview-day-3");
    const signedUp = message("preview-day-3", { hasAccount: true, plan: "free" });
    expect(waiting.subject).toBe("Your first post is one minute away");
    expect(waiting.html).toContain("Finish my first post");
    expect(waiting.html).toContain("3 posts");
    expect(waiting.html).toContain("No card needed");
    expect(signedUp.html).toContain("Your free account includes 3 posts");
    expect(waiting.html.match(/display:inline-block/g)).toHaveLength(1);
    expect(waiting.html).not.toMatch(/tradies|suburb|favourite|colour|whilst/i);
  });

  it("does not tell a paying account that no card is needed", () => {
    const email = message("preview-day-3", { hasAccount: true, plan: "starter" });
    expect(email.html).toContain("publish it when you are ready");
    expect(email.html).not.toContain("No card");
    expect(email.html).not.toContain("3 posts");
  });

  it("includes a one-click unsubscribe and the existing sender", () => {
    const unsubscribeUrl = previewReminderUnsubscribeUrl("owner@example.com");
    const email = buildPreviewReminderEmail("preview-day-1", {
      signInUrl,
      unsubscribeUrl,
      hasAccount: false,
    });
    expect(email.html).toContain(`href="${escaped(unsubscribeUrl)}"`);
    expect(email.html).toContain("SnapPost Pro &lt;noreply@snappostpro.com&gt;");
    expect(email.html).toContain("https://snappostpro.com");
    expect(email.html).toContain("admin@snappostpro.com");
    expect(email.html).toContain("Sender:");
    expect(
      isValidPreviewReminderUnsubscribe("Owner@Example.com", new URL(unsubscribeUrl).searchParams.get("token") ?? "")
    ).toBe(true);
    expect(isValidPreviewReminderUnsubscribe("owner@example.com", "tampered-token")).toBe(
      false
    );
  });

  it("adds a postal line only when one is configured", () => {
    process.env.SNAPPOST_POSTAL_ADDRESS = "PO Box 100\nAustin, TX 78701";
    const email = message("preview-day-1");
    expect(email.html).toContain("PO Box 100");
    expect(email.html).toContain("Austin, TX 78701");
  });

  it("rejects a sign-in link that leaves SnapPost Pro", () => {
    expect(() =>
      buildPreviewReminderEmail("preview-day-1", {
        signInUrl: "https://example.com/api/auth/verify?token=abc",
        unsubscribeUrl: previewReminderUnsubscribeUrl("owner@example.com"),
        hasAccount: false,
      })
    ).toThrow(/Invalid preview reminder URL/);
  });

  it("reuses only a SnapPost Pro access link", () => {
    expect(rememberedPreviewReminderLink(JSON.stringify({ signInUrl }))).toBe(signInUrl);
    expect(
      rememberedPreviewReminderLink(
        JSON.stringify({ signInUrl: "https://example.com/api/auth/verify?token=abc" })
      )
    ).toBeNull();
    expect(rememberedPreviewReminderLink("not-json")).toBeNull();
  });

  it("sends the reminder back to the saved preview, or the dashboard once claimed", () => {
    expect(
      previewReminderNextPath({
        hasAccount: false,
        previewToken: "a".repeat(32),
        landing: "contractors",
      })
    ).toBe(`/preview?token=${"a".repeat(32)}&landing=contractors`);
    expect(
      previewReminderNextPath({ hasAccount: true, previewToken: null })
    ).toBe("/dashboard");
    expect(
      previewReminderNextPath({ hasAccount: false, previewToken: null })
    ).toBe("/preview");
    expect(buildPreviewReminderSignInUrl("raw-token", "/dashboard")).toContain(
      "next=%2Fdashboard"
    );
  });

  it("sends one-click unsubscribe headers from the existing SnapPost Pro sender", async () => {
    vi.resetModules();
    const { sendAccountEmail } = await import("./email");
    const unsubscribeUrl = previewReminderUnsubscribeUrl("owner@example.com");
    await sendAccountEmail(
      "preview-day-1",
      {
        email: "owner@example.com",
        signInUrl,
        unsubscribeUrl,
        hasAccount: false,
      },
      "snappost:account:preview-reminder:test"
    );
    const payload = send.mock.calls.at(-1)?.[0] as {
      from: string;
      subject: string;
      headers: Record<string, string>;
      replyTo: string;
    };
    const options = send.mock.calls.at(-1)?.[1] as { idempotencyKey: string };
    expect(payload.from).toBe("SnapPost Pro <noreply@snappostpro.com>");
    expect(payload.subject).toBe("Your saved post is waiting");
    expect(payload.replyTo).toBe("admin@snappostpro.com");
    expect(payload.headers).toEqual({
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    expect(options.idempotencyKey).toBe("snappost:account:preview-reminder:test");
  });
});

describe("preview reminder wiring", () => {
  it("runs inside the existing 15-minute account email worker", () => {
    const automation = readFileSync(
      new URL("./accountEmailAutomation.ts", import.meta.url),
      "utf8"
    );
    const stats = readFileSync(new URL("./adminStats.ts", import.meta.url), "utf8");
    expect(automation).toContain('cron.schedule("*/15 * * * *"');
    expect(automation).toContain("enqueuePreviewReminders");
    expect(automation).toContain("suppressPreviewReminders");
    expect(automation).toContain("optOutPreviewReminders");
    expect(stats).toContain("preview-day-1");
    expect(stats).toContain("preview-day-3");
    expect(stats).toContain("previewDay1Reminders");
    expect(stats).toContain("previewDay3Reminders");
  });
});
