import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSubscriber: vi.fn(),
  immediateWelcome: vi.fn(),
  ownerNotification: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const original = await importOriginal<typeof import("./db")>();
  return { ...original, createNewsletterSubscriber: mocks.createSubscriber };
});
vi.mock("./newsletterAutomation", () => ({
  attemptImmediateNewsletterWelcome: mocks.immediateWelcome,
}));
vi.mock("./email", async importOriginal => {
  const original = await importOriginal<typeof import("./email")>();
  return { ...original, sendNewsletterSignupNotification: mocks.ownerNotification };
});

function createPublicCtx() {
  return {
    user: null,
    req: { protocol: "https", headers: {} },
    res: { clearCookie: () => {} },
  } as any;
}

beforeEach(() => {
  vi.resetModules();
  mocks.createSubscriber.mockReset();
  mocks.immediateWelcome.mockReset();
  mocks.ownerNotification.mockReset();
  mocks.immediateWelcome.mockResolvedValue(undefined);
  mocks.ownerNotification.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("contact.subscribe (newsletter)", () => {
  it("normalizes, persists, immediately attempts welcome, and notifies owner for a new signup", async () => {
    mocks.createSubscriber.mockResolvedValue({ created: true, subscriberId: 41 });
    const { appRouter } = await import("./routers");

    await expect(
      appRouter.createCaller(createPublicCtx()).contact.subscribe({ email: " CONTRACTOR@Example.COM " }),
    ).resolves.toEqual({ success: true });

    expect(mocks.createSubscriber).toHaveBeenCalledWith("contractor@example.com");
    expect(mocks.immediateWelcome).toHaveBeenCalledWith(41);
    expect(mocks.ownerNotification).toHaveBeenCalledWith(
      "contractor@example.com",
      "support@snappostpro.com",
    );
  });

  it("does not reset or mail an existing active/unsubscribed address", async () => {
    mocks.createSubscriber.mockResolvedValue({ created: false });
    const { appRouter } = await import("./routers");

    await expect(
      appRouter.createCaller(createPublicCtx()).contact.subscribe({ email: "contractor@example.com" }),
    ).resolves.toEqual({ success: true });

    expect(mocks.immediateWelcome).not.toHaveBeenCalled();
    expect(mocks.ownerNotification).not.toHaveBeenCalled();
  });

  it("keeps a persisted signup successful if the immediate attempt fails because the outbox retries it", async () => {
    mocks.createSubscriber.mockResolvedValue({ created: true, subscriberId: 8 });
    mocks.immediateWelcome.mockRejectedValue(new Error("provider unavailable"));
    const { appRouter } = await import("./routers");

    await expect(
      appRouter.createCaller(createPublicCtx()).contact.subscribe({ email: "contractor@example.com" }),
    ).resolves.toEqual({ success: true });
    expect(mocks.ownerNotification).toHaveBeenCalledTimes(1);
  });

  it("returns a user-facing failure rather than false success when persistence fails", async () => {
    mocks.createSubscriber.mockRejectedValue(new Error("database unavailable"));
    const { appRouter } = await import("./routers");

    await expect(
      appRouter.createCaller(createPublicCtx()).contact.subscribe({ email: "contractor@example.com" }),
    ).rejects.toThrow("We could not save your newsletter subscription");
    expect(mocks.immediateWelcome).not.toHaveBeenCalled();
    expect(mocks.ownerNotification).not.toHaveBeenCalled();
  });
});
