import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  sendTrialExpirationWarning,
  sendRenewalReminder,
} from "./email";
import { getStripe } from "./stripe";

/**
 * Scheduled email routes for Heartbeat cron jobs.
 * These endpoints are called by the Manus platform on a schedule.
 */

/**
 * Handler for trial expiration warnings (day 6 of 7-day trial).
 * Finds all users with "trialing" subscriptions and sends them a warning email.
 */
async function handleTrialExpirationWarnings(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Authenticate as a cron task
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      res.status(403).json({ error: "cron-only" });
      return;
    }

    const stripe = getStripe();
    if (!stripe) {
      res.status(500).json({ error: "Stripe not configured" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Database not available" });
      return;
    }

    // Get all users with trialing subscriptions
    const trialingUsers = await db
      .select()
      .from(users)
      .where(eq(users.subscriptionStatus, "trialing"));

    let sent = 0;
    let failed = 0;
    const now = new Date();

    for (const dbUser of trialingUsers) {
      try {
        if (!dbUser.stripeSubscriptionId || !dbUser.email) continue;

        // Fetch subscription from Stripe to get trial_end date
        const subscription = await stripe.subscriptions.retrieve(
          dbUser.stripeSubscriptionId
        );

        if (!subscription.trial_end) continue;

        const trialEndDate = new Date(subscription.trial_end * 1000);
        const daysDiff = Math.floor(
          (trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        // Send warning on day 6 (1 day before trial ends)
        if (daysDiff === 1) {
          await sendTrialExpirationWarning(
            dbUser.email,
            dbUser.name || "Contractor",
            trialEndDate
          );
          sent++;
        }
      } catch (err) {
        console.error(`Failed to process trial warning for user ${dbUser.id}:`, err);
        failed++;
      }
    }

    res.json({
      ok: true,
      sent,
      failed,
      total: trialingUsers.length,
      taskUid: user.taskUid,
    });
  } catch (err) {
    console.error("[Scheduled] Trial expiration warning handler error:", err);
    res.status(500).json({
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
      context: { url: req.url, timestamp: new Date().toISOString() },
    });
  }
}

/**
 * Handler for subscription renewal reminders (day before renewal).
 * Finds all users with active subscriptions renewing tomorrow and sends them a reminder.
 */
async function handleRenewalReminders(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Authenticate as a cron task
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      res.status(403).json({ error: "cron-only" });
      return;
    }

    const stripe = getStripe();
    if (!stripe) {
      res.status(500).json({ error: "Stripe not configured" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Database not available" });
      return;
    }

    // Get all users with active subscriptions
    const activeUsers = await db
      .select()
      .from(users)
      .where(eq(users.subscriptionStatus, "active"));

    let sent = 0;
    let failed = 0;
    const now = new Date();

    for (const dbUser of activeUsers) {
      try {
        if (!dbUser.stripeSubscriptionId || !dbUser.email || !dbUser.plan) continue;

        // Fetch subscription from Stripe to get current_period_end date
        const subscription = await stripe.subscriptions.retrieve(
          dbUser.stripeSubscriptionId
        );

        const periodEnd = (subscription as any).current_period_end;
        if (typeof periodEnd !== "number") continue;

        const renewalDate = new Date(periodEnd * 1000);
        const daysDiff = Math.floor(
          (renewalDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        // Send reminder 1 day before renewal
        if (daysDiff === 1) {
          await sendRenewalReminder(
            dbUser.email,
            dbUser.name || "Contractor",
            dbUser.plan as "starter" | "pro",
            renewalDate
          );
          sent++;
        }
      } catch (err) {
        console.error(`Failed to process renewal reminder for user ${dbUser.id}:`, err);
        failed++;
      }
    }

    res.json({
      ok: true,
      sent,
      failed,
      total: activeUsers.length,
      taskUid: user.taskUid,
    });
  } catch (err) {
    console.error("[Scheduled] Renewal reminder handler error:", err);
    res.status(500).json({
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
      context: { url: req.url, timestamp: new Date().toISOString() },
    });
  }
}

/**
 * Register scheduled email routes with Express.
 * These must be mounted BEFORE the Vite/static fallthrough.
 */
export function registerScheduledRoutes(app: Express) {
  app.post("/api/scheduled/trial-expiration-warnings", handleTrialExpirationWarnings);
  app.post("/api/scheduled/renewal-reminders", handleRenewalReminders);
}
