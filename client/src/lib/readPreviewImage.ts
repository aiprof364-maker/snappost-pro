/** Longest side kept for a preview photo. */
export const PREVIEW_IMAGE_MAX_EDGE = 2048;

/** Longest side kept for a preview logo. */
export const PREVIEW_LOGO_MAX_EDGE = 1024;

export const PREVIEW_IMAGE_READ_ERROR =
  "We could not read that image. Please try another JPG or PNG.";

export type PreviewImageKind = "photo" | "logo";

export function fittedImageSize(
  width: number,
  height: number,
  maxEdge = PREVIEW_IMAGE_MAX_EDGE
) {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const longest = Math.max(safeWidth, safeHeight);
  if (longest <= maxEdge) return { width: safeWidth, height: safeHeight };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

export function sniffImageMime(
  bytes: Uint8Array
): "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml" | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  const head = new TextDecoder()
    .decode(bytes.slice(0, 256))
    .replace(/^\uFEFF/, "")
    .trimStart()
    .toLowerCase();
  if (
    head.startsWith("<svg") ||
    (head.startsWith("<?xml") && head.includes("<svg"))
  ) {
    return "image/svg+xml";
  }
  return null;
}

type Drawable = CanvasImageSource & {
  width: number;
  height: number;
  naturalWidth?: number;
  naturalHeight?: number;
  close?: () => void;
};

function encodeCanvas(
  source: Drawable,
  maxEdge: number,
  mime: "image/png" | "image/jpeg"
) {
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  if (!width || !height) throw new Error("empty");
  const size = fittedImageSize(width, height, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(source, 0, 0, size.width, size.height);
  const dataUrl =
    mime === "image/png"
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", 0.9);
  if (!dataUrl.startsWith(`data:${mime}`)) throw new Error("encode");
  return dataUrl;
}

/**
 * Draw through an Image element while the blob URL is still alive.
 * SVG and WebP on Android are rasterised this way. Revoking the URL first
 * leaves the canvas blank and the picker reports that the file could not be read.
 */
async function rasterizeWithImage(
  file: Blob,
  maxEdge: number,
  mime: "image/png" | "image/jpeg"
) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("decode"));
      element.src = url;
    });
    return encodeCanvas(image, maxEdge, mime);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function rasterizeWithBitmap(
  file: Blob,
  maxEdge: number,
  mime: "image/png" | "image/jpeg"
) {
  if (typeof createImageBitmap !== "function") throw new Error("bitmap");
  const bitmap = await createImageBitmap(file);
  try {
    return encodeCanvas(bitmap, maxEdge, mime);
  } finally {
    bitmap.close();
  }
}

function bytesToDataUrl(bytes: Uint8Array, mime: string) {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    const slice = bytes.subarray(index, index + chunk);
    const copy = new Array<number>(slice.length);
    for (let offset = 0; offset < slice.length; offset++)
      copy[offset] = slice[offset];
    binary += String.fromCharCode.apply(null, copy);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

async function readOriginalDataUrl(
  file: Blob,
  kind: PreviewImageKind
): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImageMime(bytes);
  if (!mime) throw new Error("type");
  if (kind === "photo" && mime === "image/svg+xml") throw new Error("type");
  return bytesToDataUrl(bytes, mime);
}

/**
 * Read a picked image immediately and keep a data URL we own.
 * Android content:// files can become unreadable after the first failed
 * decode, so a logo is drawn with Image plus canvas before any other read.
 * Photos stay JPEG. Logos stay PNG so transparency survives, capped at 1024px.
 */
export async function readPreviewImage(
  file: Blob & { name?: string },
  options?: { kind?: PreviewImageKind }
): Promise<
  { ok: true; dataUrl: string; name: string } | { ok: false; message: string }
> {
  const kind = options?.kind ?? "photo";
  const mime = kind === "logo" ? "image/png" : "image/jpeg";
  const maxEdge =
    kind === "logo" ? PREVIEW_LOGO_MAX_EDGE : PREVIEW_IMAGE_MAX_EDGE;
  const name =
    file.name?.trim() || (kind === "logo" ? "logo.png" : "photo.jpg");
  const attempts =
    kind === "logo"
      ? [() => rasterizeWithImage(file, maxEdge, mime)]
      : [
          () => rasterizeWithBitmap(file, maxEdge, mime),
          () => rasterizeWithImage(file, maxEdge, mime),
        ];
  for (const attempt of attempts) {
    try {
      return { ok: true, dataUrl: await attempt(), name };
    } catch {
      // The next decoder gets the same blob. Logos try Image first so an
      // SVG or WebP is rasterised before a failed bitmap read consumes it.
    }
  }
  try {
    return { ok: true, dataUrl: await readOriginalDataUrl(file, kind), name };
  } catch {
    return { ok: false, message: PREVIEW_IMAGE_READ_ERROR };
  }
}
