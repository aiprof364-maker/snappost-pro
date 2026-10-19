import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { LANDING_MOCKUP } from "@/lib/landingMockup";
import { trackMetaCustomEvent } from "@/lib/metaPixel";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowRight,
  Check,
  Facebook,
  ImagePlus,
  PenLine,
  ShieldCheck,
  Stamp,
} from "lucide-react";
import { Link } from "wouter";

const STEPS = [
  {
    number: "1",
    icon: ImagePlus,
    title: "Upload a finished-job photo",
    description:
      "Use a real photo of work you want to show on your Facebook Page.",
  },
  {
    number: "2",
    icon: Stamp,
    title: "Add your logo",
    description:
      "SnapPost Pro adds your logo watermark to the lower-right of the image.",
  },
  {
    number: "3",
    icon: PenLine,
    title: "Review your AI-written caption",
    description: "Review and edit the caption before you decide to publish.",
  },
  {
    number: "4",
    icon: Facebook,
    title: "Publish to your Facebook Page",
    description:
      "Connect one Facebook Page and publish when the post is ready.",
  },
] as const;

const FREE_FEATURES = [
  "3 branded Facebook posts total",
  "No card required",
  "AI-written captions to review",
  "Logo watermark on your image",
  "One connected Facebook Page",
] as const;

export default function Contractors() {
  const { isAuthenticated } = useAuth();
  const primaryCta = isAuthenticated
    ? "/dashboard"
    : "/preview?landing=contractors";
  const trackFreeStartClick = () => {
    if (!isAuthenticated) {
      trackMetaCustomEvent("FreeStartCtaClicked", {
        landing_page: "contractors",
      });
    }
  };

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
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> For
                contractors with a Facebook Page
              </span>
              <h1 className="font-display mt-3 text-4xl font-extrabold leading-[1.05] sm:text-5xl">
                Turn finished job photos into{" "}
                <span className="text-primary">branded Facebook posts.</span>
              </h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Upload a completed-job photo. SnapPost Pro adds your logo and
                writes an AI caption. You review it, then publish it to your
                Facebook Page.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a href={primaryCta} onClick={trackFreeStartClick}>
                  <Button
                    size="lg"
                    className="w-full gap-2 px-8 py-6 text-base font-bold sm:w-auto"
                  >
                    {isAuthenticated
                      ? "Go to dashboard"
                      : "Create my free preview"}{" "}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </a>
                <Link href="/pricing">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full px-8 py-6 text-base font-semibold sm:w-auto"
                  >
                    View pricing
                  </Button>
                </Link>
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                3 posts total · No card required · Publish to one connected
                Facebook Page
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
                <a
                  href={primaryCta}
                  className="mt-5 inline-flex"
                  onClick={trackFreeStartClick}
                >
                  <Button
                    size="lg"
                    className="gap-2 px-7 py-6 text-base font-bold"
                  >
                    {isAuthenticated
                      ? "Go to dashboard"
                      : "Create my free preview"}{" "}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </a>
              </div>
            </div>

            <figure className="overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-xl shadow-primary/10">
              <div className="grid grid-cols-2 overflow-hidden rounded-xl">
                <img
                  src={LANDING_MOCKUP.originalPhotoUrl}
                  alt="Completed outdoor deck photo before logo branding"
                  className="aspect-[4/3] h-full w-full object-cover"
                />
                <img
                  src={LANDING_MOCKUP.brandedPhotoUrl}
                  alt="The same completed deck photo with a contractor logo watermark"
                  className="aspect-[4/3] h-full w-full object-cover"
                />
              </div>
              <figcaption className="flex flex-wrap items-center justify-between gap-2 px-1 pt-3 text-sm text-muted-foreground">
                <span>
                  <strong className="text-foreground">Before:</strong> finished
                  job photo
                </span>
                <span>
                  <strong className="text-primary">After:</strong> photo with
                  the contractor's logo
                </span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="border-b border-border/60 bg-muted/20 py-16 md:py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
                Four simple steps
              </p>
              <h2 className="font-display mt-3 text-3xl font-bold sm:text-4xl">
                From completed job to Facebook post
              </h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(step => (
                <article
                  key={step.number}
                  className="rounded-2xl border border-border bg-card p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-primary">
                      {step.number}
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <step.icon className="h-5 w-5" />
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 bg-muted/20 py-16 md:py-20">
          <div className="container">
            <div className="mx-auto max-w-3xl rounded-3xl bg-primary px-7 py-12 text-center text-primary-foreground shadow-xl sm:px-12">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Show your finished work without starting from scratch.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 opacity-90">
                Create three branded Facebook posts free. You review the image
                and caption before anything is published.
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
                  {isAuthenticated
                    ? "Go to dashboard"
                    : "Create my free preview"}{" "}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </a>
              <p className="mt-4 text-sm opacity-80">
                No card required. Three posts total.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
