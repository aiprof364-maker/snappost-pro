import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readSnapPostFont, snapPostFontCandidates } from "./snapPostFont";

describe("SnapPost font files", () => {
  it("looks beside the bundle and in the source font directory", () => {
    const paths = snapPostFontCandidates(
      "SnapPostBadge-Bold.ttf",
      "file:///app/dist/index.js"
    ).map(url => fileURLToPath(url));
    expect(paths).toEqual([
      "/app/dist/fonts/SnapPostBadge-Bold.ttf",
      "/app/server/fonts/SnapPostBadge-Bold.ttf",
    ]);
  });

  it("reads the real bold font used by the free-plan mark", () => {
    const font = readSnapPostFont("SnapPostBadge-Bold.ttf");
    expect(font.byteLength).toBeGreaterThan(1000);
    expect(existsSync(fileURLToPath(new URL("./fonts/SnapPostBadge-Bold.ttf", import.meta.url)))).toBe(
      true
    );
  });
});
