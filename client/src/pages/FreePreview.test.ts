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
    expect(source).toContain("Post it free: 3 posts, no card");
    expect(source).toContain("3 free posts");
    expect(source).toContain("no card");
    expect(source).toContain("Nothing is posted to Facebook");
    expect(source).toContain("snapPostCaptionFooter");
  });

  it("does not publish from the anonymous page", () => {
    expect(source).not.toContain("posts.publish");
    expect(source).not.toContain("postPhotoToPage");
  });

  it("keeps a signed-out visitor on the preview and carries the token into sign-up", () => {
    expect(source).toContain("Post it free: 3 posts, no card");
    expect(source).toContain("previewReturnPath");
    expect(source).toContain("Nothing is posted to Facebook");
    expect(source).not.toContain("/login?next=/dashboard");
    expect(source).toContain("if (!isAuthenticated || preview || !postId) return");
  });

  it("asks a new signed-in account for a business name on the preview itself", () => {
    expect(source).toContain("<BrandSetupGate");
    expect(source).toContain("preview.businessName");
    expect(source).toContain("preview.suburb");
    expect(source).toContain("Your 3 free posts are ready.");
    const gateAt = source.indexOf("<BrandSetupGate");
    const savedAt = source.indexOf("Post it free: 3 posts, no card");
    expect(gateAt).toBeGreaterThan(-1);
    expect(savedAt).toBeGreaterThan(gateAt);
  });
});
