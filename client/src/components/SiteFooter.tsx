import snapPostProLogo from "@/assets/brand/snappost-pro-logo.jpg";
import { TRADE_LANDING_NAV } from "@shared/tradeLandingNav";
import { Link } from "wouter";

export default function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="container flex flex-col gap-8 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <img
              src={snapPostProLogo}
              alt="SnapPost Pro"
              className="h-8 w-8 rounded-lg object-cover"
            />
            <span className="font-display font-bold">SnapPost Pro</span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/features" className="hover:text-foreground">
              Features
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/changelog" className="hover:text-foreground">
              Changelog
            </Link>
            <Link href="/contact" className="hover:text-foreground">
              Contact
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <button
              type="button"
              className="hover:text-foreground"
              onClick={() =>
                window.dispatchEvent(new Event("snappost-open-cookie-settings"))
              }
            >
              Cookie settings
            </button>
          </nav>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SnapPost Pro. All rights reserved.
          </p>
        </div>
        <nav aria-label="For your trade">
          <p className="text-sm font-semibold text-foreground">
            For your trade
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {TRADE_LANDING_NAV.map(trade => (
              <li key={trade.path}>
                <Link href={trade.path} className="hover:text-foreground">
                  {trade.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
