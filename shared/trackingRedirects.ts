export type TrackingShortLink = {
  path: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
};

/** Clean paths for social captions. Each one 301s to /preview. */
export const TRACKING_SHORT_LINKS: readonly TrackingShortLink[] = [
  {
    path: "/fb",
    utm_source: "facebook",
    utm_medium: "social",
    utm_campaign: "short_fb",
  },
  {
    path: "/ig",
    utm_source: "instagram",
    utm_medium: "social",
    utm_campaign: "short_ig",
  },
  {
    path: "/pin",
    utm_source: "pinterest",
    utm_medium: "social",
    utm_campaign: "short_pin",
  },
  {
    path: "/yt",
    utm_source: "youtube",
    utm_medium: "video",
    utm_campaign: "short_yt",
  },
  {
    path: "/tt",
    utm_source: "tiktok",
    utm_medium: "social",
    utm_campaign: "short_tt",
  },
  {
    path: "/th",
    utm_source: "threads",
    utm_medium: "social",
    utm_campaign: "short_th",
  },
  {
    path: "/x",
    utm_source: "x",
    utm_medium: "social",
    utm_campaign: "short_x",
  },
  {
    path: "/li",
    utm_source: "linkedin",
    utm_medium: "social",
    utm_campaign: "short_li",
  },
  {
    path: "/email",
    utm_source: "email",
    utm_medium: "email",
    utm_campaign: "short_email",
  },
];

const linksByPath = new Map(
  TRACKING_SHORT_LINKS.map(link => [link.path, link])
);

export function normalizeTrackingPath(pathname: string): string {
  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const withoutTrailingSlash =
    withLeadingSlash.length > 1
      ? withLeadingSlash.replace(/\/+$/, "")
      : withLeadingSlash;
  return withoutTrailingSlash.toLowerCase();
}

export function isTrackingRedirectPath(pathname: string): boolean {
  return linksByPath.has(normalizeTrackingPath(pathname));
}

/**
 * Defaults for a short link, with the request query merged on top.
 * An incoming key replaces the default for that key.
 */
export function trackingRedirectLocation(
  pathname: string,
  search = ""
): string | null {
  const link = linksByPath.get(normalizeTrackingPath(pathname));
  if (!link) return null;

  const params = new URLSearchParams();
  params.set("utm_source", link.utm_source);
  params.set("utm_medium", link.utm_medium);
  params.set("utm_campaign", link.utm_campaign);

  const incoming = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  incoming.forEach((value, key) => {
    params.set(key, value);
  });

  return `/preview?${params.toString()}`;
}
