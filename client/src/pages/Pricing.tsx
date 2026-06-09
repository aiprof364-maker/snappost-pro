import PricingCards from "@/components/PricingCards";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Can I switch plans later?",
    a: "Yes. Upgrade or downgrade anytime from your dashboard billing portal; changes are prorated by Stripe.",
  },
  {
    q: "Is there a contract?",
    a: "No. Both plans are month-to-month and you can cancel anytime.",
  },
  {
    q: "What payment methods are accepted?",
    a: "All major credit and debit cards via Stripe's secure checkout.",
  },
];

export default function Pricing() {
  const buildTime = new Date().toISOString();
  return (
    <div className="flex min-h-screen flex-col">
      <div className="fixed bottom-4 right-4 text-xs text-muted-foreground bg-muted p-2 rounded">
        Build: {buildTime}
      </div>
      <SiteHeader />
      <main className="flex-1">
        <section className="py-16 md:py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="font-display text-4xl font-extrabold sm:text-5xl">
                Pricing that pays for itself
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                One won job covers a year of SnapPost Pro. Choose your plan
                below.
              </p>
            </div>
            <div className="mt-12">
              <PricingCards />
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 bg-muted/20 py-16">
          <div className="container max-w-3xl">
            <h2 className="font-display text-center text-2xl font-bold">
              Billing questions
            </h2>
            <Accordion type="single" collapsible className="mt-8">
              {FAQS.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
