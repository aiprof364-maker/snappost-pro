import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Camera, Menu } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const NAV = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Changelog", href: "/changelog" },
  { label: "Contact", href: "/contact" },
];

export default function SiteHeader() {
  const { isAuthenticated, loading } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Camera className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-extrabold">SnapPost Pro</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map(item => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {loading ? null : isAuthenticated ? (
            <Link href="/dashboard">
              <Button>Dashboard</Button>
            </Link>
          ) : (
            <>
              <a href={getLoginUrl()}>
                <Button variant="ghost">Log in</Button>
              </a>
              <a href={getLoginUrl()}>
                <Button>Get started</Button>
              </a>
            </>
          )}
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <div className="container flex flex-col gap-2 py-4">
            {NAV.map(item => (
              <a
                key={item.href}
                href={item.href}
                className="py-2 text-sm font-medium text-muted-foreground"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button className="w-full">Dashboard</Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button className="w-full">Get started</Button>
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
