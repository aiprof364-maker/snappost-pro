import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { PLANS, type PlanId } from "@shared/const";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PricingCards() {
  const { isAuthenticated } = useAuth();
  const checkout = trpc.billing.createCheckout.useMutation({
    onSuccess: data => {
      if (data.url) window.location.href = data.url;
    },
    onError: err => toast.error(err.message),
  });

  const handleSelect = (plan: PlanId) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    checkout.mutate({ plan, origin: window.location.origin });
  };

  const order: PlanId[] = ["starter", "pro"];

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
      {order.map(id => {
        const plan = PLANS[id];
        const featured = id === "pro";
        return (
          <div
            key={id}
            className={`relative flex flex-col rounded-2xl border p-8 ${
              featured
                ? "border-primary bg-card shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                : "border-border bg-card"
            }`}
          >
            {featured && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Most popular
              </span>
            )}
            <h3 className="font-display text-xl font-bold">{plan.name}</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-4xl font-extrabold">
                ${plan.price}
              </span>
              <span className="text-muted-foreground">/mo</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {plan.postsPerMonth}
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              className="mt-8 w-full"
              variant={featured ? "default" : "outline"}
              onClick={() => handleSelect(id)}
              disabled={checkout.isPending}
            >
              {checkout.isPending && checkout.variables?.plan === id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Choose ${plan.name}`
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
