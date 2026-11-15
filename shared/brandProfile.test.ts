import { describe, expect, it } from "vitest";
import {
  badgeCallToAction,
  brandSetupPrefill,
  shouldShowBrandNudge,
  shouldShowBrandSetup,
} from "./brandProfile";

const hidden = {
  accountCreated: false,
  businessName: null as string | null,
  brandSetupSkipped: false,
  dismissed: false,
  reopened: false,
};

describe("first-login brand setup", () => {
  it("shows the step for a new account and for a profile with no business name", () => {
    expect(shouldShowBrandSetup({ ...hidden, accountCreated: true })).toBe(
      true
    );
    expect(shouldShowBrandSetup(hidden)).toBe(true);
    expect(
      shouldShowBrandSetup({
        ...hidden,
        businessName: "Northside Decks",
        accountCreated: true,
      })
    ).toBe(false);
  });

  it("hides the step after Skip for now and keeps a dashboard nudge", () => {
    const skipped = {
      ...hidden,
      accountCreated: true,
      brandSetupSkipped: true,
      dismissed: true,
    };
    expect(shouldShowBrandSetup(skipped)).toBe(false);
    expect(
      shouldShowBrandNudge({
        businessName: null,
        brandSetupSkipped: true,
        setupVisible: false,
      })
    ).toBe(true);
    expect(
      shouldShowBrandNudge({
        businessName: null,
        brandSetupSkipped: true,
        setupVisible: true,
      })
    ).toBe(false);
    expect(
      shouldShowBrandSetup({ ...skipped, reopened: true, dismissed: false })
    ).toBe(true);
  });

  it("prefills blank fields from a claimed preview without replacing a saved name", () => {
    expect(
      brandSetupPrefill({
        businessName: null,
        suburb: " ",
        trade: null,
        suggestion: { businessName: "Northside Decks", suburb: "Austin, TX" },
      })
    ).toEqual({
      businessName: "Northside Decks",
      suburb: "Austin, TX",
      tradeId: "",
    });
    expect(
      brandSetupPrefill({
        businessName: "Saved Co",
        suburb: null,
        trade: "Deck builder",
        suggestion: { businessName: "Other", suburb: "Austin, TX" },
      })
    ).toEqual({
      businessName: "Saved Co",
      suburb: "Austin, TX",
      tradeId: "deck-builder",
    });
  });

  it("picks the badge call to action from the trade", () => {
    expect(badgeCallToAction("deck-builder")).toBe("Call us for a free quote");
    expect(badgeCallToAction("Hair salon")).toBe("Book your next visit");
    expect(badgeCallToAction("cafe")).toBe("Come see us today");
    expect(badgeCallToAction("not a real trade")).toBe(
      "Call us for a free quote"
    );
  });
});
