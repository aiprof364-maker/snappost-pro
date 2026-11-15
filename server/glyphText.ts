import opentype from "opentype.js";
import { readSnapPostFont } from "./snapPostFont";

export type SnapPostFace = "regular" | "bold";

const fonts = new Map<SnapPostFace, ReturnType<typeof opentype.parse>>();

function fontFor(face: SnapPostFace) {
  const cached = fonts.get(face);
  if (cached) return cached;
  const filename =
    face === "bold" ? "SnapPostBadge-Bold.ttf" : "SnapPostBadge-Regular.ttf";
  const bytes = readSnapPostFont(filename);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const parsed = opentype.parse(buffer);
  fonts.set(face, parsed);
  return parsed;
}

/** Width from the bundled font. Sharp's SVG text renderer is not used. */
export function measureSnapPostText(
  text: string,
  fontSize: number,
  face: SnapPostFace
) {
  if (!text) return 0;
  return fontFor(face).getAdvanceWidth(text, fontSize);
}

/**
 * Letter outlines from the bundled TTF. librsvg ignores @font-face and would
 * otherwise draw missing-glyph boxes on a machine with no matching font.
 */
export function snapPostGlyphPath(input: {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  face: SnapPostFace;
  fill: string;
}) {
  if (!input.text) return "";
  const d = fontFor(input.face)
    .getPath(input.text, input.x, input.y, input.fontSize)
    .toPathData(2);
  if (!d) return "";
  return `<path d="${d}" fill="${input.fill}"/>`;
}
