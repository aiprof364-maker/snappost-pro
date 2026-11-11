import {
  hasMetaPixelConsent,
  hasMetaPixelChoice,
  initializeMetaPixel,
  setMetaPixelConsent,
} from "@/lib/metaPixel";
import {
  hasGoogleAnalyticsConsent,
  hasGoogleAnalyticsChoice,
  initializeGoogleAnalytics,
  setGoogleAnalyticsConsent,
} from "@/lib/googleAnalytics";
import {
  CONSENT_UPDATED_EVENT,
  OPEN_COOKIE_SETTINGS_EVENT,
  type ConsentChoice,
} from "@/lib/consentStorage";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useEffect, useState } from "react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analyticsChoice, setAnalyticsChoice] = useState<ConsentChoice>(() =>
    hasGoogleAnalyticsConsent() ? "granted" : "denied"
  );
  const [advertisingChoice, setAdvertisingChoice] = useState<ConsentChoice>(
    () => (hasMetaPixelConsent() ? "granted" : "denied")
  );
  const [bannerNode, setBannerNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const syncChoices = () => {
      setAnalyticsChoice(hasGoogleAnalyticsConsent() ? "granted" : "denied");
      setAdvertisingChoice(hasMetaPixelConsent() ? "granted" : "denied");
    };
    const openSettings = () => {
      syncChoices();
      setCustomizing(true);
      setVisible(true);
    };
    const consentUpdated = () => {
      syncChoices();
      if (hasGoogleAnalyticsChoice() && hasMetaPixelChoice()) setVisible(false);
    };

    initializeGoogleAnalytics();
    initializeMetaPixel();
    setVisible(!hasGoogleAnalyticsChoice() || !hasMetaPixelChoice());
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, openSettings);
    window.addEventListener(CONSENT_UPDATED_EVENT, consentUpdated);
    return () => {
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, openSettings);
      window.removeEventListener(CONSENT_UPDATED_EVENT, consentUpdated);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (!visible) {
      root?.style?.removeProperty("--cookie-offset");
      return;
    }
    if (!bannerNode || !root?.style) return;
    const apply = () => {
      root.style.setProperty("--cookie-offset", `${bannerNode.offsetHeight}px`);
    };
    apply();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(apply);
    observer.observe(bannerNode);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--cookie-offset");
    };
  }, [bannerNode, customizing, visible]);

  const applyChoices = (
    analytics: ConsentChoice,
    advertising: ConsentChoice
  ) => {
    setGoogleAnalyticsConsent(analytics);
    setMetaPixelConsent(advertising);
    setAnalyticsChoice(analytics);
    setAdvertisingChoice(advertising);
    setVisible(false);
    setCustomizing(false);
  };
  const declineOptional = () => applyChoices("denied", "denied");

  if (!visible) return null;

  return (
    <aside
      ref={setBannerNode}
      aria-label="Cookie preferences"
      className="fixed top-0 right-0 left-0 z-[60] border-b border-border bg-background shadow-sm"
    >
      <style>{`:root{--cookie-offset:196px}`}</style>
      <button
        type="button"
        aria-label="Decline optional cookies and close"
        title="Decline optional cookies and close"
        onClick={declineOptional}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span aria-hidden="true">×</span>
      </button>
      <div className="container py-3 pr-10 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="text-sm leading-5 text-muted-foreground">
            Optional cookies help us measure site visits and ads. You can
            decline and still use SnapPost Pro.
          </p>
          <Link
            href="/privacy"
            className="mt-1 inline-block text-xs text-muted-foreground underline underline-offset-4"
          >
            Privacy Policy
          </Link>
        </div>
        {customizing ? (
          <div className="mt-3 space-y-3 sm:mt-0 sm:w-72">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={analyticsChoice === "granted"}
                onChange={event =>
                  setAnalyticsChoice(
                    event.target.checked ? "granted" : "denied"
                  )
                }
                className="h-4 w-4 accent-primary"
              />
              Google Analytics — site measurement
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={advertisingChoice === "granted"}
                onChange={event =>
                  setAdvertisingChoice(
                    event.target.checked ? "granted" : "denied"
                  )
                }
                className="h-4 w-4 accent-primary"
              />
              Meta — advertising measurement
            </label>
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => applyChoices(analyticsChoice, advertisingChoice)}
            >
              Save choices
            </Button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2 sm:mt-0 sm:shrink-0">
            <Button
              type="button"
              size="sm"
              className="min-w-36 flex-1 sm:flex-none"
              onClick={declineOptional}
            >
              Decline optional
            </Button>
            <Button
              type="button"
              size="sm"
              className="min-w-36 flex-1 sm:flex-none"
              onClick={() => applyChoices("granted", "granted")}
            >
              Allow all
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => setCustomizing(true)}
            >
              Customize
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
