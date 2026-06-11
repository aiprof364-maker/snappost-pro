import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Resend client
const mockSend = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

beforeEach(() => {
  vi.resetModules();
  mockSend.mockClear();
  mockSend.mockResolvedValue({ id: "test-email-id" });
  process.env.RESEND_API_KEY = "test-key";
});

afterEach(() => {
  vi.restoreAllMocks();
});

function createPublicCtx() {
  return {
    user: null,
    req: { protocol: "https", headers: {} },
    res: { clearCookie: () => {} },
  } as any;
}

describe("contact.subscribe (newsletter)", () => {
  it("sends welcome email and notifies owner on newsletter signup", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createPublicCtx());

    const result = await caller.contact.subscribe({ email: "contractor@example.com" });
    expect(result).toEqual({ success: true });

    // Should have called send twice: welcome email + owner notification
    expect(mockSend).toHaveBeenCalledTimes(2);

    const welcomeCall = mockSend.mock.calls[0][0];
    expect(welcomeCall.to).toBe("contractor@example.com");
    expect(welcomeCall.subject).toContain("Welcome");

    const ownerCall = mockSend.mock.calls[1][0];
    expect(ownerCall.to).toBe("support@snappostpro.com");
    expect(ownerCall.subject).toContain("contractor@example.com");
  });

  it("succeeds gracefully even if emails fail to send", async () => {
    mockSend.mockRejectedValue(new Error("Resend error"));

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createPublicCtx());

    // Should not throw, newsletter is non-critical
    const result = await caller.contact.subscribe({ email: "contractor@example.com" });
    expect(result).toEqual({ success: true });
  });
});
