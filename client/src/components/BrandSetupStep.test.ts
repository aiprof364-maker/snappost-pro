import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./BrandSetupStep.tsx", import.meta.url),
  "utf8"
);

describe("brand setup step", () => {
  it("asks for a business name, town, optional trade and logo, and can be skipped", () => {
    expect(source).toContain("Business name");
    expect(source).toContain("Austin, TX");
    expect(source).toContain("brand-trade");
    expect(source).toContain("brand-logo");
    expect(source).toContain("Skip for now");
    expect(source).toContain("required");
    expect(source).toContain('id="brand-name-nudge"');
    expect(source).toContain("Add your business name");
  });
});
