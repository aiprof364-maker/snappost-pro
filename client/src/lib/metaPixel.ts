export const META_PIXEL_ID = "1579357956689832";

const CONSENT_STORAGE_KEY = "snappost-meta-pixel-consent";
const PENDING_EVENT_STORAGE_KEY = "snappost-pending-meta-event";

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

function installMetaPixelBaseCode() {
  if (!canUseBrowserStorage() || window.fbq) return;

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
  document.head.appendChild(script);
}

let initialized = false;

export function initializeMetaPixel() {
  if (!hasMetaPixelConsent()) return false;
  if (initialized) return true;

  installMetaPixelBaseCode();
  // Meta's consent API keeps every Pixel fire paused until the visitor has made
  // an affirmative advertising-cookie choice. The visitor has done so before
  // this function can run.
  window.fbq?.("consent", "revoke");
  window.fbq?.("init", META_PIXEL_ID);
  window.fbq?.("track", "PageView");
  window.fbq?.("consent", "grant");
  initialized = true;
  return true;
}

export function trackMetaEvent(eventName: "CompleteRegistration") {
  if (!hasMetaPixelConsent()) {
    if (canUseBrowserStorage()) {
      window.sessionStorage.setItem(PENDING_EVENT_STORAGE_KEY, eventName);
    }
    return false;
  }

  initializeMetaPixel();
  window.fbq?.("track", eventName);
  return true;
}

export function flushPendingMetaEvent() {
  if (!canUseBrowserStorage() || !hasMetaPixelConsent()) return;
  const eventName = window.sessionStorage.getItem(PENDING_EVENT_STORAGE_KEY);
  if (eventName === "CompleteRegistration") {
    initializeMetaPixel();
    window.fbq?.("track", "CompleteRegistration");
  }
  window.sessionStorage.removeItem(PENDING_EVENT_STORAGE_KEY);
}
