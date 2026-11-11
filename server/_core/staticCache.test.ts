import { createServer, type Server } from "node:http";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { serveStatic } from "./vite";
import {
  FINGERPRINTED_ASSET_CACHE_CONTROL,
  HTML_CACHE_CONTROL,
  STABLE_MEDIA_CACHE_CONTROL,
  cacheControlForStaticFile,
} from "./staticCache";

const LIVE_FINGERPRINTED_ASSETS = [
  "accessLink-BNfctU-q.js",
  "accordion-BcHhdTNn.js",
  "AdminDashboard-DtMlAJds.js",
  "AdminLeads-iAVVo7iU.js",
  "Analytics-Dk-jZ2O-.js",
  "arrow-right-CNj8UJ8V.js",
  "badge-C0XpYg3D.js",
  "BeforeAfterCaptionProof-D9t9G7mk.js",
  "card-BQZmm6Mj.js",
  "Changelog-0Q7ooihO.js",
  "check-DfpFrDYH.js",
  "chevron-down-MdEkmbXF.js",
  "circle-alert-Dpq5N7-j.js",
  "const-u53xdxLU.js",
  "Contact-Cv0Hyhk_.js",
  "Contractors-DbLT-QEe.js",
  "Dashboard-FyJJqRuF.js",
  "DeleteAccount-D1VMYy4d.js",
  "Features-CA8YaCUS.js",
  "FreePreview-D8CIGtIh.js",
  "Hairdressers-DCfBIHf4.js",
  "Home-OiiD05k8.js",
  "index-B4VpwLuc.js",
  "index-B-HJbIML.js",
  "index-Ck_CtaoY.css",
  "index-DoaYpj9h.js",
  "index-l9qGL-oX.js",
  "input-Bzd7jghX.js",
  "landingMockup-BMqzO5eI.js",
  "landingPromos-nOzSW5m2.js",
  "loader-circle-do0DT0Ts.js",
  "Login-DgqeYLii.js",
  "mail-4-E9-P9n.js",
  "NotFound-Dk1YbXsE.js",
  "pen-line-CVYaEPbO.js",
  "Pricing-C8tPEEpm.js",
  "salon-preview-CIF8jZaY.js",
  "salon-preview-eI-isYAd.webp",
  "share-2-BawbH3WE.js",
  "shield-check-BuSOiFl2.js",
  "SiteFeatures-DEfo--Qe.js",
  "SiteHeader-BjTz-WeD.js",
  "sparkles-BoC1RU9z.js",
  "spinner-DrZvuD_O.js",
  "stamp-BPH1peL_.js",
  "textarea-B4m2gOar.js",
  "useAuth-BxpEe1F4.js",
  "VerifyEmail-mPrYgCxu.js",
];

describe("cacheControlForStaticFile", () => {
  it("keeps html documents revalidated", () => {
    expect(cacheControlForStaticFile("/var/app/dist/public/index.html")).toBe(
      HTML_CACHE_CONTROL
    );
    expect(HTML_CACHE_CONTROL).toBe("public, max-age=0");
  });

  it("caches every live fingerprinted /assets/ file for a year", () => {
    for (const filename of LIVE_FINGERPRINTED_ASSETS) {
      expect(
        cacheControlForStaticFile(`/var/app/dist/public/assets/${filename}`),
        filename
      ).toBe(FINGERPRINTED_ASSET_CACHE_CONTROL);
    }
    expect(FINGERPRINTED_ASSET_CACHE_CONTROL).toBe(
      "public, max-age=31536000, immutable"
    );
  });

  it("caches stable landing media for seven days and not a year", () => {
    const media = [
      "/var/app/dist/public/media/landing/hairdressers-promo.mp4",
      "/var/app/dist/public/media/landing/contractors-promo.mp4",
      "/var/app/dist/public/media/landing/hairdressers-promo-poster.jpg",
      "/var/app/dist/public/media/landing/contractors-promo-poster.JPG",
      "/var/app/dist/public/media/landing/hairdressers-promo.vtt",
      "/var/app/dist/public/media/landing/contractors-promo.vtt",
      "/var/app/dist/public/icons/logo.png",
    ];
    for (const filePath of media) {
      expect(cacheControlForStaticFile(filePath), filePath).toBe(
        STABLE_MEDIA_CACHE_CONTROL
      );
    }
    expect(STABLE_MEDIA_CACHE_CONTROL).toBe("public, max-age=604800");
    expect(STABLE_MEDIA_CACHE_CONTROL).not.toContain("immutable");
  });

  it("does not treat unhashed scripts or text files as fingerprinted", () => {
    expect(
      cacheControlForStaticFile(
        "/var/app/dist/public/__manus__/debug-collector.js"
      )
    ).toBeUndefined();
    expect(
      cacheControlForStaticFile("/var/app/dist/public/robots.txt")
    ).toBeUndefined();
    expect(
      cacheControlForStaticFile("/var/app/dist/public/assets/logo.png")
    ).toBe(STABLE_MEDIA_CACHE_CONTROL);
  });
});

describe("production static cache headers", () => {
  let server: Server;
  let origin: string;
  let distPath: string;

  beforeAll(async () => {
    distPath = await mkdtemp(path.join(tmpdir(), "snappost-static-"));
    await mkdir(path.join(distPath, "assets"), { recursive: true });
    await mkdir(path.join(distPath, "media", "landing"), { recursive: true });
    await mkdir(path.join(distPath, "__manus__"), { recursive: true });
    await writeFile(
      path.join(distPath, "index.html"),
      "<!doctype html><title>SnapPost Pro</title>"
    );
    await writeFile(
      path.join(distPath, "assets", "index-B-HJbIML.js"),
      "console.log(1)"
    );
    await writeFile(
      path.join(distPath, "assets", "index-Ck_CtaoY.css"),
      "body{color:#111}"
    );
    await writeFile(
      path.join(distPath, "assets", "salon-preview-eI-isYAd.webp"),
      "webp"
    );
    await writeFile(
      path.join(distPath, "media", "landing", "hairdressers-promo.mp4"),
      "mp4"
    );
    await writeFile(
      path.join(distPath, "media", "landing", "hairdressers-promo-poster.jpg"),
      "jpg"
    );
    await writeFile(
      path.join(distPath, "media", "landing", "hairdressers-promo.vtt"),
      "WEBVTT\n"
    );
    await writeFile(
      path.join(distPath, "__manus__", "debug-collector.js"),
      "/* debug */"
    );
    await writeFile(path.join(distPath, "robots.txt"), "User-agent: *\n");

    const app = express();
    serveStatic(app, distPath);
    server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server.close(err => (err ? reject(err) : resolve()))
      );
    }
    if (distPath) await rm(distPath, { recursive: true, force: true });
  });

  async function cacheControl(urlPath: string, init?: RequestInit) {
    const response = await fetch(`${origin}${urlPath}`, init);
    return {
      status: response.status,
      cacheControl: response.headers.get("cache-control"),
      contentType: response.headers.get("content-type"),
      body: await response.text(),
    };
  }

  it("serves the html shell with max-age=0", async () => {
    for (const urlPath of ["/", "/index.html", "/hairdressers"]) {
      const response = await cacheControl(urlPath);
      expect(response.status, urlPath).toBe(200);
      expect(response.cacheControl, urlPath).toBe(HTML_CACHE_CONTROL);
      expect(response.body, urlPath).toContain("SnapPost Pro");
    }
  });

  it("keeps the preview document revalidated", async () => {
    const response = await cacheControl("/preview");
    expect(response.status).toBe(200);
    expect(response.cacheControl).toBe(HTML_CACHE_CONTROL);
    expect(response.contentType).toContain("text/html");
    expect(response.body).toContain("Create a Branded Facebook Post");
  });

  it("serves hashed js and css as immutable for a year", async () => {
    const script = await cacheControl("/assets/index-B-HJbIML.js");
    const style = await cacheControl("/assets/index-Ck_CtaoY.css", {
      method: "HEAD",
    });
    const image = await cacheControl("/assets/salon-preview-eI-isYAd.webp");
    expect(script.cacheControl).toBe(FINGERPRINTED_ASSET_CACHE_CONTROL);
    expect(style.cacheControl).toBe(FINGERPRINTED_ASSET_CACHE_CONTROL);
    expect(image.cacheControl).toBe(FINGERPRINTED_ASSET_CACHE_CONTROL);
    expect(script.cacheControl).toContain("immutable");
  });

  it("serves landing video, poster, and captions for seven days", async () => {
    const video = await cacheControl("/media/landing/hairdressers-promo.mp4", {
      headers: { Range: "bytes=0-1" },
    });
    const poster = await cacheControl(
      "/media/landing/hairdressers-promo-poster.jpg"
    );
    const captions = await cacheControl(
      "/media/landing/hairdressers-promo.vtt",
      { method: "HEAD" }
    );
    expect(video.status).toBe(206);
    expect(video.cacheControl).toBe(STABLE_MEDIA_CACHE_CONTROL);
    expect(poster.cacheControl).toBe(STABLE_MEDIA_CACHE_CONTROL);
    expect(captions.status).toBe(200);
    expect(captions.cacheControl).toBe(STABLE_MEDIA_CACHE_CONTROL);
    expect(video.cacheControl).not.toContain("immutable");
  });

  it("leaves unhashed non-media files on the short default", async () => {
    const robots = await cacheControl("/robots.txt");
    const debug = await cacheControl("/__manus__/debug-collector.js");
    expect(robots.cacheControl).toBe("public, max-age=0");
    expect(debug.cacheControl).toBe("public, max-age=0");
  });
});
