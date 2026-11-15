import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./FreePreview.tsx", import.meta.url),
  "utf8"
);

describe("free job-photo preview page", () => {
  it("lets a visitor pick a trade and sign up without a card", () => {
    expect(source).toContain("Choose a trade");
    expect(source).toContain("PREVIEW_TRADES");
    expect(source).toContain("Sign up free and keep this post");
    expect(source).toContain("3 free posts");
    expect(source).toContain("no card");
    expect(source).toContain("$19/mo");
    expect(source).toContain("$29/mo");
    expect(source).toContain("Nothing is posted to Facebook");
    expect(source).toContain("snapPostCaptionFooter");
  });

  it("does not publish from the anonymous page", () => {
    expect(source).not.toContain("posts.publish");
    expect(source).not.toContain("postPhotoToPage");
  });
});
