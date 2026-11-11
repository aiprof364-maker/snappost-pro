import { describe, expect, it } from "vitest";
import {
  PREVIEW_CALL_TO_ACTION,
  cleanPreviewText,
  personalizeCaption,
} from "./previewCaption";

const generic =
  "A finished deck, ready for summer. Built to last. #DeckBuild #QualityWork";

describe("personalizeCaption", () => {
  it("weaves in the business name, suburb, and call to action", () => {
    const caption = personalizeCaption(generic, {
      businessName: "Northside Decks",
      suburb: "Richmond",
      callToAction: PREVIEW_CALL_TO_ACTION,
    });

    expect(caption.startsWith("Northside Decks in Richmond.")).toBe(true);
    expect(caption).toContain("A finished deck, ready for summer.");
    expect(caption.endsWith("Call us for a free quote.")).toBe(true);
  });

  it("does not invent a business name or suburb", () => {
    const caption = personalizeCaption("Quality work you can count on.", {
      businessName: "   ",
      suburb: "",
      callToAction: PREVIEW_CALL_TO_ACTION,
    });

    expect(caption).toBe(
      "Quality work you can count on. Call us for a free quote."
    );
    expect(caption).not.toMatch(/northside|richmond|business name|suburb/i);
  });

  it("does not repeat details the caption already includes", () => {
    const original =
      "Northside Decks finished this deck in Richmond. Call us for a free quote.";
    expect(
      personalizeCaption(original, {
        businessName: "Northside Decks",
        suburb: "Richmond",
        callToAction: PREVIEW_CALL_TO_ACTION,
      })
    ).toBe(original);
  });

  it("adds a missing suburb beside the business name", () => {
    const caption = personalizeCaption("Northside Decks finished this deck.", {
      businessName: "Northside Decks",
      suburb: "Richmond",
      callToAction: PREVIEW_CALL_TO_ACTION,
    });

    expect(caption).toContain(
      "Northside Decks in Richmond finished this deck."
    );
    expect(caption.match(/Northside Decks/gi)).toHaveLength(1);
    expect(caption).toContain(PREVIEW_CALL_TO_ACTION);
  });

  it("matches a business name regardless of letter case", () => {
    const caption = personalizeCaption("northside decks finished this deck.", {
      businessName: "Northside Decks",
      callToAction: PREVIEW_CALL_TO_ACTION,
    });

    expect(caption.match(/northside decks/gi)).toHaveLength(1);
    expect(caption).not.toContain("Northside Decks. northside");
  });
});

describe("cleanPreviewText", () => {
  it("drops blank and control-character-only values", () => {
    expect(cleanPreviewText("  \n\t ", 80)).toBeUndefined();
    expect(cleanPreviewText(undefined, 80)).toBeUndefined();
  });

  it("collapses whitespace and respects the field limit", () => {
    expect(cleanPreviewText("  Northside   Decks ", 80)).toBe(
      "Northside Decks"
    );
    expect(cleanPreviewText("Richmondville", 8)).toBe("Richmond");
  });
});
