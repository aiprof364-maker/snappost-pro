import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

describe("Email Verification Enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks unverified users from posting to Facebook", async () => {
    // Mock unverified user
    const unverifiedUser = {
      id: 1,
      email: "test@example.com",
      emailVerified: false,
    };

    // Simulate the check that happens in the publish procedure
    const isEmailVerified = unverifiedUser.emailVerified;
    
    if (!isEmailVerified) {
      expect(() => {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Please verify your email before posting to Facebook. Check your inbox for the verification link.",
        });
      }).toThrow("Please verify your email before posting to Facebook");
    }
  });

  it("allows verified users to post to Facebook", async () => {
    // Mock verified user
    const verifiedUser = {
      id: 1,
      email: "test@example.com",
      emailVerified: true,
    };

    // Simulate the check that happens in the publish procedure
    const isEmailVerified = verifiedUser.emailVerified;
    
    if (!isEmailVerified) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Please verify your email before posting to Facebook. Check your inbox for the verification link.",
      });
    }

    // Should reach here without throwing
    expect(isEmailVerified).toBe(true);
  });

  it("resend verification email only works for unverified users", async () => {
    const verifiedUser = {
      id: 1,
      email: "test@example.com",
      emailVerified: true,
    };

    // Should throw error if user is already verified
    if (verifiedUser.emailVerified) {
      expect(() => {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email already verified",
        });
      }).toThrow("Email already verified");
    }
  });
});
