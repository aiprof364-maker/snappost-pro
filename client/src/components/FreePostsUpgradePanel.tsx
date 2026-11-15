import { usePlanCheckout } from "@/hooks/usePlanCheckout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { PLANS, type PlanId } from "@shared/const";
import { upgradeOfferLine } from "@shared/upgradeOffer";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

type LatestPost = {
  brandedImageUrl?: string | null;
  originalImageUrl?: string | null;
};

type Props = {
  trialEligible: boolean;
  latestPost?: LatestPost | null;
};

const PLAN_ORDER: PlanId[] = ["starter", "pro"];

export default function FreePostsUpgradePanel({
  trialEligible,
  latestPost,
}: Props) {
  const { startCheckout, isPending, pendingPlan } = usePlanCheckout();
  const trackPaywall = trpc.billing.trackPaywallShown.useMutation();
  const trackRef = useRef(trackPaywall);
  trackRef.current = trackPaywall;
  const imageUrl = latestPost?.brandedImageUrl || latestPost?.originalImageUrl;

  useEffect(() => {
    const key = "snappost-paywall-shown";
    if (window.sessionStorage.getItem(key) === "1") return;
    window.sessionStorage.setItem(key, "1");
    trackRef.current.mutate();
  }, []);

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-sm">
      <div className={imageUrl ? "grid md:grid-cols-[minmax(0,280px)_1fr]" : ""}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Your latest branded post"
            className="h-56 w-full object-cover md:h-full md:max-h-none"
          />
        )}
        <div className="p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Free posts used
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold">
            You've used your 3 free posts
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {upgradeOfferLine(trialEligible)} Your posts stay in this account.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {PLAN_ORDER.map(id => {
              const plan = PLANS[id];
              const featured = id === "pro";
              return (
                <div
                  key={id}
                  className={`flex flex-col rounded-xl border p-4 ${
                    featured
                      ? "border-primary bg-card shadow-sm ring-1 ring-primary/20"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                    <span className="text-sm font-semibold">{plan.priceLabel}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.postsPerMonth}
                  </p>
                  <ul className="mt-3 flex-1 space-y-1.5">
                    {plan.features.slice(0, 3).map(feature => (
                      <li key={feature} className="flex items-start gap-2 text-xs">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-4 w-full"
                    variant={featured ? "default" : "outline"}
                    onClick={() => startCheckout(id)}
                    disabled={isPending}
                  >
                    {isPending && pendingPlan === id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      `Choose ${plan.name}`
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
