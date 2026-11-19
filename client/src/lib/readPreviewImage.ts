import { sniffImageMime } from "@shared/imageSniff";

/** Longest side kept for a preview photo. */
export const PREVIEW_IMAGE_MAX_EDGE = 2048;

/** Longest side kept for a preview logo. */
export const PREVIEW_LOGO_MAX_EDGE = 1024;

export const PREVIEW_PHOTO_TOO_BIG = "Use a photo under 8 MB.";
export const PREVIEW_LOGO_TOO_BIG = "Use a logo under 2 MB.";

const DECODE_TIMEOUT_MS = 8_000;

export type PreviewImageKind = "photo" | "logo";

export { sniffImageMime };

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

type Drawable = CanvasImageSource & {
  width: number;
  height: number;
  naturalWidth?: number;
  naturalHeight?: number;
  close?: () => void;
};

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    work.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

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

async function bitmapDownscaled(file: Blob, maxEdge: number) {
  if (typeof createImageBitmap !== "function") throw new Error("bitmap");
  const edges = [maxEdge, Math.round(maxEdge / 2), Math.round(maxEdge / 4)];
  let last: unknown;
  for (const edge of edges) {
    const sized = fittedImageSize(edge, edge, edge);
    const attempts: ImageBitmapOptions[] = [
      {
        imageOrientation: "from-image",
        resizeWidth: sized.width,
        resizeQuality: "medium",
      },
      {
        imageOrientation: "from-image",
        resizeWidth: sized.width,
        resizeHeight: sized.height,
        resizeQuality: "low",
      },
    ];
    for (const options of attempts) {
      try {
        return await createImageBitmap(file, options);
      } catch (error) {
        last = error;
      }
    }
  }
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (error) {
    throw last instanceof Error ? last : error;
  }
}

async function rasterizeWithBitmap(
  file: Blob,
  maxEdge: number,
  mime: "image/png" | "image/jpeg"
) {
  const bitmap = await bitmapDownscaled(file, maxEdge);
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
    for (let offset = 0; offset < slice.length; offset++) {
      copy[offset] = slice[offset];
    }
    binary += String.fromCharCode.apply(null, copy);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

function originalMime(bytes: Uint8Array, file: Blob) {
  const sniffed = sniffImageMime(bytes);
  if (sniffed) return sniffed;
  const declared = file.type.split(";")[0]?.trim().toLowerCase() || "";
  if (declared.startsWith("image/")) return declared;
  return "application/octet-stream";
}

/**
 * Read a picked gallery file into a data URL.
 * Bytes are copied first so a content:// URI is only read once.
 * Huge photos are downscaled with createImageBitmap resizeWidth/resizeHeight
 * before they ever touch a canvas. If the browser cannot decode the file,
 * the original bytes are uploaded and the server converts them.
 */
export async function readPreviewImage(
  file: Blob & { name?: string },
  options?: { kind?: PreviewImageKind; maxBytes?: number }
): Promise<
  { ok: true; dataUrl: string; name: string } | { ok: false; message: string }
> {
  const kind = options?.kind ?? "photo";
  const maxBytes =
    options?.maxBytes ?? (kind === "logo" ? 2 * 1024 * 1024 : 8 * 1024 * 1024);
  const output = kind === "logo" ? "image/png" : "image/jpeg";
  const maxEdge =
    kind === "logo" ? PREVIEW_LOGO_MAX_EDGE : PREVIEW_IMAGE_MAX_EDGE;
  const tooBig = kind === "logo" ? PREVIEW_LOGO_TOO_BIG : PREVIEW_PHOTO_TOO_BIG;
  const name =
    file.name?.trim() || (kind === "logo" ? "logo.png" : "photo.jpg");

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return {
      ok: false,
      message:
        file.size > maxBytes
          ? tooBig
          : "That photo format isn't supported yet. Try a screenshot of it, or a different photo.",
    };
  }

  const raw = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(raw).set(bytes);
  const memory = new Blob([raw], { type: originalMime(bytes, file) });
  const decode = async () => {
    if (kind === "logo") {
      try {
        return await rasterizeWithImage(memory, maxEdge, output);
      } catch {
        return rasterizeWithBitmap(memory, maxEdge, output);
      }
    }
    try {
      return await rasterizeWithBitmap(memory, maxEdge, output);
    } catch {
      return rasterizeWithImage(memory, maxEdge, output);
    }
  };

  try {
    return {
      ok: true,
      dataUrl: await withTimeout(decode(), DECODE_TIMEOUT_MS),
      name,
    };
  } catch {
    if (bytes.length > maxBytes) return { ok: false, message: tooBig };
    return { ok: true, dataUrl: bytesToDataUrl(bytes, memory.type), name };
  }
}
