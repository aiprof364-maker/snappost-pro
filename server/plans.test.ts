import { describe, expect, it } from "vitest";
import { PLANS, PLAN_POST_LIMITS } from "@shared/const";

describe("pricing plans", () => {
  it("Starter is $19/mo", () => {
    expect(PLANS.starter.price).toBe(19);
    expect(PLANS.starter.priceLabel).toBe("$19/mo");
  });

  it("Pro is $29/mo", () => {
    expect(PLANS.pro.price).toBe(29);
    expect(PLANS.pro.priceLabel).toBe("$29/mo");
  });

  it("post limits: free=3, starter=30, pro=unlimited", () => {
    expect(PLAN_POST_LIMITS.free).toBe(3);
    expect(PLAN_POST_LIMITS.starter).toBe(30);
    expect(PLAN_POST_LIMITS.pro).toBeNull();
  });
});
