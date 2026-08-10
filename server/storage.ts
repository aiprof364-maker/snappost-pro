// Cloudinary-based storage for SnapPost Pro
// Replaces Manus storage with Cloudinary for full Railway independence.

import { v2 as cloudinary } from "cloudinary";

function ensureCloudinaryConfig() {
  if (!cloudinary.config().cloud_name) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        "Cloudinary config missing: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET"
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "").replace(/\.[^.]+$/, ""); // Remove leading slashes and extension for Cloudinary public_id
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `${relKey}_${hash}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  ensureCloudinaryConfig();

  const publicId = appendHashSuffix(normalizeKey(relKey));

  // Convert data to base64 data URI for Cloudinary upload
  const buffer = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  const base64 = buffer.toString("base64");
  const mimeType = contentType || "image/jpeg";
  const dataUri = `data:${mimeType};base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    public_id: publicId,
    folder: "snappost-pro",
    resource_type: "image",
    overwrite: true,
  });

  return { key: result.public_id, url: result.secure_url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  ensureCloudinaryConfig();
  const key = normalizeKey(relKey);
  const url = cloudinary.url(key, { secure: true });
  return { key, url };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  ensureCloudinaryConfig();
  // Cloudinary URLs are already publicly accessible, no signing needed
  const url = cloudinary.url(relKey, { secure: true, resource_type: "image" });
  return url;
}
