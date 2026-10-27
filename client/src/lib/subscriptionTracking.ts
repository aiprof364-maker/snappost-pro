export type VerifiedSubscriptionCheckout = {
  plan: "starter" | "pro";
  subscriptionStatus: "trialing" | "active";
  conversion: "trial_started" | "subscription_started";
};

/**
 * Map an already Stripe-verified checkout to non-identifying browser analytics.
 * A trial is not reported as a paid purchase before its first charge succeeds.
 */
export function getSubscriptionTrackingEvents(
  checkout: VerifiedSubscriptionCheckout,
) {
  const isTrial = checkout.conversion === "trial_started";
  return {
    metaEvent: isTrial ? ("StartTrial" as const) : ("Subscribe" as const),
    googleEvent: isTrial ? "start_trial" : "subscribe",
    parameters: {
      plan: checkout.plan,
      subscription_status: checkout.subscriptionStatus,
    },
  };
}
