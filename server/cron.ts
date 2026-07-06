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
  sendCronErrorAlert,
} from "./email";
import { getStripe } from "./stripe";

/**
 * Initialize cron jobs to run on Railway (not Manus Heartbeat).
 * These jobs run daily at 9am UTC and send scheduled emails.
 */

async function runTrialExpirationWarnings() {
  const jobName = "trial-expiration-warnings";
  const errors: string[] = [];
  
  try {
    const stripe = getStripe();
    if (!stripe) {
      const msg = "[Cron] Stripe not configured";
      console.error(msg);
      errors.push(msg);
      return;
    }

    const db = await getDb();
    if (!db) {
      const msg = "[Cron] Database not available";
      console.error(msg);
      errors.push(msg);
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
        const errMsg = err instanceof Error ? err.stack || err.message : String(err);
        console.error(`[Cron] Failed to process trial warning for user ${dbUser.id}:`, err);
        errors.push(`User ${dbUser.id}: ${errMsg}`);
        failed++;
      }
    }

    console.log(`[Cron] Trial expiration warnings: sent=${sent}, failed=${failed}, total=${trialingUsers.length}`);
    
    // Alert if any failures occurred
    if (failed > 0 && errors.length > 0) {
      try {
        await sendCronErrorAlert(
          jobName,
          `${failed} failures out of ${trialingUsers.length} users processed.\n\nDetails:\n${errors.join("\n")}`,
          new Date()
        );
      } catch (alertErr) {
        console.error("[Cron] Failed to send error alert:", alertErr);
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? (err.stack || err.message) : String(err);
    console.error("[Cron] Trial expiration warning error:", err);
    try {
      await sendCronErrorAlert(jobName, errorMsg, new Date());
    } catch (alertErr) {
      console.error("[Cron] Failed to send error alert:", alertErr);
    }
  }
}

async function runRenewalReminders() {
  const jobName = "renewal-reminders";
  const errors: string[] = [];
  
  try {
    const stripe = getStripe();
    if (!stripe) {
      const msg = "[Cron] Stripe not configured";
      console.error(msg);
      errors.push(msg);
      return;
    }

    const db = await getDb();
    if (!db) {
      const msg = "[Cron] Database not available";
      console.error(msg);
      errors.push(msg);
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
        const errMsg = err instanceof Error ? err.stack || err.message : String(err);
        console.error(`[Cron] Failed to process renewal reminder for user ${dbUser.id}:`, err);
        errors.push(`User ${dbUser.id}: ${errMsg}`);
        failed++;
      }
    }

    console.log(`[Cron] Renewal reminders: sent=${sent}, failed=${failed}, total=${activeUsers.length}`);
    
    // Alert if any failures occurred
    if (failed > 0 && errors.length > 0) {
      try {
        await sendCronErrorAlert(
          jobName,
          `${failed} failures out of ${activeUsers.length} users processed.\n\nDetails:\n${errors.join("\n")}`,
          new Date()
        );
      } catch (alertErr) {
        console.error("[Cron] Failed to send error alert:", alertErr);
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? (err.stack || err.message) : String(err);
    console.error("[Cron] Renewal reminder error:", err);
    try {
      await sendCronErrorAlert(jobName, errorMsg, new Date());
    } catch (alertErr) {
      console.error("[Cron] Failed to send error alert:", alertErr);
    }
  }
}

async function runOnboardingSequence() {
  const jobName = "onboarding-sequence";
  const errors: string[] = [];
  
  try {
    const db = await getDb();
    if (!db) {
      const msg = "[Cron] Database not available";
      console.error(msg);
      errors.push(msg);
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
        const errMsg = err instanceof Error ? err.stack || err.message : String(err);
        console.error(`[Cron] Failed to process onboarding for user ${dbUser.id}:`, err);
        errors.push(`User ${dbUser.id}: ${errMsg}`);
        failed++;
      }
    }

    console.log(`[Cron] Onboarding sequence: sent=${sent}, failed=${failed}, total=${allUsers.length}`);
    
    // Alert if any failures occurred
    if (failed > 0 && errors.length > 0) {
      try {
        await sendCronErrorAlert(
          jobName,
          `${failed} failures out of ${allUsers.length} users processed.\n\nDetails:\n${errors.join("\n")}`,
          new Date()
        );
      } catch (alertErr) {
        console.error("[Cron] Failed to send error alert:", alertErr);
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? (err.stack || err.message) : String(err);
    console.error("[Cron] Onboarding sequence error:", err);
    try {
      await sendCronErrorAlert(jobName, errorMsg, new Date());
    } catch (alertErr) {
      console.error("[Cron] Failed to send error alert:", alertErr);
    }
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
