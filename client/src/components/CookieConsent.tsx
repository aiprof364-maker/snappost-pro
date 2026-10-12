import {
  hasMetaPixelChoice,
  initializeMetaPixel,
  setMetaPixelConsent,
} from "@/lib/metaPixel";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useEffect, useState } from "react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasMetaPixelChoice()) {
      initializeMetaPixel();
      return;
    }
    setVisible(true);
  }, []);

  const choose = (choice: "granted" | "denied") => {
    setMetaPixelConsent(choice);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-background/95 p-4 shadow-2xl backdrop-blur sm:p-5">
      <div className="container flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          We use optional Meta advertising cookies to measure site visits and free-account registrations.
          You can decline and still use SnapPost Pro. Read our <Link href="/privacy" className="font-medium text-primary underline underline-offset-4">Privacy Policy</Link>.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={() => choose("denied")}>Decline</Button>
          <Button onClick={() => choose("granted")}>Allow optional cookies</Button>
        </div>
      </div>
    </div>
  );
}
