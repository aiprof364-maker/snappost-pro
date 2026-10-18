import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send } })),
}));

beforeEach(() => {
  vi.resetModules();
  send.mockReset();
  send.mockResolvedValue({ data: { id: "accepted-email" } });
  process.env.RESEND_API_KEY = "test-key";
  delete process.env.SUPPORT_REPLY_TO;
});

function payload() {
  return send.mock.calls.at(-1)?.[0] as { subject: string; html: string; replyTo?: string };
}

describe("account email copy", () => {
  it("uses real trial context instead of an invented monthly billing date", async () => {
    const { sendPurchaseConfirmation } = await import("./email");
    await sendPurchaseConfirmation({
      email: "customer@example.com",
      userName: "Jamie",
      plan: "starter",
      subscriptionStatus: "trialing",
      trialEndsAt: new Date("2026-10-25T00:00:00.000Z"),
    }, "purchase-test");

    const message = payload();
    expect(message.subject).toBe("Welcome to SnapPost Pro Starter");
    expect(message.html).toContain("7-day trial is active");
    expect(message.html).not.toContain("Next billing date");
    expect(message.replyTo).toBe("support@snappostpro.com");
  });

  it("uses the local-business verification description", async () => {
    const { sendEmailVerification } = await import("./email");
    await sendEmailVerification("customer@example.com", "Jamie", "token-value");

    const message = payload();
    expect(message.html).toContain("editable AI caption");
    expect(message.html).not.toMatch(/tradie|marketing automation/i);
  });

  it("keeps the invitation limited to available product behaviour", async () => {
    const { sendNewsletterSignupInvitation } = await import("./email");
    await sendNewsletterSignupInvitation("customer@example.com");

    const message = payload();
    expect(message.html).toContain("completed photo of your work, product, space, or result");
    expect(message.html).toContain("AI caption you can edit");
    expect(message.html).not.toMatch(/spend less time|finished-job|business Page|contractor|tradie/i);
  });

  it("escapes contact fields and sets Reply-To to the person who wrote in", async () => {
    const { sendContactFormNotification } = await import("./email");
    await sendContactFormNotification("<strong>Jamie</strong>", "jamie@example.com", "<img src=x>", "owner@example.com", "contact-test");

    const message = payload();
    expect(message.replyTo).toBe("jamie@example.com");
    expect(message.html).toContain("&lt;strong&gt;Jamie&lt;/strong&gt;");
    expect(message.html).toContain("&lt;img src=x&gt;");
  });
});
