import {
  PREVIEW_CALL_TO_ACTION,
} from "@shared/previewCaption";
import {
  claimedPostImages,
  referralPublicUrl,
  showsSnapPostMark,
  withSnapPostCaptionFooter,
} from "@shared/referrals";
import type { PreviewDraft, User } from "../drizzle/schema";
import { brandImage, fetchStorageBytes } from "./branding";
import { ensureReferralCode } from "./referrals";
import { compositeSnapPostMark } from "./snapPostMark";
import { storagePut } from "./storage";

export async function storeMarkedImage(jpeg: Buffer, key: string) {
  const marked = await compositeSnapPostMark(jpeg);
  if (!marked) return null;
  return storagePut(key, marked, "image/jpeg");
}

export async function brandingForClaim(
  user: Pick<User, "id" | "plan" | "subscriptionStatus">,
  draft: Pick<
    PreviewDraft,
    | "id"
    | "caption"
    | "originalImageKey"
    | "logoImageKey"
    | "brandedImageKey"
    | "brandedImageUrl"
    | "cleanImageKey"
    | "cleanImageUrl"
    | "businessName"
    | "suburb"
  >
) {
  const account = {
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
  };
  const show = showsSnapPostMark(account);
  let cleanKey = draft.cleanImageKey;
  let cleanUrl = draft.cleanImageUrl;

  // Older previews stored only the public image. A paid or trial claim rebuilds
  // a clean square from the original so the SnapPost mark is not published.
  if (!show && !cleanKey) {
    const photo = await fetchStorageBytes(draft.originalImageKey);
    let logo: Buffer | null = null;
    if (draft.logoImageKey) {
      try {
        logo = await fetchStorageBytes(draft.logoImageKey);
      } catch {
        logo = null;
      }
    }
    const clean = await brandImage({
      photoBuffer: photo,
      logoBuffer: logo,
      destKeyPrefix: `${user.id}-posts/claim-${draft.id}-${Date.now()}`,
      frame: "square",
      textBadge: logo
        ? null
        : {
            businessName: draft.businessName ?? undefined,
            suburb: draft.suburb ?? undefined,
            callToAction: PREVIEW_CALL_TO_ACTION,
          },
    });
    cleanKey = clean.key;
    cleanUrl = clean.url;
  }

  const images = claimedPostImages({
    account,
    markedKey: draft.brandedImageKey,
    markedUrl: draft.brandedImageUrl,
    cleanKey,
    cleanUrl,
  });
  const referralUrl = show
    ? referralPublicUrl(await ensureReferralCode(user.id))
    : null;
  return {
    ...images,
    caption: withSnapPostCaptionFooter(draft.caption, {
      include: show,
      referralUrl,
    }),
  };
}
