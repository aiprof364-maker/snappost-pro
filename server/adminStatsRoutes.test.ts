import express from "express";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerAdminStatsRoutes } from "./adminStatsRoutes";
import type { AdminStats } from "./adminStats";

const token = "stats-token";
const stats: AdminStats = {
  generated_at: "2026-11-26T00:00:00.000Z",
  realAccounts: {
    count: 1,
    latestCreatedAt: "2026-11-20T00:00:00.000Z",
  },
  subscriberFunnel: {
    accounts: 1,
    freeAccounts: 1,
    activatedAccounts: 0,
    facebookConnectionClicked: 0,
    connectedPages: 0,
    checkoutStarted: 0,
    subscriptionTrials: 0,
    paidSubscribers: 0,
    freePostsExhausted: 0,
    exhaustedNotUpgraded: 0,
    paywallShown: 0,
    promoCodeRedemptions: 0,
    promoCodeRedemptionsByCode: [],
    referralSignups: 0,
    referralBonusesGranted: 0,
    referralBonusPostsGranted: 0,
    referralPayingCustomers: 0,
    referralCreditsApplied: 0,
    referralCreditsWaiting: 0,
  },
  freePreviewFunnel: {
    periodDays: 30,
    previewsCreated: 0,
    previewsEmailRequested: 0,
    previewsClaimed: 0,
    freeAccessRequested: 0,
    freeAccessOpened: 0,
    freeAccountsCreated: 0,
    facebookConnectionClicked: 0,
    connectedPages: 0,
    draftsCreated: 0,
    postsPublished: 0,
    landingAccounts: { contractors: 0, hairdressers: 0 },
  },
  emailReminders: {
    trialExpirationWarnings: { sent: 0, failed: 0, lastRun: null },
    renewalReminders: { sent: 0, failed: 0, lastRun: null },
    previewDay1Reminders: { sent: 0, failed: 0, lastRun: null },
    previewDay3Reminders: { sent: 0, failed: 0, lastRun: null },
  },
};

let server: Server;
let origin: string;
let loads = 0;
const originalToken = process.env.ADMIN_STATS_TOKEN;

beforeAll(async () => {
  const app = express();
  registerAdminStatsRoutes(app, {
    loadStats: async () => {
      loads += 1;
      return stats;
    },
    now: () => new Date("2026-11-26T00:00:00.000Z"),
  });
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

beforeEach(() => {
  loads = 0;
  process.env.ADMIN_STATS_TOKEN = token;
});

afterAll(async () => {
  if (originalToken === undefined) delete process.env.ADMIN_STATS_TOKEN;
  else process.env.ADMIN_STATS_TOKEN = originalToken;
  await new Promise<void>((resolve, reject) =>
    server.close(err => (err ? reject(err) : resolve()))
  );
});

async function getStats(authorization?: string, path = "/api/admin/stats") {
  return fetch(`${origin}${path}`, {
    headers: authorization ? { authorization } : undefined,
  });
}

describe("GET /api/admin/stats", () => {
  it("is registered before the production SPA shell", () => {
    const source = readFileSync(
      resolve(process.cwd(), "server/_core/index.ts"),
      "utf8"
    );
    const registerAt = source.indexOf("registerAdminStatsRoutes(app)");
    const staticAt = source.indexOf("serveStatic(app)");
    expect(registerAt).toBeGreaterThan(-1);
    expect(staticAt).toBeGreaterThan(registerAt);
  });

  it("is disabled when the token is not configured", async () => {
    delete process.env.ADMIN_STATS_TOKEN;
    const response = await getStats(`Bearer ${token}`);
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "not_found" });
    expect(loads).toBe(0);
  });

  it("rejects a missing or wrong bearer token before reading the database", async () => {
    const missing = await getStats();
    expect(missing.status).toBe(401);
    expect(missing.headers.get("www-authenticate")).toBe("Bearer");
    expect(await missing.json()).toEqual({ error: "unauthorized" });

    const wrong = await getStats("Bearer short");
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toEqual({ error: "unauthorized" });

    const queryToken = await getStats(
      undefined,
      `/api/admin/stats?access_token=${token}`
    );
    expect(queryToken.status).toBe(401);
    expect(loads).toBe(0);
  });

  it("returns the dashboard counts and does not echo the token", async () => {
    const response = await getStats(`bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body).toEqual(stats);
    expect(JSON.stringify(body)).not.toContain(token);
    expect(loads).toBe(1);
  });

  it("returns unavailable when the read fails", async () => {
    const app = express();
    registerAdminStatsRoutes(app, {
      loadStats: async () => {
        throw new Error("database unavailable");
      },
    });
    const failed = createServer(app);
    await new Promise<void>(resolve => failed.listen(0, "127.0.0.1", resolve));
    const failedOrigin = `http://127.0.0.1:${(failed.address() as AddressInfo).port}`;
    try {
      const response = await fetch(`${failedOrigin}/api/admin/stats`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const body = await response.json();
      expect(response.status).toBe(503);
      expect(body).toEqual({ error: "unavailable" });
      expect(JSON.stringify(body)).not.toContain("database unavailable");
    } finally {
      await new Promise<void>((resolve, reject) =>
        failed.close(err => (err ? reject(err) : resolve()))
      );
    }
  });
});
