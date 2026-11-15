import { REFERRAL_DEFAULTS, type ReferralConfig } from "@shared/referrals";

function readInt(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** Amounts used by referral rewards. Invalid env values fall back to the default. */
export function getReferralConfig(): ReferralConfig {
  return {
    signupBonusPosts: readInt(
      "REFERRAL_SIGNUP_BONUS_POSTS",
      REFERRAL_DEFAULTS.signupBonusPosts,
      0,
      100
    ),
    maxSignupBonuses: readInt(
      "REFERRAL_MAX_SIGNUP_BONUSES",
      REFERRAL_DEFAULTS.maxSignupBonuses,
      0,
      10_000
    ),
    paidCreditCents: readInt(
      "REFERRAL_PAID_CREDIT_CENTS",
      REFERRAL_DEFAULTS.paidCreditCents,
      0,
      1_000_000
    ),
    maxPaidCredits: readInt(
      "REFERRAL_MAX_PAID_CREDITS",
      REFERRAL_DEFAULTS.maxPaidCredits,
      0,
      10_000
    ),
    currency: "usd",
  };
}
