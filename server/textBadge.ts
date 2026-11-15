import sharp from "sharp";
import { measureSnapPostText, snapPostGlyphPath } from "./glyphText";
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

type BadgeFace = "SnapPostBadge" | "SnapPostBadgeBold";

function faceOf(family: BadgeFace) {
  return family === "SnapPostBadgeBold" ? "bold" : "regular";
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

function measureText(text: string, fontSize: number, family: BadgeFace) {
  const key = `${family}|${fontSize}|${text}`;
  const cached = widthCache.get(key);
  if (cached !== undefined) return cached;
  const width = measureSnapPostText(text, fontSize, faceOf(family));
  widthCache.set(key, width);
  return width;
}

function fitLine(
  text: string,
  fontSize: number,
  family: BadgeFace,
  maxWidth: number
) {
  if (measureText(text, fontSize, family) <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 1) {
    clipped = clipped.slice(0, -1).trimEnd();
    const candidate = `${clipped}…`;
    if (measureText(candidate, fontSize, family) <= maxWidth) return candidate;
  }
  return "…";
}

function wrapText(
  text: string,
  fontSize: number,
  family: BadgeFace,
  maxWidth: number,
  maxLines: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    const candidate = current ? `${current} ${word}` : word;
    if (measureText(candidate, fontSize, family) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (!current) {
      lines.push(fitLine(word, fontSize, family, maxWidth));
      return lines;
    }
    lines.push(current);
    const rest = words.slice(index).join(" ");
    if (lines.length === maxLines) return lines;
    if (lines.length === maxLines - 1) {
      lines.push(fitLine(rest, fontSize, family, maxWidth));
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
    ? wrapText(copy.businessName, nameSize, "SnapPostBadgeBold", maxInner, 2)
    : [];
  const suburbLine = copy.suburb
    ? fitLine(copy.suburb, suburbSize, "SnapPostBadge", maxInner)
    : undefined;

  let ctaSize = Math.max(12, Math.round(shortSide * 0.019));
  let ctaWidth = measureText(copy.callToAction, ctaSize, "SnapPostBadgeBold");
  while (ctaWidth + Math.round(ctaSize * 1.4) > maxInner && ctaSize > 11) {
    ctaSize -= 1;
    ctaWidth = measureText(copy.callToAction, ctaSize, "SnapPostBadgeBold");
  }
  const pillPadX = Math.round(ctaSize * 0.72);
  const pillHeight = Math.round(ctaSize * 1.75);
  const pillWidth = Math.min(maxInner, ctaWidth + pillPadX * 2);

  const nameWidths = nameLines.map(line =>
    measureText(line, nameSize, "SnapPostBadgeBold")
  );
  const suburbWidth = suburbLine
    ? measureText(suburbLine, suburbSize, "SnapPostBadge")
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
      snapPostGlyphPath({
        text: line,
        x: left + padX,
        y: baseline,
        fontSize: nameSize,
        face: "bold",
        fill: "#ffffff",
      })
    );
    cursor += nameSize;
    if (index < nameLines.length - 1) cursor += nameGap;
  });
  if (suburbLine) {
    if (nameLines.length) cursor += blockGap;
    const baseline = cursor + Math.round(suburbSize * 0.8);
    parts.push(
      snapPostGlyphPath({
        text: suburbLine,
        x: left + padX,
        y: baseline,
        fontSize: suburbSize,
        face: "regular",
        fill: "#f4eeff",
      })
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
    snapPostGlyphPath({
      text: copy.callToAction,
      x: pillX + pillPadX,
      y: ctaBaseline,
      fontSize: ctaSize,
      face: "bold",
      fill: "#1f1406",
    })
  );

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect x="${left}" y="${top}" width="${badgeWidth}" height="${badgeHeight}" rx="${radius}" fill="#3c2e86"/>
  ${parts.join("")}
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
