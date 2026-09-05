import { describe, expect, it } from "vitest";
import { AVAILABLE_SNAPPOST_FEATURES } from "./availableSnapPostFeatures";

describe("AVAILABLE_SNAPPOST_FEATURES", () => {
  it("lists only features currently available in the app", () => {
    expect(AVAILABLE_SNAPPOST_FEATURES.map(feature => feature.name)).toEqual([
      "AI-generated captions",
      "Logo branding",
      "Facebook Page publishing",
      "Saved post history",
    ]);
  });
});
