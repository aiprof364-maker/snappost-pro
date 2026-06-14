import {
  COOKIE_NAME,
  PLANS,
  PLAN_POST_LIMITS,
  type PlanId,
} from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { sendContactFormNotification, sendNewsletterWelcome, sendNewsletterSignupNotification } from "./email";
import { createContact, createNewsletterSubscriber } from "./db";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { brandImage, fetchStorageBytes } from "./branding";
import { generateCaption } from "./captions";
import {
  countUserPostsSince,
  createPost,
  deleteIntegration,
  getIntegration,
  getPostById,
  getUserById,
  getUserPosts,
  updatePost,
  updateUserLogo,
  upsertIntegration,
} from "./db";
import {
  FACEBOOK_SCOPES,
  isFacebookConfigured,
  listPages,
  postPhotoToPage,
} from "./facebook";
import { getPriceId, getStripe, isStripeConfigured } from "./stripe";
import { storageGetSignedUrl, storagePut } from "./storage";
import { adminRouter } from "./adminRouters";

/** Decode a data URL or base64 string to a Buffer. */
function decodeBase64Image(input: string): { buffer: Buffer; mime: string } {
  const match = input.match(/^data:(.+?);base64,(.*)$/);
  if (match) {
    return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
  }
  return { mime: "image/jpeg", buffer: Buffer.from(input, "base64") };
}

/** First day of the current month (UTC) — used for monthly usage limits. */
function startOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    verifyEmail: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const { verifyEmailToken } = await import("./db");
        const crypto = await import("crypto");
        const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");
        const user = await verifyEmailToken(tokenHash);
        if (!user) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired verification token" });
        }
        return { success: true, email: user.email } as const;
      }),
    resendVerificationEmail: protectedProcedure.mutation(async ({ ctx }) => {
      const { generateEmailVerificationToken, setEmailVerificationToken, getUserById } = await import("./db");
      const { sendEmailVerification } = await import("./email");
      
      const user = await getUserById(ctx.user.id);
      if (!user || !user.email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "User email not found" });
      }
      
      if (user.emailVerified) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Email already verified" });
      }
      
      const { token: verificationToken, hash: tokenHash } = generateEmailVerificationToken();
      await setEmailVerificationToken(ctx.user.id, tokenHash);
      
      try {
        await sendEmailVerification(user.email, user.name || "User", verificationToken);
        return { success: true, message: "Verification email sent" } as const;
      } catch (error) {
        console.error("[Email] Failed to send verification email:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send verification email" });
      }
    }),
  }),

  /* --------------------------- Account --------------------------- */
  account: router({
    /** Full account snapshot: plan, subscription, logo, facebook connection. */
    overview: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      const integration = await getIntegration(ctx.user.id, "facebook");
      const plan = (user?.plan ?? "free") as "free" | PlanId;
      const used = await countUserPostsSince(ctx.user.id, startOfMonth());
      const limit = PLAN_POST_LIMITS[plan];
      return {
        plan,
        subscriptionStatus: user?.subscriptionStatus ?? "none",
        usage: { used, limit },
        hasLogo: Boolean(user?.logoKey),
        facebook: integration
          ? {
              status: integration.status,
              pageId: integration.pageId,
              pageName: integration.pageName,
            }
          : null,
        facebookConfigured: isFacebookConfigured(),
        stripeConfigured: isStripeConfigured(),
      };
    }),

    /** Upload/replace the branding logo. Accepts a base64/data-URL image. */
    uploadLogo: protectedProcedure
      .input(z.object({ image: z.string().min(10) }))
      .mutation(async ({ ctx, input }) => {
        const { buffer, mime } = decodeBase64Image(input.image);
        const ext = mime.includes("png") ? "png" : "jpg";
        const { key } = await storagePut(
          `${ctx.user.id}-logo/logo.${ext}`,
          buffer,
          mime,
        );
        await updateUserLogo(ctx.user.id, key);
        return { success: true } as const;
      }),
  }),

  /* ---------------------------- Posts ---------------------------- */
  posts: router({
    list: protectedProcedure.query(({ ctx }) => getUserPosts(ctx.user.id)),

    /**
     * Create a post from an uploaded photo: store original, generate caption,
     * brand with logo, and persist as a draft.
     */
    create: protectedProcedure
      .input(
        z.object({
          image: z.string().min(10),
          trade: z.string().max(60).optional(),
          tone: z.string().max(40).optional(),
          businessName: z.string().max(120).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Enforce monthly plan limit (server-side).
        const user0 = await getUserById(ctx.user.id);
        const plan = (user0?.plan ?? "free") as "free" | PlanId;
        const limit = PLAN_POST_LIMITS[plan];
        if (limit !== null) {
          const used = await countUserPostsSince(ctx.user.id, startOfMonth());
          if (used >= limit) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                plan === "free"
                  ? `You've reached the free limit of ${limit} posts this month. Upgrade to keep posting.`
                  : plan === "starter"
                    ? `You've reached your Starter limit of ${limit} posts this month. Upgrade to Pro (300/mo) or wait until next month.`
                    : `You've reached your monthly limit of ${limit} posts. Your allowance resets at the start of next month.`,
            });
          }
        }

        const { buffer, mime } = decodeBase64Image(input.image);
        const ext = mime.includes("png") ? "png" : "jpg";

        // 1. Store original
        const original = await storagePut(
          `${ctx.user.id}-posts/${Date.now()}-original.${ext}`,
          buffer,
          mime,
        );

        // 2. Caption (uses a signed URL the model can fetch)
        let caption = "";
        try {
          const signed = await storageGetSignedUrl(original.key);
          caption = await generateCaption({
            imageUrl: signed,
            trade: input.trade,
            tone: input.tone,
            businessName: input.businessName,
          });
        } catch (e) {
          caption =
            "Another job done right. Quality work you can count on. " +
            "#TradeLife #QualityWork #LocalBusiness";
        }

        // 3. Brand with logo (if present)
        const user = await getUserById(ctx.user.id);
        let logoBuffer: Buffer | null = null;
        if (user?.logoKey) {
          try {
            logoBuffer = await fetchStorageBytes(user.logoKey);
          } catch {
            logoBuffer = null;
          }
        }
        const branded = await brandImage({
          photoBuffer: buffer,
          logoBuffer,
          destKeyPrefix: `${ctx.user.id}-posts/${Date.now()}`,
        });

        // 4. Persist
        const post = await createPost({
          userId: ctx.user.id,
          originalImageKey: original.key,
          originalImageUrl: original.url,
          brandedImageKey: branded.key,
          brandedImageUrl: branded.url,
          caption,
          status: "draft",
        });
        return post;
      }),

    /** Update caption text on a draft post. */
    updateCaption: protectedProcedure
      .input(z.object({ id: z.number(), caption: z.string().max(2200) }))
      .mutation(async ({ ctx, input }) => {
        const post = await getPostById(input.id);
        if (!post || post.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await updatePost(input.id, { caption: input.caption });
        return { success: true } as const;
      }),

    /** Publish a branded post to the connected Facebook page. */
    publish: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Check email verification
        const { isEmailVerified } = await import("./db");
        const emailVerified = await isEmailVerified(ctx.user.id);
        if (!emailVerified) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Please verify your email before posting to Facebook. Check your inbox for the verification link.",
          });
        }

        const post = await getPostById(input.id);
        if (!post || post.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const integration = await getIntegration(ctx.user.id, "facebook");
        if (
          !integration ||
          integration.status !== "connected" ||
          !integration.pageId ||
          !integration.pageAccessToken
        ) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Connect a Facebook page first. Facebook posting activates once your Meta app is approved.",
          });
        }
        try {
          const imageUrl = await storageGetSignedUrl(
            post.brandedImageKey ?? post.originalImageKey!,
          );
          const fbId = await postPhotoToPage({
            pageId: integration.pageId,
            pageAccessToken: integration.pageAccessToken,
            imageUrl,
            caption: post.caption ?? "",
          });
          await updatePost(input.id, {
            status: "published",
            facebookPostId: fbId,
            errorMessage: null,
          });
          return { success: true, facebookPostId: fbId } as const;
        } catch (e: any) {
          await updatePost(input.id, {
            status: "failed",
            errorMessage: e?.message ?? "Publish failed",
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: e?.message ?? "Publish failed",
          });
        }
      }),
  }),

  /* ----------------------- Facebook integration ----------------------- */
  facebook: router({
    /** Return the configured scopes + whether the app is wired. */
    status: protectedProcedure.query(async ({ ctx }) => {
      const integration = await getIntegration(ctx.user.id, "facebook");
      return {
        configured: isFacebookConfigured(),
        scopes: FACEBOOK_SCOPES,
        connection: integration
          ? {
              status: integration.status,
              pageId: integration.pageId,
              pageName: integration.pageName,
            }
          : null,
      };
    }),

    /** Build the OAuth dialog URL (frontend redirects the browser to it). */
    getAuthUrl: protectedProcedure
      .input(z.object({ origin: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        if (!isFacebookConfigured()) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Facebook is not configured yet. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in Settings → Secrets.",
          });
        }
        const { buildFacebookAuthUrl } = await import("./facebook");
        const redirectUri = `${input.origin}/api/facebook/callback`;
        const state = `${ctx.user.id}:${input.origin}`;
        return { url: buildFacebookAuthUrl(redirectUri, state) };
      }),

    /** List pages available on the stored user token, for page selection. */
    listPages: protectedProcedure.query(async ({ ctx }) => {
      const integration = await getIntegration(ctx.user.id, "facebook");
      if (!integration?.accessToken) return [];
      try {
        const pages = await listPages(integration.accessToken);
        return pages.map(p => ({ id: p.id, name: p.name }));
      } catch {
        return [];
      }
    }),

    /** Select which page to publish to (stores the page-scoped token). */
    selectPage: protectedProcedure
      .input(z.object({ pageId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const integration = await getIntegration(ctx.user.id, "facebook");
        if (!integration?.accessToken) {
          throw new TRPCError({ code: "PRECONDITION_FAILED" });
        }
        const pages = await listPages(integration.accessToken);
        const page = pages.find(p => p.id === input.pageId);
        if (!page) throw new TRPCError({ code: "NOT_FOUND" });
        await upsertIntegration({
          userId: ctx.user.id,
          provider: "facebook",
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token,
          status: "connected",
        });
        return { success: true } as const;
      }),

    /** Disconnect Facebook. */
    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      await deleteIntegration(ctx.user.id, "facebook");
      return { success: true } as const;
    }),
  }),

  /* ----------------------------- Billing ----------------------------- */
  billing: router({
    plans: publicProcedure.query(() => PLANS),

    /** Create a Stripe Checkout session for a plan. */
    createCheckout: protectedProcedure
      .input(z.object({ plan: z.enum(["starter", "pro"]), origin: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        const stripe = getStripe();
        if (!stripe) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Payments are not configured yet. Add STRIPE_SECRET_KEY and price IDs in Settings → Secrets.",
          });
        }
        const priceId = getPriceId(input.plan);
        if (!priceId) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Missing price id for the ${input.plan} plan.`,
          });
        }
        const user = await getUserById(ctx.user.id);
        console.log(`[Stripe] Creating checkout session for user ${ctx.user.id}, plan ${input.plan}, priceId ${priceId}`);
        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [{ price: priceId, quantity: 1 }],
          customer_email: user?.email ?? undefined,
          client_reference_id: String(ctx.user.id),
          metadata: { userId: String(ctx.user.id), plan: input.plan },
          subscription_data: {
            trial_period_days: 7,
          },
          success_url: `${input.origin}/dashboard?checkout=success`,
          cancel_url: `${input.origin}/pricing?checkout=cancel`,
        });
        console.log(`[Stripe] Session created:`, { id: session.id, url: session.url });
        if (!session.url) {
          console.error(`[Stripe] Session URL is null or undefined!`);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create Stripe checkout session",
          });
        }
        return { url: session.url };
      }),

    /** Open the Stripe billing portal to manage/cancel a subscription. */
    portal: protectedProcedure
      .input(z.object({ origin: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        const stripe = getStripe();
        const user = await getUserById(ctx.user.id);
        if (!stripe || !user?.stripeCustomerId) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "No active billing account found.",
          });
        }
        const session = await stripe.billingPortal.sessions.create({
          customer: user.stripeCustomerId,
          return_url: `${input.origin}/dashboard`,
        });
        return { url: session.url };
      }),
  }),

  /* ----------------------------- Contact ----------------------------- */
  contact: router({
    submit: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(120),
          email: z.string().email(),
          message: z.string().min(1).max(4000),
        }),
      )
      .mutation(async ({ input }) => {
        try {
          const { sendContactFormNotification } = await import("./email");
          const { createContact } = await import("./db");
          const ownerEmail = process.env.OWNER_EMAIL || "support@snappostpro.com";
          
          // Save to database
          await createContact({
            name: input.name,
            email: input.email,
            message: input.message,
            status: "new",
          });
          
          // Send email notification
          await sendContactFormNotification(
            input.name,
            input.email,
            input.message,
            ownerEmail
          );
          
          return { success: true } as const;
        } catch (err) {
          console.error("[Contact Form] Failed to process submission:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not deliver your message. Please try again.",
          });
        }
      }),

    subscribe: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        try {
          const { sendNewsletterWelcome, sendNewsletterSignupNotification } = await import("./email");
          const { createNewsletterSubscriber } = await import("./db");
          const ownerEmail = process.env.OWNER_EMAIL || "support@snappostpro.com";
          
          // Save to database
          await createNewsletterSubscriber(input.email);
          
          // Send welcome email to subscriber
          await sendNewsletterWelcome(input.email).catch(err => {
            console.error("[Newsletter] Failed to send welcome email:", err);
          });
          
          // Notify owner of new subscriber
          await sendNewsletterSignupNotification(input.email, ownerEmail).catch(err => {
            console.error("[Newsletter] Failed to send owner notification:", err);
          });
          
          return { success: true } as const;
        } catch (err) {
          console.error("[Newsletter] Subscription failed:", err);
          // Newsletter is non-critical: don't hard-fail the visitor
          return { success: true } as const;
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
