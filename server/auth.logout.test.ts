import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { SESSION_COOKIE } from "./auth";
import { getSessionCookieOptions } from "./_core/cookies";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "email_magic_link",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
      hostname: "snappostpro.com",
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
      setHeader: () => undefined,
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(SESSION_COOKIE);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: 0,
      expires: new Date(0),
      domain: ".snappostpro.com",
      secure: true,
      sameSite: "lax",
      httpOnly: true,
      path: "/",
    });
  });

  it("does not restore the legacy global unauthenticated redirect that can race intentional logout", () => {
    const clientBootstrap = readFileSync(
      resolve(process.cwd(), "client/src/main.tsx"),
      "utf8"
    );

    expect(clientBootstrap).not.toContain("window.location.href = getLoginUrl();");
  });

  it("marks intentional logout before a protected page can trigger an unauthenticated redirect", () => {
    const authHook = readFileSync(
      resolve(process.cwd(), "client/src/_core/hooks/useAuth.ts"),
      "utf8"
    );

    expect(authHook).toContain(
      'window.sessionStorage.setItem(INTENTIONAL_LOGOUT_STORAGE_KEY, "true");'
    );
    expect(authHook).toContain(
      'window.sessionStorage.getItem(INTENTIONAL_LOGOUT_STORAGE_KEY) === "true"'
    );
    expect(authHook).toContain('window.location.replace("/?logged_out=1");');
    expect(authHook).toContain('window.localStorage.removeItem("snappost-user-info");');
    expect(authHook).toContain(
      'window.sessionStorage.removeItem(INTENTIONAL_LOGOUT_STORAGE_KEY);'
    );
  });

  it("uses the same root cookie scope from the www host", () => {
    const options = getSessionCookieOptions({
      hostname: "www.snappostpro.com",
      protocol: "https",
      headers: {},
    } as TrpcContext["req"]);

    expect(options.domain).toBe(".snappostpro.com");
    expect(options.secure).toBe(true);
  });
});
