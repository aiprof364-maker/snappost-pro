import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import * as db from "./db";

// Mock the database functions
vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof db>("./db");
  return {
    ...actual,
    getDb: vi.fn(),
    setEmailVerificationToken: vi.fn(),
    verifyEmailToken: vi.fn(),
    isEmailVerified: vi.fn(),
  };
});

describe("Email Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a valid email verification token", () => {
    const { token, hash } = db.generateEmailVerificationToken();

    // Token should be a 64-character hex string (32 bytes)
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);

    // Hash should be a 64-character SHA256 hex string
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);

    // Hash should be different from token
    expect(hash).not.toBe(token);

    // Hash should match SHA256(token)
    const expectedHash = crypto.createHash("sha256").update(token).digest("hex");
    expect(hash).toBe(expectedHash);
  });

  it("generates different tokens each time", () => {
    const { token: token1 } = db.generateEmailVerificationToken();
    const { token: token2 } = db.generateEmailVerificationToken();

    expect(token1).not.toBe(token2);
  });

  it("token hash is deterministic", () => {
    const token = "test-token-123";
    const hash1 = crypto.createHash("sha256").update(token).digest("hex");
    const hash2 = crypto.createHash("sha256").update(token).digest("hex");

    expect(hash1).toBe(hash2);
  });
});
