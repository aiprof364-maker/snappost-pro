import { describe, expect, it } from "vitest";
import { getDashboardPostStats } from "./dashboardStats";

describe("getDashboardPostStats", () => {
  it("counts the authenticated user's saved and published posts", () => {
    expect(
      getDashboardPostStats([
        { status: "published" },
        { status: "draft" },
        { status: "failed" },
        { status: "published" },
      ]),
    ).toEqual({ totalPosts: 4, publishedPosts: 2 });
  });

  it("returns zeroes before post history has loaded", () => {
    expect(getDashboardPostStats(undefined)).toEqual({
      totalPosts: 0,
      publishedPosts: 0,
    });
  });
});
