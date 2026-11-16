import { badgeCallToAction } from "@shared/brandProfile";
import {
  PREVIEW_BUSINESS_NAME_MAX,
  PREVIEW_SUBURB_MAX,
  cleanPreviewText,
} from "@shared/previewCaption";
import { brandImage } from "./branding";
import type { TextBadgeInput } from "./textBadge";

/**
 * No-logo badge for a signed-in post. A real logo keeps the lower-right
 * treatment, so this returns nothing when a logo buffer is present.
 * A business name is required. Town and the trade call to action are optional.
 */
export function signedInTextBadge(input: {
  hasLogo: boolean;
  businessName?: string | null;
  suburb?: string | null;
  trade?: string | null;
}): TextBadgeInput | null {
  if (input.hasLogo) return null;
  const businessName = cleanPreviewText(
    input.businessName ?? undefined,
    PREVIEW_BUSINESS_NAME_MAX
  );
  if (!businessName) return null;
  const suburb = cleanPreviewText(
    input.suburb ?? undefined,
    PREVIEW_SUBURB_MAX
  );
  return {
    businessName,
    suburb,
    callToAction: badgeCallToAction(input.trade),
  };
}

/** Same branding entry posts.create uses for a saved draft. */
export async function brandSignedInPhoto(params: {
  photoBuffer: Buffer;
  logoBuffer?: Buffer | null;
  businessName?: string | null;
  suburb?: string | null;
  trade?: string | null;
  destKeyPrefix: string;
  watermark?: boolean;
}) {
  const hasLogo = Boolean(params.logoBuffer);
  return brandImage({
    photoBuffer: params.photoBuffer,
    logoBuffer: params.logoBuffer,
    destKeyPrefix: params.destKeyPrefix,
    watermark: params.watermark,
    textBadge: signedInTextBadge({
      hasLogo,
      businessName: params.businessName,
      suburb: params.suburb,
      trade: params.trade,
    }),
  });
}
