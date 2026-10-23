const MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID ?? "").trim();
const CONSENT_STORAGE_KEY = "snappost-google-analytics-consent";

type ConsentChoice = "granted" | "denied";
type GoogleAnalyticsEventParameters = Record<string, string | number | boolean>;
type GtagFunction = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFunction;
  }
}

let initialized = false;
let lastTrackedPagePath: string | null = null;

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function hasMeasurementId() {
  return /^G-[A-Z0-9]+$/i.test(MEASUREMENT_ID);
}

function gtag(...args: unknown[]) {
  window.gtag?.(...args);
}

function installGoogleTag() {
  if (!canUseBrowserStorage() || window.gtag) return;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  script.dataset.googleAnalyticsMeasurementId = MEASUREMENT_ID;
  document.head.appendChild(script);
}

function currentPagePath() {
  return window.location.pathname || "/";
}

/** Whether the visitor has explicitly allowed optional Google Analytics cookies. */
export function hasGoogleAnalyticsConsent() {
  return (
    canUseBrowserStorage() &&
    window.localStorage.getItem(CONSENT_STORAGE_KEY) === "granted"
  );
}

/** Whether the visitor has saved an Analytics preference. */
export function hasGoogleAnalyticsChoice() {
  return (
    canUseBrowserStorage() &&
    window.localStorage.getItem(CONSENT_STORAGE_KEY) !== null
  );
}

/** Save the visitor's Analytics preference and apply it to an already loaded tag. */
export function setGoogleAnalyticsConsent(choice: ConsentChoice) {
  if (!canUseBrowserStorage()) return;

  window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  if (choice === "granted") {
    initializeGoogleAnalytics();
    return;
  }

  lastTrackedPagePath = null;
  if (window.gtag) {
    gtag("consent", "update", { analytics_storage: "denied" });
  }
}

/**
 * Loads Google Analytics only after consent. This is a basic consent setup:
 * Google receives no tag request before the visitor has opted in.
 */
export function initializeGoogleAnalytics() {
  if (!hasGoogleAnalyticsConsent() || !hasMeasurementId()) return false;
  if (initialized) {
    gtag("consent", "update", { analytics_storage: "granted" });
    return true;
  }

  installGoogleTag();
  gtag("consent", "default", { analytics_storage: "denied" });
  gtag("js", new Date());
  gtag("consent", "update", { analytics_storage: "granted" });
  gtag("config", MEASUREMENT_ID, { send_page_view: false });
  initialized = true;
  trackGooglePageView();
  return true;
}

/** Track a SPA page view without exposing URL query values such as preview tokens. */
export function trackGooglePageView() {
  if (!initializeGoogleAnalytics()) return false;

  const pagePath = currentPagePath();
  if (pagePath === lastTrackedPagePath) return true;

  lastTrackedPagePath = pagePath;
  gtag("event", "page_view", {
    page_location: `${window.location.origin}${pagePath}`,
    page_path: pagePath,
    page_title: document.title,
  });
  return true;
}

/** Track only non-identifying, consented product and marketing funnel events. */
export function trackGoogleAnalyticsEvent(
  eventName: string,
  parameters?: GoogleAnalyticsEventParameters
) {
  if (!initializeGoogleAnalytics()) return false;
  gtag("event", eventName, parameters);
  return true;
}
