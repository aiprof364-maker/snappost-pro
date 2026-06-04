export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Facebook / Meta Graph API credentials (set via Secrets once available).
  facebookAppId: process.env.FACEBOOK_APP_ID ?? "",
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET ?? "",
  // Make.com webhook URL for the Contact Us form.
  makeWebhookUrl: process.env.MAKE_WEBHOOK_URL ?? "",
  // Stripe price IDs for the two subscription plans (set via Secrets).
  stripeStarterPriceId: process.env.STRIPE_STARTER_PRICE_ID ?? "",
  stripeProPriceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
};
