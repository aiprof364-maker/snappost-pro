export const FIRST_TIME_TRIAL_DAYS = 7;

export type TrialBlocker =
  | "stripe_history"
  | "email_claimed"
  | "facebook_page_claimed";

export type TrialEligibility = {
  eligible: boolean;
  blocker?: TrialBlocker;
};

/**
 * A customer can receive one introductory trial only. A completed Stripe
 * checkout, prior email claim, or reused business Page ends eligibility.
 * A connected Facebook Page is not required to start that trial.
 */
export function determineTrialEligibility(input: {
  hasStripeBillingHistory: boolean;
  hasEmailClaim: boolean;
  hasFacebookPageClaim: boolean;
}): TrialEligibility {
  if (input.hasStripeBillingHistory) {
    return { eligible: false, blocker: "stripe_history" };
  }
  if (input.hasEmailClaim) {
    return { eligible: false, blocker: "email_claimed" };
  }
  if (input.hasFacebookPageClaim) {
    return { eligible: false, blocker: "facebook_page_claimed" };
  }
  return { eligible: true };
}

export function getCheckoutTrialData(trialEligible: boolean) {
  return trialEligible ? { trial_period_days: FIRST_TIME_TRIAL_DAYS } : {};
}

/**
 * Checkout can start the one introductory trial before a Facebook Page is
 * connected. Publishing still needs a Page, and trial_claims still allow only
 * one trial per email.
 */
export function getTrialCheckoutBlock(_input: {
  trialEligible: boolean;
  facebookPageId?: string | null;
}): "facebook_page_required" | null {
  return null;
}
