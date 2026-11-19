import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./PostBorderSettings.tsx", import.meta.url),
  "utf8"
);
const dashboard = readFileSync(
  new URL("../pages/Dashboard.tsx", import.meta.url),
  "utf8"
);
const presets = readFileSync(
  new URL("../../../shared/postBorder.ts", import.meta.url),
  "utf8"
);

describe("post border picker", () => {
  it("sits in account settings and previews square and portrait", () => {
    expect(dashboard).toContain("<PostBorderSettings");
    expect(dashboard).toContain("borderStyle={overview.data?.borderStyle}");
    expect(source).toContain('id="post-border"');
    expect(source).toContain("post-border-preview-square");
    expect(source).toContain("post-border-preview-portrait");
    expect(source).toContain("saveBorder");
    expect(source).toContain("layoutPostBorder");
  });

  it("uses US English and the five frames", () => {
    expect(source).toContain("Post border");
    expect(source).toContain("BORDER_PRESETS.map");
    expect(source).toContain("{preset.label}");
    expect(source).toContain("phone captions");
    expect(source).toContain("Your business");
    expect(source).toContain("Brand color");
    expect(presets).toContain('label: "None"');
    expect(presets).toContain('label: "Plain border"');
    expect(presets).toContain('label: "Thin line"');
    expect(presets).toContain('label: "Brand color"');
    expect(presets).toContain('label: "Name bar"');
    expect(`${source}\n${presets}`).not.toMatch(/tradies|colour/i);
  });
});
