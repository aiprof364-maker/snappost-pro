import { COOKIE_NAME, PLANS, type PlanId } from "@shared/const";
import {
  normalizeReferralCode,
  postCreationLimit,
  presentPostForAccount,
  publishableCaption,
  publishableImageKey,
  referralPublicUrl,
  withSnapPostCaptionFooter,
} from "@shared/referrals";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { sendNewsletterSignupNotification } from "./email";
import { createNewsletterSubscriber } from "./db";
import { attemptImmediateNewsletterWelcome } from "./newsletterAutomation";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { configuredAdminEmail } from "./adminIdentity";
import {
  PREVIEW_BUSINESS_NAME_MAX,
  PREVIEW_CALL_TO_ACTION,
  PREVIEW_SUBURB_MAX,
  cleanPreviewText,
} from "@shared/previewCaption";
import { parseBusinessPhone, parseBusinessWebsite } from "@shared/brandContact";
import { parseBorderColor, presentBorderSettings } from "@shared/postBorder";
import { previewTradeLabel } from "@shared/previewTrades";
import { brandImage, fetchStorageBytes } from "./branding";
import { PreviewLogoError, readPreviewLogo } from "./previewLogo";
import { brandSignedInPhoto, signedInTextBadge } from "./signedInBranding";
import { accountShowsWatermark, brandingForClaim } from "./freeMark";
import {
  describePreviewFailure,
  previewFailureMessage,
} from "./previewFailure";
import { readSnapPostFont } from "./snapPostFont";
import { photoFitsSnapPostMark } from "./snapPostMark";
import { generateCaption } from "./captions";
import {
  countUserPostsSince,
  createPost,
  deleteIntegration,
  getIntegration,
  getPostById,
  getTrialEligibility,
  getUserById,
  getUserPosts,
  updatePost,
  updateUserLogo,
  updateUserBrand,
  updateUserBorder,
  logConversionEvent,
  logConversionEventOnce,
  logAnonymousConversionOnce,
  upsertIntegration,
  getOrCreateOnboardingChecklist,
  updateOnboardingStep,
} from "./db";
import {
  FACEBOOK_SCOPES,
  getPublishedPostPermalink,
  hasPublishingReadyFacebookPage,
  isFacebookConfigured,
  listBusinesses,
  listPagesForBusiness,
  postPhotoToPage,
} from "./facebook";
import {
  getPriceId,
  getVerifiedCheckoutOutcome,
  getStripe,
  hasPaidEntitlement,
  isStripeConfigured,
  reconcileUserSubscription,
} from "./stripe";
import { createMagicLinkToken, SESSION_COOKIE } from "./auth";
import { storageGetSignedUrl, storagePut } from "./storage";
import {
  getCheckoutTrialData,
  getTrialCheckoutBlock,
} from "./trialEligibility";
import {
  queueFreePostsUsedSequence,
  runAccountEmailAutomation,
} from "./accountEmailAutomation";
import {
  checkoutPromotionParams,
  findActivePromotionCode,
} from "./promotionCodes";
import {
  anonymousPreviewDedupeKey,
  claimPreviewDraft,
  cleanupExpiredPreviewDrafts,
  createPreviewDraft,
  getPublicPreviewDraft,
  getLatestClaimedPreviewBrand,
  getUnclaimedPreviewDraft,
  markPreviewEmailRequested,
  PreviewDraftError,
  updatePublicPreviewCaption,
  type PreviewLanding,
} from "./previewDrafts";
import {
  consumePreviewAllowance,
  previewClientKey,
  previewLimitMessage,
  readPreviewLimitConfig,
  refundPreviewAllowance,
  sharedPreviewRateStore,
} from "./previewLimits";
import {
  releasePreviewDailySlot,
  reservePreviewDailySlot,
} from "./previewUsage";
import { adminRouter } from "./adminRouters";
import {
  ensureReferralCode,
  ensureReferrerCustomer,
  getReferralDashboard,
} from "./referrals";
import { ensureReferralSchema } from "./referralSchema";

function optionalBrandPhone(value: string | undefined) {
  if (value === undefined) return undefined;
  const parsed = parseBusinessPhone(value);
  if (!parsed.ok) {
    throw new TRPCError({ code: "BAD_REQUEST", message: parsed.message });
  }
  return parsed.value;
}

function optionalBrandWebsite(value: string | undefined) {
  if (value === undefined) return undefined;
  const parsed = parseBusinessWebsite(value);
  if (!parsed.ok) {
    throw new TRPCError({ code: "BAD_REQUEST", message: parsed.message });
  }
  return parsed.value;
}

function storedBrandPhone(value: string | null | undefined) {
  const parsed = parseBusinessPhone(value);
  return parsed.ok ? parsed.value : null;
}

function storedBrandWebsite(value: string | null | undefined) {
  const parsed = parseBusinessWebsite(value);
  return parsed.ok ? parsed.value : null;
}

async function noteFreePostsExhausted(
  userId: number,
  metadata: { used: number; limit: number }
) {
  await logConversionEventOnce(userId, "free_posts_exhausted", metadata);
  try {
    await queueFreePostsUsedSequence(userId);
    void runAccountEmailAutomation();
  } catch {
    console.error("[Account email] free-posts sequence could not be queued");
  }
}

async function maybeNoteFreePostsExhausted(userId: number) {
  const user = await getUserById(userId);
  if ((user?.plan ?? "free") !== "free") return;
  const limit = postCreationLimit("free", user?.bonusFreePosts);
  if (limit === null) return;
  const used = await countUserPostsSince(userId, new Date(0));
  if (used >= limit) await noteFreePostsExhausted(userId, { used, limit });
}

const magicLinkRequestTimes = new Map<string, number>();
const MAGIC_LINK_COOLDOWN_MS = 60_000;

/** Decode a data URL or base64 string to a Buffer. */
function decodeBase64Image(input: string): { buffer: Buffer; mime: string } {
  const match = input.match(/^data:(.+?);base64,(.*)$/);
  if (match) {
    return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
  }
  return { mime: "image/jpeg", buffer: Buffer.from(input, "base64") };
}

function decodePreviewImage(input: string, maxBytes: number) {
  const decoded = decodeBase64Image(input);
  if (!new Set(["image/jpeg", "image/png"]).has(decoded.mime)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Please use a JPG or PNG image.",
    });
  }
  if (!decoded.buffer.length || decoded.buffer.length > maxBytes) {
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message:
        "That image is too large. Use a photo under 8 MB and a logo under 2 MB.",
    });
  }
  return decoded;
}

function previewLanding(value: string | undefined): PreviewLanding {
  return value === "contractors" || value === "hairdressers"
    ? value
    : undefined;
}

/** First day of the current month (UTC) — used for monthly usage limits. */
function startOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Free accounts receive a one-time allowance; paid plans reset monthly. */
function usageStartForPlan(plan: "free" | PlanId): Date {
  return plan === "free" ? new Date(0) : startOfMonth();
}

export const appRouter = router({
  admin: adminRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    requestSignInLink: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          origin: z.string().url(),
          next: z.string().optional(),
          previewToken: z.string().min(32).max(128).optional(),
          referralCode: z.string().trim().max(32).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const email = input.email.trim().toLowerCase();
        if (input.previewToken) {
          const preview = await getPublicPreviewDraft(input.previewToken);
          if (!preview) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message:
                "This preview has expired. Create a new free preview to continue.",
            });
          }
          await logAnonymousConversionOnce(
            "tool_signup_click",
            anonymousPreviewDedupeKey(input.previewToken),
            { source: "preview_signup" }
          );
        }
        const lastRequestedAt = magicLinkRequestTimes.get(email) ?? 0;
        const remainingMs =
          MAGIC_LINK_COOLDOWN_MS - (Date.now() - lastRequestedAt);
        if (remainingMs > 0) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Please wait ${Math.ceil(remainingMs / 1000)} seconds before requesting another sign-in link.`,
          });
        }

        const token = await createMagicLinkToken(
          email,
          normalizeReferralCode(input.referralCode)
        );
        const next = input.next?.startsWith("/") ? input.next : "/dashboard";
        const link = new URL("/api/auth/verify", input.origin);
        link.searchParams.set("token", token);
        link.searchParams.set("next", next);
        const { sendMagicSignInLink } = await import("./email");
        try {
          await sendMagicSignInLink(email, link.toString());
          magicLinkRequestTimes.set(email, Date.now());
          if (input.previewToken) {
            await markPreviewEmailRequested(input.previewToken).catch(error => {
              console.error("[Preview] Could not record email handoff", error);
            });
          }
          return { success: true } as const;
        } catch (error) {
          console.error("[Auth] Magic-link email delivery failed", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "We could not send the sign-in email. Please try again shortly or contact support if it continues.",
          });
        }
      }),
    requestAdminAccessLink: publicProcedure.mutation(async () => {
      const email = configuredAdminEmail();
      const lastRequestedAt = magicLinkRequestTimes.get(email) ?? 0;
      const remainingMs =
        MAGIC_LINK_COOLDOWN_MS - (Date.now() - lastRequestedAt);
      if (remainingMs > 0) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Please wait ${Math.ceil(remainingMs / 1000)} seconds before requesting another admin access link.`,
        });
      }

      const token = await createMagicLinkToken(email);
      const link = new URL("/api/auth/verify", "https://snappostpro.com");
      link.searchParams.set("token", token);
      link.searchParams.set("next", "/admin");
      const { sendMagicSignInLink } = await import("./email");
      try {
        await sendMagicSignInLink(email, link.toString());
        magicLinkRequestTimes.set(email, Date.now());
        return { success: true } as const;
      } catch (error) {
        console.error("[Auth] Admin access-link email delivery failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "We could not send the admin access email. Please try again shortly.",
        });
      }
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.setHeader("Cache-Control", "no-store");
      ctx.res.clearCookie(SESSION_COOKIE, {
        ...cookieOptions,
        expires: new Date(0),
        maxAge: 0,
      });
      return { success: true } as const;
    }),
    verifyEmail: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const { verifyEmailToken } = await import("./db");
        const crypto = await import("crypto");
        const tokenHash = crypto
          .createHash("sha256")
          .update(input.token)
          .digest("hex");
        const user = await verifyEmailToken(tokenHash);
        if (!user) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid or expired verification token",
          });
        }
        return { success: true, email: user.email } as const;
      }),
    resendVerificationEmail: protectedProcedure.mutation(async ({ ctx }) => {
      const {
        generateEmailVerificationToken,
        setEmailVerificationToken,
        getUserById,
      } = await import("./db");
      const { sendEmailVerification } = await import("./email");

      const user = await getUserById(ctx.user.id);
      if (!user || !user.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User email not found",
        });
      }

      if (user.emailVerified) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email already verified",
        });
      }

      const { token: verificationToken, hash: tokenHash } =
        generateEmailVerificationToken();
      await setEmailVerificationToken(ctx.user.id, tokenHash);

      try {
        await sendEmailVerification(
          user.email,
          user.name || "User",
          verificationToken
        );
        return { success: true, message: "Verification email sent" } as const;
      } catch (error) {
        console.error("[Email] Failed to send verification email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send verification email",
        });
      }
    }),
  }),

  /* ---------------------- Public free preview ---------------------- */
  preview: router({
    /** Create a real branded photo and caption before collecting an email. */
    create: publicProcedure
      .input(
        z.object({
          image: z.string().min(10).max(11_200_000),
          logo: z
            .string()
            .min(10)
            .max(2_800_000, "Use a logo under 2 MB.")
            .optional(),
          trade: z.string().max(60).optional(),
          tone: z.string().max(40).optional(),
          businessName: z.string().max(PREVIEW_BUSINESS_NAME_MAX).optional(),
          suburb: z.string().max(PREVIEW_SUBURB_MAX).optional(),
          landing: z.enum(["contractors", "hairdressers"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Anonymous visitors never publish. This procedure only stores a draft
        // preview. Publishing stays on the signed-in post action.
        try {
          readSnapPostFont("SnapPostBadge-Regular.ttf");
          readSnapPostFont("SnapPostBadge-Bold.ttf");
        } catch (error) {
          const failure = describePreviewFailure(error);
          console.error(
            `[Preview] Creation failed at fonts (${failure.reason}): ${failure.detail}`
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: previewFailureMessage(failure.reason),
          });
        }
        const { buffer: photoBuffer, mime: photoMime } = decodePreviewImage(
          input.image,
          8 * 1024 * 1024
        );
        let logo: { buffer: Buffer; mime: "image/png" } | null = null;
        if (input.logo) {
          try {
            logo = await readPreviewLogo(input.logo);
          } catch (error) {
            if (error instanceof PreviewLogoError) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: error.message,
              });
            }
            throw error;
          }
        }
        const limits = readPreviewLimitConfig();
        const clientKey = previewClientKey({
          headers: ctx.req.headers,
          ip: ctx.req.ip || ctx.req.socket?.remoteAddress,
        });
        const allowance = consumePreviewAllowance(
          sharedPreviewRateStore(),
          clientKey,
          Date.now(),
          limits
        );
        if (!allowance.ok) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: previewLimitMessage(allowance.scope, limits),
          });
        }
        let canMark = false;
        try {
          canMark = await photoFitsSnapPostMark(photoBuffer);
        } catch {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please use a JPG or PNG photo.",
          });
        }
        if (!canMark) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Please use a larger photo so we can prepare your preview.",
          });
        }

        const businessName = cleanPreviewText(
          input.businessName,
          PREVIEW_BUSINESS_NAME_MAX
        );
        const suburb = cleanPreviewText(input.suburb, PREVIEW_SUBURB_MAX);
        const trade = previewTradeLabel(input.trade);
        const tone = cleanPreviewText(input.tone, 40);
        const createdAt = Date.now();
        const keyPrefix = `previews/${createdAt}`;
        const ext = photoMime.includes("png") ? "png" : "jpg";
        let aiStarted = false;
        let reservedDay: string | null = null;
        let ipRefunded = false;
        let stage = "daily_cap";
        const giveBackIp = () => {
          if (ipRefunded || aiStarted) return;
          ipRefunded = true;
          refundPreviewAllowance(sharedPreviewRateStore(), clientKey);
        };

        // Cleanup never blocks a visitor's preview when storage is unavailable.
        void cleanupExpiredPreviewDrafts().catch(error => {
          console.error("[Preview] Expired draft cleanup failed", error);
        });

        try {
          const reservation = await reservePreviewDailySlot(
            limits.globalDailyCap
          );
          if (!reservation.ok) {
            giveBackIp();
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: previewLimitMessage("global", limits),
            });
          }
          reservedDay = reservation.day;

          stage = "store_original";
          const original = await storagePut(
            `${keyPrefix}/original.${ext}`,
            photoBuffer,
            photoMime
          );
          const uploadedLogo = logo
            ? await storagePut(`${keyPrefix}/logo.png`, logo.buffer, logo.mime)
            : null;
          const signedUrl = await storageGetSignedUrl(original.key);
          stage = "caption";
          aiStarted = true;
          const generatedCaption = await generateCaption({
            imageUrl: signedUrl,
            trade,
            tone,
            businessName,
            suburb,
            callToAction: PREVIEW_CALL_TO_ACTION,
          });
          const showMark = accountShowsWatermark(ctx.user);
          const caption = withSnapPostCaptionFooter(generatedCaption, {
            include: showMark,
          });
          stage = "brand_image";
          const clean = await brandImage({
            photoBuffer,
            logoBuffer: logo?.buffer,
            destKeyPrefix: keyPrefix,
            frame: "square",
            watermark: showMark,
            textBadge: {
              businessName,
              suburb,
              callToAction: PREVIEW_CALL_TO_ACTION,
            },
            border: ctx.user
              ? {
                  style: ctx.user.borderStyle,
                  color: ctx.user.borderColor,
                  businessName: ctx.user.businessName ?? businessName,
                  suburb: ctx.user.suburb ?? suburb,
                  phone: ctx.user.businessPhone,
                  website: ctx.user.businessWebsite,
                }
              : null,
          });
          stage = "snap_post_mark";
          const marked =
            showMark && clean.watermarkedBuffer
              ? await storagePut(
                  `${keyPrefix}/marked.jpg`,
                  clean.watermarkedBuffer,
                  "image/jpeg"
                )
              : null;
          if (showMark && !marked) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Please use a larger photo so we can prepare your preview.",
            });
          }
          stage = "save_draft";
          const draft = await createPreviewDraft({
            landing: previewLanding(input.landing),
            originalImageKey: original.key,
            originalImageUrl: original.url,
            logoImageKey: uploadedLogo?.key,
            brandedImageKey: marked?.key ?? clean.key,
            brandedImageUrl: marked?.url ?? clean.url,
            cleanImageKey: clean.key,
            cleanImageUrl: clean.url,
            caption,
            businessName,
            suburb,
          });
          stage = "log_event";
          await logConversionEvent(null, "tool_used", {
            source: "job_photo_preview",
            landing: input.landing ?? null,
            trade: trade ?? null,
            hasLogo: Boolean(logo),
            hasBusinessName: Boolean(businessName),
          });
          return draft;
        } catch (error) {
          if (!aiStarted) {
            giveBackIp();
            if (reservedDay) {
              void releasePreviewDailySlot(reservedDay).catch(releaseError => {
                console.error(
                  "[Preview] Could not release daily slot",
                  releaseError
                );
              });
            }
          }
          if (error instanceof TRPCError) throw error;
          const failure = describePreviewFailure(error);
          console.error(
            `[Preview] Creation failed at ${stage} (${failure.reason}): ${failure.detail}`
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: previewFailureMessage(failure.reason),
          });
        }
      }),

    /** Retrieve an anonymous active preview through its opaque browser token. */
    get: publicProcedure
      .input(z.object({ token: z.string().min(32).max(128) }))
      .query(async ({ input }) => {
        const preview = await getPublicPreviewDraft(input.token);
        if (!preview) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "This preview has expired. Create a new free preview to continue.",
          });
        }
        return preview;
      }),

    /** Let a visitor refine the generated caption before saving it with email. */
    updateCaption: publicProcedure
      .input(
        z.object({
          token: z.string().min(32).max(128),
          caption: z.string().trim().min(1).max(2200),
        })
      )
      .mutation(({ input }) => updatePublicPreviewCaption(input)),

    /** Claim exactly one saved preview after the visitor completes email access. */
    claim: protectedProcedure
      .input(z.object({ token: z.string().min(32).max(128) }))
      .mutation(async ({ ctx, input }) => {
        try {
          const draft = await getUnclaimedPreviewDraft(input.token);
          const claimer = draft
            ? await reconcileUserSubscription(await getUserById(ctx.user.id))
            : null;
          const prepared =
            draft && claimer ? await brandingForClaim(claimer, draft) : null;
          const result = await claimPreviewDraft({
            token: input.token,
            userId: ctx.user.id,
            ...(prepared
              ? {
                  caption: prepared.caption,
                  brandedImageKey: prepared.brandedImageKey,
                  brandedImageUrl: prepared.brandedImageUrl,
                  markedImageKey: prepared.markedImageKey,
                  markedImageUrl: prepared.markedImageUrl,
                }
              : {}),
          });
          if (!result.alreadyClaimed) {
            await logConversionEvent(ctx.user.id, "preview_draft_claimed");
            await maybeNoteFreePostsExhausted(ctx.user.id);
          }
          return result;
        } catch (error) {
          if (
            error instanceof PreviewDraftError &&
            error.code === "free_limit"
          ) {
            const claimer = await getUserById(ctx.user.id);
            const limit = postCreationLimit("free", claimer?.bonusFreePosts);
            await noteFreePostsExhausted(ctx.user.id, {
              used: limit ?? 0,
              limit: limit ?? 0,
            });
          }
          throw error;
        }
      }),
  }),

  /* --------------------------- Account --------------------------- */
  account: router({
    /** Full account snapshot: plan, subscription, logo, facebook connection. */
    overview: protectedProcedure.query(async ({ ctx }) => {
      await ensureReferralSchema();
      const user = await reconcileUserSubscription(
        await getUserById(ctx.user.id)
      );
      const integration = await getIntegration(ctx.user.id, "facebook");
      const facebookConnected = hasPublishingReadyFacebookPage(integration);
      const plan = (user?.plan ?? "free") as "free" | PlanId;
      const trial = await getTrialEligibility({
        userId: ctx.user.id,
        email: user?.email,
        facebookPageId: integration?.pageId,
        stripeCustomerId: user?.stripeCustomerId,
      });
      const used = await countUserPostsSince(
        ctx.user.id,
        usageStartForPlan(plan)
      );
      const limit = postCreationLimit(plan, user?.bonusFreePosts);
      let logoUrl: string | null = null;
      if (user?.logoKey) {
        try {
          logoUrl = await storageGetSignedUrl(user.logoKey);
        } catch (error) {
          console.warn("[Account] Could not create logo preview URL", error);
        }
      }
      const businessName = cleanPreviewText(
        user?.businessName ?? undefined,
        PREVIEW_BUSINESS_NAME_MAX
      );
      const brandSuggestion = businessName
        ? null
        : await getLatestClaimedPreviewBrand(ctx.user.id);
      return {
        plan,
        subscriptionStatus: user?.subscriptionStatus ?? "none",
        trialEligible: trial.eligible,
        usage: { used, limit },
        hasLogo: Boolean(user?.logoKey),
        logoUrl,
        businessName: businessName ?? null,
        suburb:
          cleanPreviewText(user?.suburb ?? undefined, PREVIEW_SUBURB_MAX) ??
          null,
        businessPhone: storedBrandPhone(user?.businessPhone),
        businessWebsite: storedBrandWebsite(user?.businessWebsite),
        trade: previewTradeLabel(user?.trade ?? undefined) ?? null,
        brandSetupSkipped: Boolean(user?.brandSetupSkipped),
        ...presentBorderSettings(user),
        brandSuggestion,
        facebook: integration
          ? {
              status: integration.status,
              pageId: integration.pageId,
              pageName: integration.pageName,
              connected: facebookConnected,
            }
          : null,
        facebookConfigured: isFacebookConfigured(),
        stripeConfigured: isStripeConfigured(),
      };
    }),

    /** Personal referral link and the credits it has earned. */
    referral: protectedProcedure.query(async ({ ctx }) => {
      const { getStripe } = await import("./stripe");
      return getReferralDashboard(ctx.user.id, getStripe());
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
          mime
        );
        await updateUserLogo(ctx.user.id, key);
        return { success: true } as const;
      }),

    /**
     * First-login brand step. Business name is required. Town, trade, and logo
     * are optional. A saved name is what no-logo posts draw on the photo.
     */
    saveBrandSetup: protectedProcedure
      .input(
        z.object({
          businessName: z.string().min(1).max(PREVIEW_BUSINESS_NAME_MAX),
          suburb: z.string().max(PREVIEW_SUBURB_MAX).optional(),
          phone: z.string().max(40).optional(),
          website: z.string().max(200).optional(),
          trade: z.string().max(60).optional(),
          logo: z.string().min(10).max(2_800_000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await ensureReferralSchema();
        const businessName = cleanPreviewText(
          input.businessName,
          PREVIEW_BUSINESS_NAME_MAX
        );
        if (!businessName) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Add your business name to continue.",
          });
        }
        const suburb =
          cleanPreviewText(input.suburb, PREVIEW_SUBURB_MAX) ?? null;
        const phone = optionalBrandPhone(input.phone);
        const website = optionalBrandWebsite(input.website);
        const trade = previewTradeLabel(input.trade) ?? null;
        await updateUserBrand(ctx.user.id, {
          businessName,
          suburb,
          trade,
          brandSetupSkipped: false,
          ...(phone !== undefined ? { businessPhone: phone } : {}),
          ...(website !== undefined ? { businessWebsite: website } : {}),
        });
        if (input.logo) {
          const { buffer, mime } = decodeBase64Image(input.logo);
          if (!new Set(["image/jpeg", "image/png"]).has(mime)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Please use a JPG or PNG logo.",
            });
          }
          if (!buffer.length || buffer.length > 2 * 1024 * 1024) {
            throw new TRPCError({
              code: "PAYLOAD_TOO_LARGE",
              message: "Use a logo under 2 MB.",
            });
          }
          const ext = mime.includes("png") ? "png" : "jpg";
          const { key } = await storagePut(
            `${ctx.user.id}-logo/logo.${ext}`,
            buffer,
            mime
          );
          await updateUserLogo(ctx.user.id, key);
        }
        await updateOnboardingStep(ctx.user.id, "profileCompleted", true);
        return { success: true } as const;
      }),

    /** Update the optional phone and website shown on the name bar. */
    saveBrandContact: protectedProcedure
      .input(
        z.object({
          phone: z.string().max(40),
          website: z.string().max(200),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await ensureReferralSchema();
        const phone = optionalBrandPhone(input.phone);
        const website = optionalBrandWebsite(input.website);
        await updateUserBrand(ctx.user.id, {
          businessPhone: phone ?? null,
          businessWebsite: website ?? null,
        });
        return {
          success: true as const,
          phone: phone ?? null,
          website: website ?? null,
        };
      }),

    /**
     * Frame used on every post this account generates from now on.
     * Existing accounts stay on None until they pick something else.
     */
    saveBorder: protectedProcedure
      .input(
        z.object({
          style: z.enum(["none", "solid", "line", "brand", "bar"]),
          color: z.string().max(7).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await ensureReferralSchema();
        const color =
          input.color === undefined ? undefined : parseBorderColor(input.color);
        if (input.color !== undefined && !color) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Enter a brand color like #1B4F8A.",
          });
        }
        await updateUserBorder(ctx.user.id, {
          borderStyle: input.style,
          ...(color ? { borderColor: color } : {}),
        });
        return {
          success: true as const,
          style: input.style,
          color: color ?? null,
        };
      }),

    /** Leave the brand step for later. The dashboard keeps a nudge. */
    skipBrandSetup: protectedProcedure.mutation(async ({ ctx }) => {
      await ensureReferralSchema();
      await updateUserBrand(ctx.user.id, { brandSetupSkipped: true });
      return { success: true } as const;
    }),
  }),

  /* ---------------------------- Posts ---------------------------- */
  posts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      const account = {
        plan: user?.plan,
        subscriptionStatus: user?.subscriptionStatus,
      };
      const rows = await getUserPosts(ctx.user.id);
      return rows.map(post => presentPostForAccount(post, account));
    }),

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
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Enforce the lifetime Free limit and monthly paid-plan limits (server-side).
        const user0 = await reconcileUserSubscription(
          await getUserById(ctx.user.id)
        );
        const plan = (user0?.plan ?? "free") as "free" | PlanId;
        const limit = postCreationLimit(plan, user0?.bonusFreePosts);
        const used =
          limit === null
            ? 0
            : await countUserPostsSince(ctx.user.id, usageStartForPlan(plan));
        if (limit !== null) {
          if (used >= limit) {
            if (plan === "free") {
              await noteFreePostsExhausted(ctx.user.id, { used, limit });
            }
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                plan === "free"
                  ? `You've reached the free limit of ${limit} posts. Upgrade to keep posting.`
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
          mime
        );

        // 2. Caption (uses a signed URL the model can fetch)
        const user = user0 ?? (await getUserById(ctx.user.id));
        let logoBuffer: Buffer | null = null;
        if (user?.logoKey) {
          try {
            logoBuffer = await fetchStorageBytes(user.logoKey);
          } catch {
            logoBuffer = null;
          }
        }
        const textBadge = signedInTextBadge({
          hasLogo: Boolean(logoBuffer),
          businessName: user?.businessName,
          suburb: user?.suburb,
          trade: input.trade ?? user?.trade,
        });
        let caption = "";
        try {
          const signed = await storageGetSignedUrl(original.key);
          caption = await generateCaption({
            imageUrl: signed,
            trade: textBadge
              ? (input.trade ?? user?.trade ?? undefined)
              : input.trade,
            tone: input.tone,
            businessName: textBadge?.businessName ?? input.businessName,
            suburb: textBadge?.suburb,
            callToAction: textBadge?.callToAction,
          });
        } catch (e) {
          caption =
            "Another job done right. Quality work you can count on. " +
            "#TradeLife #QualityWork #LocalBusiness";
        }

        // 3. Brand with logo (if present). The clean file is what paid plans publish.
        // A name badge is only drawn when that logo is missing.
        const account = {
          plan: user?.plan ?? plan,
          subscriptionStatus: user?.subscriptionStatus,
        };
        const showMark = accountShowsWatermark(account);
        if (showMark) {
          const code = await ensureReferralCode(ctx.user.id);
          caption = withSnapPostCaptionFooter(caption, {
            include: true,
            referralUrl: referralPublicUrl(code),
          });
        }
        const postKey = `${ctx.user.id}-posts/${Date.now()}`;
        const branded = await brandSignedInPhoto({
          photoBuffer: buffer,
          logoBuffer,
          businessName: user?.businessName,
          suburb: user?.suburb,
          phone: user?.businessPhone,
          website: user?.businessWebsite,
          trade: input.trade ?? user?.trade,
          destKeyPrefix: postKey,
          watermark: showMark,
          border: {
            style: user?.borderStyle,
            color: user?.borderColor,
          },
        });
        const marked =
          showMark && branded.watermarkedBuffer
            ? await storagePut(
                `${postKey}/marked.jpg`,
                branded.watermarkedBuffer,
                "image/jpeg"
              )
            : null;

        // 4. Persist
        const saved = await createPost({
          userId: ctx.user.id,
          originalImageKey: original.key,
          originalImageUrl: original.url,
          brandedImageKey: branded.key,
          brandedImageUrl: branded.url,
          markedImageKey: marked?.key ?? null,
          markedImageUrl: marked?.url ?? null,
          caption,
          status: "draft",
        });
        const post = saved ? presentPostForAccount(saved, account) : saved;
        await logConversionEvent(ctx.user.id, "post_draft_created", { plan });
        if (plan === "free" && limit !== null && used + 1 >= limit) {
          await noteFreePostsExhausted(ctx.user.id, { used: used + 1, limit });
        }
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
            message:
              "Please verify your email before posting to Facebook. Check your inbox for the verification link.",
          });
        }

        const post = await getPostById(input.id);
        if (!post || post.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const integration = await getIntegration(ctx.user.id, "facebook");
        if (!hasPublishingReadyFacebookPage(integration)) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Connect a Facebook page first. Facebook posting activates once your Meta app is approved.",
          });
        }
        try {
          const publisher = await reconcileUserSubscription(
            await getUserById(ctx.user.id)
          );
          const account = {
            plan: publisher?.plan,
            subscriptionStatus: publisher?.subscriptionStatus,
          };
          const imageKey = publishableImageKey(post, account);
          if (!imageKey) {
            throw new Error("This post has no image to publish.");
          }
          const imageUrl = await storageGetSignedUrl(imageKey);
          const fbId = await postPhotoToPage({
            pageId: integration.pageId,
            pageAccessToken: integration.pageAccessToken,
            imageUrl,
            caption: publishableCaption(post.caption, account),
          });
          const facebookPostUrl = await getPublishedPostPermalink({
            postId: fbId,
            pageAccessToken: integration.pageAccessToken,
          });
          await updatePost(input.id, {
            status: "published",
            facebookPostId: fbId,
            errorMessage: null,
          });
          await logConversionEvent(ctx.user.id, "post_published");
          return {
            success: true,
            facebookPostId: fbId,
            facebookPostUrl,
            pageName: integration.pageName ?? "your Facebook Page",
          } as const;
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
              connected: hasPublishingReadyFacebookPage(integration),
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
        await logConversionEvent(ctx.user.id, "facebook_connection_clicked");
        return { url: buildFacebookAuthUrl(redirectUri, state) };
      }),

    /** List business portfolios available to the authenticated contractor. */
    listBusinesses: protectedProcedure.query(async ({ ctx }) => {
      const integration = await getIntegration(ctx.user.id, "facebook");
      if (!integration?.accessToken) return [];
      try {
        return await listBusinesses(integration.accessToken);
      } catch (error) {
        console.error("[Facebook] Business portfolio discovery failed", error);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Facebook could not read your business portfolios. Reconnect Facebook and accept the requested business and Page access.",
        });
      }
    }),

    /** List publishing-ready Pages inside one contractor-selected business portfolio. */
    listPages: protectedProcedure
      .input(z.object({ businessId: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const integration = await getIntegration(ctx.user.id, "facebook");
        if (!integration?.accessToken) return [];
        try {
          const pages = await listPagesForBusiness(
            input.businessId,
            integration.accessToken
          );
          return pages.map(p => ({ id: p.id, name: p.name }));
        } catch (error) {
          console.error("[Facebook] Page discovery failed", error);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Facebook could not read Pages in this business portfolio. Reconnect Facebook and accept the requested business and Page access.",
          });
        }
      }),

    /** Select a business portfolio and Page, storing the page-scoped publish token. */
    selectPage: protectedProcedure
      .input(
        z.object({
          businessId: z.string().min(1),
          businessName: z.string().min(1),
          pageId: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const integration = await getIntegration(ctx.user.id, "facebook");
        if (!integration?.accessToken) {
          throw new TRPCError({ code: "PRECONDITION_FAILED" });
        }
        const pages = await listPagesForBusiness(
          input.businessId,
          integration.accessToken
        );
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
        await updateOnboardingStep(ctx.user.id, "facebookConnected", true);
        await logConversionEvent(ctx.user.id, "facebook_page_connected");
        return { success: true } as const;
      }),

    /** Disconnect Facebook. */
    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      await deleteIntegration(ctx.user.id, "facebook");
      await updateOnboardingStep(ctx.user.id, "facebookConnected", false);
      return { success: true } as const;
    }),
  }),

  /* ----------------------------- Billing ----------------------------- */
  billing: router({
    plans: publicProcedure.query(() => PLANS),

    /**
     * Confirm a completed Stripe Checkout belongs to the signed-in customer
     * before a browser records an analytics conversion event.
     */
    checkoutOutcome: protectedProcedure
      .input(z.object({ sessionId: z.string().min(1).max(255) }))
      .query(async ({ ctx, input }) => {
        const stripe = getStripe();
        if (!stripe) return { outcome: null };

        try {
          const session = await stripe.checkout.sessions.retrieve(
            input.sessionId
          );
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id;
          if (!subscriptionId) return { outcome: null };

          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          return {
            outcome: getVerifiedCheckoutOutcome(
              session,
              subscription,
              ctx.user.id
            ),
          };
        } catch {
          // Do not reveal whether a supplied Stripe session exists or belongs to another customer.
          return { outcome: null };
        }
      }),

    /** Record that the in-dashboard upgrade panel was shown. */
    trackPaywallShown: protectedProcedure.mutation(async ({ ctx }) => {
      await logConversionEvent(ctx.user.id, "paywall_shown");
      return { success: true } as const;
    }),

    /** Create a Stripe Checkout session for a plan. */
    createCheckout: protectedProcedure
      .input(
        z.object({
          plan: z.enum(["starter", "pro"]),
          origin: z.string().url(),
          promotionCode: z.string().trim().max(100).optional(),
        })
      )
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
        const user = await reconcileUserSubscription(
          await getUserById(ctx.user.id)
        );
        if (
          user &&
          hasPaidEntitlement({
            plan: user.plan,
            subscriptionStatus: user.subscriptionStatus ?? "none",
          })
        ) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `You already have an active ${user.plan} subscription. Use Manage subscription to change your plan.`,
          });
        }
        const integration = await getIntegration(ctx.user.id, "facebook");
        const trial = await getTrialEligibility({
          userId: ctx.user.id,
          email: user?.email,
          facebookPageId: integration?.pageId,
          stripeCustomerId: user?.stripeCustomerId,
        });
        const trialBlock = getTrialCheckoutBlock({
          trialEligible: trial.eligible,
          facebookPageId: integration?.pageId,
        });
        if (trialBlock === "facebook_page_required") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Connect your Facebook business Page before starting your one 7-day trial. This protects the trial from duplicate claims.",
          });
        }
        let promotion: { id: string; code: string } | null = null;
        try {
          promotion = await findActivePromotionCode(
            stripe,
            input.promotionCode
          );
        } catch {
          console.error("[Stripe] promotion code lookup failed");
          promotion = null;
        }
        console.log(
          `[Stripe] Creating checkout session for user ${ctx.user.id}, plan ${input.plan}, priceId ${priceId}`
        );
        let checkoutCustomerId = user?.stripeCustomerId ?? null;
        if (user) {
          try {
            checkoutCustomerId = await ensureReferrerCustomer(user, stripe);
          } catch (error) {
            console.error(
              "[Referral] credit could not be prepared for checkout",
              error
            );
          }
        }
        const sessionParams = {
          mode: "subscription" as const,
          line_items: [{ price: priceId, quantity: 1 }],
          ...(checkoutCustomerId
            ? { customer: checkoutCustomerId }
            : { customer_email: user?.email ?? undefined }),
          client_reference_id: String(ctx.user.id),
          metadata: {
            userId: String(ctx.user.id),
            plan: input.plan,
            trialEligible: String(trial.eligible),
            facebookPageId: integration?.pageId ?? "",
          },
          subscription_data: getCheckoutTrialData(trial.eligible),
          success_url: `${input.origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${input.origin}/pricing?checkout=cancel`,
        };
        let session;
        let appliedPromotion = promotion;
        try {
          session = await stripe.checkout.sessions.create({
            ...sessionParams,
            ...checkoutPromotionParams(promotion?.id ?? null),
          });
        } catch (error) {
          if (!promotion) throw error;
          appliedPromotion = null;
          console.error("[Stripe] promotion code was not applied", {
            code: promotion.code,
          });
          session = await stripe.checkout.sessions.create({
            ...sessionParams,
            allow_promotion_codes: true,
          });
        }
        console.log(`[Stripe] Session created:`, {
          id: session.id,
          url: session.url,
        });
        if (!session.url) {
          console.error(`[Stripe] Session URL is null or undefined!`);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create Stripe checkout session",
          });
        }
        await logConversionEvent(ctx.user.id, "checkout_started", {
          plan: input.plan,
          trialEligible: trial.eligible,
          ...(appliedPromotion ? { promotionCode: appliedPromotion.code } : {}),
        });
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
        })
      )
      .mutation(async ({ input }) => {
        try {
          const { createContact } = await import("./db");
          const { queueAccountEmail } = await import(
            "./accountEmailAutomation"
          );
          const ownerEmail = process.env.OWNER_EMAIL || "admin@snappostpro.com";

          // Persist first. Once saved, owner notification is handled by the
          // durable outbox so an email-provider outage never asks the visitor
          // to submit their enquiry again.
          const contactId = await createContact({
            name: input.name,
            email: input.email,
            message: input.message,
            status: "new",
          });
          if (!contactId) {
            throw new Error("Contact was not persisted");
          }
          await queueAccountEmail({
            recipientEmail: ownerEmail,
            entityKey: `contact:${contactId}`,
            campaignKey: "contact-owner-alert:v1",
            kind: "contact-owner-alert",
            metadata: { contactId },
          });

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
      .input(z.object({ email: z.string().trim().toLowerCase().email() }))
      .mutation(async ({ input }) => {
        const email = input.email.trim().toLowerCase();
        let subscription;
        try {
          subscription = await createNewsletterSubscriber(email);
        } catch {
          // Do not claim a subscription succeeded unless it was persisted.
          console.error("[Newsletter] subscription persistence failed");
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "We could not save your newsletter subscription. Please try again.",
          });
        }

        // Existing active addresses are left alone and unsubscribed addresses
        // are deliberately not reactivated through this public form.
        if (!subscription.created || !subscription.subscriberId) {
          return { success: true } as const;
        }

        // The welcome outbox row was committed atomically above. This attempts
        // the welcome immediately when the owner-approved feature is enabled;
        // a provider failure remains queued for the worker instead of failing
        // the visitor's successfully persisted subscription.
        try {
          await attemptImmediateNewsletterWelcome(subscription.subscriberId);
        } catch {
          console.error("[Newsletter] immediate welcome attempt failed");
        }

        // Preserve owner notification for one newly persisted signup only.
        const ownerEmail = process.env.OWNER_EMAIL || "admin@snappostpro.com";
        try {
          await sendNewsletterSignupNotification(email, ownerEmail);
        } catch {
          console.error("[Newsletter] owner signup notification failed");
        }

        return { success: true } as const;
      }),
  }),

  onboarding: router({
    /** Get the current user's onboarding checklist. */
    getChecklist: protectedProcedure.query(async ({ ctx }) => {
      const [checklist, integration] = await Promise.all([
        getOrCreateOnboardingChecklist(ctx.user.id),
        getIntegration(ctx.user.id, "facebook"),
      ]);
      const facebookConnected = hasPublishingReadyFacebookPage(integration);
      if (checklist?.facebookConnected !== facebookConnected) {
        return await updateOnboardingStep(
          ctx.user.id,
          "facebookConnected",
          facebookConnected
        );
      }
      return checklist;
    }),

    /** Mark profile as completed (logo uploaded or business name filled in). */
    completeProfile: protectedProcedure.mutation(async ({ ctx }) => {
      return await updateOnboardingStep(ctx.user.id, "profileCompleted", true);
    }),

    /** Mark Facebook connection as completed. */
    completeFacebookConnection: protectedProcedure.mutation(async ({ ctx }) => {
      const integration = await getIntegration(ctx.user.id, "facebook");
      return await updateOnboardingStep(
        ctx.user.id,
        "facebookConnected",
        hasPublishingReadyFacebookPage(integration)
      );
    }),

    /** Mark first post as created. */
    completeFirstPost: protectedProcedure.mutation(async ({ ctx }) => {
      return await updateOnboardingStep(ctx.user.id, "firstPostCreated", true);
    }),

    /** Mark first post as published to Facebook. */
    completeFirstPostPublished: protectedProcedure.mutation(async ({ ctx }) => {
      return await updateOnboardingStep(
        ctx.user.id,
        "firstPostPublished",
        true
      );
    }),
  }),
});

export type AppRouter = typeof appRouter;
