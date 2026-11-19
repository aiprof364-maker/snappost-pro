import { describe, expect, it } from "vitest";
import { carryPreviewBrand, previewReturnPath } from "./previewHandoff";

describe("preview handoff", () => {
  it("sends the access link back to the same preview, not an empty dashboard", () => {
    expect(previewReturnPath("a".repeat(32), "contractors")).toBe(
      `/preview?token=${"a".repeat(32)}&landing=contractors`
    );
    expect(previewReturnPath("b".repeat(40))).toBe(
      `/preview?token=${"b".repeat(40)}`
    );
    expect(previewReturnPath("c".repeat(32), "ignore")).not.toContain(
      "dashboard"
    );
  });

  it("copies the preview name and city only into blank account fields", () => {
    expect(
      carryPreviewBrand(
        { businessName: null, suburb: "  " },
        { businessName: "  Northside Decks ", suburb: " Austin " }
      )
    ).toEqual({
      businessName: "Northside Decks",
      suburb: "Austin",
    });

    expect(
      carryPreviewBrand(
        { businessName: "Saved Co", suburb: "Dallas" },
        { businessName: "Other", suburb: "Austin" }
      )
    ).toEqual({ businessName: null, suburb: null });

    expect(
      carryPreviewBrand(
        { businessName: null, suburb: null },
        { businessName: "   ", suburb: null }
      )
    ).toEqual({ businessName: null, suburb: null });
  });
});