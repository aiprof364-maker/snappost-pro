import { describe, expect, it } from "vitest";
import {
  BORDER_PRESETS,
  BORDER_STYLES,
  CAPTION_CLEAR_ZONE,
  DEFAULT_BORDER_COLOR,
  LINE_BORDER_COLOR,
  PLAIN_BORDER_COLOR,
  borderCaption,
  borderInk,
  layoutPostBorder,
  nameBarCopy,
  parseBorderColor,
  parseBorderStyle,
  presentBorderSettings,
} from "./postBorder";

const SIZES = [
  [1080, 1080],
  [1080, 1350],
  [1080, 720],
  [1080, 400],
  [640, 960],
  [800, 800],
  [40, 20],
  [20, 40],
  [2, 2],
];

describe("post border settings", () => {
  it("offers none plus the plain, line, brand, and name-bar frames", () => {
    expect(BORDER_STYLES).toEqual(["none", "solid", "line", "brand", "bar"]);
    expect(BORDER_PRESETS.map(preset => preset.id)).toEqual([...BORDER_STYLES]);
    expect(BORDER_PRESETS.map(preset => preset.label).join(" ")).not.toMatch(
      /tradies|colour/i
    );
  });

  it("treats missing and unknown values as no border", () => {
    expect(parseBorderStyle(null)).toBe("none");
    expect(parseBorderStyle(undefined)).toBe("none");
    expect(parseBorderStyle("")).toBe("none");
    expect(parseBorderStyle("double")).toBe("none");
    expect(presentBorderSettings(null)).toEqual({
      borderStyle: "none",
      borderColor: DEFAULT_BORDER_COLOR,
    });
    expect(
      presentBorderSettings({ borderStyle: "bar", borderColor: null })
    ).toEqual({
      borderStyle: "bar",
      borderColor: DEFAULT_BORDER_COLOR,
    });
  });

  it("accepts a hex brand color and ignores anything else", () => {
    expect(parseBorderColor("#3c2e86")).toBe("#3C2E86");
    expect(parseBorderColor("3c2e86")).toBe("#3C2E86");
    expect(parseBorderColor("#fff")).toBeNull();
    expect(parseBorderColor("red")).toBeNull();
    expect(parseBorderColor("")).toBeNull();
  });

  it("picks ink that stays readable on light and dark bars", () => {
    expect(borderInk("#FFFFFF")).toBe("#1C1917");
    expect(borderInk("#F4E04D")).toBe("#1C1917");
    expect(borderInk("#3C2E86")).toBe("#FFFFFF");
    expect(borderInk("#111111")).toBe("#FFFFFF");
  });

  it("prints only the business details the account actually has", () => {
    expect(
      borderCaption({
        businessName: "  Northside Decks ",
        suburb: " Austin, TX ",
        phone: "5125550142",
        website: "https://northsidedecks.com",
      })
    ).toEqual({
      businessName: "Northside Decks",
      suburb: "Austin, TX",
      phone: "(512) 555-0142",
      website: "northsidedecks.com",
    });
    expect(borderCaption({ businessName: "   ", suburb: "" })).toEqual({
      businessName: undefined,
      suburb: undefined,
      phone: undefined,
      website: undefined,
    });
    expect(borderCaption({ phone: "nope", website: "not a site" })).toEqual({
      businessName: undefined,
      suburb: undefined,
      phone: undefined,
      website: undefined,
    });
  });

  it("puts the name on the first line and phone and website on the next", () => {
    expect(
      nameBarCopy({
        businessName: "Northside Decks",
        phone: "(512) 555-0142",
        website: "northsidedecks.com",
      })
    ).toEqual({
      name: "Northside Decks",
      detail: "(512) 555-0142 · northsidedecks.com",
    });
    expect(
      nameBarCopy({
        businessName: "Northside Decks",
        suburb: "Austin, TX",
        phone: "512-555-0142",
        website: "https://www.northsidedecks.com/book",
      }).detail
    ).toBe("Austin, TX · (512) 555-0142 · www.northsidedecks.com/book");
    expect(nameBarCopy({ businessName: "Northside Decks" })).toEqual({
      name: "Northside Decks",
      detail: undefined,
    });
    expect(nameBarCopy({ suburb: "Austin, TX" })).toEqual({
      name: "Austin, TX",
      detail: undefined,
    });
  });
});

describe("post border layout", () => {
  it("leaves none unchanged", () => {
    expect(layoutPostBorder({ width: 1080, height: 1080, style: "none" })).toBe(
      null
    );
    expect(layoutPostBorder({ width: 1080, height: 1350, style: "nope" })).toBe(
      null
    );
  });

  it("keeps the top thin and keeps text out of the top quarter on every size", () => {
    for (const [width, height] of SIZES) {
      for (const style of BORDER_STYLES) {
        if (style === "none") continue;
        const layout = layoutPostBorder({
          width,
          height,
          style,
          color: "#C2410C",
        });
        if (!layout) continue;
        expect(layout.innerWidth).toBeGreaterThan(0);
        expect(layout.innerHeight).toBeGreaterThan(0);
        expect(layout.top).toBeLessThanOrEqual(Math.ceil(height * 0.08));
        expect(layout.top + layout.bottom).toBeLessThan(height);
        if (layout.textTop !== null) {
          expect(layout.textTop).toBeGreaterThanOrEqual(
            height * CAPTION_CLEAR_ZONE
          );
          expect(layout.style).toBe("bar");
        }
        if (style !== "bar") expect(layout.textTop).toBeNull();
      }
    }
  });

  it("uses a plain mat, a hairline, the brand color, or a bottom name bar", () => {
    const solid = layoutPostBorder({
      width: 1080,
      height: 1080,
      style: "solid",
      color: "#C2410C",
    });
    const line = layoutPostBorder({
      width: 1080,
      height: 1350,
      style: "line",
    });
    const brand = layoutPostBorder({
      width: 1080,
      height: 720,
      style: "brand",
      color: "#C2410C",
    });
    const bar = layoutPostBorder({
      width: 1080,
      height: 1080,
      style: "bar",
      color: "#C2410C",
    });
    expect(solid?.background).toBe(PLAIN_BORDER_COLOR);
    expect(solid?.top).toBe(solid?.bottom);
    expect(solid?.stroke).toBe(0);
    expect(line?.stroke).toBeGreaterThan(0);
    expect(line?.stroke).toBeLessThanOrEqual(10);
    expect(line?.strokeColor).toBe(LINE_BORDER_COLOR);
    expect(line?.top).toBe(0);
    expect(brand?.background).toBe("#C2410C");
    expect(bar?.background).toBe("#C2410C");
    expect(bar && bar.bottom).toBeGreaterThan(bar.top);
    expect(bar?.textTop).toBeGreaterThan(1080 * CAPTION_CLEAR_ZONE);
  });
});
