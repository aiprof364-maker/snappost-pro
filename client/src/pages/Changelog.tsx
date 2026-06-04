import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";

type Entry = {
  version: string;
  date: string;
  tag: "New" | "Improved" | "Fixed";
  items: string[];
};

const CHANGELOG: Entry[] = [
  {
    version: "1.0.0",
    date: "2026-06-05",
    tag: "New",
    items: [
      "Launch of SnapPost Pro on snappostpro.com.",
      "Photo upload with automatic AI caption generation.",
      "Automatic logo branding overlay on every post.",
      "Facebook page connection and one-click publishing.",
      "Starter ($19/mo) and Pro ($29/mo) subscription plans via Stripe.",
      "Dashboard with post history and account status.",
    ],
  },
  {
    version: "0.9.0",
    date: "2026-05-20",
    tag: "Improved",
    items: [
      "Refined caption tone controls for different trades.",
      "Faster image branding pipeline.",
      "Improved dashboard layout and post history cards.",
    ],
  },
  {
    version: "0.8.0",
    date: "2026-05-02",
    tag: "New",
    items: [
      "Beta: Contact form with direct routing to support.",
      "Draft posts you can edit before publishing.",
    ],
  },
];

const tagColor: Record<Entry["tag"], string> = {
  New: "bg-primary text-primary-foreground",
  Improved: "bg-emerald-600 text-white",
  Fixed: "bg-amber-600 text-white",
};

export default function Changelog() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="py-16 md:py-20">
          <div className="container max-w-3xl">
            <div className="text-center">
              <h1 className="font-display text-4xl font-extrabold sm:text-5xl">
                Changelog
              </h1>
              <p className="mt-4 text-muted-foreground">
                What's new and improved in SnapPost Pro.
              </p>
            </div>

            <div className="mt-12 space-y-10">
              {CHANGELOG.map(entry => (
                <div
                  key={entry.version}
                  className="relative border-l border-border pl-6"
                >
                  <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary" />
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-xl font-bold">
                      v{entry.version}
                    </h2>
                    <Badge className={tagColor[entry.tag]}>{entry.tag}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {entry.items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
