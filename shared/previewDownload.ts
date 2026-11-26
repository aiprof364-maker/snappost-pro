/** Opaque preview tokens are base64url strings from 32 random bytes. */
const PREVIEW_ACCESS_TOKEN = /^[A-Za-z0-9_-]{32,128}$/;

export function isPreviewAccessToken(token: string) {
  return PREVIEW_ACCESS_TOKEN.test(token);
}

/**
 * Public download may only return the separate SnapPost-marked file.
 * A missing clean copy, or a branded file that is the clean file, is refused
 * so a paid or trial image is never offered from the anonymous preview.
 */
export function watermarkedPreviewStorageKey(draft: {
  brandedImageKey?: string | null;
  cleanImageKey?: string | null;
}) {
  const branded = draft.brandedImageKey?.trim() ?? "";
  const clean = draft.cleanImageKey?.trim() ?? "";
  if (!branded || !clean || branded === clean) return null;
  return branded;
}

export function watermarkedPreviewDownloadPath(token: string) {
  return `/api/preview/${encodeURIComponent(token)}/download`;
}
