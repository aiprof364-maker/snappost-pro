import { afterEach, describe, expect, it } from "vitest";
import { authorizeAdminStatsRequest, secretsMatch } from "./adminStatsAuth";
import {
  assembleAdminStats,
  emptyEmailReminderStats,
  isInternalOrTestAccount,
  isMissingRelation,
  loadEmailReminderStats,
  readExecuteRows,
  summarizeEmailReminderRows,
  summarizeRealAccounts,
} from "./adminStats";

const originalEnv = {
  ADMIN_STATS_TOKEN: process.env.ADMIN_STATS_TOKEN,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  OWNER_EMAIL: process.env.OWNER_EMAIL,
  OWNER_OPEN_ID: process.env.OWNER_OPEN_ID,
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("admin stats bearer token", () => {
  it("compares equal secrets and rejects a different length without throwing", () => {
    expect(secretsMatch("same-token", "same-token")).toBe(true);
    expect(secretsMatch("same-token", "same-tokem")).toBe(false);
    expect(secretsMatch("short", "much-longer-token")).toBe(false);
    expect(secretsMatch("", "much-longer-token")).toBe(false);
  });

  it("disables the route when ADMIN_STATS_TOKEN is missing or blank", () => {
    delete process.env.ADMIN_STATS_TOKEN;
    expect(authorizeAdminStatsRequest("Bearer anything")).toEqual({
      status: "disabled",
    });

    process.env.ADMIN_STATS_TOKEN = "   ";
    expect(authorizeAdminStatsRequest(undefined)).toEqual({
      status: "disabled",
    });
  });

  it("accepts only the configured bearer token", () => {
    process.env.ADMIN_STATS_TOKEN = "  stats-token  ";
    expect(authorizeAdminStatsRequest("Bearer stats-token")).toEqual({
      status: "ok",
    });
    expect(authorizeAdminStatsRequest("bearer stats-token")).toEqual({
      status: "ok",
    });
    expect(authorizeAdminStatsRequest(undefined)).toEqual({
      status: "unauthorized",
    });
    expect(authorizeAdminStatsRequest("Bearer wrong")).toEqual({
      status: "unauthorized",
    });
    expect(authorizeAdminStatsRequest("Bearer stats-token-extra")).toEqual({
      status: "unauthorized",
    });
    expect(authorizeAdminStatsRequest("Token stats-token")).toEqual({
      status: "unauthorized",
    });
  });
});

describe("real customer accounts", () => {
  it("excludes admin, owner, and mail.grokbot.com accounts", () => {
    process.env.ADMIN_EMAIL = "Owner@SnapPostPro.com";
    process.env.OWNER_EMAIL = "legacy-owner@snappostpro.com";
    process.env.OWNER_OPEN_ID = "owner-open-id";

    expect(
      isInternalOrTestAccount({
        role: "admin",
        email: "contractor@example.net",
        openId: "admin-role",
      })
    ).toBe(true);
    expect(
      isInternalOrTestAccount({
        role: "user",
        email: "owner@snappostpro.com",
        openId: "configured-admin",
      })
    ).toBe(true);
    expect(
      isInternalOrTestAccount({
        role: "user",
        email: "legacy-owner@snappostpro.com",
        openId: "legacy-owner",
      })
    ).toBe(true);
    expect(
      isInternalOrTestAccount({
        role: "user",
        email: "Bot+1@Mail.Grokbot.com",
        openId: "grok",
      })
    ).toBe(true);
    expect(
      isInternalOrTestAccount({
        role: "user",
        email: "contractor@example.net",
        openId: "owner-open-id",
      })
    ).toBe(true);
    expect(
      isInternalOrTestAccount({
        role: "user",
        email: "person@mail.grokbot.com.example",
        openId: "lookalike",
      })
    ).toBe(false);
    expect(
      isInternalOrTestAccount({
        role: "user",
        email: null,
        openId: "no-email",
      })
    ).toBe(false);

    const summary = summarizeRealAccounts([
      {
        role: "user",
        email: "first@example.net",
        openId: "real-1",
        createdAt: "2026-11-01T00:00:00.000Z",
      },
      {
        role: "user",
        email: "Bot@Mail.Grokbot.com",
        openId: "grok",
        createdAt: "2026-11-20T00:00:00.000Z",
      },
      {
        role: "admin",
        email: "admin@example.net",
        openId: "admin",
        createdAt: "2026-11-21T00:00:00.000Z",
      },
      {
        role: "user",
        email: "second@example.net",
        openId: "real-2",
        createdAt: "2026-11-10T12:00:00.000Z",
      },
    ]);

    expect(summary).toEqual({
      count: 2,
      latestCreatedAt: "2026-11-10T12:00:00.000Z",
    });
  });

  it("reports no latest timestamp when every account is internal", () => {
    process.env.ADMIN_EMAIL = "owner@snappostpro.com";
    expect(
      summarizeRealAccounts([
        {
          role: "user",
          email: "agent@mail.grokbot.com",
          openId: "grok",
          createdAt: "2026-11-01T00:00:00.000Z",
        },
      ])
    ).toEqual({ count: 0, latestCreatedAt: null });
  });
});

describe("admin stats payload", () => {
  it("returns every dashboard funnel count, real accounts, and no personal data", () => {
    process.env.ADMIN_EMAIL = "owner@snappostpro.com";
    process.env.OWNER_EMAIL = "legacy-owner@snappostpro.com";
    process.env.OWNER_OPEN_ID = "owner-open-id";

    const now = new Date("2026-11-26T00:00:00.000Z");
    const recent = new Date("2026-11-24T00:00:00.000Z");
    const older = new Date("2026-11-16T00:00:00.000Z");
    const stale = new Date("2026-10-01T00:00:00.000Z");
    const newestReal = new Date("2026-11-24T08:00:00.000Z");
    const pageToken = "page-token-secret";

    const stats = assembleAdminStats(
      {
        users: [
          user(1, "real-1@example.net", "real-1", recent, "free", "none"),
          user(2, "real-2@example.net", "real-2", older, "free", "none"),
          user(3, "real-3@example.net", "real-3", stale, "starter", "trialing"),
          user(
            4,
            "real-4@example.net",
            "real-4",
            newestReal,
            "pro",
            "active",
            "oauth"
          ),
          user(
            5,
            "admin-role@example.net",
            "admin-role",
            now,
            "free",
            "none",
            "email_magic_link",
            "admin"
          ),
          user(
            6,
            "owner@snappostpro.com",
            "configured-admin",
            recent,
            "free",
            "none"
          ),
          user(
            7,
            "legacy-owner@snappostpro.com",
            "legacy-owner",
            recent,
            "free",
            "none"
          ),
          user(8, "Bot@Mail.Grokbot.com", "grok", now, "pro", "active"),
          user(
            9,
            "open-id-owner@example.net",
            "owner-open-id",
            recent,
            "free",
            "none"
          ),
          user(10, null, "real-no-email", older, "free", "none"),
        ],
        posts: [
          { userId: 1, status: "draft" },
          { userId: 1, status: "published" },
          { userId: 2, status: "draft" },
          { userId: 4, status: "published" },
          { userId: 5, status: "draft" },
        ],
        integrations: [
          readyIntegration(1, pageToken),
          {
            userId: 2,
            status: "connected",
            pageId: "page-2",
            pageAccessToken: null,
          },
          readyIntegration(5, pageToken),
        ],
        events: [
          event(1, "facebook_connection_clicked", recent),
          event(2, "facebook_connection_clicked", stale),
          event(5, "facebook_connection_clicked", recent),
          event(9, "facebook_connection_clicked", recent),
          event(2, "checkout_started", recent),
          event(null, "checkout_started", recent),
          event(1, "free_posts_exhausted", recent),
          event(3, "free_posts_exhausted", recent),
          event(5, "free_posts_exhausted", recent),
          event(1, "paywall_shown", recent),
          event(2, "paywall_shown", recent),
          event(
            4,
            "upgrade_starter",
            recent,
            JSON.stringify({ promotionCode: "CREATOR-1" })
          ),
          event(
            3,
            "upgrade_pro",
            recent,
            JSON.stringify({ promotionCode: "CREATOR-1" })
          ),
          event(
            1,
            "free_account_created",
            recent,
            JSON.stringify({ landing: "contractors" })
          ),
          event(
            2,
            "free_account_created",
            older,
            JSON.stringify({ landing: "hairdressers" })
          ),
          event(1, "free_account_created", recent, "{"),
          event(
            3,
            "free_account_created",
            stale,
            JSON.stringify({ landing: "contractors" })
          ),
        ],
        referrals: [
          {
            referrerUserId: 1,
            referredUserId: 2,
            signupBonusPosts: 2,
            paidCreditStatus: "qualified",
            paidCreditCents: 1900,
          },
          {
            referrerUserId: 1,
            referredUserId: 4,
            signupBonusPosts: 0,
            paidCreditStatus: "applied",
            paidCreditCents: 1900,
          },
          {
            referrerUserId: 5,
            referredUserId: 1,
            signupBonusPosts: 2,
            paidCreditStatus: "applied",
            paidCreditCents: 1900,
          },
        ],
        tokens: [
          { email: "visitor@example.net", createdAt: recent, usedAt: recent },
          {
            email: "other-visitor@example.net",
            createdAt: recent,
            usedAt: null,
          },
          { email: "owner@snappostpro.com", createdAt: recent, usedAt: recent },
          { email: "late@example.net", createdAt: stale, usedAt: recent },
          { email: "old@example.net", createdAt: stale, usedAt: stale },
        ],
        previewDrafts: [
          {
            createdAt: recent,
            emailRequestedAt: recent,
            claimedAt: recent,
          },
          {
            createdAt: stale,
            emailRequestedAt: recent,
            claimedAt: null,
          },
          {
            createdAt: stale,
            emailRequestedAt: null,
            claimedAt: recent,
          },
          {
            createdAt: stale,
            emailRequestedAt: stale,
            claimedAt: stale,
          },
        ],
        emailReminders: summarizeEmailReminderRows([
          {
            kind: "trial-ending",
            status: "accepted",
            count: 3,
            lastAccepted: recent,
            lastAttempt: older,
          },
          {
            kind: "trial-ending",
            status: "failed",
            count: 1,
            lastAccepted: null,
            lastAttempt: older,
          },
          {
            kind: "trial-ending",
            status: "uncertain",
            count: 2,
            lastAccepted: null,
            lastAttempt: newestReal,
          },
          {
            kind: "trial-ending",
            status: "pending",
            count: 4,
            lastAccepted: null,
            lastAttempt: null,
          },
          {
            kind: "renewal",
            status: "accepted",
            count: 1,
            lastAccepted: older,
            lastAttempt: older,
          },
          {
            kind: "onboarding-welcome",
            status: "accepted",
            count: 9,
            lastAccepted: now,
            lastAttempt: now,
          },
        ]),
      },
      now
    );

    expect(stats.generated_at).toBe("2026-11-26T00:00:00.000Z");
    expect(stats.realAccounts).toEqual({
      count: 5,
      latestCreatedAt: "2026-11-24T08:00:00.000Z",
    });
    expect(stats.subscriberFunnel).toMatchObject({
      accounts: 9,
      freeAccounts: 6,
      activatedAccounts: 3,
      facebookConnectionClicked: 3,
      connectedPages: 1,
      checkoutStarted: 1,
      subscriptionTrials: 1,
      paidSubscribers: 2,
      freePostsExhausted: 2,
      exhaustedNotUpgraded: 1,
      paywallShown: 2,
      promoCodeRedemptions: 2,
      promoCodeRedemptionsByCode: [{ code: "CREATOR-1", count: 2 }],
      referralSignups: 2,
      referralBonusesGranted: 1,
      referralBonusPostsGranted: 2,
      referralPayingCustomers: 2,
      referralCreditsApplied: 1,
      referralCreditsWaiting: 1,
    });
    expect(stats.freePreviewFunnel).toEqual({
      periodDays: 30,
      previewsCreated: 1,
      previewsEmailRequested: 2,
      previewsClaimed: 2,
      freeAccessRequested: 2,
      freeAccessOpened: 2,
      freeAccountsCreated: 6,
      facebookConnectionClicked: 2,
      connectedPages: 1,
      draftsCreated: 2,
      postsPublished: 1,
      landingAccounts: { contractors: 1, hairdressers: 1 },
    });
    expect(stats.emailReminders).toEqual({
      trialExpirationWarnings: {
        sent: 3,
        failed: 3,
        lastRun: "2026-11-24T08:00:00.000Z",
      },
      renewalReminders: {
        sent: 1,
        failed: 0,
        lastRun: "2026-11-16T00:00:00.000Z",
      },
    });

    const serialized = JSON.stringify(stats);
    for (const privateValue of [
      "real-1@example.net",
      "Bot@Mail.Grokbot.com",
      "visitor@example.net",
      "owner@snappostpro.com",
      "page-token-secret",
      "owner-open-id",
      "real-1",
    ]) {
      expect(serialized).not.toContain(privateValue);
    }
    expect(serialized).toContain("CREATOR-1");
    expect(Object.keys(stats).sort()).toEqual([
      "emailReminders",
      "freePreviewFunnel",
      "generated_at",
      "realAccounts",
      "subscriberFunnel",
    ]);
  });
});

describe("email reminder counts", () => {
  it("reads grouped outbox rows and treats a missing table as zero", async () => {
    expect(emptyEmailReminderStats().trialExpirationWarnings.sent).toBe(0);

    const loaded = await loadEmailReminderStats({
      execute: async () => [
        [
          {
            kind: "renewal",
            status: "failed",
            count: "2",
            lastAccepted: null,
            lastAttempt: "2026-11-02T00:00:00.000Z",
          },
        ],
        [],
      ],
    });
    expect(loaded.renewalReminders).toEqual({
      sent: 0,
      failed: 2,
      lastRun: "2026-11-02T00:00:00.000Z",
    });

    const missing = await loadEmailReminderStats({
      execute: async () => {
        throw Object.assign(
          new Error("Table 'snappost.account_email_delivery' doesn't exist"),
          {
            code: "ER_NO_SUCH_TABLE",
            errno: 1146,
          }
        );
      },
    });
    expect(missing).toEqual(emptyEmailReminderStats());

    await expect(
      loadEmailReminderStats({
        execute: async () => {
          throw new Error("connection reset");
        },
      })
    ).rejects.toThrow("connection reset");
  });

  it("recognizes a missing table nested on the driver error", () => {
    expect(isMissingRelation({ errno: 1146, cause: null })).toBe(true);
    expect(
      isMissingRelation(
        new Error("connection reset", { cause: { errno: 999 } })
      )
    ).toBe(false);
    expect(readExecuteRows([{ affectedRows: 1 }, []])).toEqual([]);
    expect(readExecuteRows([[{ kind: "renewal" }], []])).toEqual([
      { kind: "renewal" },
    ]);
  });
});

function user(
  id: number,
  email: string | null,
  openId: string,
  createdAt: Date,
  plan: string,
  subscriptionStatus: string,
  loginMethod = "email_magic_link",
  role = "user"
) {
  return {
    id,
    role,
    plan,
    subscriptionStatus,
    email,
    openId,
    loginMethod,
    createdAt,
  };
}

function readyIntegration(userId: number, pageAccessToken: string) {
  return {
    userId,
    status: "connected",
    pageId: `page-${userId}`,
    pageAccessToken,
  };
}

function event(
  userId: number | null,
  eventType: string,
  createdAt: Date,
  metadata: string | null = null
) {
  return { userId, eventType, metadata, createdAt };
}
