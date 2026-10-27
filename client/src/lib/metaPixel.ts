export const META_PIXEL_ID = "1579357956689832";

const CONSENT_STORAGE_KEY = "snappost-meta-pixel-consent";
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

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function hasMetaPixelConsent() {
  return canUseBrowserStorage() && window.localStorage.getItem(CONSENT_STORAGE_KEY) === "granted";
}

export function hasMetaPixelChoice() {
  return canUseBrowserStorage() && window.localStorage.getItem(CONSENT_STORAGE_KEY) !== null;
}

export function setMetaPixelConsent(choice: "granted" | "denied") {
  if (!canUseBrowserStorage()) return;
  window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  if (choice === "granted") {
    initializeMetaPixel();
    flushPendingMetaEvent();
  }
}

function installMetaPixelBaseCode(onLoaded: () => void) {
  if (!canUseBrowserStorage()) return;
  if (window.fbq) {
    onLoaded();
    return;
  }

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
  script.addEventListener("load", onLoaded, { once: true });
  document.head.appendChild(script);
}

let initialized = false;

export function initializeMetaPixel() {
  if (!hasMetaPixelConsent()) return false;
  if (initialized) return true;

  // Meta's consent API keeps every Pixel fire paused until the visitor has made
  // an affirmative advertising-cookie choice. Queue the pause before Pixel
  // setup, then release it only after Meta's script has initialized.
  installMetaPixelBaseCode(() => {
    window.fbq?.("consent", "grant");
  });
  window.fbq?.("consent", "revoke");
  window.fbq?.("init", META_PIXEL_ID);
  window.fbq?.("track", "PageView");
  initialized = true;
  return true;
}

function sendMetaEvent(event: PendingMetaEvent) {
  initializeMetaPixel();
  if (event.kind === "custom") {
    window.fbq?.("trackCustom", event.name, event.parameters);
    return;
  }
  window.fbq?.("track", event.name, event.parameters);
}

function queueOrSendMetaEvent(event: PendingMetaEvent) {
  if (!hasMetaPixelConsent()) {
    if (canUseBrowserStorage()) {
      window.sessionStorage.setItem(PENDING_EVENT_STORAGE_KEY, JSON.stringify(event));
    }
    return false;
  }

  sendMetaEvent(event);
  return true;
}

export function trackMetaEvent(
  eventName: "CompleteRegistration" | "Lead" | "StartTrial" | "Subscribe",
  parameters?: MetaEventParameters,
) {
  return queueOrSendMetaEvent({ kind: "standard", name: eventName, parameters });
}

export function trackMetaCustomEvent(eventName: string, parameters?: MetaEventParameters) {
  return queueOrSendMetaEvent({ kind: "custom", name: eventName, parameters });
}

export function flushPendingMetaEvent() {
  if (!canUseBrowserStorage() || !hasMetaPixelConsent()) return;
  const rawEvent = window.sessionStorage.getItem(PENDING_EVENT_STORAGE_KEY);
  if (rawEvent) {
    try {
      const event = JSON.parse(rawEvent) as PendingMetaEvent;
      if ((event.kind === "standard" || event.kind === "custom") && typeof event.name === "string") {
        sendMetaEvent(event);
      }
    } catch {
      // Ignore malformed local session data rather than preventing consent setup.
    }
  }
  window.sessionStorage.removeItem(PENDING_EVENT_STORAGE_KEY);
}
