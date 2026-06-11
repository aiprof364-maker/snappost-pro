import { COOKIE_NAME } from "@shared/const";
import type { Express, Request, Response } from "express";
import express from "express";
import { parse as parseCookieHeader } from "cookie";
import { sdk } from "./_core/sdk";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  listPages,
} from "./facebook";
import {
  getUserByOpenId,
  updateUserSubscription,
  upsertIntegration,
} from "./db";
import { getStripe, planFromPriceId } from "./stripe";
import {
  sendPurchaseConfirmation,
  sendTrialExpirationWarning,
  sendRenewalReminder,
} from "./email";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

async function resolveUserId(req: Request): Promise<number | null> {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const session = await sdk.verifySession(cookies[COOKIE_NAME]);
  if (!session) return null;
  const user = await getUserByOpenId(session.openId);
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

      // Auto-select the first page if exactly one is available.
      let pageId: string | undefined;
      let pageName: string | undefined;
      let pageAccessToken: string | undefined;
      try {
        const pages = await listPages(longToken);
        if (pages.length === 1) {
          pageId = pages[0].id;
          pageName = pages[0].name;
          pageAccessToken = pages[0].access_token;
        }
      } catch {
        /* ignore page listing errors; user can select later */
      }

      await upsertIntegration({
        userId,
        provider: "facebook",
        accessToken: longToken,
        pageId,
        pageName,
        pageAccessToken,
        status: "connected",
      });

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
            const plan = session.metadata?.plan as "starter" | "pro" | undefined;
            if (userId) {
              const { getDb } = await import("./db");
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
                  // Send purchase confirmation email
                  await sendPurchaseConfirmation(
                    user.email,
                    user.name || "Contractor",
                    plan ?? "starter",
                    plan === "pro" ? 29 : 19
                  ).catch(e => console.error("[Email] Purchase confirmation failed", e));
                }
              }
              await updateUserSubscription(userId, {
                stripeCustomerId: session.customer ?? undefined,
                stripeSubscriptionId: session.subscription ?? undefined,
                plan: plan ?? "starter",
                subscriptionStatus: "active",
              });
            }
            break;
          }
          case "customer.subscription.updated":
          case "customer.subscription.created": {
            const sub = event.data.object as any;
            const priceId = sub.items?.data?.[0]?.price?.id;
            const plan = planFromPriceId(priceId);
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
                  plan: plan ?? rows[0].plan === "free" ? "starter" : rows[0].plan,
                  subscriptionStatus: sub.status ?? "active",
                  stripeSubscriptionId: sub.id,
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
