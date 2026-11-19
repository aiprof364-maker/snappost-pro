import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./Dashboard.tsx", import.meta.url),
  "utf8"
);

describe("dashboard post link", () => {
  it("opens the draft named by the preview handoff", () => {
    expect(source).toContain('params.get("post")');
    expect(source).toContain("setSelectedPostId(postToOpen)");
    expect(source).toContain("PENDING_POST_STORAGE_KEY");
    expect(source).toContain("Sign in to open your dashboard");
    expect(source).toContain("captionWhenPostOpens");
  });

  it("uses the shared brand step instead of the account_created flag", () => {
    expect(source).toContain("<BrandSetupGate showNudge />");
    expect(source).not.toContain("accountCreatedFlag");
    expect(source).not.toContain("shouldShowBrandSetup");
  });
});
