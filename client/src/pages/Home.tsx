import { useAuth } from "@/_core/hooks/useAuth";
import PricingCards from "@/components/PricingCards";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getLoginUrl } from "@/const";
import {
  Camera,
  Sparkles,
  Stamp,
  Share2,
  Clock,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";

const FEATURES = [
  {
    icon: Camera,
    title: "Snap & upload",
    desc: "Upload a job-site photo straight from your phone or desktop in seconds.",
  },
  {
    icon: Sparkles,
    title: "AI captions",
    desc: "Get a ready-to-post, trade-specific caption with hashtags written for you.",
  },
  {
    icon: Stamp,
    title: "Auto logo branding",
    desc: "Your logo is overlaid on every photo so every post markets your business.",
  },
  {
    icon: Share2,
    title: "Post to Facebook",
    desc: "Publish the branded photo to your connected Facebook page in one click.",
  },
  {
    icon: Clock,
    title: "Save hours every week",
    desc: "No more wrestling with captions or design tools between jobs.",
  },
  {
    icon: ShieldCheck,
    title: "Built for tradies",
    desc: "Designed for builders, plumbers, sparkies, landscapers and contractors.",
  },
];

const STEPS = [
  { n: "1", title: "Upload your photo", desc: "Add a photo from the job you just finished." },
  { n: "2", title: "We write & brand it", desc: "AI writes the caption; your logo is added automatically." },
  { n: "3", title: "Post in one click", desc: "Publish to your Facebook page or save it for later." },
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
    a: "Starter ($19/mo) suits solo operators posting a few times a week. Pro ($29/mo) is for unlimited posting and multiple pages.",
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const primaryCta = isAuthenticated ? "/dashboard" : getLoginUrl();

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
        <div className="container grid gap-12 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Marketing on
              autopilot for trade businesses
            </span>
            <h1 className="font-display mt-5 text-4xl font-extrabold leading-[1.05] sm:text-5xl md:text-6xl">
              Turn job-site photos into{" "}
              <span className="text-primary">branded Facebook posts</span> in
              seconds
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              SnapPost Pro writes the caption, stamps your logo, and posts to
              your Facebook page — so you market your business without lifting a
              finger.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="lg" className="gap-2">
                    Go to dashboard <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <a href={primaryCta}>
                  <Button size="lg" className="gap-2">
                    Start free <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
              )}
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="bg-background">
                  View pricing
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card to start · Cancel anytime
            </p>
          </div>

          {/* Visual mock */}
          <div className="relative">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Camera className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold">New post preview</span>
              </div>
              <div className="mt-4 aspect-[4/3] w-full rounded-xl bg-gradient-to-br from-muted to-muted/40 ring-1 ring-border">
                <div className="flex h-full items-end justify-end p-3">
                  <span className="rounded-md bg-background/80 px-2 py-1 text-xs font-bold text-primary ring-1 ring-border">
                    YOUR LOGO
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm">
                Fresh deck rebuild finished today — built to last through every
                season. Proud of this one.{" "}
                <span className="text-primary">
                  #Decking #Builder #QualityWork
                </span>
              </p>
              <Button className="mt-4 w-full gap-2" size="sm">
                <Share2 className="h-4 w-4" /> Post to Facebook
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 bg-muted/20 py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Everything you need to post like a pro
            </h2>
            <p className="mt-3 text-muted-foreground">
              Built so you spend time on the tools, not on social media.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Three steps, zero hassle
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map(s => (
              <div key={s.n} className="text-center">
                <span className="font-display mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {s.n}
                </span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border/60 bg-muted/20 py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Simple, honest pricing
            </h2>
            <p className="mt-3 text-muted-foreground">
              Pick a plan and start posting today. Cancel anytime.
            </p>
          </div>
          <div className="mt-12">
            <PricingCards />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
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

      {/* CTA */}
      <section className="border-t border-border/60 py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl bg-primary px-8 py-12 text-center text-primary-foreground">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Ready to market your work effortlessly?
            </h2>
            <p className="mx-auto mt-3 max-w-xl opacity-90">
              Join tradies who keep their Facebook page active without the
              hassle. Upload your first photo today.
            </p>
            <div className="mt-8 flex justify-center">
              <a href={primaryCta}>
                <Button size="lg" variant="secondary" className="gap-2">
                  Get started <ArrowRight className="h-4 w-4" />
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
