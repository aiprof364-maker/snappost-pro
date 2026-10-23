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
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useEffect, useState } from "react";

type ConsentChoice = "granted" | "denied";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [analyticsChoice, setAnalyticsChoice] =
    useState<ConsentChoice>(() =>
      hasGoogleAnalyticsConsent() ? "granted" : "denied"
    );
  const [advertisingChoice, setAdvertisingChoice] =
    useState<ConsentChoice>(() =>
      hasMetaPixelConsent() ? "granted" : "denied"
    );

  useEffect(() => {
    const hasAnalyticsPreference = hasGoogleAnalyticsChoice();
    const hasAdvertisingPreference = hasMetaPixelChoice();
    if (hasAnalyticsPreference) initializeGoogleAnalytics();
    if (hasAdvertisingPreference) {
      initializeMetaPixel();
    }
    setVisible(!hasAnalyticsPreference || !hasAdvertisingPreference);
  }, []);

  const saveChoices = () => {
    setGoogleAnalyticsConsent(analyticsChoice);
    setMetaPixelConsent(advertisingChoice);
    setVisible(false);
  };

  const declineAll = () => {
    setAnalyticsChoice("denied");
    setAdvertisingChoice("denied");
    setGoogleAnalyticsConsent("denied");
    setMetaPixelConsent("denied");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-background/95 p-4 shadow-2xl backdrop-blur sm:p-5">
      <div className="container max-w-5xl">
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Choose optional measurement below. You can decline and still use
          SnapPost Pro. Read our{" "}
          <Link href="/privacy" className="font-medium text-primary underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-3">
            <p className="font-semibold">Analytics</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Google Analytics measures visitor totals, pages and site actions.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={analyticsChoice === "granted" ? "default" : "outline"}
                aria-pressed={analyticsChoice === "granted"}
                onClick={() => setAnalyticsChoice("granted")}
              >
                Allow
              </Button>
              <Button
                type="button"
                size="sm"
                variant={analyticsChoice === "denied" ? "default" : "outline"}
                aria-pressed={analyticsChoice === "denied"}
                onClick={() => setAnalyticsChoice("denied")}
              >
                Decline
              </Button>
            </div>
          </section>
          <section className="rounded-xl border border-border bg-card p-3">
            <p className="font-semibold">Advertising</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Meta measures ad visits and free-account registrations.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={advertisingChoice === "granted" ? "default" : "outline"}
                aria-pressed={advertisingChoice === "granted"}
                onClick={() => setAdvertisingChoice("granted")}
              >
                Allow
              </Button>
              <Button
                type="button"
                size="sm"
                variant={advertisingChoice === "denied" ? "default" : "outline"}
                aria-pressed={advertisingChoice === "denied"}
                onClick={() => setAdvertisingChoice("denied")}
              >
                Decline
              </Button>
            </div>
          </section>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={declineAll}>Decline all</Button>
          <Button onClick={saveChoices}>Save choices</Button>
        </div>
      </div>
    </div>
  );
}
