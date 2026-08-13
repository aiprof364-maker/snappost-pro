import Stripe from "stripe";
import type { PlanId } from "@shared/const";
import type { User } from "../drizzle/schema";
import { updateUserSubscription } from "./db";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!_stripe) {
    _stripe = new Stripe(key, { apiVersion: "2025-03-31.basil" as any });
  }
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Resolve the configured Stripe price id for a plan. */
export function getPriceId(plan: PlanId): string | null {
  if (plan === "starter") return process.env.STRIPE_STARTER_PRICE_ID ?? null;
  if (plan === "pro") return process.env.STRIPE_PRO_PRICE_ID ?? null;
  return null;
}

/** Map a Stripe price id back to our plan id. */
export function planFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return "starter";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  return null;
}

export type SubscriptionEntitlement = {
  plan: "free" | PlanId;
  subscriptionStatus: string;
  stripeSubscriptionId?: string;
};

export function hasPaidEntitlement(entitlement: Pick<SubscriptionEntitlement, "plan" | "subscriptionStatus">) {
  return entitlement.plan !== "free" && ["active", "trialing"].includes(entitlement.subscriptionStatus);
}

/** Map a Stripe subscription to the only plan it is entitled to unlock. */
export function entitlementFromSubscription(
  subscription: Pick<Stripe.Subscription, "id" | "status" | "items">,
): SubscriptionEntitlement {
  const priceId = subscription.items.data[0]?.price.id;
  const mappedPlan = planFromPriceId(priceId);
  const paid = Boolean(mappedPlan) && ["active", "trialing"].includes(subscription.status);

  return {
    plan: paid && mappedPlan ? mappedPlan : "free",
    subscriptionStatus: subscription.status,
    stripeSubscriptionId: subscription.id,
  };
}

/**
 * Read Stripe as the authority for an existing customer. A canceled, unpaid,
 * or unknown-price subscription never unlocks a paid SnapPost Pro plan.
 */
export async function getCustomerEntitlement(customerId: string): Promise<SubscriptionEntitlement | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });

  const entitled = subscriptions.data
    .map(subscription => entitlementFromSubscription(subscription))
    .filter(hasPaidEntitlement)
    .sort((a, b) => Number(b.plan === "pro") - Number(a.plan === "pro"));

  if (entitled[0]) return entitled[0];

  const latest = subscriptions.data.sort((a, b) => b.created - a.created)[0];
  return {
    plan: "free",
    subscriptionStatus: latest?.status ?? "none",
    stripeSubscriptionId: latest?.id,
  };
}

/** Reconcile a stored user row before using it for UI or usage entitlements. */
export async function reconcileUserSubscription(user: User | undefined) {
  if (!user?.stripeCustomerId) return user;

  const entitlement = await getCustomerEntitlement(user.stripeCustomerId);
  if (!entitlement) return user;

  if (
    user.plan !== entitlement.plan ||
    user.subscriptionStatus !== entitlement.subscriptionStatus ||
    user.stripeSubscriptionId !== entitlement.stripeSubscriptionId
  ) {
    await updateUserSubscription(user.id, entitlement);
    return { ...user, ...entitlement };
  }

  return user;
}
