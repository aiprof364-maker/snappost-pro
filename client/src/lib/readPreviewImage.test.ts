import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  PREVIEW_IMAGE_MAX_EDGE,
  PREVIEW_LOGO_MAX_EDGE,
  fittedImageSize,
  readPreviewImage,
  sniffImageMime,
} from "./readPreviewImage";

describe("preview image sizing", () => {
  it("leaves a small photo unchanged and caps the long side at 2048", () => {
    expect(fittedImageSize(1200, 800)).toEqual({ width: 1200, height: 800 });
    expect(fittedImageSize(4000, 3000)).toEqual({ width: 2048, height: 1536 });
    expect(fittedImageSize(1000, 3000).height).toBe(PREVIEW_IMAGE_MAX_EDGE);
    expect(fittedImageSize(3000, 1000).width).toBe(PREVIEW_IMAGE_MAX_EDGE);
  });

  it("caps a logo at 1024px and keeps PNG, WebP, and SVG bytes", async () => {
    expect(fittedImageSize(2000, 1000, PREVIEW_LOGO_MAX_EDGE)).toEqual({
      width: 1024,
      height: 512,
    });
    const png = Uint8Array.from(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64"
      )
    );
    expect(sniffImageMime(png)).toBe("image/png");
    const transparent = await readPreviewImage(new Blob([png], { type: "" }), {
      kind: "logo",
    });
    expect(transparent.ok).toBe(true);
    if (transparent.ok) {
      expect(transparent.dataUrl.startsWith("data:image/png;base64,")).toBe(
        true
      );
    }

    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(sniffImageMime(webp)).toBe("image/webp");
    const webpLogo = await readPreviewImage(new Blob([webp], { type: "" }), {
      kind: "logo",
    });
    expect(webpLogo.ok).toBe(true);
    if (webpLogo.ok) {
      expect(webpLogo.dataUrl.startsWith("data:image/webp;base64,")).toBe(true);
    }

    const svg = new TextEncoder().encode(
      `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#1877f2"/></svg>`
    );
    expect(sniffImageMime(svg)).toBe("image/svg+xml");
    const svgLogo = await readPreviewImage(
      new Blob([svg], { type: "application/octet-stream" }),
      { kind: "logo" }
    );
    expect(svgLogo.ok).toBe(true);
    if (svgLogo.ok) {
      expect(svgLogo.dataUrl.startsWith("data:image/svg+xml;base64,")).toBe(
        true
      );
    }
  });

  it("keeps a gallery photo the browser cannot decode, including an empty MIME type and HEIC", async () => {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
    expect(sniffImageMime(jpeg)).toBe("image/jpeg");
    const emptyType = await readPreviewImage(new Blob([jpeg], { type: "" }));
    expect(emptyType.ok).toBe(true);
    if (emptyType.ok) {
      expect(emptyType.dataUrl.startsWith("data:image/jpeg;base64,")).toBe(
        true
      );
    }

    const heic = new Uint8Array(12);
    heic.set([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
    ]);
    expect(sniffImageMime(heic)).toBe("image/heic");
    const heicPhoto = await readPreviewImage(
      new Blob([heic], { type: "application/octet-stream" })
    );
    expect(heicPhoto.ok).toBe(true);
    if (heicPhoto.ok) {
      expect(heicPhoto.dataUrl.startsWith("data:image/heic;base64,")).toBe(
        true
      );
    }

    const gif = new TextEncoder().encode("GIF89a");
    expect(sniffImageMime(gif)).toBe("image/gif");
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
    expect(source).toMatch(/logoRead,\s*"logo"/);
    const reader = readFileSync(
      new URL("./readPreviewImage.ts", import.meta.url),
      "utf8"
    );
    expect(reader).toContain('canvas.toDataURL("image/png")');
    expect(reader).toContain("PREVIEW_LOGO_MAX_EDGE");
    expect(reader).toContain("rasterizeWithImage");
    expect(reader).toContain("resizeWidth");
    expect(reader).toContain("resizeHeight");
    expect(source).not.toContain(
      "We could not read that image. Please try another JPG or PNG."
    );
    expect(source).toContain("photoError");
    expect(source).toContain("logoError");
    expect(source).toContain("photo.dataUrl");
    expect(source).toContain("logo?.dataUrl");
    expect(source).not.toContain("fileToDataUrl");
    expect(source).toContain("Post it free: 3 posts, no card");
  });
});
