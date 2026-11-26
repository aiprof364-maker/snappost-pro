import express from "express";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  readWatermarkedPreviewDownload,
  registerPreviewDownloadRoute,
  WATERMARKED_PREVIEW_FILENAME,
} from "./previewDownloadRoute";

const token = "a".repeat(43);

describe("watermarked preview bytes", () => {
  it("reads the marked file and ignores the clean file", async () => {
    const readBytes = vi.fn(async (key: string) => Buffer.from(key));
    const file = await readWatermarkedPreviewDownload(token, {
      findDraft: async () => ({
        brandedImageKey: "marked-key",
        cleanImageKey: "clean-key",
      }),
      readBytes,
    });

    expect(file?.toString()).toBe("marked-key");
    expect(readBytes).toHaveBeenCalledTimes(1);
    expect(readBytes).toHaveBeenCalledWith("marked-key");
    expect(readBytes).not.toHaveBeenCalledWith("clean-key");
  });

  it("refuses a preview whose public file is the clean file", async () => {
    const readBytes = vi.fn(async (key: string) => Buffer.from(key));
    const file = await readWatermarkedPreviewDownload(token, {
      findDraft: async () => ({
        brandedImageKey: "clean-key",
        cleanImageKey: "clean-key",
      }),
      readBytes,
    });

    expect(file).toBeNull();
    expect(readBytes).not.toHaveBeenCalled();
  });
});

describe("GET /api/preview/:token/download", () => {
  let server: Server;
  let origin: string;
  const load = vi.fn(async (value: string) =>
    value === token ? Buffer.from("jpeg-bytes") : null
  );

  beforeAll(async () => {
    const app = express();
    registerPreviewDownloadRoute(app, load);
    server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close(err => (err ? reject(err) : resolve()))
    );
  });

  it("downloads the watermarked preview as an attachment", async () => {
    const response = await fetch(`${origin}/api/preview/${token}/download`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/jpeg");
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="${WATERMARKED_PREVIEW_FILENAME}"`
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).toBe("jpeg-bytes");
  });

  it("does not serve an unknown or clean preview", async () => {
    const response = await fetch(
      `${origin}/api/preview/${"b".repeat(43)}/download`
    );
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("expired");
  });
});
