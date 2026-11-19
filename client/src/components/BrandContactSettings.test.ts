import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./BrandContactSettings.tsx", import.meta.url),
  "utf8"
);
const dashboard = readFileSync(
  new URL("../pages/Dashboard.tsx", import.meta.url),
  "utf8"
);
const preview = readFileSync(
  new URL("./PostBorderSettings.tsx", import.meta.url),
  "utf8"
);

describe("brand phone and website", () => {
  it("edits them next to the business name and city", () => {
    expect(source).toContain("Business name");
    expect(source).toContain("City");
    expect(source).toContain('id="account-phone"');
    expect(source).toContain('id="account-website"');
    expect(source).toContain("Save phone and website");
    expect(source).toContain("without https://");
    expect(source).not.toMatch(/tradies|colour/i);
    expect(dashboard).toContain("<BrandContactSettings");
    expect(dashboard).toContain("phone={contactDraft?.phone");
  });

  it("shows the contact line on the live name-bar preview", () => {
    expect(preview).toContain("nameBarCopy");
    expect(preview).toContain("previewDetail");
    expect(preview).toContain("phone={phone}");
    expect(preview).toContain("website={website}");
  });
});