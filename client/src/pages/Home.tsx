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
import { LANDING_MOCKUP } from "@/lib/landingMockup";
import { TRIAL_SUMMARY } from "@/lib/trialCopy";
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
    desc: "Upload a photo of your completed work, product, space or result from your phone or desktop.",
  },
  {
    icon: Sparkles,
    title: "AI captions",
    desc: "Get a ready-to-post caption with hashtags written for you.",
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
    desc: "Spend less time writing captions and preparing images for social media.",
  },
  {
    icon: ShieldCheck,
    title: "Built for local businesses",
    desc: "Made for businesses with real work, products, spaces or results worth showing.",
  },
];

const STEPS = [
  { n: "1", title: "Take the photo", desc: "Take a photo of completed work, a product, a space or a result you want to share." },
  { n: "2", title: "AI writes the caption", desc: "A caption with hashtags is generated for you to review." },
  { n: "3", title: "Logo is branded on", desc: "Your business logo is stamped onto the image automatically." },
  { n: "4", title: "Post to Facebook", desc: "Publish to your connected Facebook page in one click — or save for later." },
];

const LOCAL_BUSINESS_CATEGORIES = [
  {
    title: "Trades & Home Services",
    examples: "Builders, painters, landscapers, gardeners, cleaners, window cleaners and car detailers.",
  },
  {
    title: "Food & Hospitality",
    examples: "Cafés, coffee shops, restaurants, bistros, food trucks, bakeries, cake designers and specialty food stores.",
  },
  {
    title: "Beauty, Wellness & Fitness",
    examples: "Hair salons, stylists, barbers, nails, lashes, skincare, tattoo, massage, personal training, yoga, Pilates and dance.",
  },
  {
    title: "Retail & Creative Businesses",
    examples: "Boutiques, clothing and vintage stores, florists, artisan makers, craft businesses, photographers, interior designers and home stagers.",
  },
  {
    title: "Property, Events & Local Services",
    examples: "Real estate, property management, Airbnb hosting, home organising, event planning, wedding coordination and driving instruction.",
  },
  {
    title: "Pet, Care & Professional Services",
    examples: "Dog grooming, pet businesses, boarding, daycares, training, local clinics and independent care providers.",
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
]

export default function Home() {
  const { isAuthenticated } = useAuth();
  const primaryCta = isAuthenticated ? "/dashboard" : getLoginUrl("/pricing");
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
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Photo-to-post
              for local businesses
            </span>
            <h1 className="font-display mt-5 text-4xl font-extrabold leading-[1.05] sm:text-5xl md:text-6xl">
              Turn photos of your work into{" "}
              <span className="text-primary">branded Facebook posts.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              SnapPost Pro turns a photo of your completed work, product, space
              or result into a logo-branded image and an AI-written caption. You
              review it, then post it to your Facebook Page.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent)]/12 px-3 py-1 text-sm font-semibold text-[var(--brand-accent)]">
              <Stamp className="h-4 w-4" /> Your photo, with your logo
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="lg" className="gap-2 w-full sm:w-auto px-8 py-6 text-base font-semibold">
                    Go to dashboard <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <a href={primaryCta}>
                  <Button size="lg" className="gap-2 w-full sm:w-auto px-8 py-6 text-base font-semibold">
                    Start free <ArrowRight className="h-5 w-5" />
                  </Button>
                </a>
              )}
              <Link href="/pricing">
                <Button size="lg" className="w-full sm:w-auto px-8 py-6 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
                  View pricing
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {TRIAL_SUMMARY}
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
                  src={LANDING_MOCKUP.brandedPhotoUrl}
                 alt="Completed A-frame deck with Aiprof Studios logo branding"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <p className="mt-4 text-sm">
                {LANDING_MOCKUP.heroCaption}{" "}
                <span className="text-primary">
                  #DeckBuild #OutdoorLiving #QualityWork
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

      {/* Local businesses */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Built for local businesses
            </h2>
            <p className="mt-3 text-muted-foreground">
              If your business has real work, products, spaces or results worth
              showing, SnapPost Pro can help turn a photo into a branded Facebook post.
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
            Only upload photos you own or have permission to publish. Do not upload
            customer, patient or client-identifying information without appropriate consent.
          </p>
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
              Your photo. Your brand. Ready to post.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Your completed work stays exactly the same. SnapPost Pro adds your
              logo and writes a caption for you to review before posting.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-4xl">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <div className="grid grid-cols-2">
                <img
                  src={LANDING_MOCKUP.originalPhotoUrl}
                  alt="Original completed A-frame deck photo before branding"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <img
                  src={LANDING_MOCKUP.brandedPhotoUrl}
                  alt="The same A-frame deck photo with Aiprof Studios logo branding"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center text-sm">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                  Before
                </span>
                Completed job photo, no branding
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  After
                </span>
                Same photo, with your logo
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
              What's your time worth?
           </h2>
          </div>
         <div className="mx-auto mt-8 max-w-2xl space-y-6 text-center">
           <p className="text-lg text-muted-foreground">
             Preparing a Facebook post means choosing a photo, writing a caption
             and finding the right words to say.
           </p>
           <p className="text-2xl font-bold text-primary">
              SnapPost Pro gives you a logo-branded image and AI-written caption
              to review before you publish.
           </p>
           <p className="text-lg text-muted-foreground">
              Keep your Facebook Page active while spending less time preparing posts.
           </p>
         </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20">
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
              Keep your Facebook Page active without the hassle. Upload your first
              photo today.
            </p>
            <div className="mt-8 flex justify-center">
              <a href={primaryCta}>
                <Button size="lg" variant="secondary" className="gap-2 px-8 py-6 text-base font-semibold">
                  Get started <ArrowRight className="h-5 w-5" />
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
