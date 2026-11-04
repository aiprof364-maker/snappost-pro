export type ConsentChoice = "granted" | "denied";

export const GOOGLE_CONSENT_KEY = "snappost-google-analytics-consent";
export const META_CONSENT_KEY = "snappost-meta-pixel-consent";
export const CONSENT_UPDATED_EVENT = "snappost-consent-updated";
export const OPEN_COOKIE_SETTINGS_EVENT = "snappost-open-cookie-settings";

type ConsentKey = typeof GOOGLE_CONSENT_KEY | typeof META_CONSENT_KEY;
const memoryPreferences = new Map<ConsentKey, ConsentChoice>();
const RETENTION_SECONDS = 60 * 60 * 24 * 365;

export function isConsentChoice(value: unknown): value is ConsentChoice {
  return value === "granted" || value === "denied";
}

function readCookie(key: ConsentKey): ConsentChoice | null {
  try {
    if (typeof document === "undefined") return null;
    const value = document.cookie
      .split(";")
      .map(part => part.trim())
      .find(part => part.startsWith(`${key}=`))
      ?.slice(key.length + 1);
    return isConsentChoice(value) ? value : null;
  } catch {
    return null;
  }
}

function writeCookie(key: ConsentKey, choice: ConsentChoice): boolean {
  try {
    if (typeof document === "undefined") return false;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    // Essential first-party preference only: no identifiers or tracking data.
    document.cookie = `${key}=${choice}; Max-Age=${RETENTION_SECONDS}; Path=/; SameSite=Lax${secure}`;
    return readCookie(key) === choice;
  } catch {
    return false;
  }
}

export function readConsentPreference(key: ConsentKey): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  const memoryChoice = memoryPreferences.get(key);
  if (memoryChoice) return memoryChoice;

  // The cookie also covers a previous write where localStorage was read-only.
  const cookieChoice = readCookie(key);
  if (cookieChoice) return cookieChoice;
  try {
    const choice = window.localStorage.getItem(key);
    if (isConsentChoice(choice)) {
      // Migrate existing preferences without prompting or changing the choice.
      writeCookie(key, choice);
      return choice;
    }
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
  return null;
}

/** Returns false when the choice can only be remembered for this loaded page. */
export function writeConsentPreference(
  key: ConsentKey,
  choice: ConsentChoice
): boolean {
  if (typeof window === "undefined" || !isConsentChoice(choice)) return false;
  // Keep the latest choice authoritative even if persistent storage rejects writes.
  memoryPreferences.set(key, choice);
  let persisted = false;
  try {
    window.localStorage.setItem(key, choice);
    persisted = window.localStorage.getItem(key) === choice;
  } catch {
    // Try the essential preference cookie instead.
  }
  return writeCookie(key, choice) || persisted;
}

export function notifyConsentUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CONSENT_UPDATED_EVENT));
  }
}
