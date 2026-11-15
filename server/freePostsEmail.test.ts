import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildFreePostsUsedEmail,
  freePostsEmailSchedule,
  shouldSkipFreePostsEmail,
  shouldSuppressOnboardingEmail,
} from "./freePostsEmail";

const send = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send } })),
}));

beforeEach(() => {
  vi.resetModules();
  send.mockReset();
  send.mockResolvedValue({ data: { id: "accepted-email" } });
  process.env.RESEND_API_KEY = "test-key";
});

describe("free-posts email sequence", () => {
  it("schedules one email now, one after 2 days, and one after 5 days", () => {
    const exhaustedAt = new Date("2026-11-01T00:00:00.000Z");
    const schedule = freePostsEmailSchedule(exhaustedAt);

    expect(schedule.map(step => step.campaignKey)).toEqual([
      "free-posts-used-1:v1",
      "free-posts-used-2:v1",
      "free-posts-used-3:v1",
    ]);
    expect(schedule.map(step => step.availableAt.toISOString())).toEqual([
      "2026-11-01T00:00:00.000Z",
      "2026-11-03T00:00:00.000Z",
      "2026-11-06T00:00:00.000Z",
    ]);
    expect(schedule.map(step => step.subject)).toEqual([
      "Your 3 free SnapPost Pro posts are ready — keep posting",
      "Your branded posts are waiting",
      "Last step to keep posting with SnapPost Pro",
    ]);
  });

  it("skips the sequence after a trial or paid plan has started", () => {
    expect(shouldSkipFreePostsEmail({ plan: "free", subscriptionStatus: "none" })).toBe(false);
    expect(shouldSkipFreePostsEmail({ plan: "free", subscriptionStatus: null })).toBe(false);
    expect(
      shouldSkipFreePostsEmail({
        plan: "free",
        subscriptionStatus: "none",
        stripeCustomerId: "cus_123",
      }),
    ).toBe(true);
    expect(shouldSkipFreePostsEmail({ plan: "starter", subscriptionStatus: "trialing" })).toBe(true);
    expect(shouldSkipFreePostsEmail({ plan: "pro", subscriptionStatus: "active" })).toBe(true);
    expect(shouldSkipFreePostsEmail({ plan: "free", subscriptionStatus: "canceled" })).toBe(true);
    expect(shouldSkipFreePostsEmail({ plan: "starter", subscriptionStatus: "past_due" })).toBe(true);
  });

  it("suppresses pending onboarding mail once the free-posts sequence exists", () => {
    expect(
      shouldSuppressOnboardingEmail({
        kind: "onboarding-day-5",
        hasFreePostsSequence: true,
      }),
    ).toBe(true);
    expect(
      shouldSuppressOnboardingEmail({
        kind: "onboarding-welcome",
        hasFreePostsSequence: false,
      }),
    ).toBe(false);
    expect(
      shouldSuppressOnboardingEmail({
        kind: "free-posts-used-1",
        hasFreePostsSequence: true,
      }),
    ).toBe(false);
  });

  it("keeps each email short, with one plan button and the trial only when eligible", () => {
    const eligible = buildFreePostsUsedEmail("free-posts-used-1", {
      userName: "Jamie",
      trialEligible: true,
    });
    expect(eligible.subject).toBe(
      "Your 3 free SnapPost Pro posts are ready — keep posting",
    );
    expect(eligible.html).toContain("Starter is $19/mo and Pro is $29/mo.");
    expect(eligible.html).toContain("7-day trial");
    expect(eligible.html).toContain("https://snappostpro.com/pricing");
    expect(eligible.html.match(/Choose a plan/g)).toHaveLength(1);
    expect(eligible.html.match(/background:#6366f1/g)).toHaveLength(1);

    const ineligible = buildFreePostsUsedEmail("free-posts-used-3", {
      userName: "<Jamie>",
      trialEligible: false,
    });
    expect(ineligible.subject).toBe("Last step to keep posting with SnapPost Pro");
    expect(ineligible.html).toContain("Starter is $19/mo and Pro is $29/mo.");
    expect(ineligible.html).not.toContain("7-day");
    expect(ineligible.html).toContain("&lt;Jamie&gt;");
    expect(ineligible.html.match(/Choose a plan/g)).toHaveLength(1);
  });

  it("sends the queued kind through the account email sender", async () => {
    const { sendAccountEmail } = await import("./email");
    await sendAccountEmail(
      "free-posts-used-2",
      {
        email: "customer@example.com",
        userName: "Jamie",
        plan: "free",
        trialEligible: true,
      },
      "free-posts-test",
    );

    const message = send.mock.calls.at(-1)?.[0] as { subject: string; html: string };
    expect(message.subject).toBe("Your branded posts are waiting");
    expect(message.html).toContain("Choose a plan");
    expect(message.html).toContain("$19/mo");
    expect(message.html).toContain("$29/mo");
    expect(message.html).toContain("7-day trial");
  });
});
