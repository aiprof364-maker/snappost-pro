import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSend = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({
    emails: { send: mockSend },
  })),
}));

beforeEach(() => {
  vi.resetModules();
  mockSend.mockReset();
  mockSend.mockResolvedValue({ data: { id: "test-email-id" } });
  process.env.RESEND_API_KEY = "test-key";
});

afterEach(() => {
  vi.restoreAllMocks();
});

function lastPayload() {
  return mockSend.mock.calls.at(-1)?.[0] as {
    subject: string;
    html: string;
    to: string;
  };
}

const unsupportedLegacyClaims = /contractor|tradie|tailored to your trade|job site|5\+ hours|more leads|track engagement|before\/after transformations/i;

describe("onboarding email copy", () => {
  it("sends an immediate welcome that drives a new account to Page selection", async () => {
    const { sendOnboardingWelcome } = await import("./email");

    await sendOnboardingWelcome("customer@example.com", "Jamie");

    const email = lastPayload();
    expect(email.subject).toContain("connect your Facebook Page");
    expect(email.html).toContain("Connect your Facebook Page");
    expect(email.html).toContain("https://snappostpro.com/dashboard#facebook-section");
    expect(email.html).toContain("No business Facebook Page yet?");
    expect(email.html).toContain("Use Manus or another AI");
    expect(email.html).toContain("Create and manage the actual Page yourself");
    expect(email.html).toContain("https://www.facebook.com/business/help/473994396650734");
    expect(email.html).not.toMatch(unsupportedLegacyClaims);
  });

  it("uses accurate local-business Day 1 copy", async () => {
    const { sendOnboardingDay1 } = await import("./email");

    await sendOnboardingDay1("customer@example.com", "Jamie");

    const email = lastPayload();
    expect(email.to).toBe("customer@example.com");
    expect(email.subject).toBe("Welcome to SnapPost Pro — connect your Facebook Page");
    expect(email.html).toContain("completed photo");
    expect(email.html).toContain("Connect your Facebook Page");
    expect(email.html).toContain("SnapPost Pro-written caption");
    expect(email.html).toContain("https://snappostpro.com/dashboard#facebook-section");
    expect(email.html).not.toMatch(unsupportedLegacyClaims);
  });

  it("uses accurate local-business Day 3 copy", async () => {
    const { sendOnboardingDay3 } = await import("./email");

    await sendOnboardingDay3("customer@example.com", "Jamie");

    const email = lastPayload();
    expect(email.subject).toBe("Connect your Page, then prepare your next Facebook post");
    expect(email.html).toContain("photo stays yours");
    expect(email.html).toContain("does not alter the finished work");
    expect(email.html).toContain("Connect the one business Page");
    expect(email.html).toContain("Connect your Page and create a post");
    expect(email.html).not.toMatch(unsupportedLegacyClaims);
  });

  it("states only the available plan features in Day 5 copy", async () => {
    const { sendOnboardingDay5 } = await import("./email");

    await sendOnboardingDay5("customer@example.com", "Jamie", "free");

    const email = lastPayload();
    expect(email.subject).toBe("Connect your Page and use your SnapPost Pro posts");
    expect(email.html).toContain("3 branded posts total");
    expect(email.html).not.toContain("3 posts per month");
    expect(email.html).toContain("Starter includes 30 posts per month");
    expect(email.html).toContain("Pro includes 300 posts per month");
    expect(email.html).toContain("One connected Facebook Page");
    expect(email.html).toContain("Post history");
    expect(email.html).toContain("Connect your Page and open SnapPost Pro");
    expect(email.html).not.toMatch(unsupportedLegacyClaims);
  });
});
