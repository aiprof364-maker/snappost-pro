import sharp from "sharp";
import { prepareLogoForBranding } from "./logoPreparation";
import { renderTextBadgeOverlay, type TextBadgeInput } from "./textBadge";
import { storagePut, storageGetSignedUrl } from "./storage";

/**
 * Cover-crop a tall or wide photo into a square Facebook frame.
 * The longest side is capped at 1080 and the image is never enlarged.
 * The centre of the photo is kept so the work stays in frame.
 */
async function squareFacebookFrame(photoBuffer: Buffer) {
  const rotated = await sharp(photoBuffer).rotate().png().toBuffer();
  const meta = await sharp(rotated).metadata();
  const width = meta.width ?? 1;
  const height = meta.height ?? 1;
  const side = Math.min(1080, width, height);
  if (width === side && height === side) return rotated;
  return sharp(rotated)
    .resize({
      width: side,
      height: side,
      fit: "cover",
      position: "centre",
    })
    .png()
    .toBuffer();
}

/**
 * Add an optional, cleaned logo in the lower-right corner of the real photo.
 * Logo artwork fits within 16% of image width and 20% of image height; it is
 * never enlarged. Saved customer drafts keep the original crop. Public
 * previews pass frame "square". When a preview has no logo, a text badge can
 * be drawn in the lower-left from the visitor's own business name and suburb.
 */
export async function brandImage(params: {
  photoBuffer: Buffer;
  logoBuffer?: Buffer | null;
  destKeyPrefix: string;
  frame?: "original" | "square";
  textBadge?: TextBadgeInput | null;
}): Promise<{ key: string; url: string }> {
  const { photoBuffer, logoBuffer, destKeyPrefix, textBadge } = params;
  const frame = params.frame ?? "original";

  // Rotate before resizing so portrait EXIF images use their upright dimensions.
  // A lossless intermediate avoids a second JPEG compression before compositing.
  const resizedBase =
    frame === "square"
      ? await squareFacebookFrame(photoBuffer)
      : await sharp(photoBuffer)
          .rotate()
          .resize({ width: 1080, withoutEnlargement: true })
          .png()
          .toBuffer();
  const resizedMeta = await sharp(resizedBase).metadata();
  const finalWidth = resizedMeta.width!;
  const finalHeight = resizedMeta.height!;
  let composited = sharp(resizedBase);
  let logoApplied = false;

  if (logoBuffer) {
    const logoPng = await prepareLogoForBranding(
      logoBuffer,
      finalWidth,
      finalHeight
    );
    if (logoPng) {
      const logoMeta = await sharp(logoPng).metadata();
      const logoWidth = logoMeta.width!;
      const logoHeight = logoMeta.height!;
      const margin = Math.max(
        0,
        Math.min(
          Math.round(Math.min(finalWidth, finalHeight) * 0.03),
          Math.floor((finalWidth - logoWidth) / 2),
          Math.floor((finalHeight - logoHeight) / 2)
        )
      );
      composited = composited.composite([
        {
          input: logoPng,
          left: finalWidth - logoWidth - margin,
          top: finalHeight - logoHeight - margin,
          blend: "over",
        },
      ]);
      logoApplied = true;
    }
  }

  // A real logo keeps the lower-right treatment. The text badge is only the
  // fallback for a preview that did not upload one.
  if (!logoApplied && textBadge) {
    const overlay = await renderTextBadgeOverlay(
      finalWidth,
      finalHeight,
      textBadge
    );
    if (overlay) {
      composited = composited.composite([
        { input: overlay, left: 0, top: 0, blend: "over" },
      ]);
    }
  }

  const outBuffer = await composited.jpeg({ quality: 90 }).toBuffer();
  const { key, url } = await storagePut(
    `${destKeyPrefix}/branded.jpg`,
    outBuffer,
    "image/jpeg"
  );
  return { key, url };
}

/** Download bytes for a stored object via its signed URL. */
export async function fetchStorageBytes(storageKey: string): Promise<Buffer> {
  const signed = await storageGetSignedUrl(storageKey);
  const resp = await fetch(signed);
  if (!resp.ok) {
    throw new Error(`Failed to fetch storage object (${resp.status})`);
  }
  const arr = await resp.arrayBuffer();
  return Buffer.from(arr);
}
