export const PREVIEW_TRADE_GROUPS = [
  "Contractors",
  "Salons",
  "Other local businesses",
] as const;

export type PreviewTradeGroup = (typeof PREVIEW_TRADE_GROUPS)[number];

export const PREVIEW_TRADES = [
  {
    id: "general-contractor",
    label: "General contractor",
    group: "Contractors",
  },
  { id: "builder", label: "Builder", group: "Contractors" },
  { id: "carpenter", label: "Carpenter", group: "Contractors" },
  { id: "cleaner", label: "Cleaner", group: "Contractors" },
  { id: "concrete", label: "Concrete", group: "Contractors" },
  { id: "deck-builder", label: "Deck builder", group: "Contractors" },
  { id: "electrician", label: "Electrician", group: "Contractors" },
  { id: "flooring", label: "Flooring", group: "Contractors" },
  { id: "handyman", label: "Handyman", group: "Contractors" },
  { id: "hvac", label: "HVAC", group: "Contractors" },
  { id: "landscaper", label: "Landscaper", group: "Contractors" },
  { id: "painter", label: "Painter", group: "Contractors" },
  { id: "plumber", label: "Plumber", group: "Contractors" },
  { id: "roofer", label: "Roofer", group: "Contractors" },
  { id: "hair-salon", label: "Hair salon", group: "Salons" },
  { id: "barber", label: "Barber", group: "Salons" },
  { id: "nail-salon", label: "Nail salon", group: "Salons" },
  { id: "esthetician", label: "Esthetician", group: "Salons" },
  { id: "lash-studio", label: "Lash studio", group: "Salons" },
  { id: "spa", label: "Spa", group: "Salons" },
  { id: "massage", label: "Massage", group: "Salons" },
  { id: "cafe", label: "Café", group: "Other local businesses" },
  { id: "restaurant", label: "Restaurant", group: "Other local businesses" },
  { id: "bakery", label: "Bakery", group: "Other local businesses" },
  { id: "florist", label: "Florist", group: "Other local businesses" },
  { id: "fitness", label: "Fitness studio", group: "Other local businesses" },
  {
    id: "pet-grooming",
    label: "Pet grooming",
    group: "Other local businesses",
  },
  {
    id: "photographer",
    label: "Photographer",
    group: "Other local businesses",
  },
  { id: "real-estate", label: "Real estate", group: "Other local businesses" },
  {
    id: "auto-detailer",
    label: "Auto detailer",
    group: "Other local businesses",
  },
  { id: "retail", label: "Retail shop", group: "Other local businesses" },
  {
    id: "other",
    label: "Other local business",
    group: "Other local businesses",
  },
] as const;

export type PreviewTradeId = (typeof PREVIEW_TRADES)[number]["id"];

/**
 * Accept a trade id or its exact label. Anything else is dropped so a visitor
 * cannot send arbitrary instructions through to the caption model.
 */
export function previewTradeLabel(
  value: string | undefined
): string | undefined {
  if (!value) return undefined;
  const cleaned = value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return undefined;
  const byId = PREVIEW_TRADES.find(trade => trade.id === cleaned);
  if (byId) return byId.label;
  return PREVIEW_TRADES.find(
    trade => trade.label.toLowerCase() === cleaned.toLowerCase()
  )?.label;
}

/** Anonymous visitors see the watermarked image. Saved drafts keep the clean one. */
export function previewImageUrls(input: {
  brandedImageUrl: string;
  watermarkedImageUrl?: string | null;
}) {
  return {
    publicImageUrl: input.watermarkedImageUrl || input.brandedImageUrl,
    savedImageUrl: input.brandedImageUrl,
  };
}
