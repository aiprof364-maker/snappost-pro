import type { PlanId } from "./const";

export type AccountPlan = "free" | PlanId;

export type UploadUsage = {
  used: number;
  limit: number | null;
};

export type UploadLimitNotice = {
  message: string;
  action?: {
    href: string;
    label: string;
  };
};

/**
 * Explains why the upload control is unavailable instead of leaving a disabled
 * control that can look like a broken photo selector.
 */
export function getUploadLimitNotice(
  plan: AccountPlan,
  usage: UploadUsage | null | undefined,
): UploadLimitNotice | null {
  if (!usage || usage.limit === null || usage.used < usage.limit) return null;

  if (plan === "free") {
    return {
      message: `You've used all ${usage.limit} free posts this month. Choose a plan to keep creating posts.`,
      action: { href: "/pricing", label: "Choose a plan" },
    };
  }

  if (plan === "starter") {
    return {
      message: `You've used all ${usage.limit} Starter posts this month. Upgrade to Pro or wait until your next monthly reset.`,
      action: { href: "/pricing", label: "Upgrade to Pro" },
    };
  }

  return {
    message: `You've used all ${usage.limit} Pro posts this month. Your allowance resets at the start of next month.`,
  };
}
