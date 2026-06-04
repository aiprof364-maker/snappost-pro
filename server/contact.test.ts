import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Ensure no webhook configured for this test.
const ORIGINAL = process.env.MAKE_WEBHOOK_URL;

beforeEach(() => {
  delete process.env.MAKE_WEBHOOK_URL;
  vi.resetModules();
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.MAKE_WEBHOOK_URL;
  else process.env.MAKE_WEBHOOK_URL = ORIGINAL;
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
  it("fails clearly when the Make webhook is not configured", async () => {
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
