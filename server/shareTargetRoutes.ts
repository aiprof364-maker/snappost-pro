import type { Express, Request, Response } from "express";
import { nanoid } from "nanoid";
import {
  imageFileFromShare,
  isShareId,
  MAX_SHARE_BYTES,
  SHARE_IMAGE_PATH,
  SHARE_MAX_AGE_MS,
  SHARE_OPEN_PATH,
  SHARE_TARGET_PATH,
  shareLandingPath,
  safeShareType,
  sharedFileName,
} from "@shared/shareTarget";

type PendingShare = {
  buffer: Buffer;
  type: string;
  name: string;
  expiresAt: number;
};

const MAX_PENDING = 32;

export type ShareInbox = {
  put(file: { buffer: Buffer; type: string; name: string }): string;
  take(id: string): PendingShare | null;
  clear(): void;
};

export function createShareInbox(now: () => number = Date.now): ShareInbox {
  const pending = new Map<string, PendingShare>();

  function sweep() {
    const time = now();
    for (const [id, item] of Array.from(pending.entries())) {
      if (item.expiresAt <= time) pending.delete(id);
    }
    while (pending.size > MAX_PENDING) {
      const oldest = pending.keys().next().value;
      if (!oldest) break;
      pending.delete(oldest);
    }
  }

  return {
    put(file) {
      sweep();
      const id = nanoid();
      pending.set(id, {
        ...file,
        expiresAt: now() + SHARE_MAX_AGE_MS,
      });
      return id;
    },
    take(id) {
      sweep();
      const item = pending.get(id);
      if (!item) return null;
      pending.delete(id);
      return item;
    },
    clear() {
      pending.clear();
    },
  };
}

const defaultInbox = createShareInbox();

function noStore(res: Response) {
  res.setHeader("Cache-Control", "no-store");
}

function redirectOpen(res: Response, shareId?: string | null) {
  noStore(res);
  const params = new URLSearchParams();
  if (shareId && isShareId(shareId)) params.set("sid", shareId);
  const target = params.size
    ? `${SHARE_OPEN_PATH}?${params.toString()}`
    : SHARE_OPEN_PATH;
  res.redirect(303, target);
}

async function readLimited(
  req: Request,
  res: Response,
  max: number
): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > max) {
      redirectOpen(res);
      req.destroy();
      return null;
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

function shareIdParam(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && isShareId(raw) ? raw : null;
}

/**
 * Network fallback for a share the service worker did not handle: the first
 * share after install, and Samsung Internet (which cannot read the file in
 * the worker). The photo is kept in memory for one follow-up GET.
 */
export function registerShareTargetRoutes(
  app: Express,
  inbox: ShareInbox = defaultInbox
) {
  app.post(SHARE_TARGET_PATH, async (req, res) => {
    try {
      const contentType = req.header("content-type") ?? "";
      if (!contentType.toLowerCase().includes("multipart/form-data")) {
        redirectOpen(res);
        return;
      }
      const body = await readLimited(req, res, MAX_SHARE_BYTES);
      if (!body || res.headersSent) return;

      const webRequest = new Request("http://127.0.0.1/share-target", {
        method: "POST",
        headers: { "content-type": contentType },
        body: new Uint8Array(body),
      });
      const form = await webRequest.formData();
      const file = imageFileFromShare(form);
      if (!file || file.size > MAX_SHARE_BYTES) {
        redirectOpen(res);
        return;
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.length === 0 || buffer.length > MAX_SHARE_BYTES) {
        redirectOpen(res);
        return;
      }
      const type = safeShareType(file.type || "image/jpeg");
      const id = inbox.put({
        buffer,
        type,
        name: sharedFileName(file.name, type),
      });
      redirectOpen(res, id);
    } catch (error) {
      console.warn("[Share target] could not accept shared photo");
      if (!res.headersSent) redirectOpen(res);
      else console.warn(error);
    }
  });

  app.get(SHARE_OPEN_PATH, (req, res) => {
    noStore(res);
    res.setHeader("Vary", "Cookie");
    const sid = shareIdParam(req.query.sid);
    res.redirect(303, shareLandingPath(req.header("cookie"), sid));
  });

  app.get(`${SHARE_IMAGE_PATH}/:id`, (req, res) => {
    const id = shareIdParam(req.params.id);
    const item = id ? inbox.take(id) : null;
    if (!item) {
      noStore(res);
      res.status(404).end();
      return;
    }
    noStore(res);
    res.setHeader("Content-Type", item.type);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Share-Filename", encodeURIComponent(item.name));
    res.end(item.buffer);
  });
}
