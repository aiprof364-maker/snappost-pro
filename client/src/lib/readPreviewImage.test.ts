import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  PREVIEW_IMAGE_MAX_EDGE,
  PREVIEW_IMAGE_READ_ERROR,
  fittedImageSize,
  readPreviewImage,
} from "./readPreviewImage";

describe("preview image sizing", () => {
  it("leaves a small photo unchanged and caps the long side at 2048", () => {
    expect(fittedImageSize(1200, 800)).toEqual({ width: 1200, height: 800 });
    expect(fittedImageSize(4000, 3000)).toEqual({ width: 2048, height: 1536 });
    expect(fittedImageSize(1000, 3000).height).toBe(PREVIEW_IMAGE_MAX_EDGE);
    expect(fittedImageSize(3000, 1000).width).toBe(PREVIEW_IMAGE_MAX_EDGE);
  });

  it("reports the picker error when the photo cannot be decoded", async () => {
    const result = await readPreviewImage(
      new Blob(["not a photo"], { type: "image/jpeg" })
    );
    expect(result).toEqual({ ok: false, message: PREVIEW_IMAGE_READ_ERROR });
  });

  it("reads the photo in the picker, not when the form is submitted", () => {
    const source = readFileSync(
      new URL("../pages/FreePreview.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain('accept="image/*"');
    expect(source).not.toContain('accept="image/jpeg,image/png"');
    expect(source).toContain('id="preview-photo"');
    expect(source).toContain('id="preview-logo"');
    expect(source).toContain("readPreviewImage");
    expect(source).toContain("PREVIEW_IMAGE_READ_ERROR");
    expect(source).toContain("photoError");
    expect(source).toContain("logoError");
    expect(source).toContain("photo.dataUrl");
    expect(source).toContain("logo?.dataUrl");
    expect(source).not.toContain("fileToDataUrl");
    expect(source).toContain("Post it free: 3 posts, no card");
    expect(PREVIEW_IMAGE_READ_ERROR).toContain("could not read that image");
  });
});
