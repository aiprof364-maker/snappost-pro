import { describe, expect, it } from "vitest";
import { LANDING_MOCKUP } from "./landingMockup";

describe("landing mockup assets", () => {
  it("uses the existing A-frame raw and branded Cloudinary pair", () => {
    expect(LANDING_MOCKUP.originalPhotoUrl).toContain("original_a79f86b3.jpg");
    expect(LANDING_MOCKUP.brandedPhotoUrl).toContain("branded_34e1526b.jpg");
    expect(LANDING_MOCKUP.originalPhotoUrl).not.toBe(LANDING_MOCKUP.brandedPhotoUrl);
  });

  it("describes a completed job without claiming photo cleanup or construction work", () => {
    expect(LANDING_MOCKUP.heroCaption).toContain("finished outdoor space");
    expect(LANDING_MOCKUP.heroCaption).not.toMatch(/cleaned|cropped|landscap|completed by SnapPost/i);
  });
});
