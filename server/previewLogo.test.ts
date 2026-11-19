import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  PREVIEW_LOGO_DECODE_ERROR,
  PREVIEW_LOGO_MIME_ERROR,
  PREVIEW_LOGO_SIZE_ERROR,
  PreviewLogoError,
  readPreviewLogo,
} from "./previewLogo";

const GENERIC_READ_ERROR =
  "We could not read that image. Please try another JPG or PNG.";

function dataUrl(mime: string, buffer: Buffer) {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

describe("preview logo validation", () => {
  it("keeps the transparent pixels in a PNG logo", async () => {
    const png = await sharp({
      create: {
        width: 12,
        height: 12,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 4,
              height: 4,
              channels: 4,
              background: { r: 23, g: 119, b: 242, alpha: 1 },
            },
          })
            .png()
            .toBuffer(),
          left: 4,
          top: 4,
        },
      ])
      .png()
      .toBuffer();

    const logo = await readPreviewLogo(dataUrl("image/png", png));
    const { data, info } = await sharp(logo.buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(logo.mime).toBe("image/png");
    expect(info.width).toBe(12);
    expect(data[3]).toBe(0);
    const ink = (4 * info.width + 4) * 4;
    expect(data[ink + 2]).toBeGreaterThan(200);
    expect(data[ink + 3]).toBe(255);
  });

  it("accepts a WebP logo and keeps its alpha in a PNG", async () => {
    const webp = await sharp({
      create: {
        width: 10,
        height: 6,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 0.4 },
      },
    })
      .webp()
      .toBuffer();
    const logo = await readPreviewLogo(dataUrl("image/webp", webp));
    const meta = await sharp(logo.buffer).metadata();
    expect(meta.format).toBe("png");
    expect(meta.hasAlpha).toBe(true);
    expect(meta.width).toBe(10);
  });

  it("rasterises an SVG logo to a PNG", async () => {
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="#1877f2"/></svg>`
    );
    const logo = await readPreviewLogo(dataUrl("image/svg+xml", svg));
    const meta = await sharp(logo.buffer).metadata();
    expect(meta.format).toBe("png");
    const { data, info } = await sharp(logo.buffer)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(info.width).toBe(40);
    expect(info.height).toBe(20);
    expect(data[2]).toBeGreaterThan(200);
    expect(data[0]).toBeLessThan(40);
  });

  it("shrinks a huge logo to 1024px on the long side", async () => {
    const png = await sharp({
      create: {
        width: 2000,
        height: 1000,
        channels: 4,
        background: { r: 10, g: 20, b: 30, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    const logo = await readPreviewLogo(dataUrl("image/png", png));
    const meta = await sharp(logo.buffer).metadata();
    expect(meta.width).toBe(1024);
    expect(meta.height).toBe(512);
  });

  it("returns a logo-specific message for a rejected file", async () => {
    await expect(
      readPreviewLogo("data:text/plain;base64,aGVsbG8=")
    ).rejects.toThrow(PREVIEW_LOGO_MIME_ERROR);
    await expect(readPreviewLogo("data:image/png;base64,aaaa")).rejects.toThrow(
      PREVIEW_LOGO_DECODE_ERROR
    );
    const huge = Buffer.alloc(2 * 1024 * 1024 + 1, 1);
    await expect(readPreviewLogo(dataUrl("image/png", huge))).rejects.toThrow(
      PREVIEW_LOGO_SIZE_ERROR
    );
    try {
      await readPreviewLogo("data:text/plain;base64,aGVsbG8=");
    } catch (error) {
      expect(error).toBeInstanceOf(PreviewLogoError);
      expect((error as Error).message).not.toBe(GENERIC_READ_ERROR);
    }
  });
});
