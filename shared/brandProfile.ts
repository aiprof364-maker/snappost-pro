import {
  PREVIEW_BUSINESS_NAME_MAX,
  PREVIEW_CALL_TO_ACTION,
  PREVIEW_SUBURB_MAX,
  cleanPreviewText,
} from "./previewCaption";
import { PREVIEW_TRADES, previewTradeLabel } from "./previewTrades";

const SALON_TRADES = new Set([
  "Hair salon",
  "Barber",
  "Nail salon",
  "Esthetician",
  "Lash studio",
  "Spa",
  "Massage",
]);

const VISIT_TRADES = new Set([
  "Café",
  "Restaurant",
  "Bakery",
  "Florist",
  "Retail shop",
]);

/** Short badge line for a known trade. Unknown trades keep the preview default. */
export function badgeCallToAction(trade: string | null | undefined) {
  const label = previewTradeLabel(trade ?? undefined);
  if (!label) return PREVIEW_CALL_TO_ACTION;
  if (SALON_TRADES.has(label)) return "Book your next visit";
  if (VISIT_TRADES.has(label)) return "Come see us today";
  if (label === "Fitness studio" || label === "Photographer") {
    return "Book your next session";
  }
  if (label === "Pet grooming") return "Book your next groom";
  if (label === "Real estate") return "Ask about this listing";
  if (label === "Auto detailer") return "Book your next detail";
  return PREVIEW_CALL_TO_ACTION;
}

export function hasBusinessName(value: string | null | undefined) {
  return Boolean(
    cleanPreviewText(value ?? undefined, PREVIEW_BUSINESS_NAME_MAX)
  );
}

/**
 * The first-login step appears for a brand-new account and for any profile
 * that still has no business name, until the owner saves a name or skips.
 */
export function shouldShowBrandSetup(input: {
  accountCreated: boolean;
  businessName?: string | null;
  brandSetupSkipped: boolean;
  dismissed: boolean;
  reopened: boolean;
}) {
  if (hasBusinessName(input.businessName)) return false;
  if (input.reopened) return true;
  if (input.dismissed) return false;
  return input.accountCreated || !input.brandSetupSkipped;
}

/** Persistent reminder after Skip for now, hidden while the setup step is open. */
export function shouldShowBrandNudge(input: {
  businessName?: string | null;
  brandSetupSkipped: boolean;
  setupVisible: boolean;
}) {
  return (
    !input.setupVisible &&
    input.brandSetupSkipped &&
    !hasBusinessName(input.businessName)
  );
}

export function previewTradeId(value: string | null | undefined) {
  const label = previewTradeLabel(value ?? undefined);
  if (!label) return "";
  return PREVIEW_TRADES.find(trade => trade.label === label)?.id ?? "";
}

/** Profile values win. A claimed preview fills only the blanks. */
export function brandSetupPrefill(input: {
  businessName?: string | null;
  suburb?: string | null;
  trade?: string | null;
  suggestion?: {
    businessName?: string | null;
    suburb?: string | null;
  } | null;
}) {
  const businessName =
    cleanPreviewText(
      input.businessName ?? undefined,
      PREVIEW_BUSINESS_NAME_MAX
    ) ??
    cleanPreviewText(
      input.suggestion?.businessName ?? undefined,
      PREVIEW_BUSINESS_NAME_MAX
    ) ??
    "";
  const suburb =
    cleanPreviewText(input.suburb ?? undefined, PREVIEW_SUBURB_MAX) ??
    cleanPreviewText(
      input.suggestion?.suburb ?? undefined,
      PREVIEW_SUBURB_MAX
    ) ??
    "";
  return {
    businessName,
    suburb,
    tradeId: previewTradeId(input.trade),
  };
}
