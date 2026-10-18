import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockQueue = vi.fn();
const mockCreateContact = vi.fn();

vi.mock("./accountEmailAutomation", () => ({
  queueAccountEmail: mockQueue,
}));

vi.mock("./db", async original => ({
  ...(await original<typeof import("./db")>()),
  createContact: mockCreateContact,
}));

function createPublicCtx() {
  return {
    user: null,
    req: { protocol: "https", headers: {} },
    res: { clearCookie: () => {} },
  } as any;
}

describe("contact.submit", () => {
  beforeEach(() => {
    vi.resetModules();
    mockQueue.mockReset();
    mockCreateContact.mockReset();
    mockCreateContact.mockResolvedValue(42);
    mockQueue.mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it("persists the enquiry then queues one durable owner alert", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createPublicCtx());

    const result = await caller.contact.submit({
      name: "John Doe",
      email: "john@example.com",
      message: "I'm interested in SnapPost Pro",
    });

    expect(result.success).toBe(true);
    expect(mockCreateContact).toHaveBeenCalledWith({
      name: "John Doe",
      email: "john@example.com",
      message: "I'm interested in SnapPost Pro",
      status: "new",
    });
    expect(mockQueue).toHaveBeenCalledWith({
      recipientEmail: "admin@snappostpro.com",
      entityKey: "contact:42",
      campaignKey: "contact-owner-alert:v1",
      kind: "contact-owner-alert",
      metadata: { contactId: 42 },
    });
  });

  it("reports an error only when the enquiry cannot be persisted", async () => {
    mockCreateContact.mockResolvedValueOnce(null);
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createPublicCtx());

    await expect(caller.contact.submit({
      name: "Test",
      email: "test@example.com",
      message: "Hello",
    })).rejects.toThrow();
    expect(mockQueue).not.toHaveBeenCalled();
  });
});
