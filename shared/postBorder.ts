import {
  PREVIEW_BUSINESS_NAME_MAX,
  PREVIEW_SUBURB_MAX,
  cleanPreviewText,
} from "./previewCaption";

/**
 * Frames for generated Facebook and Instagram posts.
 * None is the default and leaves the photo untouched.
 * Text is only ever placed in a bottom bar. The top quarter of the image
 * stays clear because phone captions cover that area.
 */
export const BORDER_STYLES = ["none", "solid", "line", "brand", "bar"] as const;

export type BorderStyle = (typeof BORDER_STYLES)[number];

export const CAPTION_CLEAR_ZONE = 0.25;

/** Used when an account has not picked a brand color yet. */
export const DEFAULT_BORDER_COLOR = "#3C2E86";

/** Fixed off-white mat. Not the account's brand color. */
export const PLAIN_BORDER_COLOR = "#F3F0EA";

export const LINE_BORDER_COLOR = "#1C1917";

export const BORDER_PRESETS: ReadonlyArray<{
  id: BorderStyle;
  label: string;
  description: string;
}> = [
  {
    id: "none",
    label: "None",
    description: "No border. Your photo fills the post, the same as today.",
  },
  {
    id: "solid",
    label: "Plain border",
    description: "A clean off-white frame. The top stays thin.",
  },
  {
    id: "line",
    label: "Thin line",
    description: "A fine dark line around the edge of the photo.",
  },
  {
    id: "brand",
    label: "Brand color",
    description: "A frame in the color you pick for your business.",
  },
  {
    id: "bar",
    label: "Name bar",
    description:
      "A bar along the bottom with your business name and city. Nothing is written across the top.",
  },
];

export type PostBorderOptions = {
  style?: string | null;
  color?: string | null;
  businessName?: string | null;
  suburb?: string | null;
};

export type PostBorderLayout = {
  style: Exclude<BorderStyle, "none">;
  top: number;
  right: number;
  bottom: number;
  left: number;
  innerWidth: number;
  innerHeight: number;
  background: string;
  stroke: number;
  strokeColor: string;
  /**
   * Y where bottom-bar text may start. Null when this frame has no text.
   * Always at or below the top 25% of the image.
   */
  textTop: number | null;
};

export function parseBorderStyle(
  value: string | null | undefined
): BorderStyle {
  if (value && (BORDER_STYLES as readonly string[]).includes(value)) {
    return value as BorderStyle;
  }
  return "none";
}

/** Accept #RRGGBB. Returns uppercase, or null when the value is not a color. */
export function parseBorderColor(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const match = /^#?([0-9a-fA-F]{6})$/.exec(value.trim());
  if (!match) return null;
  return `#${match[1].toUpperCase()}`;
}

export function resolvedBorderColor(value: string | null | undefined): string {
  return parseBorderColor(value) ?? DEFAULT_BORDER_COLOR;
}

export function borderUsesCustomColor(style: BorderStyle) {
  return style === "brand" || style === "bar";
}

/** Pick white or near-black ink, whichever contrasts more with the bar. */
export function borderInk(color: string): "#FFFFFF" | "#1C1917" {
  const hex = parseBorderColor(color) ?? DEFAULT_BORDER_COLOR;
  const channel = (byte: number) => {
    const c = byte / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel(parseInt(hex.slice(1, 3), 16)) +
    0.7152 * channel(parseInt(hex.slice(3, 5), 16)) +
    0.0722 * channel(parseInt(hex.slice(5, 7), 16));
  const contrast = (other: number) => {
    const lighter = Math.max(luminance, other);
    const darker = Math.min(luminance, other);
    return (lighter + 0.05) / (darker + 0.05);
  };
  return contrast(1) >= contrast(0) ? "#FFFFFF" : "#1C1917";
}

export function presentBorderSettings(
  user:
    | { borderStyle?: string | null; borderColor?: string | null }
    | null
    | undefined
) {
  return {
    borderStyle: parseBorderStyle(user?.borderStyle),
    borderColor: resolvedBorderColor(user?.borderColor),
  };
}

/** Name and city actually stored on the account. Blank values stay blank. */
export function borderCaption(input: {
  businessName?: string | null;
  suburb?: string | null;
}) {
  return {
    businessName: cleanPreviewText(
      input.businessName ?? undefined,
      PREVIEW_BUSINESS_NAME_MAX
    ),
    suburb: cleanPreviewText(input.suburb ?? undefined, PREVIEW_SUBURB_MAX),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function placeInsets(
  width: number,
  height: number,
  top: number,
  side: number,
  bottom: number
) {
  const left = Math.min(Math.max(0, side), Math.floor((width - 1) / 2));
  let nextTop = Math.max(0, top);
  let nextBottom = Math.max(0, bottom);
  if (nextTop + nextBottom > height - 1) {
    const budget = height - 1;
    if (budget < 1) return null;
    const scale = budget / (nextTop + nextBottom || 1);
    nextTop = Math.floor(nextTop * scale);
    nextBottom = budget - nextTop;
  }
  const innerWidth = width - left * 2;
  const innerHeight = height - nextTop - nextBottom;
  if (innerWidth < 1 || innerHeight < 1) return null;
  return {
    top: nextTop,
    right: left,
    bottom: nextBottom,
    left,
    innerWidth,
    innerHeight,
  };
}

/**
 * Pixel geometry for a frame. Returns null for None and for images too small
 * to hold a frame, which keeps today's output unchanged.
 */
export function layoutPostBorder(input: {
  width: number;
  height: number;
  style?: string | null;
  color?: string | null;
}): PostBorderLayout | null {
  const style = parseBorderStyle(input.style);
  if (style === "none") return null;
  const width = Math.round(input.width);
  const height = Math.round(input.height);
  if (width < 2 || height < 2) return null;

  const shortSide = Math.min(width, height);
  const color = resolvedBorderColor(input.color);

  if (style === "line") {
    let stroke = Math.round(clamp(shortSide * 0.008, 2, 10));
    if (stroke * 2 >= shortSide) stroke = Math.floor((shortSide - 1) / 2);
    if (stroke < 1) return null;
    return {
      style,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      innerWidth: width,
      innerHeight: height,
      background: LINE_BORDER_COLOR,
      stroke,
      strokeColor: LINE_BORDER_COLOR,
      textTop: null,
    };
  }

  let top = Math.round(clamp(shortSide * 0.03, 3, 36));
  let side = top;
  let bottom = top;
  let background = PLAIN_BORDER_COLOR;
  if (style === "brand") background = color;
  if (style === "bar") {
    const thin = Math.round(clamp(shortSide * 0.012, 2, 16));
    top = thin;
    side = thin;
    const nameTarget = Math.round(clamp(width * 0.044, 14, 52));
    const preferred = Math.round(nameTarget / 0.58) + 10;
    bottom = Math.max(Math.round(height * 0.11), preferred);
    bottom = Math.min(bottom, 160, Math.floor(height * 0.22));
    background = color;
  }

  top = Math.min(top, Math.max(1, Math.floor(height * 0.08)));
  side = Math.min(side, Math.max(1, Math.floor(width * 0.08)));
  const placed = placeInsets(width, height, top, side, bottom);
  if (!placed) return null;

  // The bar itself stays in the lower portion, so its text cannot enter the
  // top quarter that phone captions cover.
  const textTop =
    style === "bar" && placed.bottom >= 16 ? height - placed.bottom : null;
  if (textTop !== null && textTop < height * CAPTION_CLEAR_ZONE) return null;

  return {
    style,
    ...placed,
    background,
    stroke: 0,
    strokeColor: LINE_BORDER_COLOR,
    textTop,
  };
}
