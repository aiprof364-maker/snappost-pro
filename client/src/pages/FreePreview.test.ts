import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./FreePreview.tsx", import.meta.url),
  "utf8"
);

describe("free job-photo preview page", () => {
  it("lets a visitor pick a trade and save with email, without a card", () => {
    expect(source).toContain("Choose a trade");
    expect(source).toContain("PREVIEW_TRADES");
    expect(source).toContain(
      "Enter your email to save these posts and get 3 free posts, no card needed."
    );
    expect(source).toContain("Email my free access link");
    expect(source).toContain("3 free posts");
    expect(source).toContain("no card");
    expect(source).toContain("Nothing is posted to Facebook");
    expect(source).toContain("snapPostCaptionFooter");
    expect(source).not.toMatch(/tradies/i);
  });

  it("does not publish from the anonymous page", () => {
    expect(source).not.toContain("posts.publish");
    expect(source).not.toContain("postPhotoToPage");
  });

  it("keeps a signed-out visitor on the preview and carries the token into the access link", () => {
    expect(source).toContain("previewReturnPath");
    expect(source).toContain("previewToken: token");
    expect(source).toContain("Check your email");
    expect(source).toContain("watermarkedPreviewDownloadPath");
    expect(source).toContain("Download preview with the SnapPost mark");
    expect(source).toContain("preview.hasWatermark");
    expect(source).toContain("Nothing is posted to Facebook");
    expect(source).not.toContain("/login?next=/dashboard");
    expect(source).toContain(
      "if (!isAuthenticated || preview || !postId) return"
    );
  });

  it("puts the finished preview at the top of a phone screen and the email capture next", () => {
    expect(source).toContain('id="preview-result"');
    expect(source).toContain('scrollIntoView({ block: "start" })');
    expect(source).toContain("line-clamp-3");
    expect(source).toContain("Show more");
    expect(source).toContain("Review and post this");
    expect(source).toContain("Email my free access link");
    expect(source).toContain('id="preview-email"');
    expect(source).toContain("h-12 w-full");
    expect(source).toContain("Create a different preview");
    expect(source).toContain(
      "hidden border-b border-border/60 bg-background md:block"
    );
    expect(source).toContain('preview ? "hidden md:block" : undefined');
    const imageAt = source.indexOf("preview.brandedImageUrl");
    const captureAt = source.indexOf("{PREVIEW_SAVE_PROMPT}");
    const emailAt = source.indexOf('id="preview-email"');
    const signedInAt = source.indexOf("Review and post this");
    const againAt = source.indexOf("Create a different preview");
    const captionAt = source.indexOf("line-clamp-3");
    expect(imageAt).toBeGreaterThan(-1);
    expect(captureAt).toBeGreaterThan(imageAt);
    expect(emailAt).toBeGreaterThan(captureAt);
    expect(signedInAt).toBeGreaterThan(imageAt);
    expect(againAt).toBeGreaterThan(emailAt);
    expect(captionAt).toBeGreaterThan(againAt);
    expect(source).not.toContain("posts.publish");
  });

  it("asks a new signed-in account for a business name on the preview itself", () => {
    expect(source).toContain("<BrandSetupGate");
    expect(source).toContain("preview.businessName");
    expect(source).toContain("preview.suburb");
    expect(source).toContain("Your 3 free posts are ready.");
    const gateAt = source.indexOf("<BrandSetupGate");
    const savedAt = source.indexOf("{PREVIEW_SAVE_PROMPT}");
    expect(gateAt).toBeGreaterThan(-1);
    expect(savedAt).toBeGreaterThan(gateAt);
  });
});
