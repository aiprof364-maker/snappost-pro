import { describe, expect, it } from "vitest";
import {
  REFERRAL_STORAGE_KEY,
  rememberReferralCode,
} from "./referralCode";

function memoryStorage(initial = "") {
  let value = initial;
  return {
    getItem: (key: string) => (key === REFERRAL_STORAGE_KEY ? value : null),
    setItem: (key: string, next: string) => {
      if (key === REFERRAL_STORAGE_KEY) value = next;
    },
    read: () => value,
  };
}

describe("rememberReferralCode", () => {
  it("stores a referral code from the URL and reuses it after the param is gone", () => {
    const storage = memoryStorage();
    let cookie = "";
    const jar = {
      get: () => cookie,
      set: (code: string) => {
        cookie = code;
      },
    };
    expect(rememberReferralCode("?ref=ab12cd34", storage, jar)).toBe("AB12CD34");
    expect(rememberReferralCode("", storage, jar)).toBe("AB12CD34");
    expect(cookie).toBe("AB12CD34");
  });

  it("ignores a code that is not a referral code and keeps the saved one", () => {
    const storage = memoryStorage("SAVEDCODE");
    expect(rememberReferralCode("?ref=bad code", storage)).toBe("SAVEDCODE");
    expect(rememberReferralCode("?code=CREATOR-1", storage)).toBe("SAVEDCODE");
  });
});
