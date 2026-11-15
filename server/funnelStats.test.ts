import { describe, expect, it } from "vitest";
import { summarizeFreeToPaidFunnel } from "./funnelStats";

describe("free-to-paid funnel", () => {
  it("counts exhausted accounts that have not upgraded, and redemptions per creator code", () => {
    const summary = summarizeFreeToPaidFunnel(
      [
        { id: 1, role: "user", plan: "free", subscriptionStatus: "none" },
        { id: 2, role: "user", plan: "starter", subscriptionStatus: "trialing" },
        { id: 3, role: "user", plan: "pro", subscriptionStatus: "active" },
        { id: 4, role: "admin", plan: "free", subscriptionStatus: "none" },
      ],
      [
        { userId: 1, eventType: "free_posts_exhausted", metadata: null },
        { userId: 1, eventType: "paywall_shown", metadata: null },
        { userId: 2, eventType: "free_posts_exhausted", metadata: null },
        { userId: 2, eventType: "paywall_shown", metadata: null },
        {
          userId: 2,
          eventType: "upgrade_starter",
          metadata: JSON.stringify({ promotionCode: "CREATOR-1", plan: "starter" }),
        },
        {
          userId: 3,
          eventType: "upgrade_pro",
          metadata: JSON.stringify({ promotionCode: "CREATOR-1" }),
        },
        {
          userId: 3,
          eventType: "checkout_started",
          metadata: JSON.stringify({ promotionCode: "NOT-A-REDEMPTION" }),
        },
        { userId: 4, eventType: "free_posts_exhausted", metadata: null },
      ],
    );

    expect(summary.freePostsExhausted).toBe(2);
    expect(summary.exhaustedNotUpgraded).toBe(1);
    expect(summary.paywallShown).toBe(2);
    expect(summary.promoCodeRedemptions).toBe(2);
    expect(summary.promoCodeRedemptionsByCode).toEqual([{ code: "CREATOR-1", count: 2 }]);
  });
});
