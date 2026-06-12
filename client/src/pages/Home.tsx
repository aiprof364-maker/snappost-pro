import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import PricingCards from "@/components/PricingCards";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    title: "Built for contractors",
    desc: "Designed for builders, plumbers, sparkies, landscapers and contractors.",
  },
];

const STEPS = [
  { n: "1", title: "Take the photo", desc: "Snap a photo of the job you just finished — on site, from your phone." },
  { n: "2", title: "AI writes the caption", desc: "A trade-specific caption with hashtags is generated for you instantly." },
  { n: "3", title: "Logo is branded on", desc: "Your business logo is stamped onto the image automatically." },
  { n: "4", title: "Post to Facebook", desc: "Publish to your connected Facebook page in one click — or save for later." },
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
    a: "Starter ($19/mo) suits solo operators posting a few times a week. Pro ($29/mo) gives 300 posts/month (about 10 a day) and multiple pages.",
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const primaryCta = isAuthenticated ? "/dashboard" : getLoginUrl();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const subscribe = trpc.contact.subscribe.useMutation({
    onSuccess: () => {
      toast.success("You're in! Weekly tips are on the way.");
      setNewsletterEmail("");
    },
    onError: () => toast.error("Couldn't subscribe right now. Please try again."),
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
        <div className="container grid gap-12 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Marketing on
              autopilot for trade businesses
            </span>
            <h1 className="font-display mt-5 text-4xl font-extrabold leading-[1.05] sm:text-5xl md:text-6xl">
              Stop writing captions.{" "}
              <span className="text-primary">Start getting leads.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              As a solo contractor, every minute counts. SnapPost Pro turns your
              job-site photos into professional, branded Facebook posts in
              seconds — no writing, no design skills needed. Just take a photo
              and post.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent)]/12 px-3 py-1 text-sm font-semibold text-[var(--brand-accent)]">
              <Clock className="h-4 w-4" /> Save 5+ hours every week
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
              7-day free trial · No credit card required · Cancel anytime
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
              <div className="mt-4 aspect-[4/3] w-full overflow-hidden rounded-xl ring-1 ring-border">
                <img
                  src="/manus-storage/deck-photo_77f6ce90.jpg"
                  alt="Professional deck project with contractor branding logo"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
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
              How it works
            </h2>
          </div>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Four simple steps from photo to Facebook.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Before / After */}
      <section className="border-t border-border/60 bg-muted/20 py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              From plain photo to lead-winning post
            </h2>
            <p className="mt-3 text-muted-foreground">
              Same photo, two very different results. SnapPost Pro does the
              caption and branding for you.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-4xl">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <img
                src="/manus-storage/snappost-before-after_096e50ab.webp"
                alt="Before and after: a raw job-site photo on the left transformed into a clean, branded social post with a caption on the right"
                className="w-full"
                loading="lazy"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center text-sm">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                  Before
                </span>
                Raw phone photo, no branding
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  After
                </span>
                Branded post with AI caption
              </div>
            </div>
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

      {/* Cost transparency */}
      <section className="border-t border-border/60 bg-muted/20 py-20">
        <div className="container max-w-3xl">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              What we pay so you don't have to
            </h2>
            <p className="mt-3 text-muted-foreground">
              Every post runs on AI and automation. Here's roughly what that
              costs us per active user each month — so you can see the value.
            </p>
          </div>
          <div className="mt-10 overflow-hidden rounded-xl border border-border bg-card">
            {[
              ["AI caption writing", "~$0.24 / mo"],
              ["Image processing & branding", "~$0.10 / mo"],
              ["Automation & hosting", "~$0.02 / mo"],
            ].map(([label, cost]) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-border px-5 py-4 text-sm last:border-b-0"
              >
                <span>{label}</span>
                <span className="font-medium text-muted-foreground">{cost}</span>
              </div>
            ))}
            <div className="flex items-center justify-between bg-muted/40 px-5 py-4 text-sm font-semibold">
              <span>Our typical cost</span>
              <span>~$0.36 / mo</span>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            From $19/month, SnapPost Pro costs less than an hour of labour. The
            time you save pays for itself on day one.
          </p>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20">
        <div className="container max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Get weekly tips for contractors
          </h2>
          <p className="mt-3 text-muted-foreground">
            Practical tips to grow your business and save time on social media.
            No spam — unsubscribe anytime.
          </p>
          <form
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            onSubmit={e => {
              e.preventDefault();
              if (newsletterEmail.trim()) subscribe.mutate({ email: newsletterEmail.trim() });
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
      <section className="border-t border-border/60 py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl bg-primary px-8 py-12 text-center text-primary-foreground">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Ready to market your work effortlessly?
            </h2>
            <p className="mx-auto mt-3 max-w-xl opacity-90">
              Join contractors who keep their Facebook page active without the
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
