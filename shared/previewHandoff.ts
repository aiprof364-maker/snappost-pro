import {
  PREVIEW_BUSINESS_NAME_MAX,
  PREVIEW_SUBURB_MAX,
  cleanPreviewText,
} from "./previewCaption";

/** Survives the Facebook and Stripe redirects in the same browser tab. */
export const PENDING_POST_STORAGE_KEY = "snappost-pending-facebook-post";

/**
 * Where a signed-out preview returns after the access link, so the same
 * photo, image, caption, and business details can be claimed.
 */
export function previewReturnPath(
  token: string,
  landing?: string | null
) {
  const params = new URLSearchParams();
  params.set("token", token);
  if (landing === "contractors" || landing === "hairdressers") {
    params.set("landing", landing);
  }
  return `/preview?${params.toString()}`;
}

/**
 * Fill only the brand fields the account has not already saved.
 * Blank preview fields stay blank.
 */
export function carryPreviewBrand(
  account: {
    businessName?: string | null;
    suburb?: string | null;
  },
  preview: {
    businessName?: string | null;
    suburb?: string | null;
  }
) {
  const businessName = account.businessName?.trim()
    ? undefined
    : cleanPreviewText(preview.businessName ?? undefined, PREVIEW_BUSINESS_NAME_MAX);
  const suburb = account.suburb?.trim()
    ? undefined
    : cleanPreviewText(preview.suburb ?? undefined, PREVIEW_SUBURB_MAX);
  return {
    businessName: businessName ?? null,
    suburb: suburb ?? null,
  };
}
