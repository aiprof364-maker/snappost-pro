import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { users, posts } from "../drizzle/schema";
import { eq, gte } from "drizzle-orm";
import { PLAN_POST_LIMITS } from "@shared/const";

/**
 * Admin-only procedures for analytics and contractor management.
 * Requires admin role.
 */

function adminOnlyMiddleware(ctx: any) {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
}

export const adminRouter = router({
  /**
   * Get high-usage contractors (>70% of their plan limit).
   * Useful for identifying upsell opportunities.
   */
  highUsageContractors: protectedProcedure.query(async ({ ctx }) => {
    adminOnlyMiddleware(ctx);

    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    }

    // Get all users
    const allUsers = await db.select().from(users);

    const highUsageList = [];
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    for (const user of allUsers) {
      if (user.plan === "free") continue; // Skip free users

      const plan = user.plan as "starter" | "pro";
      const limit = PLAN_POST_LIMITS[plan];
      if (limit === null) continue; // Skip unlimited plans

      // Count posts this month
      const monthPosts = await db
        .select()
        .from(posts)
        .where(
          eq(posts.userId, user.id) && gte(posts.createdAt, monthStart)
        );

      const usage = monthPosts.length;
      const usagePercent = Math.round((usage / limit) * 100);

      // Include if >70% of limit
      if (usagePercent >= 70) {
        highUsageList.push({
          id: user.id,
          name: user.name,
          email: user.email,
          plan,
          usage,
          limit,
          usagePercent,
          subscriptionStatus: user.subscriptionStatus,
          createdAt: user.createdAt,
        });
      }
    }

    // Sort by usage percent descending
    return highUsageList.sort((a, b) => b.usagePercent - a.usagePercent);
  }),

  /**
   * Get detailed analytics for a specific contractor.
   */
  contractorAnalytics: protectedProcedure
    .input((input: any) => input as { userId: number })
    .query(async ({ ctx, input }) => {
      adminOnlyMiddleware(ctx);

      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      }

      const user = await db.select().from(users).where(eq(users.id, input.userId));
      if (!user[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const userRecord = user[0];
      const userPosts = await db.select().from(posts).where(eq(posts.userId, input.userId));

      // Calculate stats
      const totalPosts = userPosts.length;
      const publishedPosts = userPosts.filter(p => p.status === "published").length;
      const failedPosts = userPosts.filter(p => p.status === "failed").length;
      const draftPosts = userPosts.filter(p => p.status === "draft").length;

      // Posts this month
      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const monthPosts = userPosts.filter(p => new Date(p.createdAt) >= monthStart);

      // Usage percentage
      const plan = userRecord.plan as "starter" | "pro";
      const limit = PLAN_POST_LIMITS[plan];
      const usagePercent = limit === null ? 0 : Math.round((monthPosts.length / limit) * 100);

      return {
        user: {
          id: userRecord.id,
          name: userRecord.name,
          email: userRecord.email,
          plan,
          subscriptionStatus: userRecord.subscriptionStatus,
          createdAt: userRecord.createdAt,
        },
        stats: {
          totalPosts,
          publishedPosts,
          failedPosts,
          draftPosts,
          monthlyUsage: monthPosts.length,
          monthlyLimit: limit,
          usagePercent,
        },
        recentPosts: userPosts.slice(-10).reverse(),
      };
    }),

  /**
   * Get email delivery stats for scheduled jobs.
   */
  emailDeliveryStats: protectedProcedure.query(async ({ ctx }) => {
    adminOnlyMiddleware(ctx);

    // This would integrate with Resend API to get delivery stats
    // For now, return a placeholder
    return {
      trialExpirationWarnings: {
        sent: 0,
        failed: 0,
        lastRun: null,
      },
      renewalReminders: {
        sent: 0,
        failed: 0,
        lastRun: null,
      },
    };
  }),
});
