import { describe, expect, it, vi } from "vitest";
import { refreshPostCreationQueries } from "./postQueryInvalidation";

describe("refreshPostCreationQueries", () => {
  it("refreshes post history and the account usage counter after a draft is created", () => {
    const invalidatePosts = vi.fn();
    const invalidateAccountOverview = vi.fn();

    refreshPostCreationQueries({
      invalidatePosts,
      invalidateAccountOverview,
    });

    expect(invalidatePosts).toHaveBeenCalledTimes(1);
    expect(invalidateAccountOverview).toHaveBeenCalledTimes(1);
  });
});
