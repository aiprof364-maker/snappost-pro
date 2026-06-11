import { describe, it, expect, beforeAll } from "vitest";
import { Resend } from "resend";

describe("Email Configuration", () => {
  let resendClient: Resend;

  beforeAll(() => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).toMatch(/^re_/);
    resendClient = new Resend(apiKey);
  });

  it("should have valid Resend API key configured", () => {
    expect(process.env.RESEND_API_KEY).toBeDefined();
    expect(process.env.RESEND_API_KEY).toMatch(/^re_/);
  });

  it("should be able to instantiate Resend client", () => {
    expect(resendClient).toBeDefined();
  });

  it("should have emails API available", () => {
    expect(resendClient.emails).toBeDefined();
    expect(typeof resendClient.emails.send).toBe("function");
  });
});
