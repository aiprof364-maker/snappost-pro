import type { Express } from "express";

/**
 * Storage proxy is no longer needed with Cloudinary.
 * Cloudinary returns direct public URLs, so no proxy/redirect is required.
 * This is kept as a no-op to avoid breaking the server startup import.
 */
export function registerStorageProxy(app: Express) {
  // Legacy route: redirect any old /manus-storage/ requests to a 404
  app.get("/manus-storage/*", (_req, res) => {
    res.status(404).send("Storage has been migrated. Use direct Cloudinary URLs.");
  });
}
