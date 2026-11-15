import { afterEach, describe, expect, it } from "vitest";
import { REFERRAL_DEFAULTS } from "@shared/referrals";
import { getReferralConfig } from "./referralConfig";

const KEYS = [
  "REFERRAL_SIGNUP_BONUS_POSTS",
  "REFERRAL_MAX_SIGNUP_BONUSES",
  "REFERRAL_PAID_CREDIT_CENTS",
  "REFERRAL_MAX_PAID_CREDITS",
] as const;

afterEach(() => {
  for (const key of KEYS) delete process.env[key];
});

describe("referral config", () => {
  it("uses the defaults when env vars are unset or invalid", () => {
    expect(getReferralConfig()).toEqual(REFERRAL_DEFAULTS);
    process.env.REFERRAL_PAID_CREDIT_CENTS = "nope";
    process.env.REFERRAL_SIGNUP_BONUS_POSTS = "-3";
    expect(getReferralConfig().paidCreditCents).toBe(1900);
    expect(getReferralConfig().signupBonusPosts).toBe(0);
  });

  it("accepts integer overrides inside the allowed range", () => {
    process.env.REFERRAL_SIGNUP_BONUS_POSTS = "4";
    process.env.REFERRAL_MAX_SIGNUP_BONUSES = "25";
    process.env.REFERRAL_PAID_CREDIT_CENTS = "2900";
    process.env.REFERRAL_MAX_PAID_CREDITS = "3";
    expect(getReferralConfig()).toMatchObject({
      signupBonusPosts: 4,
      maxSignupBonuses: 25,
      paidCreditCents: 2900,
      maxPaidCredits: 3,
      currency: "usd",
    });
  });
});
