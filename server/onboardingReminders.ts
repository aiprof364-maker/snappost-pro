import { getIncompleteOnboardingUsers, getStalledOnboardingUsers } from "./db";
import { sendOnboardingReminder24h, sendOnboardingReminder48h } from "./email";

/**
 * Send 24-hour onboarding reminder to users who haven't completed setup.
 * Called by Heartbeat cron at 24h after signup.
 */
export async function sendOnboarding24hReminders() {
  try {
    const incompleteUsers = await getIncompleteOnboardingUsers();
    let sent = 0;
    let failed = 0;

    for (const user of incompleteUsers) {
      if (!user.email) continue;

      try {
        await sendOnboardingReminder24h(
          user.email,
          user.name || "there",
          user.completionPercentage
        );
        sent++;
      } catch (error) {
        console.error(
          `[Onboarding] Failed to send 24h reminder to user ${user.userId}:`,
          error
        );
        failed++;
      }
    }

    console.log(
      `[Onboarding] 24h reminders: ${sent} sent, ${failed} failed out of ${incompleteUsers.length} incomplete users`
    );
    return { sent, failed, total: incompleteUsers.length };
  } catch (error) {
    console.error("[Onboarding] Error in 24h reminder batch:", error);
    throw error;
  }
}

/**
 * Send 48-hour onboarding reminder to users who haven't progressed in 24+ hours.
 * Called by Heartbeat cron at 48h after signup.
 */
export async function sendOnboarding48hReminders() {
  try {
    // Get users who haven't updated their onboarding in the last 24 hours
    const stalledUsers = await getStalledOnboardingUsers(24);
    let sent = 0;
    let failed = 0;

    for (const user of stalledUsers) {
      if (!user.email) continue;

      try {
        await sendOnboardingReminder48h(
          user.email,
          user.name || "there",
          user.completionPercentage
        );
        sent++;
      } catch (error) {
        console.error(
          `[Onboarding] Failed to send 48h reminder to user ${user.userId}:`,
          error
        );
        failed++;
      }
    }

    console.log(
      `[Onboarding] 48h reminders: ${sent} sent, ${failed} failed out of ${stalledUsers.length} stalled users`
    );
    return { sent, failed, total: stalledUsers.length };
  } catch (error) {
    console.error("[Onboarding] Error in 48h reminder batch:", error);
    throw error;
  }
}
