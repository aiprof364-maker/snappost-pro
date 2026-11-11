import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { and, eq, gt, isNull } from "drizzle-orm";
import express from "express";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { ACCESS_LINK_MAX_AGE_MS } from "@shared/accessLink";
import { authTokens } from "../drizzle/schema";
import { queueAccountEmail } from "./accountEmailAutomation";

type Row = Record<string, unknown>;

const memory = vi.hoisted(() => ({
  tokens: [] as Row[],
  users: [] as Row[],
  events: [] as unknown[][],
  tokenId: 0,
  userId: 0,
  skipNextUserRead: false,
  rejectNextUserInsert: false,
  failNextUserInsert: null as Error | null,
  breakNextRead: false,
  reset() {
    this.tokens.length = 0;
    this.users.length = 0;
    this.events.length = 0;
    this.tokenId = 0;
    this.userId = 0;
    this.skipNextUserRead = false;
    this.rejectNextUserInsert = false;
    this.failNextUserInsert = null;
    this.breakNextRead = false;
  },
}));

function chunkText(chunk: { value?: unknown }) {
  if (Array.isArray(chunk.value)) return chunk.value.join("");
  return typeof chunk.value === "string" ? chunk.value : "";
}

function matches(node: { queryChunks?: unknown[] }, row: Row): boolean {
  const chunks = (node.queryChunks ?? []) as Array<{
    queryChunks?: unknown[];
    constructor: { name: string };
    value?: unknown;
    name?: unknown;
    table?: unknown;
  }>;
  const nested = chunks.filter(chunk => Array.isArray(chunk?.queryChunks));
  const textBits = chunks
    .filter(chunk => chunk?.constructor?.name === "StringChunk")
    .map(chunk => chunkText(chunk));
  const joiner = textBits.find(text => text === " and " || text === " or ");
  if (nested.length > 1 && joiner) {
    const results = nested.map(child =>
      matches(child as { queryChunks?: unknown[] }, row)
    );
    return joiner.trim() === "or"
      ? results.some(Boolean)
      : results.every(Boolean);
  }
  if (nested.length === 1) {
    return matches(nested[0] as { queryChunks?: unknown[] }, row);
  }

  const column = chunks.find(
    chunk => typeof chunk?.name === "string" && chunk.table
  );
  const param = chunks.find(chunk => chunk?.constructor?.name === "Param");
  const text = textBits.join("");
  if (!column || typeof column.name !== "string") {
    throw new Error(`Cannot read column from SQL: ${text || "(empty)"}`);
  }
  const current = row[column.name];
  if (text.includes("is null")) return current == null;
  if (!param) throw new Error(`Cannot read SQL parameter: ${text}`);
  if (text.includes(" = ")) return current === param.value;
  if (text.includes(" > ")) {
    const left = current instanceof Date ? current.getTime() : Number(current);
    const right =
      param.value instanceof Date ? param.value.getTime() : Number(param.value);
    return left > right;
  }
  throw new Error(`Unsupported SQL fragment: ${text}`);
}

function memoryDb() {
  const rowsFor = (table: unknown) =>
    table === authTokens ? memory.tokens : memory.users;
  return {
    insert(table: unknown) {
      return {
        values: async (row: Row) => {
          if (table === authTokens) {
            memory.tokens.push({
              id: ++memory.tokenId,
              createdAt: new Date(),
              ...row,
              usedAt: row.usedAt ?? null,
            });
            return;
          }
          if (memory.failNextUserInsert) {
            const error = memory.failNextUserInsert;
            memory.failNextUserInsert = null;
            throw error;
          }
          if (memory.rejectNextUserInsert) {
            memory.rejectNextUserInsert = false;
            throw Object.assign(new Error("Duplicate entry"), {
              code: "ER_DUP_ENTRY",
              errno: 1062,
            });
          }
          if (memory.users.some(user => user.openId === row.openId)) {
            throw Object.assign(new Error("Duplicate entry"), {
              code: "ER_DUP_ENTRY",
              errno: 1062,
            });
          }
          memory.users.push({
            id: ++memory.userId,
            name: null,
            plan: "free",
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            subscriptionStatus: "none",
            logoKey: null,
            emailVerified: false,
            emailVerificationToken: null,
            emailVerificationTokenExpiry: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
            role: "user",
            ...row,
          });
        },
      };
    },
    select() {
      return {
        from(table: unknown) {
          return {
            where(condition: { queryChunks?: unknown[] }) {
              return {
                limit: async (count: number) => {
                  if (memory.breakNextRead) {
                    memory.breakNextRead = false;
                    throw new Error("database unavailable");
                  }
                  if (table !== authTokens && memory.skipNextUserRead) {
                    memory.skipNextUserRead = false;
                    return [];
                  }
                  return rowsFor(table)
                    .filter(row => matches(condition, row))
                    .slice(0, count);
                },
              };
            },
          };
        },
      };
    },
    update(table: unknown) {
      return {
        set(values: Row) {
          return {
            where: async (condition: { queryChunks?: unknown[] }) => {
              for (const row of rowsFor(table)) {
                if (matches(condition, row)) Object.assign(row, values);
              }
            },
          };
        },
      };
    },
  };
}

vi.mock("./db", () => ({
  getDb: async () => memoryDb(),
  logConversionEvent: async (...args: unknown[]) => {
    memory.events.push(args);
  },
}));

vi.mock("./accountEmailAutomation", () => ({
  queueAccountEmail: vi.fn(async () => undefined),
  runAccountEmailAutomation: vi.fn(async () => undefined),
}));

const { createMagicLinkToken, consumeMagicLinkToken } = await import("./auth");
const { registerAuthRoutes } = await import("./authRoutes");

let server: Server;
let origin: string;

beforeAll(async () => {
  process.env.AUTH_SESSION_SECRET = "test-access-link-secret";
  const app = express();
  registerAuthRoutes(app);
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

beforeEach(() => {
  memory.reset();
  vi.mocked(queueAccountEmail).mockClear();
  delete process.env.ADMIN_EMAIL;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close(err => (err ? reject(err) : resolve()))
  );
});

function locationOf(response: Response) {
  return new URL(
    response.headers.get("location") ?? "",
    "https://snappostpro.com"
  );
}

async function openLink(rawToken: string, next = "/dashboard") {
  const url = new URL("/api/auth/verify", origin);
  url.searchParams.set("token", rawToken);
  url.searchParams.set("next", next);
  return fetch(url, { redirect: "manual" });
}

describe("access link query harness", () => {
  it("can tell a reusable lookup from the old single-use filter", () => {
    const used = {
      id: 1,
      tokenHash: "abc",
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    };
    const expired = {
      ...used,
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    };
    expect(matches(eq(authTokens.tokenHash, "abc"), used)).toBe(true);
    expect(
      matches(
        and(
          eq(authTokens.tokenHash, "abc"),
          isNull(authTokens.usedAt),
          gt(authTokens.expiresAt, new Date())
        ),
        used
      )
    ).toBe(false);
    expect(
      matches(
        and(
          eq(authTokens.tokenHash, "abc"),
          gt(authTokens.expiresAt, new Date())
        ),
        expired
      )
    ).toBe(false);
  });
});

describe("forgiving access links", () => {
  it("keeps a new link usable for 24 hours and stores only its hash", async () => {
    const before = Date.now();
    const raw = await createMagicLinkToken("  Owner@Example.com ");
    const after = Date.now();
    const stored = memory.tokens[0];

    expect(stored?.email).toBe("owner@example.com");
    expect(stored?.usedAt).toBeNull();
    expect(stored?.tokenHash).not.toBe(raw);
    expect(String(stored?.tokenHash)).toHaveLength(64);
    expect(JSON.stringify(stored)).not.toContain(raw);
    expect((stored?.expiresAt as Date).getTime()).toBeGreaterThanOrEqual(
      before + ACCESS_LINK_MAX_AGE_MS
    );
    expect((stored?.expiresAt as Date).getTime()).toBeLessThanOrEqual(
      after + ACCESS_LINK_MAX_AGE_MS
    );
    expect(ACCESS_LINK_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("lets the same free-user link be opened again before it expires", async () => {
    const raw = await createMagicLinkToken("free@example.com");
    const expiresAt = memory.tokens[0]?.expiresAt;

    const first = await openLink(raw, "/dashboard?landing=hairdressers");
    const firstLocation = locationOf(first);
    expect(first.status).toBe(302);
    expect(firstLocation.pathname).toBe("/dashboard");
    expect(firstLocation.searchParams.get("account_created")).toBe("1");
    expect(firstLocation.searchParams.get("landing")).toBe("hairdressers");
    expect(first.headers.get("set-cookie")).toContain("snappost_session=");
    expect(first.headers.get("cache-control")).toBe("no-store");
    expect(first.headers.get("referrer-policy")).toBe("no-referrer");
    expect(memory.users).toHaveLength(1);
    expect(memory.users[0]?.role).toBe("user");
    expect(queueAccountEmail).toHaveBeenCalledTimes(1);

    const openedAt = memory.tokens[0]?.usedAt as Date;
    const second = await openLink(raw, "/dashboard?landing=hairdressers");
    const secondLocation = locationOf(second);
    expect(second.status).toBe(302);
    expect(secondLocation.pathname).toBe("/dashboard");
    expect(secondLocation.searchParams.get("account_created")).toBeNull();
    expect(second.headers.get("set-cookie")).toContain("snappost_session=");
    expect(memory.users).toHaveLength(1);
    expect(memory.tokens[0]?.expiresAt).toBe(expiresAt);
    expect((memory.tokens[0]?.usedAt as Date).getTime()).toBe(
      openedAt.getTime()
    );
    expect(queueAccountEmail).toHaveBeenCalledTimes(1);
    expect(
      memory.events.filter(event => event[1] === "free_account_created")
    ).toHaveLength(1);
    expect(
      memory.events.filter(event => event[1] === "magic_link_opened")
    ).toHaveLength(2);
  });

  it("rejects a link only after it has truly expired, even if it was opened before", async () => {
    const raw = await createMagicLinkToken("free@example.com");
    expect((await openLink(raw)).status).toBe(302);

    memory.tokens[0]!.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const stillValid = await consumeMagicLinkToken(raw);
    expect(stillValid.status).toBe("ok");
    if (stillValid.status === "ok") {
      expect(stillValid.accountCreated).toBe(false);
    }

    memory.tokens[0]!.expiresAt = new Date(Date.now() - 1);
    const expired = await openLink(raw, "/preview?landing=contractors");
    const expiredLocation = locationOf(expired);
    expect(expired.status).toBe(302);
    expect(expiredLocation.pathname).toBe("/login");
    expect(expiredLocation.searchParams.get("error")).toBe("expired-link");
    expect(expiredLocation.searchParams.get("next")).toBe(
      "/preview?landing=contractors"
    );
    expect(expired.headers.get("set-cookie")).toBeNull();
    expect(memory.users).toHaveLength(1);

    const direct = await consumeMagicLinkToken(raw);
    expect(direct).toEqual({ status: "expired" });
  });

  it("sends an unknown or missing link to the invalid-link page", async () => {
    const unknown = await openLink("not-a-real-token");
    const unknownLocation = locationOf(unknown);
    expect(unknownLocation.pathname).toBe("/login");
    expect(unknownLocation.searchParams.get("error")).toBe("invalid-link");
    expect(unknown.headers.get("set-cookie")).toBeNull();
    expect(await consumeMagicLinkToken("not-a-real-token")).toEqual({
      status: "invalid",
    });

    const missing = await fetch(`${origin}/api/auth/verify`, {
      redirect: "manual",
    });
    expect(locationOf(missing).searchParams.get("error")).toBe("invalid-link");
  });

  it("uses the same reusable 24 hour lifetime for admin access links", async () => {
    process.env.ADMIN_EMAIL = "owner@snappostpro.test";
    const before = Date.now();
    const raw = await createMagicLinkToken("Owner@SnapPostPro.test");
    const lifetime = (memory.tokens[0]?.expiresAt as Date).getTime() - before;
    expect(lifetime).toBeGreaterThanOrEqual(ACCESS_LINK_MAX_AGE_MS);
    expect(lifetime).toBeLessThan(ACCESS_LINK_MAX_AGE_MS + 5_000);

    const first = await openLink(raw, "/admin");
    const second = await openLink(raw, "/admin");
    expect(locationOf(first).pathname).toBe("/admin");
    expect(locationOf(first).searchParams.get("account_created")).toBe("1");
    expect(locationOf(second).pathname).toBe("/admin");
    expect(locationOf(second).searchParams.get("account_created")).toBeNull();
    expect(memory.users[0]?.role).toBe("admin");
    expect(queueAccountEmail).not.toHaveBeenCalled();

    memory.tokens[0]!.expiresAt = new Date(Date.now() - 1);
    const expired = await openLink(raw, "/admin");
    expect(locationOf(expired).searchParams.get("error")).toBe("expired-link");
    expect(locationOf(expired).searchParams.get("next")).toBe("/admin");
  });

  it("signs in an account that was created by a racing first open", async () => {
    const raw = await createMagicLinkToken("race@example.com");
    memory.users.push({
      id: 90,
      openId: "email_existing",
      email: "race@example.com",
      name: null,
      loginMethod: "email_magic_link",
      role: "user",
      plan: "free",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    memory.skipNextUserRead = true;
    memory.rejectNextUserInsert = true;

    const result = await consumeMagicLinkToken(raw);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.accountCreated).toBe(false);
      expect(result.user.id).toBe(90);
      expect(result.user.emailVerified).toBe(true);
    }
    expect(
      memory.events.some(event => event[1] === "free_account_created")
    ).toBe(false);
  });

  it("does not treat a database failure as an expired link", async () => {
    const raw = await createMagicLinkToken("free@example.com");
    memory.breakNextRead = true;
    const logged = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const response = await openLink(raw, "/dashboard");
    logged.mockRestore();
    const location = locationOf(response);
    expect(location.searchParams.get("error")).toBe("sign-in-failed");
    expect(location.searchParams.get("next")).toBe("/dashboard");
  });
});
