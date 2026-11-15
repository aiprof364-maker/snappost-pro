/**
 * Lightweight trade-page list for nav, the footer, and the sitemap.
 * Full page copy lives in tradeLandingPages.ts so marketing shells do not
 * download every landing page.
 */
export const TRADE_LANDING_NAV = [
  {
    id: "contractors",
    path: "/contractors",
    label: "Contractors",
    previewLanding: "contractors",
  },
  {
    id: "landscapers",
    path: "/landscapers",
    label: "Landscapers",
    previewLanding: "landscapers",
  },
  {
    id: "hairdressers",
    path: "/hairdressers",
    label: "Salons",
    previewLanding: "hairdressers",
  },
  {
    id: "food-trucks",
    path: "/food-trucks",
    label: "Food trucks",
    previewLanding: "food-trucks",
  },
  {
    id: "realtors",
    path: "/realtors",
    label: "Realtors",
    previewLanding: "realtors",
  },
  {
    id: "cleaners",
    path: "/cleaners",
    label: "Cleaners",
    previewLanding: "cleaners",
  },
  {
    id: "auto-detailers",
    path: "/auto-detailers",
    label: "Auto detailers",
    previewLanding: "auto-detailers",
  },
  {
    id: "pet-groomers",
    path: "/pet-groomers",
    label: "Pet groomers",
    previewLanding: "pet-groomers",
  },
] as const;

export type TradeLandingId = (typeof TRADE_LANDING_NAV)[number]["id"];

export type TradeLandingNavItem = (typeof TRADE_LANDING_NAV)[number];
