import {
  boolean,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** Subscription plan: free (default), starter ($19/mo), pro ($29/mo). */
  plan: mysqlEnum("plan", ["free", "starter", "pro"]).default("free").notNull(),
  /** Stripe customer identifier, set after first checkout. */
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  /** Stripe subscription identifier. */
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  /** Subscription status mirrored from Stripe: active, trialing, past_due, canceled, none. */
  subscriptionStatus: varchar("subscriptionStatus", { length: 32 }).default(
    "none"
  ),
  /** Logo image storage key used to brand uploaded photos. */
  logoKey: varchar("logoKey", { length: 256 }),
  /** Email verification status: pending, verified. */
  emailVerified: boolean("emailVerified").default(false).notNull(),
  /** Email verification token (hashed). */
  emailVerificationToken: varchar("emailVerificationToken", { length: 256 }),
  /** Email verification token expiry. */
  emailVerificationTokenExpiry: timestamp("emailVerificationTokenExpiry"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** One-time passwordless email sign-in links for the Railway-hosted app. */
export const authTokens = mysqlTable("auth_tokens", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuthToken = typeof authTokens.$inferSelect;

/**
 * A durable ledger of first-time trial claims. Email is stored as a SHA-256
 * hash and a connected Facebook Page is an additional anti-abuse signal.
 */
export const trialClaims = mysqlTable("trial_claims", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  emailHash: varchar("emailHash", { length: 64 }).notNull().unique(),
  facebookPageId: varchar("facebookPageId", { length: 128 }).unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }).unique(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", {
    length: 128,
  }).unique(),
  redeemedAt: timestamp("redeemedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrialClaim = typeof trialClaims.$inferSelect;
export type InsertTrialClaim = typeof trialClaims.$inferInsert;

/**
 * Social integrations (Facebook pages). Stores OAuth tokens and the selected page.
 * Tokens are sensitive — never expose them to the client.
 */
export const integrations = mysqlTable("integrations", {
  id: int("id").autoincrement().primaryKey(),
  /** FK to users.id (owner of this integration). */
  userId: int("userId").notNull(),
  /** Provider name, e.g. "facebook". */
  provider: varchar("provider", { length: 32 }).notNull(),
  /** Long-lived user access token returned by the provider. */
  accessToken: text("accessToken"),
  /** Page-scoped access token used to publish to the page. */
  pageAccessToken: text("pageAccessToken"),
  /** Selected Facebook page id. */
  pageId: varchar("pageId", { length: 128 }),
  /** Selected Facebook page name (for display). */
  pageName: varchar("pageName", { length: 256 }),
  /** Connection status: connected, pending, disconnected. */
  status: varchar("status", { length: 32 }).default("connected").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = typeof integrations.$inferInsert;

/**
 * Posts created in the app: an uploaded + branded photo with an AI caption,
 * optionally published to a connected Facebook page.
 */
export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  /** FK to users.id (author). */
  userId: int("userId").notNull(),
  /** Storage key for the original uploaded image. */
  originalImageKey: varchar("originalImageKey", { length: 256 }),
  /** Storage URL for the original uploaded image. */
  originalImageUrl: varchar("originalImageUrl", { length: 512 }),
  /** Storage key for the branded image (with logo overlay). */
  brandedImageKey: varchar("brandedImageKey", { length: 256 }),
  /** Storage URL for the branded image. */
  brandedImageUrl: varchar("brandedImageUrl", { length: 512 }),
  /** AI-generated caption text. */
  caption: text("caption"),
  /** Lifecycle status: draft, published, failed. */
  status: mysqlEnum("status", ["draft", "published", "failed"])
    .default("draft")
    .notNull(),
  /** Facebook post id returned after publishing. */
  facebookPostId: varchar("facebookPostId", { length: 128 }),
  /** Error message if publishing failed. */
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

/**
 * A short-lived, anonymous photo-to-post preview created before a visitor
 * supplies an email address. The raw token stays only in the browser/email
 * link; this table stores a SHA-256 hash. When the visitor opens their secure
 * email link, the assets become the first saved draft in their account.
 */
export const previewDrafts = mysqlTable(
  "preview_drafts",
  {
    id: int("id").autoincrement().primaryKey(),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
    landing: varchar("landing", { length: 32 }),
    originalImageKey: varchar("originalImageKey", { length: 256 }).notNull(),
    originalImageUrl: varchar("originalImageUrl", { length: 512 }).notNull(),
    logoImageKey: varchar("logoImageKey", { length: 256 }),
    brandedImageKey: varchar("brandedImageKey", { length: 256 }).notNull(),
    brandedImageUrl: varchar("brandedImageUrl", { length: 512 }).notNull(),
    caption: text("caption").notNull(),
    emailRequestedAt: timestamp("emailRequestedAt"),
    userId: int("userId"),
    postId: int("postId"),
    claimedAt: timestamp("claimedAt"),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    tokenHashUnique: uniqueIndex("preview_drafts_token_hash_uq").on(
      table.tokenHash
    ),
    expiryIndex: index("preview_drafts_expiry_idx").on(table.expiresAt),
  })
);

export type PreviewDraft = typeof previewDrafts.$inferSelect;
export type InsertPreviewDraft = typeof previewDrafts.$inferInsert;

/**
 * Onboarding checklist tracking for new contractors.
 * Tracks completion of key setup steps to improve retention.
 */
export const onboardingChecklist = mysqlTable("onboarding_checklist", {
  id: int("id").autoincrement().primaryKey(),
  /** FK to users.id (contractor). */
  userId: int("userId").notNull().unique(),
  /** Profile setup: uploaded logo or filled in business name. */
  profileCompleted: boolean("profileCompleted").default(false).notNull(),
  profileCompletedAt: timestamp("profileCompletedAt"),
  /** Facebook connection: at least one page connected. */
  facebookConnected: boolean("facebookConnected").default(false).notNull(),
  facebookConnectedAt: timestamp("facebookConnectedAt"),
  /** First post: at least one photo uploaded and branded. */
  firstPostCreated: boolean("firstPostCreated").default(false).notNull(),
  firstPostCreatedAt: timestamp("firstPostCreatedAt"),
  /** First post published to Facebook. */
  firstPostPublished: boolean("firstPostPublished").default(false).notNull(),
  firstPostPublishedAt: timestamp("firstPostPublishedAt"),
  /** Overall completion percentage (0-100). */
  completionPercentage: int("completionPercentage").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OnboardingChecklist = typeof onboardingChecklist.$inferSelect;
export type InsertOnboardingChecklist = typeof onboardingChecklist.$inferInsert;

/**
 * Conversion funnel tracking for analytics.
 * Tracks key events: signup, first post, first publish, upgrade.
 */
export const conversionEvents = mysqlTable("conversion_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConversionEvent = typeof conversionEvents.$inferSelect;
export type InsertConversionEvent = typeof conversionEvents.$inferInsert;

/**
 * Contact form submissions.
 * Stores all inquiries from the contact form for lead tracking.
 */
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["new", "replied", "archived"])
    .default("new")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

/**
 * Newsletter subscribers.
 * Stores email addresses of users who signed up for the newsletter.
 */
export const newsletterSubscribers = mysqlTable("newsletterSubscribers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  status: mysqlEnum("status", ["active", "unsubscribed"])
    .default("active")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber =
  typeof newsletterSubscribers.$inferInsert;

/**
 * Additive state for newsletter subscribers. `welcomeEligible` distinguishes
 * subscriptions created after automation was introduced from the pre-existing
 * list, so legacy subscribers never receive a retroactive welcome message.
 */
export const newsletterSubscriberState = mysqlTable(
  "newsletter_subscriber_state",
  {
    subscriberId: int("subscriberId").primaryKey(),
    /** Opaque 32-byte-or-longer token used only to construct unsubscribe URLs. */
    unsubscribeToken: varchar("unsubscribeToken", { length: 128 }).notNull(),
    /** Durable activation time used for the 72-hour follow-up calculation. */
    activationAnchor: datetime("activationAnchor").notNull(),
    welcomeEligible: boolean("welcomeEligible").default(false).notNull(),
    createdAt: datetime("createdAt")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: datetime("updatedAt")
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => ({
    unsubscribeTokenUnique: uniqueIndex("newsletter_state_token_uq").on(
      table.unsubscribeToken
    ),
    activationAnchorIndex: index("newsletter_state_anchor_idx").on(
      table.activationAnchor
    ),
  })
);

export type NewsletterSubscriberState =
  typeof newsletterSubscriberState.$inferSelect;

/**
 * Durable, idempotent newsletter outbox. The unique subscriber/campaign key
 * lets workers safely resume after process failures without re-queuing a send.
 */
export const newsletterDeliveryLedger = mysqlTable(
  "newsletter_delivery_ledger",
  {
    id: int("id").autoincrement().primaryKey(),
    subscriberId: int("subscriberId").notNull(),
    campaignKey: varchar("campaignKey", { length: 191 }).notNull(),
    kind: varchar("kind", { length: 16 }).notNull(),
    issueIndex: int("issueIndex"),
    status: varchar("status", { length: 16 }).default("pending").notNull(),
    attempts: int("attempts").default(0).notNull(),
    /** Never reset: bounds retries to Resend's 24-hour idempotency window. */
    firstAttemptAt: datetime("firstAttemptAt"),
    lastAttemptAt: datetime("lastAttemptAt"),
    nextAttemptAt: datetime("nextAttemptAt"),
    sentAt: datetime("sentAt"),
    providerMessageId: varchar("providerMessageId", { length: 191 }),
    lastErrorClass: varchar("lastErrorClass", { length: 32 }),
    /** Set once after an ambiguous provider outcome; clear only on accepted id. */
    ambiguousSince: datetime("ambiguousSince"),
    uncertainAt: datetime("uncertainAt"),
    alertedAt: datetime("alertedAt"),
    createdAt: datetime("createdAt")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: datetime("updatedAt")
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => ({
    subscriberCampaignUnique: uniqueIndex(
      "newsletter_delivery_sub_campaign_uq"
    ).on(table.subscriberId, table.campaignKey),
    dispatchIndex: index("newsletter_delivery_dispatch_idx").on(
      table.status,
      table.nextAttemptAt
    ),
  })
);

export type NewsletterDeliveryLedger =
  typeof newsletterDeliveryLedger.$inferSelect;

/**
 * Durable outbox for account, billing, onboarding, and owner-alert emails.
 * A unique entity/campaign pair makes a provider retry or Stripe replay safe.
 */
export const accountEmailDelivery = mysqlTable(
  "account_email_delivery",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId"),
    recipientEmail: varchar("recipientEmail", { length: 320 }),
    entityKey: varchar("entityKey", { length: 191 }).notNull(),
    campaignKey: varchar("campaignKey", { length: 191 }).notNull(),
    kind: varchar("kind", { length: 32 }).notNull(),
    status: varchar("status", { length: 16 }).default("pending").notNull(),
    attempts: int("attempts").default(0).notNull(),
    availableAt: datetime("availableAt").notNull(),
    nextAttemptAt: datetime("nextAttemptAt"),
    firstAttemptAt: datetime("firstAttemptAt"),
    lastAttemptAt: datetime("lastAttemptAt"),
    acceptedAt: datetime("acceptedAt"),
    providerMessageId: varchar("providerMessageId", { length: 191 }),
    lastErrorClass: varchar("lastErrorClass", { length: 32 }),
    metadata: text("metadata"),
    createdAt: datetime("createdAt")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: datetime("updatedAt")
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => ({
    entityCampaignUnique: uniqueIndex("account_email_entity_campaign_uq").on(
      table.entityKey,
      table.campaignKey
    ),
    dispatchIndex: index("account_email_dispatch_idx").on(
      table.status,
      table.nextAttemptAt
    ),
    userIndex: index("account_email_user_idx").on(table.userId),
  })
);

export const accountEmailRollout = mysqlTable("account_email_rollout", {
  rolloutKey: varchar("rolloutKey", { length: 64 }).primaryKey(),
  startedAt: datetime("startedAt").notNull(),
});

export type AccountEmailDelivery = typeof accountEmailDelivery.$inferSelect;
