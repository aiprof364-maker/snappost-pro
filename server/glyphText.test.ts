import { describe, expect, it } from "vitest";
import { measureSnapPostText, snapPostGlyphPath } from "./glyphText";

describe("bundled glyph outlines", () => {
  it("draws Made with SnapPost as curves, not a rectangle or missing-glyph box", () => {
    const path = snapPostGlyphPath({
      text: "Made with SnapPost",
      x: 12,
      y: 28,
      fontSize: 16,
      face: "bold",
      fill: "#ffffff",
    });
    expect(path.startsWith("<path ")).toBe(true);
    expect(path).not.toContain("<text");
    const curves = path.match(/[QqCc]/g) ?? [];
    expect(curves.length).toBeGreaterThan(40);
    expect(measureSnapPostText("Made with SnapPost", 16, "bold")).toBeGreaterThan(
      80
    );
  });
});
