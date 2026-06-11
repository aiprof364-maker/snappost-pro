import { and, desc, eq, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertIntegration,
  InsertPost,
  InsertUser,
  InsertContact,
  InsertNewsletterSubscriber,
  integrations,
  posts,
  users,
  contacts,
  newsletterSubscribers,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/** Update subscription / Stripe fields for a user. */
export async function updateUserSubscription(
  userId: number,
  data: Partial<
    Pick<
      InsertUser,
      "plan" | "stripeCustomerId" | "stripeSubscriptionId" | "subscriptionStatus"
    >
  >,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

/** Update the user's logo storage key used for branding. */
export async function updateUserLogo(userId: number, logoKey: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ logoKey }).where(eq(users.id, userId));
}

/* ----------------------------- Posts ----------------------------- */

export async function createPost(data: InsertPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(posts).values(data).$returningId();
  const id = result[0]?.id;
  return getPostById(id);
}

export async function getPostById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserPosts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(posts)
    .where(eq(posts.userId, userId))
    .orderBy(desc(posts.createdAt));
}

export async function updatePost(
  id: number,
  data: Partial<InsertPost>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(posts).set(data).where(eq(posts.id, id));
}

/* -------------------------- Integrations -------------------------- */

export async function upsertIntegration(data: InsertIntegration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getIntegration(data.userId, data.provider ?? "facebook");
  if (existing) {
    await db
      .update(integrations)
      .set({
        accessToken: data.accessToken ?? existing.accessToken,
        pageAccessToken: data.pageAccessToken ?? existing.pageAccessToken,
        pageId: data.pageId ?? existing.pageId,
        pageName: data.pageName ?? existing.pageName,
        status: data.status ?? existing.status,
      })
      .where(eq(integrations.id, existing.id));
    return getIntegration(data.userId, data.provider ?? "facebook");
  }

  await db.insert(integrations).values(data);
  return getIntegration(data.userId, data.provider ?? "facebook");
}

export async function getIntegration(userId: number, provider = "facebook") {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, provider)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteIntegration(userId: number, provider = "facebook") {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, provider)));
}

/** Count posts created by a user since the given date (for monthly plan limits). */
export async function countUserPostsSince(
  userId: number,
  since: Date,
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select()
    .from(posts)
    .where(and(eq(posts.userId, userId), gte(posts.createdAt, since)));
  return rows.length;
}


/** Create a new contact form submission. */
export async function createContact(data: InsertContact): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create contact: database not available");
    return;
  }
  try {
    await db.insert(contacts).values(data);
  } catch (error) {
    console.error("[Database] Failed to create contact:", error);
  }
}

/** Get all contacts, optionally filtered by status. */
export async function getContacts(status?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (status) {
    return await db.select().from(contacts).where(eq(contacts.status, status as any));
  }
  return await db.select().from(contacts).orderBy(desc(contacts.createdAt));
}

/** Update contact status. */
export async function updateContactStatus(id: number, status: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(contacts).set({ status: status as any }).where(eq(contacts.id, id));
}

/** Create a new newsletter subscriber. */
export async function createNewsletterSubscriber(email: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create subscriber: database not available");
    return;
  }
  try {
    await db.insert(newsletterSubscribers).values({ email, status: "active" });
  } catch (error) {
    // Ignore duplicate email errors
    if (!(error as any).message?.includes("Duplicate")) {
      console.error("[Database] Failed to create subscriber:", error);
    }
  }
}

/** Get all newsletter subscribers. */
export async function getNewsletterSubscribers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt));
}

/** Unsubscribe an email from newsletter. */
export async function unsubscribeNewsletter(email: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(newsletterSubscribers).set({ status: "unsubscribed" }).where(eq(newsletterSubscribers.email, email));
}
