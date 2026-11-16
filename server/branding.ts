import sharp from "sharp";
import { prepareLogoForBranding } from "./logoPreparation";
import {
  layoutSnapPostMark,
  renderSnapPostMarkOverlay,
  type MarkCorner,
} from "./snapPostMark";
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
 *
 * `watermark` composites the free-plan SnapPost pill in this same pass, in the
 * bottom corner opposite the customer logo. The returned `buffer` stays clean
 * so a paid account can publish it unchanged. `watermarkedBuffer` is the file
 * free accounts download and share.
 */
export async function brandImage(params: {
  photoBuffer: Buffer;
  logoBuffer?: Buffer | null;
  destKeyPrefix: string;
  frame?: "original" | "square";
  textBadge?: TextBadgeInput | null;
  watermark?: boolean;
}): Promise<{
  key: string;
  url: string;
  buffer: Buffer;
  watermarkedBuffer: Buffer | null;
}> {
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
  const cleanLayers: sharp.OverlayOptions[] = [];
  let logoLeft = finalWidth;

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
      const logoLayer: sharp.OverlayOptions = {
        input: logoPng,
        left: finalWidth - logoWidth - margin,
        top: finalHeight - logoHeight - margin,
        blend: "over",
      };
      cleanLayers.push(logoLayer);
      composited = composited.composite([logoLayer]);
      logoApplied = true;
      logoLeft = logoLayer.left ?? logoLeft;
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
      const badgeLayer: sharp.OverlayOptions = {
        input: overlay,
        left: 0,
        top: 0,
        blend: "over",
      };
      cleanLayers.push(badgeLayer);
      composited = composited.composite([badgeLayer]);
    }
  }

  const watermarkedBuffer = params.watermark
    ? await renderWatermarkedJpeg({
        base: resizedBase,
        width: finalWidth,
        height: finalHeight,
        cleanLayers,
        logoApplied,
        logoLeft,
        textBadge: textBadge ?? null,
      })
    : null;

  const outBuffer = await composited.jpeg({ quality: 90 }).toBuffer();
  const { key, url } = await storagePut(
    `${destKeyPrefix}/branded.jpg`,
    outBuffer,
    "image/jpeg"
  );
  return { key, url, buffer: outBuffer, watermarkedBuffer };
}

/**
 * Same logo and badge layers as the clean image, plus the free-plan pill.
 * A business-name badge is redrawn so it stops before the pill. The clean
 * JPEG above is left untouched.
 */
async function renderWatermarkedJpeg(input: {
  base: Buffer;
  width: number;
  height: number;
  cleanLayers: sharp.OverlayOptions[];
  logoApplied: boolean;
  logoLeft: number;
  textBadge: TextBadgeInput | null;
}) {
  const margin = Math.max(8, Math.round(Math.min(input.width, input.height) * 0.03));
  const gap = Math.max(8, Math.round(Math.min(input.width, input.height) * 0.02));
  const hasBadge = input.cleanLayers.length > (input.logoApplied ? 1 : 0);
  const corner: MarkCorner =
    input.logoApplied || !hasBadge ? "bottom-left" : "bottom-right";
  const maxWidth = input.logoApplied
    ? input.logoLeft - gap - margin
    : hasBadge
      ? Math.round(input.width * 0.5)
      : undefined;
  const layout = layoutSnapPostMark(input.width, input.height, {
    corner,
    maxWidth,
  });
  if (!layout) return null;

  const markedLayers = [...input.cleanLayers];
  if (hasBadge && !input.logoApplied && input.textBadge) {
    const fitted = await renderTextBadgeOverlay(
      input.width,
      input.height,
      input.textBadge,
      { avoidLeft: layout.left }
    );
    const badgeIndex = markedLayers.length - 1;
    if (fitted) {
      markedLayers[badgeIndex] = {
        input: fitted,
        left: 0,
        top: 0,
        blend: "over",
      };
    } else {
      markedLayers.splice(badgeIndex, 1);
    }
  }

  const mark = await renderSnapPostMarkOverlay(input.width, input.height, {
    corner,
    maxWidth,
  });
  if (!mark) return null;
  return sharp(input.base)
    .composite([
      ...markedLayers,
      { input: mark, left: 0, top: 0, blend: "over" },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
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
