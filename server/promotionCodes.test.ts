import { describe, expect, it, vi } from "vitest";
import {
  checkoutPromotionParams,
  findPromotionCodeReference,
  normalizePromotionCode,
  promotionCodeFromEventMetadata,
  promotionCodeUsedOnCheckout,
} from "./promotionCodes";

describe("checkout promotion codes", () => {
  it("accepts a creator code and rejects anything Stripe would not store", () => {
    expect(normalizePromotionCode(" Creator-100 ")).toBe("Creator-100");
    expect(normalizePromotionCode("")).toBeNull();
    expect(normalizePromotionCode("has space")).toBeNull();
    expect(normalizePromotionCode("bad_code")).toBeNull();
  });

  it("pre-applies a code without also leaving the promotion field open", () => {
    expect(checkoutPromotionParams("promo_123")).toEqual({
      discounts: [{ promotion_code: "promo_123" }],
    });
    expect(checkoutPromotionParams("promo_123")).not.toHaveProperty("allow_promotion_codes");
    expect(checkoutPromotionParams(null)).toEqual({ allow_promotion_codes: true });
  });

  it("reads an expanded code or an unexpanded promotion code id", () => {
    expect(
      findPromotionCodeReference({
        session: { discounts: [{ promotion_code: { id: "promo_123", code: "CREATOR-1" } }] },
      }),
    ).toEqual({ id: "promo_123", code: "CREATOR-1" });
    expect(
      findPromotionCodeReference({
        subscription: { discount: { promotion_code: "promo_456" } },
      }),
    ).toEqual({ id: "promo_456" });
  });

  it("retrieves the customer-facing code when Checkout only returns an id", async () => {
    const retrieve = vi.fn(async () => ({ code: "CREATOR-1" }));
    const code = await promotionCodeUsedOnCheckout(
      {
        promotionCodes: { retrieve },
        checkout: { sessions: { retrieve: vi.fn() } },
      },
      { session: { id: "cs_123", discounts: [{ promotion_code: "promo_123" }] } as never },
    );
    expect(code).toBe("CREATOR-1");
    expect(retrieve).toHaveBeenCalledWith("promo_123");
  });

  it("reads the redeemed code stored on an upgrade event", () => {
    expect(promotionCodeFromEventMetadata('{"promotionCode":"CREATOR-1","plan":"starter"}')).toBe(
      "CREATOR-1",
    );
    expect(promotionCodeFromEventMetadata("{")).toBeNull();
    expect(promotionCodeFromEventMetadata(null)).toBeNull();
  });
});
