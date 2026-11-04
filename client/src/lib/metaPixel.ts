import {
  META_CONSENT_KEY,
  isConsentChoice,
  notifyConsentUpdated,
  readConsentPreference,
  writeConsentPreference,
  type ConsentChoice,
} from "./consentStorage";

export const META_PIXEL_ID = "1579357956689832";

const PENDING_EVENT_STORAGE_KEY = "snappost-pending-meta-event";

type MetaEventParameters = Record<string, string | number | boolean>;
type PendingMetaEvent = {
  kind: "standard" | "custom";
  name: string;
  parameters?: MetaEventParameters;
};

type MetaPixelFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push?: MetaPixelFunction;
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
    _fbq?: MetaPixelFunction;
  }
}

function canUseBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function hasMetaPixelConsent() {
  return (
    canUseBrowser() && readConsentPreference(META_CONSENT_KEY) === "granted"
  );
}

export function hasMetaPixelChoice() {
  return canUseBrowser() && readConsentPreference(META_CONSENT_KEY) !== null;
}

export function setMetaPixelConsent(choice: ConsentChoice) {
  if (!canUseBrowser() || !isConsentChoice(choice)) return false;
  const persisted = writeConsentPreference(META_CONSENT_KEY, choice);
  if (choice === "granted") {
    initializeMetaPixel();
    flushPendingMetaEvent();
  } else {
    window.fbq?.("consent", "revoke");
  }
  notifyConsentUpdated();
  return persisted;
}

function installMetaPixelBaseCode() {
  if (window.fbq) return null;

  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
    } else {
      fbq.queue.push(args);
    }
  }) as MetaPixelFunction;

  fbq.queue = [];
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  script.dataset.metaPixelId = META_PIXEL_ID;
  script.addEventListener(
    "load",
    () => {
      // Consent may have been withdrawn while the script was in flight.
      scriptLoaded = true;
      if (hasMetaPixelConsent()) window.fbq?.("consent", "grant");
    },
    { once: true }
  );
  return script;
}

let initialized = false;
let scriptLoaded = false;

export function initializeMetaPixel() {
  if (!hasMetaPixelConsent()) return false;
  if (initialized) {
    // An already initialized Pixel must resume after a new affirmative choice.
    if (scriptLoaded) window.fbq?.("consent", "grant");
    return true;
  }

  const script = installMetaPixelBaseCode();
  // Pause before initialization; release only for affirmative consent.
  window.fbq?.("consent", "revoke");
  window.fbq?.("init", META_PIXEL_ID);
  window.fbq?.("track", "PageView");
  initialized = true;
  if (script) {
    document.head.appendChild(script);
  } else if (hasMetaPixelConsent()) {
    scriptLoaded = true;
    window.fbq?.("consent", "grant");
  }
  return true;
}

function sendMetaEvent(event: PendingMetaEvent) {
  if (!initializeMetaPixel()) return;
  if (event.kind === "custom") {
    window.fbq?.("trackCustom", event.name, event.parameters);
    return;
  }
  window.fbq?.("track", event.name, event.parameters);
}

function queueOrSendMetaEvent(event: PendingMetaEvent) {
  if (!hasMetaPixelConsent()) {
    if (canUseBrowser()) {
      try {
        window.sessionStorage.setItem(
          PENDING_EVENT_STORAGE_KEY,
          JSON.stringify(event)
        );
      } catch {
        // Optional tracking must not break the app when storage is blocked.
      }
    }
    return false;
  }

  sendMetaEvent(event);
  return true;
}

export function trackMetaEvent(
  eventName: "CompleteRegistration" | "Lead" | "StartTrial" | "Subscribe",
  parameters?: MetaEventParameters
) {
  return queueOrSendMetaEvent({
    kind: "standard",
    name: eventName,
    parameters,
  });
}

export function trackMetaCustomEvent(
  eventName: string,
  parameters?: MetaEventParameters
) {
  return queueOrSendMetaEvent({ kind: "custom", name: eventName, parameters });
}

export function flushPendingMetaEvent() {
  if (!canUseBrowser() || !hasMetaPixelConsent()) return;
  try {
    const rawEvent = window.sessionStorage.getItem(PENDING_EVENT_STORAGE_KEY);
    if (rawEvent) {
      const event = JSON.parse(rawEvent) as PendingMetaEvent;
      if (
        (event.kind === "standard" || event.kind === "custom") &&
        typeof event.name === "string"
      ) {
        sendMetaEvent(event);
      }
    }
  } catch {
    // Ignore unavailable storage or malformed data rather than blocking consent.
  }
  try {
    window.sessionStorage.removeItem(PENDING_EVENT_STORAGE_KEY);
  } catch {
    // Session storage can be unavailable independently of preference storage.
  }
}
