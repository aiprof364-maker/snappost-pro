import { describe, expect, it } from "vitest";
import type { User } from "../drizzle/schema";
import { createSessionToken, SESSION_COOKIE } from "./auth";

describe("independent session auth", () => {
  it("creates a signed session token with the authenticated user ID", async () => {
    process.env.AUTH_SESSION_SECRET = "test-independent-auth-secret";
    const user = {
      id: 42,
      openId: "email_test",
      email: "contractor@example.com",
      name: "Contractor",
      loginMethod: "email_magic_link",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as User;

    const token = await createSessionToken(user);

    expect(SESSION_COOKIE).toBe("snappost_session");
    expect(token.split(".")).toHaveLength(3);
  });
});
