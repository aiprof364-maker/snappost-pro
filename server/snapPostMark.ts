import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { SNAPPOST_CAPTION_FOOTER } from "@shared/referrals";
import { measureSnapPostText, snapPostGlyphPath } from "./glyphText";

export const WATERMARK_TEXT = SNAPPOST_CAPTION_FOOTER;

/** Pill height as a fraction of the image height. */
const HEIGHT_RATIO = 0.03;
const MIN_FONT = 7;
const MIN_PILL = 11;

const logoBytesCache = { value: undefined as Buffer | null | undefined };
const resizedLogoCache = new Map<number, Buffer>();

function logoCandidates(moduleUrl: string | URL) {
  return [
    new URL("../client/public/icons/icon-192.png", moduleUrl),
    new URL("./public/icons/icon-192.png", moduleUrl),
    new URL("../dist/public/icons/icon-192.png", moduleUrl),
  ];
}

/** Small SnapPost Pro mark already shipped with the app, if the file is present. */
export function readSnapPostLogo(): Buffer | null {
  if (logoBytesCache.value !== undefined) return logoBytesCache.value;
  for (const url of logoCandidates(import.meta.url)) {
    const path = fileURLToPath(url);
    if (!existsSync(path)) continue;
    logoBytesCache.value = readFileSync(path);
    return logoBytesCache.value;
  }
  logoBytesCache.value = null;
  return null;
}

async function logoPng(size: number): Promise<Buffer | null> {
  const cached = resizedLogoCache.get(size);
  if (cached) return cached;
  const source = readSnapPostLogo();
  if (!source || size < 4) return null;
  const png = await sharp(source)
    .resize(size, size, { fit: "cover" })
    .png()
    .toBuffer();
  resizedLogoCache.set(size, png);
  return png;
}

export type MarkCorner = "bottom-left" | "bottom-right";

export type SnapPostMarkLayout = {
  left: number;
  top: number;
  pillWidth: number;
  pillHeight: number;
  fontSize: number;
  padX: number;
  padY: number;
  logoSize: number;
  logoGap: number;
  baseline: number;
  radius: number;
  corner: MarkCorner;
};

function edgeMargin(width: number, height: number) {
  return Math.max(8, Math.round(Math.min(width, height) * 0.03));
}

type PillMetrics = {
  fontSize: number;
  padX: number;
  padY: number;
  logoSize: number;
  logoGap: number;
  pillWidth: number;
  pillHeight: number;
};

function metricsFor(fontSize: number, pillHeight: number, includeLogo: boolean): PillMetrics {
  const padX = Math.max(3, Math.round(pillHeight * 0.28));
  const logoSize = includeLogo ? Math.max(0, Math.round(pillHeight * 0.7)) : 0;
  const logoGap = logoSize ? Math.max(2, Math.round(pillHeight * 0.12)) : 0;
  const textWidth = Math.ceil(measureSnapPostText(WATERMARK_TEXT, fontSize, "bold"));
  return {
    fontSize,
    padX,
    padY: Math.max(1, Math.round((pillHeight - fontSize) / 2)),
    logoSize,
    logoGap,
    pillWidth: padX + (logoSize ? logoSize + logoGap : 0) + textWidth + padX,
    pillHeight,
  };
}

/**
 * Bottom-corner pill for the free-plan watermark. Height is about 3% of the
 * image and scales with it. The corner is the one opposite the customer logo.
 * Returns null when the photo is too small to keep the line readable.
 */
export function layoutSnapPostMark(
  width: number,
  height: number,
  options?: { corner?: MarkCorner; maxWidth?: number }
): SnapPostMarkLayout | null {
  if (width < 2 || height < 2) return null;
  const corner = options?.corner ?? "bottom-left";
  const margin = edgeMargin(width, height);
  const available = Math.min(
    width - margin * 2,
    options?.maxWidth ?? width - margin * 2
  );
  if (available < 48 || height - margin < MIN_PILL) return null;

  const includeLogo = Boolean(readSnapPostLogo());
  const targetPill = Math.round(height * HEIGHT_RATIO);
  let pillHeight = Math.max(MIN_PILL, targetPill);
  let fontSize = Math.min(
    pillHeight - 4,
    Math.max(MIN_FONT, Math.round(pillHeight * 0.56))
  );
  if (fontSize < MIN_FONT || pillHeight + margin > height) return null;

  let chosen: PillMetrics | null = null;
  while (pillHeight >= MIN_PILL && fontSize >= MIN_FONT) {
    const next = metricsFor(fontSize, pillHeight, includeLogo);
    const fits =
      next.pillWidth <= available &&
      pillHeight + margin <= height &&
      next.pillWidth + margin <= width &&
      fontSize <= pillHeight - 2;
    if (fits) {
      chosen = next;
      break;
    }
    fontSize -= 1;
    pillHeight = Math.max(MIN_PILL, Math.round(fontSize / 0.56));
    if (fontSize < MIN_FONT) break;
  }
  if (!chosen) return null;

  const left =
    corner === "bottom-left" ? margin : width - margin - chosen.pillWidth;
  const top = height - margin - chosen.pillHeight;
  if (left < 0 || top < 0) return null;

  return {
    left,
    top,
    pillWidth: chosen.pillWidth,
    pillHeight: chosen.pillHeight,
    fontSize: chosen.fontSize,
    padX: chosen.padX,
    padY: chosen.padY,
    logoSize: chosen.logoSize,
    logoGap: chosen.logoGap,
    baseline: top + chosen.padY + Math.round(chosen.fontSize * 0.8),
    radius: Math.round(chosen.pillHeight / 2),
    corner,
  };
}

/**
 * Transparent overlay the same size as the photo. White text sits on a
 * semi-transparent dark rounded pill, with the SnapPost Pro logo when the
 * repo icon is available.
 */
export async function renderSnapPostMarkOverlay(
  width: number,
  height: number,
  options?: { corner?: MarkCorner; maxWidth?: number }
): Promise<Buffer | null> {
  const layout = layoutSnapPostMark(width, height, options);
  if (!layout) return null;

  const textX =
    layout.left +
    layout.padX +
    (layout.logoSize ? layout.logoSize + layout.logoGap : 0);
  const letters = snapPostGlyphPath({
    text: WATERMARK_TEXT,
    x: textX,
    y: layout.baseline,
    fontSize: layout.fontSize,
    face: "bold",
    fill: "#ffffff",
  });
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect x="${layout.left}" y="${layout.top}" width="${layout.pillWidth}" height="${layout.pillHeight}" rx="${layout.radius}" fill="#14122b" fill-opacity="0.76"/>
  ${letters}
</svg>`;
  const pill = await sharp(Buffer.from(svg)).png().toBuffer();
  if (!layout.logoSize) return pill;
  const logo = await logoPng(layout.logoSize);
  if (!logo) return pill;
  const logoLeft = layout.left + layout.padX;
  const logoTop =
    layout.top + Math.round((layout.pillHeight - layout.logoSize) / 2);
  return sharp(pill)
    .composite([{ input: logo, left: logoLeft, top: logoTop, blend: "over" }])
    .png()
    .toBuffer();
}

/** JPEG with the free-plan watermark, or null when the photo cannot hold it. */
export async function compositeSnapPostMark(
  jpeg: Buffer,
  options?: { corner?: MarkCorner; maxWidth?: number }
): Promise<Buffer | null> {
  const meta = await sharp(jpeg).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const overlay = await renderSnapPostMarkOverlay(width, height, options);
  if (!overlay) return null;
  return sharp(jpeg)
    .composite([{ input: overlay, left: 0, top: 0, blend: "over" }])
    .jpeg({ quality: 90 })
    .toBuffer();
}

/** True when the square preview frame can hold a readable watermark. */
export async function photoFitsSnapPostMark(photoBuffer: Buffer) {
  const meta = await sharp(photoBuffer).rotate().metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const side = Math.min(1080, width, height);
  return layoutSnapPostMark(side, side) !== null;
}
