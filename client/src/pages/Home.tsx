import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import PricingCards from "@/components/PricingCards";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import ResultsFirstHero from "@/components/ResultsFirstHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import { Link } from "wouter";

const FEATURES = [
  {
    title: "Snap & upload",
    desc: "Upload a photo of your completed work, product, space or result from your phone or desktop.",
  },
  {
    title: "SnapPost Pro captions",
    desc: "Get a ready-to-post caption with hashtags written for you.",
  },
  {
    title: "Auto logo branding",
    desc: "Your logo is overlaid on every photo so every post markets your business.",
  },
  {
    title: "Post to Facebook",
    desc: "Publish the branded photo to your connected Facebook page in one click.",
  },
  {
    title: "Save hours every week",
    desc: "Spend less time writing captions and preparing images for social media.",
  },
  {
    title: "Built for local businesses",
    desc: "Made for businesses with real work, products, spaces or results worth showing.",
  },
];

const FREE_START_FEATURES = [
  "3 branded Facebook posts total",
  "No card required",
  "SnapPost Pro-written captions to review",
  "Logo watermark on your image",
  "One connected Facebook Page",
] as const;

const LOCAL_BUSINESS_CATEGORIES = [
  {
    title: "Trades & Home Services",
    examples:
      "Builders, painters, landscapers, gardeners, cleaners, window cleaners and car detailers.",
  },
  {
    title: "Food & Hospitality",
    examples:
      "Cafés, coffee shops, restaurants, bistros, food trucks, bakeries, cake designers and specialty food stores.",
  },
  {
    title: "Beauty, Wellness & Fitness",
    examples:
      "Hair salons, stylists, barbers, nails, lashes, skincare, tattoo, massage, personal training, yoga, Pilates and dance.",
  },
  {
    title: "Retail & Creative Businesses",
    examples:
      "Boutiques, clothing and vintage stores, florists, artisan makers, craft businesses, photographers, interior designers and home stagers.",
  },
  {
    title: "Property, Events & Local Services",
    examples:
      "Real estate, property management, Airbnb hosting, home organising, event planning, wedding coordination and driving instruction.",
  },
  {
    title: "Pet, Care & Professional Services",
    examples:
      "Dog grooming, pet businesses, boarding, daycares, training, local clinics and independent care providers.",
  },
];

const FAQS = [
  {
    q: "Do I need design or writing skills?",
    a: "No. SnapPost Pro writes the caption and brands the image for you. You just upload a photo and click post.",
  },
  {
    q: "What do I need to post to Facebook?",
    a: "You connect your Facebook page once. Facebook posting activates after your connected app is approved by Meta; everything else works immediately.",
  },
  {
    q: "Can I edit the caption before posting?",
    a: "Yes. Every caption is editable. Tweak it, then publish or save it as a draft.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Manage or cancel your subscription anytime from your dashboard billing portal.",
  },
  {
    q: "Which plan should I choose?",
    a: "Starter ($19/mo) suits solo operators posting a few times a week. Pro ($29/mo) provides 300 posts/month (about 10 a day) for higher-volume posting.",
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const primaryCta = isAuthenticated ? "/dashboard" : "/login?next=/preview";
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const subscribe = trpc.contact.subscribe.useMutation({
    onSuccess: () => {
      toast.success("You're in! Weekly tips are on the way.");
      setNewsletterEmail("");
    },
    onError: () =>
      toast.error("Couldn't subscribe right now. Please try again."),
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.4]"
          style={{
            backgroundImage:
              "radial-gradient(60% 50% at 20% 0%, oklch(0.49 0.18 277 / 0.18), transparent), radial-gradient(50% 50% at 90% 10%, oklch(0.74 0.15 70 / 0.14), transparent)",
          }}
        />
        <div className="container pt-10 pb-3 sm:pt-14 sm:pb-3 md:pt-16 md:pb-3">
          <ResultsFirstHero />

          <div className="mx-auto mt-12 max-w-xl text-center sm:mt-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Photo-to-post
              for local businesses
            </span>
            <h1 className="font-display mt-5 space-y-1 text-left text-4xl font-extrabold leading-[1.05] sm:text-5xl md:text-6xl">
              {[
                "Buy back your time",
                "Post your work faster",
                "Try free today",
                "3 free posts",
                "No card required",
              ].map(line => (
                <span key={line} className="flex items-center gap-3">
                  <Check className="h-8 w-8 shrink-0 stroke-[3] text-emerald-500 sm:h-10 sm:w-10" />
                  <span>{line}</span>
                </span>
              ))}
            </h1>
            <p className="mx-auto mt-5 max-w-md text-lg text-muted-foreground">
              Upload a real photo. Add your logo if you have one. Review an
              SnapPost Pro-written caption. Publish to your Facebook Page when you are
              ready.
            </p>
            <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-semibold text-foreground">
              <span>Upload a photo</span>
              <span className="text-primary" aria-hidden="true">
                →
              </span>
              <span>Add your logo</span>
              <span className="text-primary" aria-hidden="true">
                →
              </span>
              <span>Review caption</span>
              <span className="text-primary" aria-hidden="true">
                →
              </span>
              <span>Publish</span>
            </p>
            <div className="mt-8">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    className="gap-2 w-full sm:w-auto px-8 py-6 text-base font-semibold"
                  >
                    Go to dashboard <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <a href={primaryCta}>
                  <Button
                    size="lg"
                    className="gap-2 w-full sm:w-auto px-8 py-6 text-base font-semibold"
                  >
                    Start my 3 free posts{" "}
                    <ArrowRight className="h-5 w-5 text-emerald-300" />
                  </Button>
                </a>
              )}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              3 posts total · No card required · Publish to one connected
              Facebook Page
            </p>
            <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-left sm:p-6">
              <h2 className="text-lg font-bold">Your free start includes</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {FREE_START_FEATURES.map(feature => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm leading-6"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-border/60 bg-muted/20 py-3"
      >
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Everything you need to post like a pro
            </h2>
            <p className="mt-3 text-muted-foreground">
              Built so you spend time on the tools, not on social media.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
            <h3 className="text-lg font-bold">Everything you need includes</h3>
            <ul className="mt-4 space-y-4">
              {FEATURES.map(f => (
                <li key={f.title} className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">{f.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {f.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Local businesses */}
      <section className="py-3">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Built for local businesses
            </h2>
            <p className="mt-3 text-muted-foreground">
              If your business has real work, products, spaces or results worth
              showing, SnapPost Pro can help turn a photo into a branded
              Facebook post.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {LOCAL_BUSINESS_CATEGORIES.map(category => (
              <div
                key={category.title}
                className="rounded-xl border border-border bg-card p-6"
              >
                <h3 className="font-semibold">{category.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {category.examples}
                </p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-sm text-muted-foreground">
            Only upload photos you own or have permission to publish. Do not
            upload customer, patient or client-identifying information without
            appropriate consent.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="border-t border-border/60 bg-muted/20 py-3"
      >
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Simple, honest pricing
            </h2>
            <p className="mt-3 text-muted-foreground">
              Start with 3 free branded Facebook posts. Choose a paid plan only
              when you need more.
            </p>
          </div>
          <div className="mt-12">
            <PricingCards />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-3">
        <div className="container max-w-3xl">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Frequently asked questions
            </h2>
          </div>
          <Accordion type="single" collapsible className="mt-10">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Cost transparency */}
      <section className="border-t border-border/60 bg-muted/20 py-3">
        <div className="container max-w-3xl">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              What's your time worth?
            </h2>
          </div>
          <div className="mx-auto mt-8 max-w-2xl space-y-6 text-center">
            <p className="text-lg text-muted-foreground">
              Preparing a Facebook post means choosing a photo, writing a
              caption and finding the right words to say.
            </p>
            <p className="text-2xl font-bold text-primary">
              SnapPost Pro gives you a logo-branded image and SnapPost Pro-written caption
              to review before you publish.
            </p>
            <p className="text-lg text-muted-foreground">
              Keep your Facebook Page active while spending less time preparing
              posts.
            </p>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-3">
        <div className="container max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Get weekly tips for local businesses
          </h2>
          <p className="mt-3 text-muted-foreground">
            Practical tips to grow your business and save time on social media.
            No spam — unsubscribe anytime.
          </p>
          <form
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            onSubmit={e => {
              e.preventDefault();
              if (newsletterEmail.trim())
                subscribe.mutate({ email: newsletterEmail.trim() });
            }}
          >
            <Input
              type="email"
              required
              placeholder="your@email.com"
              value={newsletterEmail}
              onChange={e => setNewsletterEmail(e.target.value)}
              className="h-11"
            />
            <Button type="submit" size="lg" disabled={subscribe.isPending}>
              {subscribe.isPending ? "Joining…" : "Get tips"}
            </Button>
          </form>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 py-3">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl bg-primary px-8 py-12 text-center text-primary-foreground">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Create your first branded post free.
            </h2>
            <p className="mx-auto mt-3 max-w-xl opacity-90">
              Upload your photo and logo first, then review your branded image
              and SnapPost Pro-written caption before you enter your email. No card
              required.
            </p>
            <div className="mt-8 flex justify-center">
              <a href={primaryCta}>
                <Button
                  size="lg"
                  variant="secondary"
                  className="gap-2 px-8 py-6 text-base font-semibold"
                >
                  Start my 3 free posts <ArrowRight className="h-5 w-5" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
