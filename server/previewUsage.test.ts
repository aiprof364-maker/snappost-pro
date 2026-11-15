import { describe, expect, it } from "vitest";
import { nextDailyUsageAction } from "./previewUsage";

describe("anonymous preview daily cap", () => {
  it("reserves while the UTC day is under the cap", () => {
    expect(
      nextDailyUsageAction({ updatedRows: 1, existingCount: null, cap: 200 })
    ).toBe("reserved");
  });

  it("inserts the first row of the day and denies a full day", () => {
    expect(
      nextDailyUsageAction({ updatedRows: 0, existingCount: null, cap: 200 })
    ).toBe("insert");
    expect(
      nextDailyUsageAction({ updatedRows: 0, existingCount: 200, cap: 200 })
    ).toBe("deny");
    expect(
      nextDailyUsageAction({ updatedRows: 0, existingCount: null, cap: 0 })
    ).toBe("deny");
  });

  it("retries once when a row exists but the increment missed", () => {
    expect(
      nextDailyUsageAction({ updatedRows: 0, existingCount: 4, cap: 200 })
    ).toBe("retry");
  });
});
