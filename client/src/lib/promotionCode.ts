const PROMOTION_CODE_PATTERN = /^[A-Za-z0-9-]{1,100}$/;
export const PROMOTION_CODE_STORAGE_KEY = "snappost-promo-code";

type PromoStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function rememberPromotionCode(search: string, storage: PromoStorage): string | undefined {
  const fromUrl = new URLSearchParams(search).get("code")?.trim() ?? "";
  if (PROMOTION_CODE_PATTERN.test(fromUrl)) {
    storage.setItem(PROMOTION_CODE_STORAGE_KEY, fromUrl);
    return fromUrl;
  }
  const stored = storage.getItem(PROMOTION_CODE_STORAGE_KEY)?.trim() ?? "";
  return PROMOTION_CODE_PATTERN.test(stored) ? stored : undefined;
}

export function capturePromotionCode(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return rememberPromotionCode(window.location.search, window.sessionStorage);
}
