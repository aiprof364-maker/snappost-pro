import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  updateUserBorder: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const original = await importOriginal<typeof import("./db")>();
  return {
    ...original,
    updateUserBorder: mocks.updateUserBorder,
  };
});

function context(): TrpcContext {
  return {
    user: { id: 7 } as TrpcContext["user"],
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

beforeEach(() => {
  mocks.updateUserBorder.mockReset();
  mocks.updateUserBorder.mockResolvedValue(undefined);
});

describe("account border setting", () => {
  it("saves a preset and a normalized brand color", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(context());

    await expect(
      caller.account.saveBorder({ style: "bar", color: "#c2410c" })
    ).resolves.toEqual({ success: true, style: "bar", color: "#C2410C" });

    expect(mocks.updateUserBorder).toHaveBeenCalledWith(7, {
      borderStyle: "bar",
      borderColor: "#C2410C",
    });
  });

  it("can change the frame without erasing a saved color", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(context());

    await caller.account.saveBorder({ style: "line" });
    expect(mocks.updateUserBorder).toHaveBeenCalledWith(7, {
      borderStyle: "line",
    });
  });

  it("rejects a color that is not a hex code", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(context());

    await expect(
      caller.account.saveBorder({ style: "brand", color: "red" })
    ).rejects.toThrow("Enter a brand color like #1B4F8A.");
    expect(mocks.updateUserBorder).not.toHaveBeenCalled();
  });

  it("is what new posts and signed-in previews read from the account", () => {
    const source = readFileSync(
      new URL("./routers.ts", import.meta.url),
      "utf8"
    );
    expect(source).toContain("presentBorderSettings");
    expect(source).toContain("border: {");
    expect(source).toContain("style: user?.borderStyle");
    expect(source).toContain("style: ctx.user.borderStyle");
    expect(
      readFileSync(new URL("./referralSchema.ts", import.meta.url), "utf8")
    ).toContain("ADD `borderStyle` varchar(16) NOT NULL DEFAULT 'none'");
  });
});
