import { readFileSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  PREVIEW_PHOTO_TOO_BIG,
  PREVIEW_PHOTO_UNSUPPORTED,
  readPreviewPhoto,
} from "./previewPhoto";

function dataUrl(mime: string, buffer: Buffer) {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

describe("preview photo conversion", () => {
  it("converts a HEIC gallery photo to a JPEG", async () => {
    const heic = readFileSync(
      new URL("./fixtures/sample.heic", import.meta.url)
    );
    const photo = await readPreviewPhoto(
      dataUrl("application/octet-stream", heic)
    );
    const meta = await sharp(photo.buffer).metadata();
    expect(photo.mime).toBe("image/jpeg");
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBeGreaterThan(0);
    expect(meta.height).toBeGreaterThan(0);
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(
      2048
    );
  });

  it("shrinks an 8000x6000 JPEG to 2048px on the long side", async () => {
    const big = await sharp({
      create: {
        width: 8000,
        height: 6000,
        channels: 3,
        background: { r: 20, g: 40, b: 60 },
      },
    })
      .jpeg({ quality: 40 })
      .toBuffer();
    const photo = await readPreviewPhoto(dataUrl("image/jpeg", big));
    const meta = await sharp(photo.buffer).metadata();
    expect(meta.width).toBe(2048);
    expect(meta.height).toBe(1536);
  });

  it("accepts a JPEG whose data URL has an empty MIME type", async () => {
    const jpeg = await sharp({
      create: {
        width: 12,
        height: 8,
        channels: 3,
        background: { r: 1, g: 2, b: 3 },
      },
    })
      .jpeg()
      .toBuffer();
    const photo = await readPreviewPhoto(
      `data:application/octet-stream;base64,${jpeg.toString("base64")}`
    );
    const meta = await sharp(photo.buffer).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(12);
    expect(meta.height).toBe(8);
  });

  it("applies EXIF orientation before the preview is saved", async () => {
    const wide = await sharp({
      create: {
        width: 60,
        height: 20,
        channels: 3,
        background: { r: 200, g: 10, b: 10 },
      },
    })
      .jpeg()
      .toBuffer();
    const turned = await sharp(wide)
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const photo = await readPreviewPhoto(dataUrl("", turned));
    const meta = await sharp(photo.buffer).metadata();
    expect(meta.orientation).toBeUndefined();
    expect(meta.width).toBe(20);
    expect(meta.height).toBe(60);
  });

  it("says when a file is not a photo the server can open", async () => {
    await expect(
      readPreviewPhoto("data:text/plain;base64,aGVsbG8=")
    ).rejects.toThrow(PREVIEW_PHOTO_UNSUPPORTED);
    const huge = Buffer.alloc(8 * 1024 * 1024 + 1, 1);
    await expect(readPreviewPhoto(dataUrl("image/jpeg", huge))).rejects.toThrow(
      PREVIEW_PHOTO_TOO_BIG
    );
  });
});
