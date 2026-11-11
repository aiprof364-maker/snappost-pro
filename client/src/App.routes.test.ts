import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

const routedPages = [
  "Home",
  "Pricing",
  "Features",
  "Dashboard",
  "Analytics",
  "AdminDashboard",
  "AdminLeads",
  "Contact",
  "Changelog",
  "Privacy",
  "DeleteAccount",
  "VerifyEmail",
  "Login",
  "Contractors",
  "Hairdressers",
  "FreePreview",
  "NotFound",
] as const;

describe("route splitting", () => {
  it("loads every page through a dynamic import", () => {
    for (const page of routedPages) {
      expect(source).not.toMatch(
        new RegExp(`import\\s+${page}\\s+from\\s+["']\\./pages/${page}["']`)
      );
      expect(source).toContain(`import("./pages/${page}")`);
    }
  });

  it("does not pull the component showcase into the app shell", () => {
    expect(source).not.toContain("ComponentShowcase");
  });
});
