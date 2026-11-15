import { promotionCodeFromEventMetadata } from "./promotionCodes";

const UPGRADED_STATUSES = new Set(["trialing", "active", "past_due"]);

export type FunnelUser = {
  id: number;
  role: string;
  plan: string;
  subscriptionStatus: string | null;
};

export type FunnelEvent = {
  userId: number | null;
  eventType: string;
  metadata: string | null;
};

export type PromoCodeRedemption = {
  code: string;
  count: number;
};

export function summarizeFreeToPaidFunnel(users: FunnelUser[], events: FunnelEvent[]) {
  const customers = users.filter(user => user.role !== "admin");
  const customerIds = new Set(customers.map(user => user.id));
  const customerById = new Map(customers.map(user => [user.id, user]));
  const exhausted = new Set<number>();
  const paywallShown = new Set<number>();
  const redemptions = new Map<string, number>();

  for (const event of events) {
    if (event.userId === null || !customerIds.has(event.userId)) continue;
    if (event.eventType === "free_posts_exhausted") exhausted.add(event.userId);
    if (event.eventType === "paywall_shown") paywallShown.add(event.userId);
    if (event.eventType.startsWith("upgrade_")) {
      const code = promotionCodeFromEventMetadata(event.metadata);
      if (!code) continue;
      redemptions.set(code, (redemptions.get(code) ?? 0) + 1);
    }
  }

  let exhaustedNotUpgraded = 0;
  for (const userId of Array.from(exhausted)) {
    const user = customerById.get(userId);
    if (!user) continue;
    const upgraded =
      user.plan !== "free" && UPGRADED_STATUSES.has(user.subscriptionStatus ?? "");
    if (!upgraded) exhaustedNotUpgraded += 1;
  }

  const promoCodeRedemptionsByCode: PromoCodeRedemption[] = Array.from(redemptions.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

  return {
    freePostsExhausted: exhausted.size,
    exhaustedNotUpgraded,
    paywallShown: paywallShown.size,
    promoCodeRedemptions: promoCodeRedemptionsByCode.reduce((sum, row) => sum + row.count, 0),
    promoCodeRedemptionsByCode,
  };
}
