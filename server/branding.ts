import sharp from "sharp";
import { storagePut, storageGetSignedUrl } from "./storage";

/**
 * Branding helper: composites a user's logo as a watermark onto a job-site photo.
 * Both inputs are storage keys; returns the storage key + url of the branded image.
 *
 * The logo is scaled to ~22% of the photo width and placed in the bottom-right
 * corner with a small margin and slight transparency so it reads as a brand mark.
 */
export async function brandImage(params: {
  photoBuffer: Buffer;
  logoBuffer?: Buffer | null;
  destKeyPrefix: string;
}): Promise<{ key: string; url: string }> {
  const { photoBuffer, logoBuffer, destKeyPrefix } = params;

  const basePng = sharp(photoBuffer).rotate(); // respect EXIF orientation
  const meta = await basePng.metadata();
  const baseWidth = meta.width ?? 1080;
  const baseHeight = meta.height ?? 1080;

  // Normalize the base to a max width of 1080 for consistent social output.
  const targetWidth = Math.min(baseWidth, 1080);
  const resizedBase = await sharp(photoBuffer)
    .rotate()
    .resize({ width: targetWidth, withoutEnlargement: true })
    .toBuffer();

  const resizedMeta = await sharp(resizedBase).metadata();
  const finalWidth = resizedMeta.width ?? targetWidth;
  const finalHeight = resizedMeta.height ?? baseHeight;

  let composited = sharp(resizedBase);

  if (logoBuffer) {
    const logoWidth = Math.max(80, Math.round(finalWidth * 0.22));
    const logoPng = await sharp(logoBuffer)
      .resize({ width: logoWidth, withoutEnlargement: true })
      .png()
      .toBuffer();
    const logoMeta = await sharp(logoPng).metadata();
    const margin = Math.round(finalWidth * 0.03);
    const left = Math.max(0, finalWidth - (logoMeta.width ?? logoWidth) - margin);
    const top = Math.max(0, finalHeight - (logoMeta.height ?? logoWidth) - margin);

    composited = composited.composite([
      { input: logoPng, left, top, blend: "over" },
    ]);
  }

  const outBuffer = await composited.jpeg({ quality: 90 }).toBuffer();
  const { key, url } = await storagePut(
    `${destKeyPrefix}/branded.jpg`,
    outBuffer,
    "image/jpeg",
  );
  return { key, url };
}

/** Download bytes for a stored object via its signed URL. */
export async function fetchStorageBytes(storageKey: string): Promise<Buffer> {
  const signed = await storageGetSignedUrl(storageKey);
  const resp = await fetch(signed);
  if (!resp.ok) {
    throw new Error(`Failed to fetch storage object (${resp.status})`);
  }
  const arr = await resp.arrayBuffer();
  return Buffer.from(arr);
}
