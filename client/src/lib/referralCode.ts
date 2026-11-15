import { normalizeReferralCode } from "@shared/referrals";

export const REFERRAL_STORAGE_KEY = "snappost-referral-code";
export const REFERRAL_COOKIE = "snappost_ref";

type ReferralStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

type ReferralCookie = {
  get: () => string | null;
  set: (code: string) => void;
};

function readStored(value: string | null | undefined) {
  return normalizeReferralCode(value);
}

/**
 * Remember ?ref= for the magic-link request. The URL wins, then the cookie
 * (so a later tab still counts), then session storage.
 */
export function rememberReferralCode(
  search: string,
  storage: ReferralStorage,
  cookie?: ReferralCookie
): string | null {
  const fromUrl = readStored(new URLSearchParams(search).get("ref"));
  if (fromUrl) {
    storage.setItem(REFERRAL_STORAGE_KEY, fromUrl);
    cookie?.set(fromUrl);
    return fromUrl;
  }
  const fromCookie = readStored(cookie?.get());
  if (fromCookie) {
    storage.setItem(REFERRAL_STORAGE_KEY, fromCookie);
    return fromCookie;
  }
  return readStored(storage.getItem(REFERRAL_STORAGE_KEY));
}

export function captureReferralCode(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const cookie: ReferralCookie = {
      get: () => {
        const row = document.cookie
          .split("; ")
          .find(part => part.startsWith(`${REFERRAL_COOKIE}=`));
        if (!row) return null;
        return decodeURIComponent(row.slice(REFERRAL_COOKIE.length + 1));
      },
      set: code => {
        const secure = window.location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `${REFERRAL_COOKIE}=${encodeURIComponent(code)}; Path=/; Max-Age=2592000; SameSite=Lax${secure}`;
      },
    };
    return rememberReferralCode(window.location.search, window.sessionStorage, cookie) ?? undefined;
  } catch {
    return undefined;
  }
}
