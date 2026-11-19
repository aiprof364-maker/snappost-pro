import sharp from "sharp";
import { sniffImageMime } from "@shared/imageSniff";

export const PREVIEW_PHOTO_UNSUPPORTED =
  "That photo format isn't supported yet. Try a screenshot of it, or a different photo.";
export const PREVIEW_PHOTO_TOO_BIG = "Use a photo under 8 MB.";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_PHOTO_EDGE = 2048;

export class PreviewPhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreviewPhotoError";
  }
}

function parseDataUrl(input: string) {
  const match = input.match(/^data:([^,]*),([\s\S]*)$/);
  if (!match) throw new PreviewPhotoError(PREVIEW_PHOTO_UNSUPPORTED);
  const meta = match[1] ?? "";
  const declared = meta.split(";")[0]?.trim().toLowerCase() || "";
  const buffer = meta.includes(";base64")
    ? Buffer.from(match[2], "base64")
    : Buffer.from(decodeURIComponent(match[2]), "utf8");
  if (!buffer.length) throw new PreviewPhotoError(PREVIEW_PHOTO_UNSUPPORTED);
  return { declared, buffer };
}

function acceptedMime(
  declared: string,
  sniffed: ReturnType<typeof sniffImageMime>
) {
  if (sniffed) return sniffed;
  if (declared.startsWith("image/")) return declared;
  if (!declared || declared === "application/octet-stream") return "";
  return null;
}

async function convertHeic(buffer: Buffer) {
  const { default: convert } = await import("heic-convert");
  const jpeg = await convert({ buffer, format: "JPEG", quality: 0.92 });
  return Buffer.from(jpeg);
}

/** Return bytes sharp can rasterise. HEIC falls back to heic-convert. */
export async function galleryBuffer(buffer: Buffer) {
  if (sniffImageMime(buffer) !== "image/heic") return buffer;
  try {
    await sharp(buffer, { failOn: "none", limitInputPixels: false })
      .rotate()
      .jpeg()
      .toBuffer();
    return buffer;
  } catch {
    return convertHeic(buffer);
  }
}

async function toOrientedJpeg(buffer: Buffer) {
  return sharp(buffer, {
    failOn: "none",
    animated: false,
    limitInputPixels: false,
  })
    .rotate()
    .resize({
      width: MAX_PHOTO_EDGE,
      height: MAX_PHOTO_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/**
 * Turn a phone gallery photo into a 2048px JPEG.
 * HEIC is decoded with sharp when libheif can read it, otherwise heic-convert.
 * rotate() applies the EXIF orientation.
 */
export async function readPreviewPhoto(input: string) {
  const parsed = parseDataUrl(input);
  if (parsed.buffer.length > MAX_PHOTO_BYTES) {
    throw new PreviewPhotoError(PREVIEW_PHOTO_TOO_BIG);
  }
  const sniffed = sniffImageMime(parsed.buffer);
  const mime = acceptedMime(parsed.declared, sniffed);
  if (mime === null) throw new PreviewPhotoError(PREVIEW_PHOTO_UNSUPPORTED);
  try {
    const buffer = await toOrientedJpeg(await galleryBuffer(parsed.buffer));
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height || meta.format !== "jpeg") {
      throw new PreviewPhotoError(PREVIEW_PHOTO_UNSUPPORTED);
    }
    return { buffer, mime: "image/jpeg" as const };
  } catch (error) {
    if (error instanceof PreviewPhotoError) throw error;
    throw new PreviewPhotoError(PREVIEW_PHOTO_UNSUPPORTED);
  }
}
