/** Longest side kept for a preview photo or logo. */
export const PREVIEW_IMAGE_MAX_EDGE = 2048;

export const PREVIEW_IMAGE_READ_ERROR =
  "We could not read that image. Please try another JPG or PNG.";

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

type DecodedImage = CanvasImageSource & {
  width: number;
  height: number;
  close?: () => void;
};

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string" && result.startsWith("data:image/")) {
        resolve(result);
        return;
      }
      reject(new Error("unreadable"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("unreadable"));
    reader.readAsDataURL(file);
  });
}

async function decodeWithImageElement(file: Blob): Promise<DecodedImage> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("decode"));
      element.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodeImage(file: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Some phones decode HEIC or WebP only through an Image element.
    }
  }
  return decodeWithImageElement(file);
}

/**
 * Read a picked photo immediately and keep a JPEG data URL we own.
 * Android content:// files can become unreadable after the picker closes,
 * so this must run in the file input's change handler, not at submit.
 * Browsers that can decode HEIC or WebP are re-encoded to JPEG.
 */
export async function readPreviewImage(
  file: Blob & { name?: string }
): Promise<
  { ok: true; dataUrl: string; name: string } | { ok: false; message: string }
> {
  const name = file.name?.trim() || "photo.jpg";
  try {
    const decoded = await decodeImage(file);
    const image = decoded as HTMLImageElement;
    const size = fittedImageSize(
      image.naturalWidth || decoded.width,
      image.naturalHeight || decoded.height
    );
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas");
    context.drawImage(decoded, 0, 0, size.width, size.height);
    decoded.close?.();
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    if (!dataUrl.startsWith("data:image/jpeg")) throw new Error("encode");
    return { ok: true, dataUrl, name };
  } catch {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      return { ok: true, dataUrl, name };
    } catch {
      return { ok: false, message: PREVIEW_IMAGE_READ_ERROR };
    }
  }
}
