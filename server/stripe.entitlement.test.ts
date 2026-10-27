import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  entitlementFromSubscription,
  getVerifiedCheckoutOutcome,
  hasPaidEntitlement,
} from "./stripe";

const originalStarterPriceId = process.env.STRIPE_STARTER_PRICE_ID;
const originalProPriceId = process.env.STRIPE_PRO_PRICE_ID;

function subscription(status: string, priceId: string) {
  return {
    id: "sub_test",
    status,
    items: { data: [{ price: { id: priceId } }] },
  } as any;
}

describe("Stripe subscription entitlements", () => {
  beforeEach(() => {
    process.env.STRIPE_STARTER_PRICE_ID = "price_starter_test";
    process.env.STRIPE_PRO_PRICE_ID = "price_pro_test";
  });

  afterEach(() => {
    if (originalStarterPriceId === undefined) delete process.env.STRIPE_STARTER_PRICE_ID;
    else process.env.STRIPE_STARTER_PRICE_ID = originalStarterPriceId;
    if (originalProPriceId === undefined) delete process.env.STRIPE_PRO_PRICE_ID;
    else process.env.STRIPE_PRO_PRICE_ID = originalProPriceId;
  });

  it("only unlocks the mapped plan for active or trialing subscriptions", () => {
    const starter = entitlementFromSubscription(subscription("active", "price_starter_test"));
    const pro = entitlementFromSubscription(subscription("trialing", "price_pro_test"));

    expect(starter).toMatchObject({ plan: "starter", subscriptionStatus: "active" });
    expect(pro).toMatchObject({ plan: "pro", subscriptionStatus: "trialing" });
    expect(hasPaidEntitlement(starter)).toBe(true);
    expect(hasPaidEntitlement(pro)).toBe(true);
  });

  it("never unlocks a canceled, inactive, or unknown-price subscription", () => {
    const canceled = entitlementFromSubscription(subscription("canceled", "price_pro_test"));
    const pastDue = entitlementFromSubscription(subscription("past_due", "price_pro_test"));
    const unpaid = entitlementFromSubscription(subscription("unpaid", "price_pro_test"));
    const incomplete = entitlementFromSubscription(subscription("incomplete", "price_pro_test"));
    const unknown = entitlementFromSubscription(subscription("active", "price_unknown"));

    expect(canceled.plan).toBe("free");
    expect(pastDue.plan).toBe("free");
    expect(unpaid.plan).toBe("free");
    expect(incomplete.plan).toBe("free");
    expect(unknown.plan).toBe("free");
    expect(hasPaidEntitlement(canceled)).toBe(false);
    expect(hasPaidEntitlement(pastDue)).toBe(false);
    expect(hasPaidEntitlement(unpaid)).toBe(false);
    expect(hasPaidEntitlement(incomplete)).toBe(false);
    expect(hasPaidEntitlement(unknown)).toBe(false);
  });

  it("returns a checkout conversion only for its signed-in owner and an entitled plan", () => {
    const session = {
      client_reference_id: "42",
      metadata: { userId: "42" },
    } as any;

    expect(
      getVerifiedCheckoutOutcome(session, subscription("trialing", "price_starter_test"), 42),
    ).toMatchObject({
      plan: "starter",
      subscriptionStatus: "trialing",
      conversion: "trial_started",
    });
    expect(
      getVerifiedCheckoutOutcome(session, subscription("active", "price_pro_test"), 42),
    ).toMatchObject({
      plan: "pro",
      subscriptionStatus: "active",
      conversion: "subscription_started",
    });
    expect(
      getVerifiedCheckoutOutcome(session, subscription("active", "price_pro_test"), 7),
    ).toBeNull();
    expect(
      getVerifiedCheckoutOutcome(session, subscription("canceled", "price_pro_test"), 42),
    ).toBeNull();
  });
});
