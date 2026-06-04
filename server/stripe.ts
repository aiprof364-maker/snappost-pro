import Stripe from "stripe";
import type { PlanId } from "@shared/const";

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
