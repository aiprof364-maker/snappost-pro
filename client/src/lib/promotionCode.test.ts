import { describe, expect, it } from "vitest";
import { PROMOTION_CODE_STORAGE_KEY, rememberPromotionCode } from "./promotionCode";

function memoryStorage(initial = "") {
  let value = initial;
  return {
    getItem: (key: string) => (key === PROMOTION_CODE_STORAGE_KEY ? value : null),
    setItem: (key: string, next: string) => {
      if (key === PROMOTION_CODE_STORAGE_KEY) value = next;
    },
  };
}

describe("rememberPromotionCode", () => {
  it("stores a valid code from the URL and reuses it after the param is gone", () => {
    const storage = memoryStorage();
    expect(rememberPromotionCode("?code=Creator-100", storage)).toBe("Creator-100");
    expect(rememberPromotionCode("", storage)).toBe("Creator-100");
  });

  it("ignores codes Stripe would reject and keeps a previously stored code", () => {
    const storage = memoryStorage("SAVED-1");
    expect(rememberPromotionCode("?code=bad code", storage)).toBe("SAVED-1");
    expect(rememberPromotionCode("?code=", storage)).toBe("SAVED-1");
  });
});
