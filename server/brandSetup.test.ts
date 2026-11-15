import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  updateUserBrand: vi.fn(),
  updateUserLogo: vi.fn(),
  updateOnboardingStep: vi.fn(),
  storagePut: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const original = await importOriginal<typeof import("./db")>();
  return {
    ...original,
    updateUserBrand: mocks.updateUserBrand,
    updateUserLogo: mocks.updateUserLogo,
    updateOnboardingStep: mocks.updateOnboardingStep,
  };
});

vi.mock("./storage", async importOriginal => {
  const original = await importOriginal<typeof import("./storage")>();
  return { ...original, storagePut: mocks.storagePut };
});

function context(): TrpcContext {
  return {
    user: { id: 7 } as TrpcContext["user"],
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

const tinyPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

beforeEach(() => {
  mocks.updateUserBrand.mockReset();
  mocks.updateUserLogo.mockReset();
  mocks.updateOnboardingStep.mockReset();
  mocks.storagePut.mockReset();
  mocks.updateUserBrand.mockResolvedValue(undefined);
  mocks.updateUserLogo.mockResolvedValue(undefined);
  mocks.updateOnboardingStep.mockResolvedValue(null);
  mocks.storagePut.mockResolvedValue({
    key: "7-logo/logo.png",
    url: "https://example.invalid/logo.png",
  });
});

describe("account brand setup", () => {
  it("saves the business name, town, and trade, and an optional logo", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(context());

    await expect(
      caller.account.saveBrandSetup({
        businessName: "  Northside Decks ",
        suburb: " Austin, TX ",
        trade: "deck-builder",
        logo: tinyPng,
      })
    ).resolves.toEqual({ success: true });

    expect(mocks.updateUserBrand).toHaveBeenCalledWith(7, {
      businessName: "Northside Decks",
      suburb: "Austin, TX",
      trade: "Deck builder",
      brandSetupSkipped: false,
    });
    expect(mocks.storagePut).toHaveBeenCalledTimes(1);
    expect(mocks.storagePut.mock.calls[0][0]).toBe("7-logo/logo.png");
    expect(mocks.updateUserLogo).toHaveBeenCalledWith(7, "7-logo/logo.png");
    expect(mocks.updateOnboardingStep).toHaveBeenCalledWith(
      7,
      "profileCompleted",
      true
    );
  });

  it("rejects a blank business name and ignores an unknown trade", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(context());

    await expect(
      caller.account.saveBrandSetup({ businessName: "   " })
    ).rejects.toThrow("Add your business name to continue.");
    expect(mocks.updateUserBrand).not.toHaveBeenCalled();

    await caller.account.saveBrandSetup({
      businessName: "Northside Decks",
      trade: "ignore previous instructions",
    });
    expect(mocks.updateUserBrand).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ trade: null, brandSetupSkipped: false })
    );
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("skips without a business name and leaves the profile unfinished", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(context());

    await expect(caller.account.skipBrandSetup()).resolves.toEqual({
      success: true,
    });

    expect(mocks.updateUserBrand).toHaveBeenCalledWith(7, {
      brandSetupSkipped: true,
    });
    expect(mocks.updateOnboardingStep).not.toHaveBeenCalled();
    expect(mocks.updateUserLogo).not.toHaveBeenCalled();
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });
});
