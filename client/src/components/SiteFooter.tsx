import { Camera } from "lucide-react";
import { Link } from "wouter";

export default function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="container flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Camera className="h-4 w-4" />
          </span>
          <span className="font-display font-bold">SnapPost Pro</span>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <a href="/#features" className="hover:text-foreground">Features</a>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/changelog" className="hover:text-foreground">Changelog</Link>
          <Link href="/contact" className="hover:text-foreground">Contact</Link>
        </nav>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} SnapPost Pro. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
