import { COOKIE_NAME } from "./const";

export const SHARE_TARGET_PATH = "/share-target";
export const SHARE_OPEN_PATH = "/share-target/open";
export const SHARE_IMAGE_PATH = "/share-target/image";

export const SHARED_QUERY = "shared";
export const SHARE_ID_QUERY = "sid";

/** Phone photos are larger than the preview form's 8 MB cap. */
export const MAX_SHARE_BYTES = 12 * 1024 * 1024;

/** Drop a shared photo the visitor never opened. */
export const SHARE_MAX_AGE_MS = 15 * 60 * 1000;

export const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{10,32}$/;

export const PWA_NAME = "SnapPost Pro";
export const PWA_SHORT_NAME = "SnapPost";
/** Deep indigo brand primary, oklch(0.49 0.18 277). */
export const PWA_THEME_COLOR = "#4c4dc3";
/** Navy field sampled from the SnapPost Pro logo. */
export const PWA_BACKGROUND_COLOR = "#102039";

const SHARE_DB_NAME = "snappost-share-target";
const SHARE_STORE_NAME = "photos";
const SHARE_RECORD_KEY = "latest";

export const SHARE_STORAGE = {
  db: SHARE_DB_NAME,
  store: SHARE_STORE_NAME,
  key: SHARE_RECORD_KEY,
} as const;

/**
 * The service worker cannot read Cookie (the browser adds it after the
 * worker). Presence of the session cookie is enough for the server hop that
 * chooses preview vs dashboard. An invalid cookie still lands on the
 * dashboard, which sends the visitor to sign in without consuming the photo.
 */
export function hasSessionCookie(
  cookieHeader: string | null | undefined
): boolean {
  if (!cookieHeader) return false;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name !== COOKIE_NAME) continue;
    return part.slice(eq + 1).trim().length > 0;
  }
  return false;
}

export function isShareId(value: string | null | undefined): value is string {
  return typeof value === "string" && SHARE_ID_PATTERN.test(value);
}

export function shareLandingPath(
  cookieHeader: string | null | undefined,
  shareId?: string | null
): string {
  const base = hasSessionCookie(cookieHeader) ? "/dashboard" : "/preview";
  const params = new URLSearchParams();
  params.set(SHARED_QUERY, "1");
  if (shareId && isShareId(shareId)) params.set(SHARE_ID_QUERY, shareId);
  return `${base}?${params.toString()}`;
}

export function isShareLanding(search: string): boolean {
  return shareParams(search).get(SHARED_QUERY) === "1";
}

export function shareIdFromSearch(search: string): string | null {
  const id = shareParams(search).get(SHARE_ID_QUERY);
  return isShareId(id) ? id : null;
}

export function searchWithoutShareParams(search: string): string {
  const params = shareParams(search);
  params.delete(SHARED_QUERY);
  params.delete(SHARE_ID_QUERY);
  const next = params.toString();
  return next ? `?${next}` : "";
}

/**
 * Signed-in visitors who still land on the preview shell continue into the
 * dashboard upload flow. The stored photo is left untouched.
 */
export function signedInShareDestination(search: string): string | null {
  if (!isShareLanding(search)) return null;
  const params = shareParams(search);
  params.set(SHARED_QUERY, "1");
  return `/dashboard?${params.toString()}`;
}

const SAFE_SHARE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

/** Avoid reflecting SVG or HTML as an active content type on our origin. */
export function safeShareType(type: string | undefined): string {
  const normalized = (type ?? "").toLowerCase().split(";")[0].trim();
  if (!normalized || normalized === "image/jpg") return "image/jpeg";
  if (SAFE_SHARE_TYPES.has(normalized)) return normalized;
  return "application/octet-stream";
}

export function sharedFileName(name: string | undefined, type: string): string {
  const base = (name ?? "").split(/[/\\]/).pop() ?? "";
  const cleaned = base
    .replace(/[\u0000-\u001f]/g, "")
    .trim()
    .slice(0, 180);
  if (cleaned) return cleaned;
  if (type === "image/png") return "shared-photo.png";
  if (type === "image/webp") return "shared-photo.webp";
  if (type === "image/gif") return "shared-photo.gif";
  return "shared-photo.jpg";
}

export function isSharedImageFile(value: unknown): value is File {
  if (typeof value !== "object" || value === null) return false;
  if (typeof (value as File).arrayBuffer !== "function") return false;
  const file = value as File;
  if (typeof file.size !== "number" || file.size <= 0) return false;
  const type = typeof file.type === "string" ? file.type : "";
  return type === "" || type.startsWith("image/");
}

/**
 * Chrome names the file `photo`. Samsung Internet and other share sheets
 * sometimes use a different part name, so the first image file wins.
 */
export function imageFileFromShare(form: FormData): File | null {
  const named = form.getAll("photo");
  for (const value of named) {
    if (isSharedImageFile(value)) return value;
  }
  for (const value of Array.from(form.values())) {
    if (isSharedImageFile(value)) return value;
  }
  return null;
}

/**
 * Samsung Internet delivers the shared file on the network request, and
 * `request.formData()` inside the service worker throws. Leave that POST
 * for the server. Chrome Android can read the file in the worker.
 */
export function shouldLeaveShareToServer(
  userAgent: string | null | undefined
): boolean {
  return /SamsungBrowser/i.test(userAgent ?? "");
}

function shareParams(search: string): URLSearchParams {
  const query = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(query);
}
