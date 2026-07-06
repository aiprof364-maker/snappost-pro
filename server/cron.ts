import cron from "node-cron";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  sendTrialExpirationWarning,
  sendRenewalReminder,
  sendOnboardingDay1,
  sendOnboardingDay3,
  sendOnboardingDay5,
} from "./email";
import { getStripe } from "./stripe";

/**
 * Initialize cron jobs to run on Railway (not Manus Heartbeat).
 * These jobs run daily at 9am UTC and send scheduled emails.
 */

async function runTrialExpirationWarnings() {
  try {
    const stripe = getStripe();
    if (!stripe) {
      console.error("[Cron] Stripe not configured");
      return;
    }

    const db = await getDb();
    if (!db) {
      console.error("[Cron] Database not available");
      return;
    }

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

        const subscription = await stripe.subscriptions.retrieve(
          dbUser.stripeSubscriptionId
        );

        if (!subscription.trial_end) continue;

        const trialEndDate = new Date(subscription.trial_end * 1000);
        const daysDiff = Math.floor(
          (trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (daysDiff === 1) {
          await sendTrialExpirationWarning(
            dbUser.email,
            dbUser.name || "Contractor",
            trialEndDate
          );
          sent++;
        }
      } catch (err) {
        console.error(`[Cron] Failed to process trial warning for user ${dbUser.id}:`, err);
        failed++;
      }
    }

    console.log(`[Cron] Trial expiration warnings: sent=${sent}, failed=${failed}, total=${trialingUsers.length}`);
  } catch (err) {
    console.error("[Cron] Trial expiration warning error:", err);
  }
}

async function runRenewalReminders() {
  try {
    const stripe = getStripe();
    if (!stripe) {
      console.error("[Cron] Stripe not configured");
      return;
    }

    const db = await getDb();
    if (!db) {
      console.error("[Cron] Database not available");
      return;
    }

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

        const subscription = await stripe.subscriptions.retrieve(
          dbUser.stripeSubscriptionId
        );

        const periodEnd = (subscription as any).current_period_end;
        if (typeof periodEnd !== "number") continue;

        const renewalDate = new Date(periodEnd * 1000);
        const daysDiff = Math.floor(
          (renewalDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

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
        console.error(`[Cron] Failed to process renewal reminder for user ${dbUser.id}:`, err);
        failed++;
      }
    }

    console.log(`[Cron] Renewal reminders: sent=${sent}, failed=${failed}, total=${activeUsers.length}`);
  } catch (err) {
    console.error("[Cron] Renewal reminder error:", err);
  }
}

async function runOnboardingSequence() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[Cron] Database not available");
      return;
    }

    const allUsers = await db.select().from(users);

    let sent = 0;
    let failed = 0;
    const now = new Date();

    for (const dbUser of allUsers) {
      try {
        if (!dbUser.email || !dbUser.createdAt) continue;

        const signupDate = new Date(dbUser.createdAt);
        const daysSinceSignup = Math.floor(
          (now.getTime() - signupDate.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (daysSinceSignup === 1) {
          await sendOnboardingDay1(dbUser.email, dbUser.name || "Contractor");
          sent++;
        } else if (daysSinceSignup === 3) {
          await sendOnboardingDay3(dbUser.email, dbUser.name || "Contractor");
          sent++;
        } else if (daysSinceSignup === 5) {
          await sendOnboardingDay5(
            dbUser.email,
            dbUser.name || "Contractor",
            dbUser.plan as "free" | "starter" | "pro"
          );
          sent++;
        }
      } catch (err) {
        console.error(`[Cron] Failed to process onboarding for user ${dbUser.id}:`, err);
        failed++;
      }
    }

    console.log(`[Cron] Onboarding sequence: sent=${sent}, failed=${failed}, total=${allUsers.length}`);
  } catch (err) {
    console.error("[Cron] Onboarding sequence error:", err);
  }
}

export function initializeCrons() {
  console.log("[Cron] Initializing node-cron jobs (running on Railway, not Manus)");

  // Trial expiration warnings - Daily at 9am UTC
  cron.schedule("0 9 * * *", () => {
    console.log("[Cron] Executing: trial-expiration-warnings");
    runTrialExpirationWarnings().catch(err => 
      console.error("[Cron] Uncaught error in trial-expiration-warnings:", err)
    );
  });

  // Renewal reminders - Daily at 9am UTC
  cron.schedule("0 9 * * *", () => {
    console.log("[Cron] Executing: renewal-reminders");
    runRenewalReminders().catch(err => 
      console.error("[Cron] Uncaught error in renewal-reminders:", err)
    );
  });

  // Onboarding sequence - Daily at 9am UTC
  cron.schedule("0 9 * * *", () => {
    console.log("[Cron] Executing: onboarding-sequence");
    runOnboardingSequence().catch(err => 
      console.error("[Cron] Uncaught error in onboarding-sequence:", err)
    );
  });

  console.log("[Cron] All jobs scheduled:");
  console.log("  ✓ trial-expiration-warnings: 9am UTC daily");
  console.log("  ✓ renewal-reminders: 9am UTC daily");
  console.log("  ✓ onboarding-sequence: 9am UTC daily");
}
