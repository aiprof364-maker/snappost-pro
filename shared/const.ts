export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

export const PRODUCT_NAME = "SnapPost Pro";
export const PRODUCT_DOMAIN = "snappostpro.com";

export type PlanId = "starter" | "pro";

export const PLANS: Record<
  PlanId,
  { id: PlanId; name: string; price: number; priceLabel: string; postsPerMonth: string; features: string[] }
> = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 19,
    priceLabel: "$19/mo",
    postsPerMonth: "30 posts / month",
    features: [
      "30 branded posts per month",
      "AI captions",
      "Logo branding overlay",
      "1 connected Facebook page",
      "Post history",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 29,
    priceLabel: "$29/mo",
    postsPerMonth: "300 posts / month",
    features: [
      "300 branded posts per month",
      "AI captions with tone control",
      "Logo branding overlay",
      "Up to 5 connected Facebook pages",
      "Priority processing",
      "Post history & analytics",
    ],
  },
};

/** Monthly post creation limits per plan. null = unlimited. */
export const PLAN_POST_LIMITS: Record<"free" | PlanId, number | null> = {
  free: 3,
  starter: 30,
  pro: 300,
};
