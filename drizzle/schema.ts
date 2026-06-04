import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

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
