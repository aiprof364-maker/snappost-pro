import { describe, expect, it } from "vitest";
import {
  FIRST_TIME_TRIAL_DAYS,
  determineTrialEligibility,
  getCheckoutTrialData,
} from "./trialEligibility";

describe("single-trial eligibility", () => {
  it("grants a 7-day trial only to a new email and new Facebook Page without billing history", () => {
    expect(
      determineTrialEligibility({
        hasStripeBillingHistory: false,
        hasEmailClaim: false,
        hasFacebookPageClaim: false,
      }),
    ).toEqual({ eligible: true });
    expect(getCheckoutTrialData(true)).toEqual({
      trial_period_days: FIRST_TIME_TRIAL_DAYS,
    });
  });

  it("withholds another trial after any prior completed billing relationship", () => {
    expect(
      determineTrialEligibility({
        hasStripeBillingHistory: true,
        hasEmailClaim: false,
        hasFacebookPageClaim: false,
      }),
    ).toEqual({ eligible: false, blocker: "stripe_history" });
    expect(getCheckoutTrialData(false)).toEqual({});
  });

  it("withholds another trial for a reused email or Facebook business Page", () => {
    expect(
      determineTrialEligibility({
        hasStripeBillingHistory: false,
        hasEmailClaim: true,
        hasFacebookPageClaim: false,
      }),
    ).toEqual({ eligible: false, blocker: "email_claimed" });
    expect(
      determineTrialEligibility({
        hasStripeBillingHistory: false,
        hasEmailClaim: false,
        hasFacebookPageClaim: true,
      }),
    ).toEqual({ eligible: false, blocker: "facebook_page_claimed" });
  });
});
