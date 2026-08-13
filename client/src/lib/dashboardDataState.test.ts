import { describe, expect, it } from "vitest";
import { isDashboardDataLoading } from "./dashboardDataState";

describe("isDashboardDataLoading", () => {
  it("keeps an authenticated account neutral until its authoritative overview arrives", () => {
    expect(
      isDashboardDataLoading({
        authLoading: false,
        isAuthenticated: true,
        overviewLoading: true,
      }),
    ).toBe(true);
  });

  it("renders the dashboard only after authentication and account overview are ready", () => {
    expect(
      isDashboardDataLoading({
        authLoading: false,
        isAuthenticated: true,
        overviewLoading: false,
      }),
    ).toBe(false);
  });
});
