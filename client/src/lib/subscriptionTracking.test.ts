import { describe, expect, it } from "vitest";
import { getSubscriptionTrackingEvents } from "./subscriptionTracking";

describe("getSubscriptionTrackingEvents", () => {
  it("tracks a Stripe-confirmed free trial as StartTrial, not a paid subscription", () => {
    expect(
      getSubscriptionTrackingEvents({
        plan: "starter",
        subscriptionStatus: "trialing",
        conversion: "trial_started",
      }),
    ).toMatchObject({
      metaEvent: "StartTrial",
      googleEvent: "start_trial",
      parameters: { plan: "starter", subscription_status: "trialing" },
    });
  });

  it("tracks an active Stripe-confirmed subscription as Subscribe", () => {
    expect(
      getSubscriptionTrackingEvents({
        plan: "pro",
        subscriptionStatus: "active",
        conversion: "subscription_started",
      }),
    ).toMatchObject({
      metaEvent: "Subscribe",
      googleEvent: "subscribe",
      parameters: { plan: "pro", subscription_status: "active" },
    });
  });
});
