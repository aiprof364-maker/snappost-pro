import { COOKIE_NAME } from "@shared/const";
import type { Express, Request, Response } from "express";
import express from "express";
import { parse as parseCookieHeader } from "cookie";
import {
  exchangeCodeForToken,
  getLongLivedToken,
} from "./facebook";
import {
  getUserByOpenId,
  recordTrialClaim,
  updateUserSubscription,
  upsertIntegration,
  updateOnboardingStep,
} from "./db";
import { entitlementFromSubscription, getStripe } from "./stripe";
import { getSessionUser } from "./auth";
import { queueAccountEmail } from "./accountEmailAutomation";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

async function resolveUserId(req: Request): Promise<number | null> {
  const user = await getSessionUser(req);
  return user?.id ?? null;
}

export function registerIntegrationRoutes(app: Express) {
  /* --------- Facebook OAuth callback --------- */
  app.get("/api/facebook/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const error = getQueryParam(req, "error");

    // state = "<userId>:<origin>"
    const origin = state?.split(":").slice(1).join(":") || "";
    const dashboard = `${origin || ""}/dashboard`;

    if (error) {
      res.redirect(302, `${dashboard}?facebook=denied`);
      return;
    }
    if (!code || !state) {
      res.redirect(302, `${dashboard}?facebook=error`);
      return;
    }

    try {
      const userId = await resolveUserId(req);
      if (!userId) {
        res.redirect(302, `${dashboard}?facebook=session`);
        return;
      }

      const redirectUri = `${origin}/api/facebook/callback`;
      const shortToken = await exchangeCodeForToken(code, redirectUri);
      const longToken = await getLongLivedToken(shortToken).catch(() => shortToken);

      await upsertIntegration({
        userId,
        provider: "facebook",
        accessToken: longToken,
        pageId: null,
        pageName: null,
        pageAccessToken: null,
        status: "connected",
      });
      await updateOnboardingStep(userId, "facebookConnected", true);

      res.redirect(302, `${dashboard}?facebook=connected`);
    } catch (e) {
      console.error("[Facebook] Callback failed", e);
      res.redirect(302, `${dashboard}?facebook=error`);
    }
  });

  /* --------- Stripe webhook --------- */
  // Raw body is required for signature verification.
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const stripe = getStripe();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!stripe || !webhookSecret) {
        res.status(503).json({ error: "Stripe not configured" });
        return;
      }

      const sig = req.headers["stripe-signature"] as string | undefined;
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body as Buffer,
          sig ?? "",
          webhookSecret,
        );
      } catch (err: any) {
        console.error("[Stripe] Signature verification failed", err?.message);
        res.status(400).send(`Webhook Error: ${err?.message}`);
        return;
      }

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as any;
            const userId = Number(
              session.metadata?.userId ?? session.client_reference_id,
            );
            const requestedPlan = session.metadata?.plan as "starter" | "pro" | undefined;
            const stripeSubscription = typeof session.subscription === "string"
              ? await stripe.subscriptions.retrieve(session.subscription)
              : null;
            const entitlement = stripeSubscription
              ? entitlementFromSubscription(stripeSubscription)
              : null;
            const plan = entitlement?.plan === "starter" || entitlement?.plan === "pro"
              ? entitlement.plan
              : requestedPlan;
            if (userId) {
              const { getDb, logConversionEvent } = await import("./db");
              const db = await getDb();
              if (db) {
                const { users } = await import("../drizzle/schema");
                const { eq } = await import("drizzle-orm");
                const rows = await db
                  .select()
                  .from(users)
                  .where(eq(users.id, userId))
                  .limit(1);
                const user = rows[0];
                if (user && user.email) {
                  if (
                    session.metadata?.trialEligible === "true" &&
                    session.metadata?.facebookPageId
                  ) {
                    await recordTrialClaim({
                      userId,
                      email: user.email,
                      facebookPageId: session.metadata.facebookPageId,
                      stripeCustomerId: session.customer ?? undefined,
                      stripeSubscriptionId: session.subscription ?? undefined,
                    });
                  }
                }
              }
              // Log conversion event for funnel tracking
              await logConversionEvent(userId, `upgrade_${plan || "starter"}`, {
                plan: plan || "starter",
                amount: plan === "pro" ? 29 : 19,
                stripeSessionId: session.id,
              }).catch(e => console.error("[Conversion] Failed to log upgrade event", e));
              await updateUserSubscription(userId, {
                stripeCustomerId: session.customer ?? undefined,
                stripeSubscriptionId: session.subscription ?? undefined,
                ...(entitlement ?? {}),
              });
              const billableStatus = stripeSubscription?.status;
              if (
                stripeSubscription &&
                (billableStatus === "trialing" || billableStatus === "active") &&
                (plan === "starter" || plan === "pro")
              ) {
                const trialEnd = stripeSubscription.trial_end
                  ? new Date(stripeSubscription.trial_end * 1000)
                  : null;
                const periodEndSeconds = Number((stripeSubscription as any).current_period_end);
                const renewalAt = Number.isFinite(periodEndSeconds)
                  ? new Date(periodEndSeconds * 1000)
                  : null;
                await queueAccountEmail({
                  userId,
                  entityKey: `checkout:${session.id}`,
                  campaignKey: "purchase:v1",
                  kind: "purchase",
                  metadata: {
                    subscriptionStatus: billableStatus,
                    trialEndsAt: trialEnd?.toISOString(),
                    renewalAt: renewalAt?.toISOString(),
                  },
                });
              } else {
                console.error("[Stripe] Purchase email held: subscription plan could not be mapped", { eventId: event.id });
              }
            }
            break;
          }
          case "customer.subscription.updated":
          case "customer.subscription.created": {
            const sub = event.data.object as any;
            const entitlement = entitlementFromSubscription(sub);
            const customerId = sub.customer as string;
            // Find user by stripeCustomerId
            const { getDb } = await import("./db");
            const db = await getDb();
            if (db && customerId) {
              const { users } = await import("../drizzle/schema");
              const { eq } = await import("drizzle-orm");
              const rows = await db
                .select()
                .from(users)
                .where(eq(users.stripeCustomerId, customerId))
                .limit(1);
              if (rows[0]) {
                await updateUserSubscription(rows[0].id, {
                  ...entitlement,
                });
              }
            }
            break;
          }
          case "customer.subscription.deleted": {
            const sub = event.data.object as any;
            const customerId = sub.customer as string;
            const { getDb } = await import("./db");
            const db = await getDb();
            if (db && customerId) {
              const { users } = await import("../drizzle/schema");
              const { eq } = await import("drizzle-orm");
              const rows = await db
                .select()
                .from(users)
                .where(eq(users.stripeCustomerId, customerId))
                .limit(1);
              if (rows[0]) {
                await updateUserSubscription(rows[0].id, {
                  plan: "free",
                  subscriptionStatus: "canceled",
                });
              }
            }
            break;
          }
          default:
            break;
        }
        res.json({ received: true });
      } catch (e) {
        console.error("[Stripe] Webhook handler error", e);
        res.status(500).json({ error: "Webhook handler failed" });
      }
    },
  );
}
