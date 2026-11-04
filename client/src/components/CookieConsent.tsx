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
      aria-label="Cookie preferences"
      className="fixed bottom-3 left-3 right-3 z-[100] rounded-xl border border-border bg-background p-4 shadow-lg sm:bottom-4 sm:left-auto sm:right-4 sm:w-[28rem]"
    >
      <button
        type="button"
        aria-label="Decline optional cookies and close"
        title="Decline optional cookies and close"
        onClick={declineOptional}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span aria-hidden="true">×</span>
      </button>
      <p className="pr-7 text-sm leading-5 text-muted-foreground">
        Optional cookies help us measure site visits and ads. You can decline
        and still use SnapPost Pro.
      </p>
      {customizing ? (
        <div className="mt-3 space-y-3">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={analyticsChoice === "granted"}
              onChange={event =>
                setAnalyticsChoice(event.target.checked ? "granted" : "denied")
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
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" size="sm" onClick={declineOptional}>
            Decline optional
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => applyChoices("granted", "granted")}
          >
            Allow all
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="col-span-2"
            onClick={() => setCustomizing(true)}
          >
            Customize
          </Button>
        </div>
      )}
      <Link
        href="/privacy"
        className="mt-2 inline-block text-xs text-muted-foreground underline underline-offset-4"
      >
        Privacy Policy
      </Link>
    </aside>
  );
}
