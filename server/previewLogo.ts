import sharp from "sharp";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_LOGO_EDGE = 1024;

export const PREVIEW_LOGO_MIME_ERROR =
  "Please use a PNG, JPG, WebP, or SVG logo.";
export const PREVIEW_LOGO_SIZE_ERROR = "Use a logo under 2 MB.";
export const PREVIEW_LOGO_DECODE_ERROR =
  "We could not open that logo. Please use a PNG, JPG, WebP, or SVG file.";

const LOGO_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);

export class PreviewLogoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreviewLogoError";
  }
}

function parseLogoDataUrl(input: string) {
  const match = input.match(/^data:([^,]*),([\s\S]*)$/);
  if (!match) throw new PreviewLogoError(PREVIEW_LOGO_MIME_ERROR);
  const meta = match[1];
  const mime = meta.split(";")[0]?.trim().toLowerCase() || "";
  if (!LOGO_MIMES.has(mime))
    throw new PreviewLogoError(PREVIEW_LOGO_MIME_ERROR);
  const buffer = meta.includes(";base64")
    ? Buffer.from(match[2], "base64")
    : Buffer.from(decodeURIComponent(match[2]), "utf8");
  if (!buffer.length) throw new PreviewLogoError(PREVIEW_LOGO_DECODE_ERROR);
  if (buffer.length > MAX_LOGO_BYTES) {
    throw new PreviewLogoError(PREVIEW_LOGO_SIZE_ERROR);
  }
  return { mime: mime === "image/jpg" ? "image/jpeg" : mime, buffer };
}

/**
 * Check a preview logo and keep it as a PNG so transparent artwork survives.
 * SVG is rasterised here when the phone could not draw it itself.
 */
export async function readPreviewLogo(input: string) {
  const decoded = parseLogoDataUrl(input);
  try {
    const buffer = await sharp(decoded.buffer, {
      limitInputPixels: 16_000_000,
      animated: false,
    })
      .rotate()
      .resize({
        width: MAX_LOGO_EDGE,
        height: MAX_LOGO_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height || meta.format !== "png") {
      throw new PreviewLogoError(PREVIEW_LOGO_DECODE_ERROR);
    }
    return { buffer, mime: "image/png" as const };
  } catch (error) {
    if (error instanceof PreviewLogoError) throw error;
    throw new PreviewLogoError(PREVIEW_LOGO_DECODE_ERROR);
  }
}
