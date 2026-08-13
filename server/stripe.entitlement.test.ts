import { describe, expect, it } from "vitest";
import { entitlementFromSubscription, hasPaidEntitlement } from "./stripe";

function subscription(status: string, priceId: string) {
  return {
    id: "sub_test",
    status,
    items: { data: [{ price: { id: priceId } }] },
  } as any;
}

describe("Stripe subscription entitlements", () => {
  it("only unlocks the mapped plan for active or trialing subscriptions", () => {
    const starter = entitlementFromSubscription(subscription("active", process.env.STRIPE_STARTER_PRICE_ID ?? ""));
    const pro = entitlementFromSubscription(subscription("trialing", process.env.STRIPE_PRO_PRICE_ID ?? ""));

    expect(starter).toMatchObject({ plan: "starter", subscriptionStatus: "active" });
    expect(pro).toMatchObject({ plan: "pro", subscriptionStatus: "trialing" });
    expect(hasPaidEntitlement(starter)).toBe(true);
    expect(hasPaidEntitlement(pro)).toBe(true);
  });

  it("never unlocks a canceled, inactive, or unknown-price subscription", () => {
    const canceled = entitlementFromSubscription(subscription("canceled", process.env.STRIPE_PRO_PRICE_ID ?? ""));
    const pastDue = entitlementFromSubscription(subscription("past_due", process.env.STRIPE_PRO_PRICE_ID ?? ""));
    const unpaid = entitlementFromSubscription(subscription("unpaid", process.env.STRIPE_PRO_PRICE_ID ?? ""));
    const incomplete = entitlementFromSubscription(subscription("incomplete", process.env.STRIPE_PRO_PRICE_ID ?? ""));
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
});
