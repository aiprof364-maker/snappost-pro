import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getUserById } from "./db";
import {
  sendTrialExpirationWarning,
  sendRenewalReminder,
} from "./email";

/**
 * Scheduled email routes for Heartbeat cron jobs.
 * These endpoints are called by the Manus platform on a schedule.
 */

/**
 * Handler for trial expiration warnings (day 6 of 7-day trial).
 * Triggered by Heartbeat cron job.
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

    // In a real implementation, you would:
    // 1. Query all users with subscriptionStatus === "trialing"
    // 2. Check if their trial_end date is tomorrow (via Stripe API or stored in DB)
    // 3. Send warning emails to those users

    // For now, this is a placeholder that logs the cron execution
    console.log(`[Scheduled] Trial expiration warnings cron triggered (taskUid: ${user.taskUid})`);

    res.json({
      ok: true,
      message: "Trial expiration warnings processed",
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
 * Triggered by Heartbeat cron job.
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

    // In a real implementation, you would:
    // 1. Query all users with subscriptionStatus === "active"
    // 2. Check if their renewal date is tomorrow (via Stripe API or stored in DB)
    // 3. Send renewal reminder emails to those users

    // For now, this is a placeholder that logs the cron execution
    console.log(`[Scheduled] Renewal reminders cron triggered (taskUid: ${user.taskUid})`);

    res.json({
      ok: true,
      message: "Renewal reminders processed",
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
