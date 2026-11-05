import sharp from "sharp";
import { prepareLogoForBranding } from "./logoPreparation";
import { storagePut, storageGetSignedUrl } from "./storage";

/**
 * Add an optional, cleaned logo in the lower-right corner of the real photo.
 * Logo artwork fits within 16% of image width and 20% of image height; it is
 * never enlarged. Both public previews and saved customer drafts use this path.
 */
export async function brandImage(params: {
  photoBuffer: Buffer;
  logoBuffer?: Buffer | null;
  destKeyPrefix: string;
}): Promise<{ key: string; url: string }> {
  const { photoBuffer, logoBuffer, destKeyPrefix } = params;

  // Rotate before resizing so portrait EXIF images use their upright dimensions.
  // A lossless intermediate avoids a second JPEG compression before compositing.
  const resizedBase = await sharp(photoBuffer)
    .rotate()
    .resize({ width: 1080, withoutEnlargement: true })
    .png()
    .toBuffer();
  const resizedMeta = await sharp(resizedBase).metadata();
  const finalWidth = resizedMeta.width!;
  const finalHeight = resizedMeta.height!;
  let composited = sharp(resizedBase);

  if (logoBuffer) {
    const logoPng = await prepareLogoForBranding(
      logoBuffer,
      finalWidth,
      finalHeight
    );
    if (logoPng) {
      const logoMeta = await sharp(logoPng).metadata();
      const logoWidth = logoMeta.width!;
      const logoHeight = logoMeta.height!;
      const margin = Math.max(
        0,
        Math.min(
          Math.round(Math.min(finalWidth, finalHeight) * 0.03),
          Math.floor((finalWidth - logoWidth) / 2),
          Math.floor((finalHeight - logoHeight) / 2)
        )
      );
      composited = composited.composite([
        {
          input: logoPng,
          left: finalWidth - logoWidth - margin,
          top: finalHeight - logoHeight - margin,
          blend: "over",
        },
      ]);
    }
  }

  const outBuffer = await composited.jpeg({ quality: 90 }).toBuffer();
  const { key, url } = await storagePut(
    `${destKeyPrefix}/branded.jpg`,
    outBuffer,
    "image/jpeg"
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
