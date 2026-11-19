import sharp from "sharp";
import {
  borderInk,
  layoutPostBorder,
  nameBarCopy,
  type PostBorderOptions,
} from "@shared/postBorder";
import { measureSnapPostText, snapPostGlyphPath } from "./glyphText";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function fitLine(
  text: string,
  fontSize: number,
  face: "regular" | "bold",
  maxWidth: number
) {
  if (measureSnapPostText(text, fontSize, face) <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 1) {
    clipped = clipped.slice(0, -1).trimEnd();
    const candidate = `${clipped}…`;
    if (measureSnapPostText(candidate, fontSize, face) <= maxWidth) {
      return candidate;
    }
  }
  return "";
}

type BarLine = {
  text: string;
  fontSize: number;
  face: "regular" | "bold";
  x: number;
  baseline: number;
};

/**
 * Bottom-bar copy. Font size tracks image width so the name stays readable
 * when the post is shown full-width on a phone. Returns null when there is
 * nothing to print or the bar cannot hold readable type.
 */
export function planBarText(
  width: number,
  height: number,
  textTop: number,
  bottom: number,
  input: PostBorderOptions
): BarLine[] | null {
  if (textTop < height * 0.25) return null;
  const copy = nameBarCopy(input);
  const primary = copy.name;
  const secondary = copy.detail;
  if (!primary) return null;

  const padX = Math.max(8, Math.round(width * 0.045));
  const maxWidth = width - padX * 2;
  if (maxWidth < 24) return null;

  let nameSize = Math.round(clamp(width * 0.044, 14, 52));
  nameSize = Math.min(nameSize, Math.floor((bottom - 8) * 0.62));
  while (
    nameSize > 12 &&
    measureSnapPostText(primary, nameSize, "bold") > maxWidth
  ) {
    nameSize -= 1;
  }
  if (nameSize < 12) return null;
  const name = fitLine(primary, nameSize, "bold", maxWidth);
  if (!name) return null;

  let detail: string | undefined;
  let detailSize = Math.round(Math.min(nameSize * 0.68, width * 0.034));
  const minDetail = Math.max(12, Math.round(width * 0.028));
  if (secondary && detailSize >= minDetail) {
    while (
      detailSize > minDetail &&
      measureSnapPostText(secondary, detailSize, "regular") > maxWidth
    ) {
      detailSize -= 1;
    }
    const fitted = fitLine(secondary, detailSize, "regular", maxWidth);
    if (fitted) detail = fitted;
  }

  const gap = detail ? Math.round(nameSize * 0.2) : 0;
  let block = nameSize + (detail ? gap + detailSize : 0);
  if (block > bottom - 4) {
    detail = undefined;
    block = nameSize;
  }
  if (block > bottom - 2) return null;

  const barTop = height - bottom;
  const blockTop = barTop + Math.floor((bottom - block) / 2);
  if (blockTop < height * 0.25) return null;

  const lines: BarLine[] = [
    {
      text: name,
      fontSize: nameSize,
      face: "bold",
      x: Math.round((width - measureSnapPostText(name, nameSize, "bold")) / 2),
      baseline: blockTop + Math.round(nameSize * 0.8),
    },
  ];
  if (detail) {
    lines.push({
      text: detail,
      fontSize: detailSize,
      face: "regular",
      x: Math.round(
        (width - measureSnapPostText(detail, detailSize, "regular")) / 2
      ),
      baseline: blockTop + nameSize + gap + Math.round(detailSize * 0.8),
    });
  }
  return lines;
}

function lineFrameSvg(
  width: number,
  height: number,
  stroke: number,
  color: string
) {
  const span = Math.max(0, height - stroke * 2);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect x="0" y="0" width="${width}" height="${stroke}" fill="${color}"/>
  <rect x="0" y="${height - stroke}" width="${width}" height="${stroke}" fill="${color}"/>
  <rect x="0" y="${stroke}" width="${stroke}" height="${span}" fill="${color}"/>
  <rect x="${width - stroke}" y="${stroke}" width="${stroke}" height="${span}" fill="${color}"/>
</svg>`;
}

async function svgPng(svg: string) {
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Draw a saved frame onto a finished post. None returns the same buffer, so
 * existing posts keep today's pixels. Square and portrait inputs keep their
 * width and height.
 */
export async function framePostImage(
  image: Buffer,
  options: PostBorderOptions
): Promise<Buffer> {
  const meta = await sharp(image).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const layout = layoutPostBorder({
    width,
    height,
    style: options.style,
    color: options.color,
  });
  if (!layout) return image;

  const overlays: sharp.OverlayOptions[] = [];
  if (
    layout.left === 0 &&
    layout.top === 0 &&
    layout.innerWidth === width &&
    layout.innerHeight === height
  ) {
    overlays.push({ input: image, left: 0, top: 0 });
  } else {
    const photo = await sharp(image)
      .resize({
        width: layout.innerWidth,
        height: layout.innerHeight,
        fit: "contain",
        position: "centre",
        background: layout.background,
      })
      .flatten({ background: layout.background })
      .png()
      .toBuffer();
    overlays.push({ input: photo, left: layout.left, top: layout.top });
  }

  if (layout.stroke > 0) {
    overlays.push({
      input: await svgPng(
        lineFrameSvg(width, height, layout.stroke, layout.strokeColor)
      ),
      left: 0,
      top: 0,
    });
  }

  if (layout.textTop !== null) {
    const lines = planBarText(
      width,
      height,
      layout.textTop,
      layout.bottom,
      options
    );
    if (lines?.length) {
      const fill = borderInk(layout.background);
      const paths = lines
        .map(line =>
          snapPostGlyphPath({
            text: line.text,
            x: line.x,
            y: line.baseline,
            fontSize: line.fontSize,
            face: line.face,
            fill,
          })
        )
        .join("");
      if (paths) {
        overlays.push({
          input: await svgPng(
            `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  ${paths}
</svg>`
          ),
          left: 0,
          top: 0,
        });
      }
    }
  }

  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: layout.background,
    },
  })
    .composite(overlays)
    .jpeg({ quality: 90 })
    .toBuffer();
}
