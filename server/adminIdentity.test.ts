import { afterEach, describe, expect, it } from "vitest";
import { configuredAdminEmail, isConfiguredAdminEmail } from "./adminIdentity";

const originalAdminEmail = process.env.ADMIN_EMAIL;
const originalOwnerEmail = process.env.OWNER_EMAIL;

afterEach(() => {
  if (originalAdminEmail === undefined) delete process.env.ADMIN_EMAIL;
  else process.env.ADMIN_EMAIL = originalAdminEmail;

  if (originalOwnerEmail === undefined) delete process.env.OWNER_EMAIL;
  else process.env.OWNER_EMAIL = originalOwnerEmail;
});

describe("configured administrator identity", () => {
  it("uses ADMIN_EMAIL ahead of OWNER_EMAIL and compares case-insensitively", () => {
    process.env.ADMIN_EMAIL = "Admin@SnapPostPro.com";
    process.env.OWNER_EMAIL = "other-owner@example.com";

    expect(configuredAdminEmail()).toBe("admin@snappostpro.com");
    expect(isConfiguredAdminEmail("ADMIN@SNAPPOSTPRO.COM")).toBe(true);
    expect(isConfiguredAdminEmail("other-owner@example.com")).toBe(false);
  });

  it("falls back to the owner address, then the SnapPost Pro admin address", () => {
    delete process.env.ADMIN_EMAIL;
    process.env.OWNER_EMAIL = "Owner@Example.com";
    expect(configuredAdminEmail()).toBe("owner@example.com");

    delete process.env.OWNER_EMAIL;
    expect(configuredAdminEmail()).toBe("admin@snappostpro.com");
  });
});
