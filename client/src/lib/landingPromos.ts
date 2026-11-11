/**
 * Promo videos for the contractor and hairdresser landing pages.
 *
 * Optimized files are served from client/public/media/landing. Cloudinary is
 * the site's image host, but this environment has no Cloudinary credentials,
 * so the videos ship with the app. To move them later, upload with
 * resource_type "video" into snappost-pro/landing and replace these paths
 * with the secure URLs.
 */
export const LANDING_PROMOS = {
  hairdressers: {
    src: "/media/landing/hairdressers-promo.mp4",
    poster: "/media/landing/hairdressers-promo-poster.jpg",
    captions: "/media/landing/hairdressers-promo.vtt",
    label:
      "SnapPost Pro for hairdressers: turn salon photos into branded Facebook posts.",
  },
  contractors: {
    src: "/media/landing/contractors-promo.mp4",
    poster: "/media/landing/contractors-promo-poster.jpg",
    captions: "/media/landing/contractors-promo.vtt",
    label:
      "SnapPost Pro for contractors: turn finished-job photos into branded Facebook posts.",
  },
} as const;
