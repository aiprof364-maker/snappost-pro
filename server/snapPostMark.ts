import sharp from "sharp";
import { readSnapPostFont } from "./snapPostFont";

const MARK_TEXT = "Made with SnapPost";
const MIN_SHORT_SIDE = 160;

/** True when the upright photo is large enough for the shared free-plan mark. */
export async function photoFitsSnapPostMark(photoBuffer: Buffer) {
  const meta = await sharp(photoBuffer).rotate().metadata();
  return Math.min(meta.width ?? 0, meta.height ?? 0) >= MIN_SHORT_SIDE;
}
let fontCss: string | null = null;

function markFontCss() {
  if (fontCss) return fontCss;
  const bold = readSnapPostFont("SnapPostBadge-Bold.ttf").toString("base64");
  fontCss = `@font-face{font-family:'SnapPostMark';src:url("data:font/ttf;base64,${bold}") format("truetype");}`;
  return fontCss;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function measureText(text: string, fontSize: number) {
  const height = Math.ceil(fontSize * 2);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="${height}">
  <style>${markFontCss()}</style>
  <text x="0" y="${fontSize}" font-family="SnapPostMark" font-size="${fontSize}" fill="#000000">${escapeXml(text)}</text>
</svg>`;
  const { data, info } = await sharp(Buffer.from(svg))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let maxX = 0;
  for (
    let offset = info.channels - 1;
    offset < data.length;
    offset += info.channels
  ) {
    if (data[offset] > 16) {
      const x = Math.floor(offset / info.channels) % info.width;
      if (x > maxX) maxX = x;
    }
  }
  return Math.max(1, maxX + 1);
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
  const shortSide = Math.min(width, height);
  if (shortSide < MIN_SHORT_SIDE || width < 2 || height < 2) return null;

  const margin = Math.max(10, Math.round(shortSide * 0.028));
  let fontSize = Math.min(20, Math.max(12, Math.round(shortSide * 0.026)));
  let textWidth = await measureText(MARK_TEXT, fontSize);
  const maxInner = width - margin * 2 - fontSize;
  while (textWidth > maxInner && fontSize > 11) {
    fontSize -= 1;
    textWidth = await measureText(MARK_TEXT, fontSize);
  }
  if (textWidth > maxInner) return null;

  const padX = Math.round(fontSize * 0.55);
  const padY = Math.round(fontSize * 0.38);
  const pillWidth = textWidth + padX * 2;
  const pillHeight = fontSize + padY * 2;
  if (pillWidth + margin > width || pillHeight + margin > height) return null;

  const baseline = margin + padY + Math.round(fontSize * 0.8);
  const radius = Math.round(pillHeight / 2);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <style>${markFontCss()}</style>
  <rect x="${margin}" y="${margin}" width="${pillWidth}" height="${pillHeight}" rx="${radius}" fill="#1c183a" fill-opacity="0.78"/>
  <text x="${margin + padX}" y="${baseline}" font-family="SnapPostMark" font-size="${fontSize}" fill="#ffffff">${escapeXml(MARK_TEXT)}</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Returns a JPEG with the free-plan mark, or null when the photo is too small. */
export async function compositeSnapPostMark(jpeg: Buffer): Promise<Buffer | null> {
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
