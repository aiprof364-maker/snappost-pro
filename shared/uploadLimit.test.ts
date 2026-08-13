import { describe, expect, it } from "vitest";
import { getUploadLimitNotice } from "./uploadLimit";

describe("getUploadLimitNotice", () => {
  it("returns no notice while the account can still create a post", () => {
    expect(getUploadLimitNotice("free", { used: 2, limit: 3 })).toBeNull();
    expect(getUploadLimitNotice("pro", { used: 300, limit: null })).toBeNull();
  });

  it("explains a free-account lock and gives the user a pricing route", () => {
    expect(getUploadLimitNotice("free", { used: 5, limit: 3 })).toEqual({
      message: "You've used all 3 free posts this month. Choose a plan to keep creating posts.",
      action: { href: "/pricing", label: "Choose a plan" },
    });
  });

  it("uses the appropriate paid-plan guidance at a monthly cap", () => {
    expect(getUploadLimitNotice("starter", { used: 30, limit: 30 })).toEqual({
      message: "You've used all 30 Starter posts this month. Upgrade to Pro or wait until your next monthly reset.",
      action: { href: "/pricing", label: "Upgrade to Pro" },
    });
    expect(getUploadLimitNotice("pro", { used: 300, limit: 300 })).toEqual({
      message: "You've used all 300 Pro posts this month. Your allowance resets at the start of next month.",
    });
  });
});
