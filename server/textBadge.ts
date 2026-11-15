import { readFileSync } from "node:fs";
import sharp from "sharp";
import {
  PREVIEW_BUSINESS_NAME_MAX,
  PREVIEW_CALL_TO_ACTION,
  PREVIEW_SUBURB_MAX,
  cleanPreviewText,
} from "@shared/previewCaption";

export type TextBadgeInput = {
  businessName?: string;
  suburb?: string;
  callToAction?: string;
};

type BadgeCopy = {
  businessName?: string;
  suburb?: string;
  callToAction: string;
};

const MIN_SHORT_SIDE = 280;
const widthCache = new Map<string, number>();
let fontCss: string | null = null;

function badgeFontCss() {
  if (fontCss) return fontCss;
  const regular = readFileSync(
    new URL("./fonts/SnapPostBadge-Regular.ttf", import.meta.url)
  ).toString("base64");
  const bold = readFileSync(
    new URL("./fonts/SnapPostBadge-Bold.ttf", import.meta.url)
  ).toString("base64");
  fontCss = `@font-face{font-family:'SnapPostBadge';src:url("data:font/ttf;base64,${regular}") format("truetype");}@font-face{font-family:'SnapPostBadgeBold';src:url("data:font/ttf;base64,${bold}") format("truetype");}`;
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

/** A badge is only drawn from details the visitor supplied. */
export function normalizeTextBadge(
  details: TextBadgeInput | null | undefined
): BadgeCopy | null {
  const businessName = cleanPreviewText(
    details?.businessName,
    PREVIEW_BUSINESS_NAME_MAX
  );
  const suburb = cleanPreviewText(details?.suburb, PREVIEW_SUBURB_MAX);
  if (!businessName && !suburb) return null;
  return {
    businessName,
    suburb,
    callToAction:
      cleanPreviewText(details?.callToAction, 80) ?? PREVIEW_CALL_TO_ACTION,
  };
}

async function measureText(
  text: string,
  fontSize: number,
  family: "SnapPostBadge" | "SnapPostBadgeBold"
) {
  const key = `${family}|${fontSize}|${text}`;
  const cached = widthCache.get(key);
  if (cached !== undefined) return cached;
  const height = Math.ceil(fontSize * 2);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="${height}">
  <style>${badgeFontCss()}</style>
  <text x="0" y="${fontSize}" font-family="${family}" font-size="${fontSize}" fill="#000000">${escapeXml(text)}</text>
</svg>`;
  // Sharp's trim treats transparent black like solid black, so measure the
  // ink by its alpha instead of trimming the canvas.
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
  const width = Math.max(1, maxX + 1);
  widthCache.set(key, width);
  return width;
}

async function fitLine(
  text: string,
  fontSize: number,
  family: "SnapPostBadge" | "SnapPostBadgeBold",
  maxWidth: number
) {
  if ((await measureText(text, fontSize, family)) <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 1) {
    clipped = clipped.slice(0, -1).trimEnd();
    const candidate = `${clipped}…`;
    if ((await measureText(candidate, fontSize, family)) <= maxWidth) {
      return candidate;
    }
  }
  return "…";
}

async function wrapText(
  text: string,
  fontSize: number,
  family: "SnapPostBadge" | "SnapPostBadgeBold",
  maxWidth: number,
  maxLines: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    const candidate = current ? `${current} ${word}` : word;
    const candidateWidth = await measureText(candidate, fontSize, family);
    if (candidateWidth <= maxWidth) {
      current = candidate;
      continue;
    }
    if (!current) {
      lines.push(await fitLine(word, fontSize, family, maxWidth));
      return lines;
    }
    lines.push(current);
    const rest = words.slice(index).join(" ");
    if (lines.length === maxLines) return lines;
    if (lines.length === maxLines - 1) {
      lines.push(await fitLine(rest, fontSize, family, maxWidth));
      return lines;
    }
    current = word;
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

/**
 * Lower-left business badge for a preview that has no logo.
 * Returns a transparent PNG the same size as the photo, or null when there
 * is nothing supplied to show or the photo is too small for readable type.
 */
export async function renderTextBadgeOverlay(
  width: number,
  height: number,
  details: TextBadgeInput | null | undefined
): Promise<Buffer | null> {
  const copy = normalizeTextBadge(details);
  const shortSide = Math.min(width, height);
  if (!copy || shortSide < MIN_SHORT_SIDE || width < 2 || height < 2)
    return null;

  const margin = Math.max(12, Math.round(shortSide * 0.037));
  const maxOuter = Math.min(Math.round(width * 0.74), width - margin * 2);
  const nameSize = Math.max(16, Math.round(shortSide * 0.039));
  const suburbSize = Math.max(13, Math.round(shortSide * 0.024));
  const padX = Math.round(nameSize * 0.72);
  const padY = Math.round(nameSize * 0.58);
  const maxInner = maxOuter - padX * 2;
  if (maxInner < 80) return null;

  const nameLines = copy.businessName
    ? await wrapText(
        copy.businessName,
        nameSize,
        "SnapPostBadgeBold",
        maxInner,
        2
      )
    : [];
  const suburbLine = copy.suburb
    ? await fitLine(copy.suburb, suburbSize, "SnapPostBadge", maxInner)
    : undefined;

  let ctaSize = Math.max(12, Math.round(shortSide * 0.019));
  let ctaWidth = await measureText(
    copy.callToAction,
    ctaSize,
    "SnapPostBadgeBold"
  );
  while (ctaWidth + Math.round(ctaSize * 1.4) > maxInner && ctaSize > 11) {
    ctaSize -= 1;
    ctaWidth = await measureText(
      copy.callToAction,
      ctaSize,
      "SnapPostBadgeBold"
    );
  }
  const pillPadX = Math.round(ctaSize * 0.72);
  const pillHeight = Math.round(ctaSize * 1.75);
  const pillWidth = Math.min(maxInner, ctaWidth + pillPadX * 2);

  const nameWidths = await Promise.all(
    nameLines.map(line => measureText(line, nameSize, "SnapPostBadgeBold"))
  );
  const suburbWidth = suburbLine
    ? await measureText(suburbLine, suburbSize, "SnapPostBadge")
    : 0;
  const contentWidth = Math.max(pillWidth, suburbWidth, ...nameWidths, 1);
  const badgeWidth = Math.min(maxOuter, contentWidth + padX * 2);

  const nameGap = Math.round(nameSize * 0.22);
  const blockGap = Math.round(nameSize * 0.38);
  let contentHeight = 0;
  if (nameLines.length) {
    contentHeight +=
      nameLines.length * nameSize + (nameLines.length - 1) * nameGap;
  }
  if (suburbLine) contentHeight += (contentHeight ? blockGap : 0) + suburbSize;
  contentHeight += (contentHeight ? blockGap : 0) + pillHeight;
  const badgeHeight = contentHeight + padY * 2;
  if (badgeHeight + margin > height) return null;

  const left = margin;
  const top = height - margin - badgeHeight;
  const radius = Math.max(12, Math.round(badgeHeight * 0.16));
  const parts: string[] = [];
  let cursor = top + padY;

  nameLines.forEach((line, index) => {
    const baseline = cursor + Math.round(nameSize * 0.8);
    parts.push(
      `<text x="${left + padX}" y="${baseline}" font-family="SnapPostBadgeBold" font-size="${nameSize}" fill="#ffffff">${escapeXml(line)}</text>`
    );
    cursor += nameSize;
    if (index < nameLines.length - 1) cursor += nameGap;
  });
  if (suburbLine) {
    if (nameLines.length) cursor += blockGap;
    const baseline = cursor + Math.round(suburbSize * 0.8);
    parts.push(
      `<text x="${left + padX}" y="${baseline}" font-family="SnapPostBadge" font-size="${suburbSize}" fill="#f4eeff">${escapeXml(suburbLine)}</text>`
    );
    cursor += suburbSize;
  }
  if (nameLines.length || suburbLine) cursor += blockGap;
  const pillY = cursor;
  const pillX = left + padX;
  const ctaBaseline = pillY + Math.round(pillHeight * 0.68);
  parts.push(
    `<rect x="${pillX}" y="${pillY}" width="${pillWidth}" height="${pillHeight}" rx="${Math.round(pillHeight / 2)}" fill="#e39a2b"/>`
  );
  parts.push(
    `<text x="${pillX + pillPadX}" y="${ctaBaseline}" font-family="SnapPostBadgeBold" font-size="${ctaSize}" fill="#1f1406">${escapeXml(copy.callToAction)}</text>`
  );

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <style>${badgeFontCss()}</style>
  <rect x="${left}" y="${top}" width="${badgeWidth}" height="${badgeHeight}" rx="${radius}" fill="#3c2e86"/>
  ${parts.join("")}
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
