export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Independent Railway-hosted login route. No external identity provider is used.
export const getLoginUrl = (returnPath?: string) => {
  const next = returnPath?.startsWith("/") ? returnPath : "/dashboard";
  return `/login?next=${encodeURIComponent(next)}`;
};

// Parse state from OAuth callback
export const parseOAuthState = (state: string) => {
  try {
    return JSON.parse(atob(state));
  } catch {
    return { redirectUri: window.location.origin, returnPath: "/" };
  }
};
