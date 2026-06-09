import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.MAKE_WEBHOOK_URL;

beforeEach(() => {
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

describe("contact.subscribe (newsletter)", () => {
  it("succeeds gracefully when no webhook is configured", async () => {
    delete process.env.MAKE_WEBHOOK_URL;
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createPublicCtx());

    const result = await caller.contact.subscribe({ email: "contractor@example.com" });
    expect(result).toEqual({ success: true });
  });

  it("throws when the webhook is configured but the request fails", async () => {
    process.env.MAKE_WEBHOOK_URL = "https://hook.make.com/test-newsletter";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500 })) as unknown as typeof fetch,
    );

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createPublicCtx());

    await expect(
      caller.contact.subscribe({ email: "contractor@example.com" }),
    ).rejects.toThrow();
  });
});
