import { capturePromotionCode } from "@/lib/promotionCode";
import { trpc } from "@/lib/trpc";
import type { PlanId } from "@shared/const";
import { useEffect } from "react";
import { toast } from "sonner";

export function usePlanCheckout() {
  const checkout = trpc.billing.createCheckout.useMutation({
    onSuccess: data => {
      if (data.url) window.location.href = data.url;
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    capturePromotionCode();
  }, []);

  const startCheckout = (plan: PlanId) => {
    const promotionCode = capturePromotionCode();
    checkout.mutate({
      plan,
      origin: window.location.origin,
      ...(promotionCode ? { promotionCode } : {}),
    });
  };

  return {
    startCheckout,
    isPending: checkout.isPending,
    pendingPlan: checkout.isPending ? checkout.variables?.plan : undefined,
  };
}
