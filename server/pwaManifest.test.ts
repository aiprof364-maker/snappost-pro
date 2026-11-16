import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  PWA_BACKGROUND_COLOR,
  PWA_NAME,
  PWA_SHORT_NAME,
  PWA_THEME_COLOR,
} from "@shared/shareTarget";
import { withPreviewMetadata } from "./_core/vite";

const root = path.resolve(import.meta.dirname, "..");
const manifestPath = path.join(root, "client/public/manifest.webmanifest");
const html = readFileSync(path.join(root, "client/index.html"), "utf8");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

describe("web app manifest", () => {
  it("is valid install metadata with a file share target", () => {
    expect(manifest.name).toBe(PWA_NAME);
    expect(manifest.short_name).toBe(PWA_SHORT_NAME);
    expect(manifest.name).toBe("SnapPost Pro");
    expect(manifest.short_name).toBe("SnapPost");
    expect(manifest.start_url).toBe("/preview");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe(PWA_THEME_COLOR);
    expect(manifest.background_color).toBe(PWA_BACKGROUND_COLOR);
    expect(manifest.share_target).toEqual({
      action: "/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [{ name: "photo", accept: ["image/*"] }],
      },
    });
    expect(manifest.icons).toEqual([
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ]);
  });

  it("ships real PNG icons generated from the logo", async () => {
    for (const icon of manifest.icons) {
      const file = path.join(root, "client/public", icon.src);
      const image = sharp(file);
      const meta = await image.metadata();
      const [width, height] = icon.sizes.split("x").map(Number);
      expect(meta.format, icon.src).toBe("png");
      expect(meta.width, icon.src).toBe(width);
      expect(meta.height, icon.src).toBe(height);
      const { data, info } = await image
        .raw()
        .toBuffer({ resolveWithObject: true });
      const corner = [data[0], data[1], data[2]];
      expect(corner[2], icon.src).toBeGreaterThan(corner[0]);
      const centerIndex =
        (Math.floor(info.height / 2) * info.width +
          Math.floor(info.width / 2)) *
        info.channels;
      const center = [
        data[centerIndex],
        data[centerIndex + 1],
        data[centerIndex + 2],
      ];
      expect(center, icon.src).not.toEqual(corner);
    }
  });

  it("stays linked from the preview document and the signed-in shell", () => {
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain(`content="${PWA_THEME_COLOR}"`);
    const preview = withPreviewMetadata(html);
    expect(preview).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(preview).toContain('name="theme-color"');
    expect(preview).toContain(
      "Create a Branded Facebook Post From Your Photo | SnapPost Pro"
    );
    expect(preview).toContain(
      "Upload a completed-job, product, salon or result photo."
    );
    expect(preview).toContain(
      'property="og:url" content="https://snappostpro.com/preview"'
    );
  });
});
