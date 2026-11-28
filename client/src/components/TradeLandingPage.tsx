import BeforeAfterCaptionProof from "@/components/BeforeAfterCaptionProof";
import LandingPromoVideo from "@/components/LandingPromoVideo";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import TradeVideoSection from "@/components/TradeVideoSection";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "@/_core/hooks/useAuth";
import { trackGoogleAnalyticsEvent } from "@/lib/googleAnalytics";
import { trackMetaCustomEvent } from "@/lib/metaPixel";
import { useTradePageMetadata } from "@/lib/pageSeo";
import { PLANS } from "@shared/const";
import { TRADE_LANDING_NAV } from "@shared/tradeLandingNav";
import {
  tradePreviewHref,
  type TradeLandingPage as TradePage,
} from "@shared/tradeLandingPages";
import {
  ArrowRight,
  Check,
  Facebook,
  ImagePlus,
  PenLine,
  ShieldCheck,
  Stamp,
} from "lucide-react";
import type { ComponentType } from "react";
import { Link } from "wouter";

const FREE_FEATURES = [
  "3 Facebook posts total",
  "No card required",
  "SnapPost Pro-written captions to review",
  "Logo optional",
  "Connect or create one Facebook Page when you are ready to publish",
] as const;

const STEP_ICONS = [ImagePlus, Stamp, PenLine, Facebook] as const;

export type TradeProof = {
  originalImageUrl: string;
  brandedImageUrl: string;
  originalAlt: string;
  brandedAlt: string;
  caption: string;
  hashtags: string;
  showLogoOverlay?: boolean;
};

export type TradePromo = {
  src: string;
  poster: string;
  captions: string;
  label: string;
};

type TradeLandingPageProps = {
  page: TradePage;
  proof?: TradeProof;
  promo?: TradePromo;
};

function StepIcon({
  icon: Icon,
}: {
  icon: ComponentType<{ className?: string }>;
}) {
  return <Icon className="h-5 w-5" />;
}

export default function TradeLandingPage({
  page,
  proof,
  promo,
}: TradeLandingPageProps) {
  const { isAuthenticated } = useAuth();
  const primaryCta = isAuthenticated
    ? "/dashboard"
    : tradePreviewHref(page.previewLanding);
  useTradePageMetadata(page);

  const trackFreeStartClick = () => {
    if (!isAuthenticated) {
      trackMetaCustomEvent("FreeStartCtaClicked", {
        landing_page: page.previewLanding,
      });
      trackGoogleAnalyticsEvent("free_start_cta_clicked", {
        landing_page: page.previewLanding,
      });
    }
  };

  const ctaLabel = isAuthenticated
    ? "Go to dashboard"
    : "Create my free post preview";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/60">
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-50"
            style={{
              backgroundImage:
                "radial-gradient(55% 55% at 14% 0%, oklch(0.49 0.18 277 / 0.16), transparent), radial-gradient(48% 52% at 92% 14%, oklch(0.74 0.15 70 / 0.16), transparent)",
            }}
          />
          <div className="container grid gap-8 py-8 md:grid-cols-2 md:items-start md:gap-10 md:py-12">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                {page.eyebrow}
              </span>
              <h1 className="font-display mt-3 text-4xl font-extrabold leading-[1.05] sm:text-5xl">
                {page.h1}
              </h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                {page.intro}
              </p>
              <div className="mt-6 flex items-center gap-4 sm:gap-5">
                {promo ? <LandingPromoVideo {...promo} /> : null}
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <a
                    href={primaryCta}
                    onClick={trackFreeStartClick}
                    className="flex"
                  >
                    <Button
                      size="lg"
                      className="h-auto w-full whitespace-normal px-4 py-4 text-left text-sm font-bold leading-snug sm:px-6 sm:py-5 sm:text-base"
                    >
                      {ctaLabel} <ArrowRight className="h-5 w-5" />
                    </Button>
                  </a>
                  <Link href="/pricing" className="flex">
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-auto w-full whitespace-normal px-4 py-4 text-sm font-semibold sm:px-6 sm:py-5 sm:text-base"
                    >
                      View pricing
                    </Button>
                  </Link>
                </div>
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                Sign up after the preview for 3 free posts. No card required.
                Logo optional. Connect a Facebook Page when you are ready to
                publish.
              </p>
              <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
                <h2 className="text-lg font-bold">Your free start includes</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {FREE_FEATURES.map(feature => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm leading-6"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  After the free posts, Starter is {PLANS.starter.priceLabel} or
                  Pro is {PLANS.pro.priceLabel}.
                </p>
                <a
                  href={primaryCta}
                  className="mt-5 inline-flex"
                  onClick={trackFreeStartClick}
                >
                  <Button
                    size="lg"
                    className="gap-2 px-7 py-6 text-base font-bold"
                  >
                    {isAuthenticated ? "Go to dashboard" : "Start 3 free posts"}{" "}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </a>
              </div>
            </div>

            {proof ? (
              <BeforeAfterCaptionProof
                originalImageUrl={proof.originalImageUrl}
                brandedImageUrl={proof.brandedImageUrl}
                originalAlt={proof.originalAlt}
                brandedAlt={proof.brandedAlt}
                caption={proof.caption}
                hashtags={proof.hashtags}
                showLogoOverlay={proof.showLogoOverlay}
              />
            ) : (
              <ExampleCard example={page.examples[0]} />
            )}
          </div>
        </section>

        <section
          id="post-ideas"
          className="border-b border-border/60 py-16 md:py-20"
        >
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
                Example posts
              </p>
              <h2 className="font-display mt-3 text-3xl font-bold sm:text-4xl">
                {page.exampleHeading}
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                {page.exampleIntro}
              </p>
            </div>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {page.examples.map(example => (
                <article
                  key={example.title}
                  className="flex flex-col rounded-2xl border border-border bg-card p-6"
                >
                  <h3 className="text-lg font-bold">{example.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Photo to use.{" "}
                    </span>
                    {example.photo}
                  </p>
                  <div className="mt-4 flex-1 rounded-xl border border-primary/15 bg-primary/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                      Example caption
                    </p>
                    <p className="mt-2 text-sm leading-6">{example.caption}</p>
                    <p className="mt-3 text-xs font-semibold text-primary">
                      {example.hashtags}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <TradeVideoSection tradeId={page.id} />

        <section className="border-b border-border/60 bg-muted/20 py-16 md:py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
                Four simple steps
              </p>
              <h2 className="font-display mt-3 text-3xl font-bold sm:text-4xl">
                {page.stepsHeading}
              </h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {page.steps.map((step, index) => {
                const Icon = STEP_ICONS[index] ?? ImagePlus;
                return (
                  <article
                    key={step.title}
                    className="rounded-2xl border border-border bg-card p-6"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-bold text-primary">
                        {index + 1}
                      </span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <StepIcon icon={Icon} />
                      </span>
                    </div>
                    <h3 className="mt-6 text-lg font-bold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="faq" className="py-16 md:py-20">
          <div className="container max-w-3xl">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Common questions
              </h2>
            </div>
            <Accordion type="single" collapsible className="mt-10">
              {page.faqs.map(faq => (
                <AccordionItem key={faq.question} value={faq.question}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="border-t border-border/60 bg-muted/20 py-16 md:py-20">
          <div className="container">
            <nav aria-label="For your trade" className="mx-auto max-w-3xl">
              <h2 className="text-center font-display text-2xl font-bold">
                For your trade
              </h2>
              <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm font-semibold">
                {TRADE_LANDING_NAV.map(trade => (
                  <li key={trade.path}>
                    {trade.path === page.path ? (
                      <span className="text-foreground">{trade.label}</span>
                    ) : (
                      <Link
                        href={trade.path}
                        className="text-primary hover:underline"
                      >
                        {trade.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mx-auto mt-12 max-w-3xl rounded-3xl bg-primary px-7 py-12 text-center text-primary-foreground shadow-xl sm:px-12">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                {page.closingHeading}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 opacity-90">
                {page.closingBody}
              </p>
              <a
                href={primaryCta}
                className="mt-8 inline-flex"
                onClick={trackFreeStartClick}
              >
                <Button
                  size="lg"
                  variant="secondary"
                  className="gap-2 px-8 py-6 text-base font-bold"
                >
                  {isAuthenticated ? "Go to dashboard" : "Start 3 free posts"}{" "}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </a>
              <p className="mt-4 text-sm opacity-80">
                No card required. The photo-to-post preview comes first.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function ExampleCard({ example }: { example: TradePage["examples"][number] }) {
  return (
    <figure className="overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-xl shadow-primary/10 sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
        Example Facebook post
      </p>
      <h2 className="mt-3 text-2xl font-bold">{example.title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {example.photo}
      </p>
      <div className="mt-5 rounded-xl border border-primary/15 bg-background p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
          Example caption
        </p>
        <p className="mt-2 text-sm leading-6">{example.caption}</p>
        <p className="mt-3 text-xs font-semibold text-primary">
          {example.hashtags}
        </p>
      </div>
      <figcaption className="pt-4 text-xs leading-5 text-muted-foreground">
        An example for your own photo. You review the caption before you
        publish.
      </figcaption>
    </figure>
  );
}
