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
  it("uses accurate local-business Day 1 copy", async () => {
    const { sendOnboardingDay1 } = await import("./email");

    await sendOnboardingDay1("customer@example.com", "Jamie");

    const email = lastPayload();
    expect(email.to).toBe("customer@example.com");
    expect(email.subject).toBe("Welcome to SnapPost Pro — create your first branded post");
    expect(email.html).toContain("completed photo");
    expect(email.html).toContain("caption you can edit before posting");
    expect(email.html).toContain("connected Facebook Page");
    expect(email.html).not.toMatch(unsupportedLegacyClaims);
  });

  it("uses accurate local-business Day 3 copy", async () => {
    const { sendOnboardingDay3 } = await import("./email");

    await sendOnboardingDay3("customer@example.com", "Jamie");

    const email = lastPayload();
    expect(email.subject).toBe("A simple way to prepare your next Facebook post");
    expect(email.html).toContain("photo stays yours");
    expect(email.html).toContain("does not alter the finished work");
    expect(email.html).toContain("caption before publishing");
    expect(email.html).not.toMatch(unsupportedLegacyClaims);
  });

  it("states only the available plan features in Day 5 copy", async () => {
    const { sendOnboardingDay5 } = await import("./email");

    await sendOnboardingDay5("customer@example.com", "Jamie", "free");

    const email = lastPayload();
    expect(email.subject).toBe("Your SnapPost Pro plan and next post");
    expect(email.html).toContain("3 posts per month");
    expect(email.html).toContain("Starter includes 30 posts per month");
    expect(email.html).toContain("Pro includes 300 posts per month");
    expect(email.html).toContain("One connected Facebook Page");
    expect(email.html).toContain("Post history");
    expect(email.html).not.toMatch(unsupportedLegacyClaims);
  });
});
