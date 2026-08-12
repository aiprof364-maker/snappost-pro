import { getFacebookPostUrl } from "@shared/facebookPost";
import { describe, expect, it } from "vitest";

describe("getFacebookPostUrl", () => {
  it("creates a direct Facebook URL for a published Page post", () => {
    expect(getFacebookPostUrl("1174494559070858_122115921831314961")).toBe(
      "https://www.facebook.com/1174494559070858_122115921831314961",
    );
  });
});
