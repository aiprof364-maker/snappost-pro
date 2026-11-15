import { describe, expect, it } from "vitest";
import { REFERRAL_DEFAULTS } from "./referrals";
import {
  canonicalEmail,
  claimedPostImages,
  evaluatePaidCredit,
  evaluateReferralSignup,
  formatReferralCredit,
  normalizeReferralCode,
  postCreationLimit,
  presentPostForAccount,
  publishableCaption,
  publishableImageKey,
  referralBalanceTransaction,
  showsSnapPostMark,
  summarizeReferralFunnel,
  withSnapPostCaptionFooter,
} from "./referrals";

const referrer = { id: 1, email: "owner@shop.test", role: "user" };
const referred = { id: 2, email: "new@shop.test", role: "user" };

describe("referral signup rules", () => {
  it("grants the configured bonus and then tracks signups without more posts", () => {
    expect(
      evaluateReferralSignup({
        referrer,
        referred,
        rewardedSignupCount: 0,
      })
    ).toEqual({ accept: true, bonusPosts: REFERRAL_DEFAULTS.signupBonusPosts });

    expect(
      evaluateReferralSignup({
        referrer,
        referred,
        rewardedSignupCount: REFERRAL_DEFAULTS.maxSignupBonuses,
      })
    ).toEqual({ accept: true, bonusPosts: 0 });
  });

  it("rejects self-referrals, aliases, admins, and unknown codes", () => {
    expect(
      evaluateReferralSignup({
        referrer: null,
        referred,
        rewardedSignupCount: 0,
      })
    ).toEqual({ accept: false, reason: "missing_referrer" });
    expect(
      evaluateReferralSignup({
        referrer,
        referred: { ...referred, id: referrer.id },
        rewardedSignupCount: 0,
      })
    ).toEqual({ accept: false, reason: "self" });
    expect(
      evaluateReferralSignup({
        referrer: { ...referrer, email: "Owner+ads@gmail.com" },
        referred: { ...referred, email: "owner@googlemail.com" },
        rewardedSignupCount: 0,
      })
    ).toEqual({ accept: false, reason: "same_email" });
    expect(
      evaluateReferralSignup({
        referrer: { ...referrer, role: "admin" },
        referred,
        rewardedSignupCount: 0,
      })
    ).toEqual({ accept: false, reason: "admin" });
    expect(canonicalEmail("a.b+c@gmail.com")).toBe("ab@gmail.com");
    expect(canonicalEmail("a.b+c@shop.test")).toBe("a.b@shop.test");
  });

  it("accepts only unguessable-looking codes", () => {
    expect(normalizeReferralCode(" ab12cd34 ")).toBe("AB12CD34");
    expect(normalizeReferralCode("short")).toBeNull();
    expect(normalizeReferralCode("has space")).toBeNull();
    expect(normalizeReferralCode("bad_code")).toBeNull();
  });
});

describe("referral paid credit", () => {
  const base = {
    paidCreditStatus: "pending" as const,
    appliedPaidCreditCount: 0,
    referrerStripeCustomerId: "cus_referrer",
    referredStripeCustomerId: "cus_referred",
  };

  it("waits through a trial and a zero-dollar invoice", () => {
    expect(
      evaluatePaidCredit({
        ...base,
        amountPaidCents: 0,
        subscriptionStatus: "trialing",
        billingReason: "subscription_create",
      })
    ).toEqual({ action: "ignore" });
    expect(
      evaluatePaidCredit({
        ...base,
        amountPaidCents: 1900,
        subscriptionStatus: "trialing",
        billingReason: "subscription_create",
      })
    ).toEqual({ action: "ignore" });
  });

  it("credits one configured month as a negative Stripe balance once they pay", () => {
    const decision = evaluatePaidCredit({
      ...base,
      amountPaidCents: 2900,
      subscriptionStatus: "active",
      billingReason: "subscription_cycle",
    });
    expect(decision).toEqual({
      action: "apply",
      amountCents: 1900,
      currency: "usd",
    });
    if (decision.action !== "apply") return;
    expect(
      referralBalanceTransaction({
        amountCents: decision.amountCents,
        currency: decision.currency,
        referralId: 9,
        referredUserId: 2,
      }).amount
    ).toBe(-1900);
  });

  it("holds the credit until the referrer has a Stripe customer, and does not pay twice", () => {
    expect(
      evaluatePaidCredit({
        ...base,
        referrerStripeCustomerId: null,
        amountPaidCents: 1900,
        subscriptionStatus: "active",
        billingReason: "subscription_create",
      })
    ).toEqual({ action: "qualify" });
    expect(
      evaluatePaidCredit({
        ...base,
        paidCreditStatus: "qualified",
        amountPaidCents: 0,
        subscriptionStatus: null,
        billingReason: null,
      })
    ).toEqual({ action: "apply", amountCents: 1900, currency: "usd" });
    expect(
      evaluatePaidCredit({
        ...base,
        paidCreditStatus: "applied",
        amountPaidCents: 1900,
        subscriptionStatus: "active",
        billingReason: "subscription_cycle",
      })
    ).toEqual({ action: "ignore" });
  });

  it("skips shared customers and credits past the cap", () => {
    expect(
      evaluatePaidCredit({
        ...base,
        referredStripeCustomerId: "cus_referrer",
        amountPaidCents: 1900,
        subscriptionStatus: "active",
        billingReason: "subscription_update",
      })
    ).toEqual({ action: "skip", reason: "same_customer" });
    expect(
      evaluatePaidCredit({
        ...base,
        appliedPaidCreditCount: REFERRAL_DEFAULTS.maxPaidCredits,
        amountPaidCents: 1900,
        subscriptionStatus: "active",
        billingReason: "subscription_create",
      })
    ).toEqual({ action: "skip", reason: "cap" });
    expect(
      evaluatePaidCredit({
        ...base,
        amountPaidCents: 1900,
        subscriptionStatus: "past_due",
        billingReason: "subscription_cycle",
      })
    ).toEqual({ action: "ignore" });
  });
});

describe("SnapPost mark visibility", () => {
  it("shows the mark and referral footer only for free accounts", () => {
    expect(showsSnapPostMark({ plan: "free", subscriptionStatus: "none" })).toBe(
      true
    );
    expect(
      showsSnapPostMark({ plan: "free", subscriptionStatus: "canceled" })
    ).toBe(true);
    expect(
      showsSnapPostMark({ plan: "starter", subscriptionStatus: "trialing" })
    ).toBe(false);
    expect(
      showsSnapPostMark({ plan: "starter", subscriptionStatus: "active" })
    ).toBe(false);
    expect(showsSnapPostMark({ plan: "pro", subscriptionStatus: "past_due" })).toBe(
      false
    );
    expect(showsSnapPostMark({ plan: "free", subscriptionStatus: "trialing" })).toBe(
      false
    );

    const freeCaption = withSnapPostCaptionFooter("Deck finished.", {
      include: true,
      referralUrl: "https://snappostpro.com/?ref=AB12CD34",
    });
    expect(freeCaption).toBe(
      "Deck finished.\n\nMade with SnapPost · snappostpro.com/?ref=AB12CD34"
    );
    expect(
      withSnapPostCaptionFooter(freeCaption, {
        include: true,
        referralUrl: "https://snappostpro.com/?ref=AB12CD34",
      })
    ).toBe(freeCaption);
    expect(
      withSnapPostCaptionFooter(freeCaption, { include: false })
    ).toBe("Deck finished.");
  });

  it("publishes the clean image and caption for trial and paid accounts", () => {
    const post = {
      caption: "Job done.\n\nMade with SnapPost · snappostpro.com/?ref=AB12CD34",
      brandedImageKey: "clean.jpg",
      brandedImageUrl: "https://cdn.example/clean.jpg",
      markedImageKey: "marked.jpg",
      markedImageUrl: "https://cdn.example/marked.jpg",
      originalImageKey: "original.jpg",
    };
    const trial = { plan: "starter", subscriptionStatus: "trialing" };
    const paid = { plan: "pro", subscriptionStatus: "active" };
    const free = { plan: "free", subscriptionStatus: "none" };

    expect(publishableImageKey(post, trial)).toBe("clean.jpg");
    expect(publishableImageKey(post, paid)).toBe("clean.jpg");
    expect(publishableImageKey(post, free)).toBe("marked.jpg");
    expect(publishableCaption(post.caption, trial)).toBe("Job done.");
    expect(publishableCaption(post.caption, free)).toContain("?ref=AB12CD34");

    expect(presentPostForAccount(post, paid).brandedImageUrl).toBe(
      "https://cdn.example/clean.jpg"
    );
    expect(presentPostForAccount(post, paid).markedImageUrl).toBeNull();
    expect(presentPostForAccount(post, trial).caption).toBe("Job done.");
    expect(presentPostForAccount(post, free).brandedImageUrl).toBe(
      "https://cdn.example/marked.jpg"
    );

    expect(
      claimedPostImages({
        account: trial,
        markedKey: "marked.jpg",
        markedUrl: "https://cdn.example/marked.jpg",
        cleanKey: "clean.jpg",
        cleanUrl: "https://cdn.example/clean.jpg",
      }).markedImageKey
    ).toBeNull();
    expect(
      claimedPostImages({
        account: free,
        markedKey: "marked.jpg",
        markedUrl: "https://cdn.example/marked.jpg",
        cleanKey: "clean.jpg",
        cleanUrl: "https://cdn.example/clean.jpg",
      }).markedImageKey
    ).toBe("marked.jpg");
  });

  it("adds referral posts only to the free allowance", () => {
    expect(postCreationLimit("free", 4)).toBe(7);
    expect(postCreationLimit("starter", 4)).toBe(30);
    expect(postCreationLimit("pro", 0)).toBe(300);
    expect(formatReferralCredit(1900)).toBe("$19");
  });
});

describe("referral funnel", () => {
  it("counts signups, bonuses, and paid credits without admin accounts", () => {
    const summary = summarizeReferralFunnel(
      [
        {
          referrerUserId: 1,
          referredUserId: 2,
          signupBonusPosts: 2,
          paidCreditStatus: "applied",
          paidCreditCents: 1900,
        },
        {
          referrerUserId: 1,
          referredUserId: 3,
          signupBonusPosts: 2,
          paidCreditStatus: "qualified",
          paidCreditCents: 0,
        },
        {
          referrerUserId: 1,
          referredUserId: 4,
          signupBonusPosts: 0,
          paidCreditStatus: "pending",
          paidCreditCents: 0,
        },
        {
          referrerUserId: 9,
          referredUserId: 8,
          signupBonusPosts: 2,
          paidCreditStatus: "applied",
          paidCreditCents: 1900,
        },
      ],
      new Set([1, 2, 3, 4])
    );
    expect(summary).toEqual({
      referralSignups: 3,
      referralBonusesGranted: 2,
      referralBonusPostsGranted: 4,
      referralPayingCustomers: 2,
      referralCreditsApplied: 1,
      referralCreditsWaiting: 1,
    });
  });
});
