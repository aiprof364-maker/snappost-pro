import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getDb,
  getContacts,
  getNewsletterSubscribers,
  updateContactStatus,
} from "./db";
import {
  authTokens,
  contacts,
  newsletterSubscribers,
  users,
  posts,
  integrations,
  conversionEvents,
  previewDrafts,
  referrals,
} from "../drizzle/schema";
import { and, desc, eq, gte, inArray, like, ne } from "drizzle-orm";
import { PLAN_POST_LIMITS } from "@shared/const";
import { sendNewsletterSignupInvitation } from "./email";
import {
  buildFreePreviewFunnel,
  buildSubscriberFunnel,
  emptyEmailReminderStats,
  loadEmailReminderStats,
} from "./adminStats";
import { ensureReferralSchema } from "./referralSchema";

/**
 * Admin-only procedures for analytics and contractor management.
 * Requires admin role.
 */

function adminOnlyMiddleware(ctx: any) {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
}

export const adminRouter = router({
  /** Owner-only account list for identifying real sign-ups and test accounts. */
  accountList: protectedProcedure.query(async ({ ctx }) => {
    adminOnlyMiddleware(ctx);

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }

    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        plan: users.plan,
        role: users.role,
        subscriptionStatus: users.subscriptionStatus,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return allUsers;
  }),
  /** All-time subscriber funnel counts for the owner dashboard. */
  funnelOverview: protectedProcedure.query(async ({ ctx }) => {
    adminOnlyMiddleware(ctx);

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }

    await ensureReferralSchema();
    const [allUsers, allPosts, allIntegrations, allEvents, allReferrals] =
      await Promise.all([
        db.select().from(users),
        db.select().from(posts),
        db.select().from(integrations),
        db.select().from(conversionEvents),
        db.select().from(referrals),
      ]);

    return buildSubscriberFunnel({
      users: allUsers,
      posts: allPosts,
      integrations: allIntegrations,
      events: allEvents,
      referrals: allReferrals,
    });
  }),

  /**
   * Owner-only aggregate free-access funnel. No visitor email addresses are
   * returned; this is used to locate the stage where paid landing traffic drops.
   */
  signupFunnel: protectedProcedure.query(async ({ ctx }) => {
    adminOnlyMiddleware(ctx);

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }

    const now = new Date();
    const [
      allTokens,
      allUsers,
      allPosts,
      allIntegrations,
      allEvents,
      allPreviewDrafts,
    ] = await Promise.all([
      db.select().from(authTokens),
      db.select().from(users),
      db.select().from(posts),
      db.select().from(integrations),
      db.select().from(conversionEvents),
      db.select().from(previewDrafts),
    ]);

    return buildFreePreviewFunnel({
      now,
      tokens: allTokens,
      users: allUsers,
      posts: allPosts,
      integrations: allIntegrations,
      events: allEvents,
      previewDrafts: allPreviewDrafts,
    });
  }),

  /**
   * Get high-usage contractors (>70% of their plan limit).
   * Useful for identifying upsell opportunities.
   */
  highUsageContractors: protectedProcedure.query(async ({ ctx }) => {
    adminOnlyMiddleware(ctx);

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }

    // Get all users
    const allUsers = await db.select().from(users);

    const highUsageList = [];
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );

    for (const user of allUsers) {
      if (user.plan === "free") continue; // Skip free users

      const plan = user.plan as "starter" | "pro";
      const limit = PLAN_POST_LIMITS[plan];
      if (limit === null) continue; // Skip unlimited plans

      // Count posts this month
      const monthPosts = await db
        .select()
        .from(posts)
        .where(eq(posts.userId, user.id) && gte(posts.createdAt, monthStart));

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
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      }

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, input.userId));
      if (!user[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const userRecord = user[0];
      const userPosts = await db
        .select()
        .from(posts)
        .where(eq(posts.userId, input.userId));

      // Calculate stats
      const totalPosts = userPosts.length;
      const publishedPosts = userPosts.filter(
        p => p.status === "published"
      ).length;
      const failedPosts = userPosts.filter(p => p.status === "failed").length;
      const draftPosts = userPosts.filter(p => p.status === "draft").length;

      // Posts this month
      const now = new Date();
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      );
      const monthPosts = userPosts.filter(
        p => new Date(p.createdAt) >= monthStart
      );

      // Usage percentage
      const plan = userRecord.plan as "starter" | "pro";
      const limit = PLAN_POST_LIMITS[plan];
      const usagePercent =
        limit === null ? 0 : Math.round((monthPosts.length / limit) * 100);

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

    try {
      const db = await getDb();
      if (!db) return emptyEmailReminderStats();
      return await loadEmailReminderStats(db);
    } catch {
      console.error("[Admin] email reminder counts unavailable");
      return emptyEmailReminderStats();
    }
  }),

  /**
   * Get all contact form submissions.
   */
  getContacts: protectedProcedure
    .input((input: any) => input as { status?: string } | undefined)
    .query(async ({ ctx, input }) => {
      adminOnlyMiddleware(ctx);
      return await getContacts(input?.status);
    }),

  /**
   * Update contact status (new, replied, archived).
   */
  updateContactStatus: protectedProcedure
    .input((input: any) => input as { id: number; status: string })
    .mutation(async ({ ctx, input }) => {
      adminOnlyMiddleware(ctx);
      await updateContactStatus(input.id, input.status);
      return { success: true };
    }),

  /** Archive only contacts using the reserved example.com test domain. */
  archiveExampleTestContacts: protectedProcedure.mutation(async ({ ctx }) => {
    adminOnlyMiddleware(ctx);

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }

    const testContacts = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(
          like(contacts.email, "%@example.com"),
          ne(contacts.status, "archived")
        )
      );

    if (testContacts.length > 0) {
      await db
        .update(contacts)
        .set({ status: "archived" })
        .where(
          inArray(
            contacts.id,
            testContacts.map(contact => contact.id)
          )
        );
    }

    return { archived: testContacts.length };
  }),

  /**
   * Get all newsletter subscribers.
   */
  getNewsletterSubscribers: protectedProcedure.query(async ({ ctx }) => {
    adminOnlyMiddleware(ctx);
    return await getNewsletterSubscribers();
  }),

  /** Sends a one-time approved invitation only to selected active non-test subscribers. */
  sendSignupInvitations: protectedProcedure
    .input(z.object({ emails: z.array(z.string().email()).min(1).max(10) }))
    .mutation(async ({ ctx, input }) => {
      adminOnlyMiddleware(ctx);

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      }

      const requestedEmails = Array.from(
        new Set(input.emails.map(email => email.trim().toLowerCase()))
      );
      const activeSubscribers = await db
        .select({ email: newsletterSubscribers.email })
        .from(newsletterSubscribers)
        .where(
          and(
            inArray(newsletterSubscribers.email, requestedEmails),
            eq(newsletterSubscribers.status, "active")
          )
        );

      const recipients = activeSubscribers
        .map(subscriber => subscriber.email.toLowerCase())
        .filter(email => !email.endsWith("@example.com"));

      const results = await Promise.allSettled(
        recipients.map(async email => ({
          email,
          delivery: await sendNewsletterSignupInvitation(email),
        }))
      );

      const sent = results
        .filter(
          (
            result
          ): result is PromiseFulfilledResult<{
            email: string;
            delivery: { id: string };
          }> => result.status === "fulfilled"
        )
        .map(result => result.value.email);
      const failed = results
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected"
        )
        .map(result =>
          result.reason instanceof Error
            ? result.reason.message
            : "Email delivery failed"
        );

      return { sent, failed };
    }),
});
