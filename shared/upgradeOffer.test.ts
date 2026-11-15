import { describe, expect, it } from "vitest";
import { upgradeOfferLine } from "./upgradeOffer";

describe("upgradeOfferLine", () => {
  it("states both prices and the 7-day trial when the customer is eligible", () => {
    expect(upgradeOfferLine(true)).toBe(
      "Starter is $19/mo and Pro is $29/mo. Includes one 7-day trial for first-time customers.",
    );
  });

  it("states both prices without a trial when the customer is not eligible", () => {
    expect(upgradeOfferLine(false)).toBe("Starter is $19/mo and Pro is $29/mo.");
    expect(upgradeOfferLine(false)).not.toContain("7-day");
  });
});
