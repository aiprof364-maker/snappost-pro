import { describe, expect, it } from "vitest";
import { TRIAL_SUMMARY } from "./trialCopy";

describe("TRIAL_SUMMARY", () => {
  it("does not claim the Stripe subscription trial can start without a card", () => {
    expect(TRIAL_SUMMARY).toBe(
      "7-day free trial · Card required to start · Cancel anytime",
    );
    expect(TRIAL_SUMMARY).not.toContain("No credit card required");
  });
});
