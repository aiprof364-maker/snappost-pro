import express, { type Response } from "express";
import path from "path";

const SECONDS_PER_DAY = 24 * 60 * 60;

/**
 * Vite content hashes change the URL when the bytes change, so browsers can
 * keep these files for a year and skip revalidation (`immutable`).
 * 365 days matches the maximum max-age the `send` package will emit.
 */
export const FINGERPRINTED_ASSET_MAX_AGE_SECONDS = 365 * SECONDS_PER_DAY;

/**
 * Promo videos, posters, and captions use stable URLs (pages and emails
 * already link to them). A week is long enough that a return visit does not
 * re-download them, and short enough that a replacement at the same path is
 * not stuck in browsers for months.
 */
export const STABLE_MEDIA_MAX_AGE_SECONDS = 7 * SECONDS_PER_DAY;

export const HTML_CACHE_CONTROL = "public, max-age=0";
export const FINGERPRINTED_ASSET_CACHE_CONTROL = `public, max-age=${FINGERPRINTED_ASSET_MAX_AGE_SECONDS}, immutable`;
export const STABLE_MEDIA_CACHE_CONTROL = `public, max-age=${STABLE_MEDIA_MAX_AGE_SECONDS}`;

const STABLE_MEDIA_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".m4v",
  ".mov",
  ".mp4",
  ".png",
  ".srt",
  ".svg",
  ".vtt",
  ".webm",
  ".webp",
]);

/**
 * Vite's default build names are `[name]-[hash].ext` directly under `assets/`.
 * The hash is url-safe and can contain `-` and `_` (for example
 * `index-B-HJbIML.js` and `Analytics-Dk-jZ2O-.js`).
 */
const FINGERPRINTED_ASSET_NAME = /^.+-[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9]+)+$/;

type HeaderWriter = {
  setHeader(name: string, value: string): void;
};

export function cacheControlForStaticFile(
  filePath: string
): string | undefined {
  const normalized = filePath.replace(/\\/g, "/");
  const extension = path.posix.extname(normalized).toLowerCase();

  if (extension === ".html") {
    return HTML_CACHE_CONTROL;
  }

  if (isFingerprintedAsset(normalized)) {
    return FINGERPRINTED_ASSET_CACHE_CONTROL;
  }

  if (STABLE_MEDIA_EXTENSIONS.has(extension)) {
    return STABLE_MEDIA_CACHE_CONTROL;
  }

  return undefined;
}

export function applyStaticFileCacheHeaders(
  res: HeaderWriter,
  filePath: string
) {
  const cacheControl = cacheControlForStaticFile(filePath);
  if (cacheControl) {
    res.setHeader("Cache-Control", cacheControl);
  }
}

export function applyHtmlDocumentCacheHeaders(res: HeaderWriter) {
  res.setHeader("Cache-Control", HTML_CACHE_CONTROL);
}

export function cachedStatic(distPath: string): express.RequestHandler {
  return express.static(distPath, {
    setHeaders(res, filePath) {
      applyStaticFileCacheHeaders(res, filePath);
    },
  });
}

export function sendSpaShell(res: Response, distPath: string) {
  applyHtmlDocumentCacheHeaders(res);
  res.sendFile(path.resolve(distPath, "index.html"));
}

function isFingerprintedAsset(normalizedPath: string) {
  const marker = "/assets/";
  const index = normalizedPath.lastIndexOf(marker);
  if (index === -1) return false;
  const filename = normalizedPath.slice(index + marker.length);
  if (filename.includes("/")) return false;
  return FINGERPRINTED_ASSET_NAME.test(filename);
}
