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

describe("contact.submit", () => {
  it("sends contact form notification via Resend", async () => {
    process.env.RESEND_API_KEY = "test-key";
    
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createPublicCtx());

    const result = await caller.contact.submit({
      name: "John Doe",
      email: "john@example.com",
      message: "I'm interested in SnapPost Pro",
    });

    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalled();
    
    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.to).toBe("support@snappostpro.com");
    expect(callArgs.subject).toContain("John Doe");
    expect(callArgs.html).toContain("john@example.com");
    expect(callArgs.html).toContain("I'm interested in SnapPost Pro");
  });

  it("fails gracefully when Resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    vi.resetModules();

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createPublicCtx());

    await expect(
      caller.contact.submit({
        name: "Test",
        email: "test@example.com",
        message: "Hello",
      }),
    ).rejects.toThrow();
  });
});
