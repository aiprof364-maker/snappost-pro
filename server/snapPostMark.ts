import sharp from "sharp";
import { measureSnapPostText, snapPostGlyphPath } from "./glyphText";

const MARK_TEXT = "Made with SnapPost";
const MIN_SHORT_SIDE = 160;

/** True when the upright photo is large enough for the shared free-plan mark. */
export async function photoFitsSnapPostMark(photoBuffer: Buffer) {
  const meta = await sharp(photoBuffer).rotate().metadata();
  return Math.min(meta.width ?? 0, meta.height ?? 0) >= MIN_SHORT_SIDE;
}
function measureText(text: string, fontSize: number) {
  return measureSnapPostText(text, fontSize, "bold");
}

export type SnapPostMarkLayout = {
  left: number;
  top: number;
  pillWidth: number;
  pillHeight: number;
  fontSize: number;
  padX: number;
  baseline: number;
  radius: number;
};

/**
 * Top-left box for the free-plan mark. The rendered mark uses this layout
 * unchanged so a business-name badge can stay clear of it.
 */
export function layoutSnapPostMark(
  width: number,
  height: number
): SnapPostMarkLayout | null {
  const shortSide = Math.min(width, height);
  if (shortSide < MIN_SHORT_SIDE || width < 2 || height < 2) return null;

  const margin = Math.max(10, Math.round(shortSide * 0.028));
  let fontSize = Math.min(20, Math.max(12, Math.round(shortSide * 0.026)));
  let textWidth = measureText(MARK_TEXT, fontSize);
  const maxInner = width - margin * 2 - fontSize;
  while (textWidth > maxInner && fontSize > 11) {
    fontSize -= 1;
    textWidth = measureText(MARK_TEXT, fontSize);
  }
  if (textWidth > maxInner) return null;

  const padX = Math.round(fontSize * 0.55);
  const padY = Math.round(fontSize * 0.38);
  const pillWidth = textWidth + padX * 2;
  const pillHeight = fontSize + padY * 2;
  if (pillWidth + margin > width || pillHeight + margin > height) return null;

  return {
    left: margin,
    top: margin,
    pillWidth,
    pillHeight,
    fontSize,
    padX,
    baseline: margin + padY + Math.round(fontSize * 0.8),
    radius: Math.round(pillHeight / 2),
  };
}

/**
 * Small top-left credit for a free-plan image. Returns a transparent PNG the
 * same size as the photo, or null when the photo is too small to hold it.
 * Logo branding stays in the lower-right, so this does not cover it.
 */
export async function renderSnapPostMarkOverlay(
  width: number,
  height: number
): Promise<Buffer | null> {
  const layout = layoutSnapPostMark(width, height);
  if (!layout) return null;

  const letters = snapPostGlyphPath({
    text: MARK_TEXT,
    x: layout.left + layout.padX,
    y: layout.baseline,
    fontSize: layout.fontSize,
    face: "bold",
    fill: "#ffffff",
  });
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect x="${layout.left}" y="${layout.top}" width="${layout.pillWidth}" height="${layout.pillHeight}" rx="${layout.radius}" fill="#1c183a" fill-opacity="0.78"/>
  ${letters}
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Returns a JPEG with the free-plan mark, or null when the photo is too small. */
export async function compositeSnapPostMark(
  jpeg: Buffer
): Promise<Buffer | null> {
  const meta = await sharp(jpeg).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const overlay = await renderSnapPostMarkOverlay(width, height);
  if (!overlay) return null;
  return sharp(jpeg)
    .composite([{ input: overlay, left: 0, top: 0, blend: "over" }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
