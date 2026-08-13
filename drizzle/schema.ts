import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  subscriptionStatus: varchar("subscriptionStatus", { length: 32 }).default("none"),
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
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }).unique(),
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
  status: mysqlEnum("status", ["draft", "published", "failed"]).default("draft").notNull(),
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
  status: mysqlEnum("status", ["new", "replied", "archived"]).default("new").notNull(),
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
  status: mysqlEnum("status", ["active", "unsubscribed"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;
