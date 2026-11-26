import type { Express, Request, Response } from "express";
import {
  isPreviewAccessToken,
  watermarkedPreviewStorageKey,
} from "@shared/previewDownload";
import { fetchStorageBytes } from "./branding";
import { getUnclaimedPreviewDraft } from "./previewDrafts";

export const WATERMARKED_PREVIEW_FILENAME = "snappost-preview.jpg";

const EXPIRED =
  "This preview has expired. Create a new free preview to continue.";

export async function readWatermarkedPreviewDownload(
  token: string,
  deps: {
    findDraft: (token: string) => Promise<{
      brandedImageKey?: string | null;
      cleanImageKey?: string | null;
    } | null>;
    readBytes: (key: string) => Promise<Buffer>;
  }
): Promise<Buffer | null> {
  if (!isPreviewAccessToken(token)) return null;
  const draft = await deps.findDraft(token);
  if (!draft) return null;
  const key = watermarkedPreviewStorageKey(draft);
  if (!key) return null;
  return deps.readBytes(key);
}

export async function loadWatermarkedPreviewDownload(token: string) {
  return readWatermarkedPreviewDownload(token, {
    findDraft: async value => {
      const draft = await getUnclaimedPreviewDraft(value);
      if (!draft) return null;
      return {
        brandedImageKey: draft.brandedImageKey,
        cleanImageKey: draft.cleanImageKey,
      };
    },
    readBytes: key => fetchStorageBytes(key),
  });
}

export function registerPreviewDownloadRoute(
  app: Express,
  load: (
    token: string
  ) => Promise<Buffer | null> = loadWatermarkedPreviewDownload
) {
  app.get(
    "/api/preview/:token/download",
    async (req: Request, res: Response) => {
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      const token =
        typeof req.params.token === "string" ? req.params.token : "";
      try {
        const file = await load(token);
        if (!file || file.length === 0) {
          res.status(404).type("text/plain").send(EXPIRED);
          return;
        }
        res.status(200);
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${WATERMARKED_PREVIEW_FILENAME}"`
        );
        res.setHeader("Content-Length", String(file.length));
        res.end(file);
      } catch (error) {
        console.error("[Preview] Watermarked download failed", error);
        if (!res.headersSent) {
          res
            .status(503)
            .type("text/plain")
            .send("Preview download is temporarily unavailable.");
        }
      }
    }
  );
}
