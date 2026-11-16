import {
  isShareId,
  isShareLanding,
  MAX_SHARE_BYTES,
  searchWithoutShareParams,
  shareIdFromSearch,
  safeShareType,
  SHARE_IMAGE_PATH,
  sharedFileName,
} from "@shared/shareTarget";
import { takeSharedPhoto, type StoredShare } from "./shareDb";

export type { StoredShare };

export function fileFromStoredShare(stored: StoredShare): File | null {
  if (!stored.blob || stored.blob.size <= 0) return null;
  if (stored.blob.size > MAX_SHARE_BYTES) return null;
  const type = safeShareType(stored.type || stored.blob.type || "image/jpeg");
  const name = sharedFileName(stored.name, type);
  return new File([stored.blob], name, { type, lastModified: Date.now() });
}

/**
 * Same accept rule as the preview file input: an oversized pick is discarded.
 */
export function acceptPickedPhoto(
  file: File | null,
  maxBytes: number
): File | null {
  if (!file) return null;
  if (file.size > maxBytes) return null;
  return file;
}

export function stripShareParamsFromLocation(): void {
  if (typeof window === "undefined") return;
  const nextSearch = searchWithoutShareParams(window.location.search);
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const next = `${window.location.pathname}${nextSearch}${window.location.hash}`;
  if (next === current) return;
  window.history.replaceState(window.history.state, "", next);
}

export async function fetchServerShare(
  id: string
): Promise<StoredShare | null> {
  if (!isShareId(id)) return null;
  const response = await fetch(
    `${SHARE_IMAGE_PATH}/${encodeURIComponent(id)}`,
    {
      credentials: "same-origin",
      cache: "no-store",
    }
  );
  if (!response.ok) return null;
  const blob = await response.blob();
  const encoded = response.headers.get("X-Share-Filename");
  let name = "";
  if (encoded) {
    try {
      name = decodeURIComponent(encoded);
    } catch {
      name = "";
    }
  }
  const type =
    response.headers.get("content-type")?.split(";")[0]?.trim() ||
    blob.type ||
    "image/jpeg";
  return { blob, name, type };
}

export async function loadSharedPhoto(
  search: string,
  deps: {
    readStored: () => Promise<StoredShare | null>;
    fetchServerShare: (id: string) => Promise<StoredShare | null>;
  } = {
    readStored: takeSharedPhoto,
    fetchServerShare,
  }
): Promise<File | null> {
  if (!isShareLanding(search)) return null;

  const shareId = shareIdFromSearch(search);
  let stored: StoredShare | null = null;
  if (shareId) {
    try {
      stored = await deps.fetchServerShare(shareId);
    } catch {
      stored = null;
    }
  }

  let fromDevice: StoredShare | null = null;
  try {
    fromDevice = await deps.readStored();
  } catch {
    fromDevice = null;
  }
  if (!stored) stored = fromDevice;
  if (!stored) return null;
  return fileFromStoredShare(stored);
}

let pending: { search: string; promise: Promise<File | null> } | null = null;

/**
 * One in-flight read per URL so a second effect pass does not lose the photo
 * the first pass already took out of storage.
 */
export function consumeSharedPhoto(
  search: string,
  deps?: Parameters<typeof loadSharedPhoto>[1]
): Promise<File | null> {
  if (!isShareLanding(search)) return Promise.resolve(null);
  if (pending?.search === search) return pending.promise;
  const promise = loadSharedPhoto(search, deps).finally(() => {
    if (pending?.promise === promise) pending = null;
  });
  pending = { search, promise };
  return promise;
}
