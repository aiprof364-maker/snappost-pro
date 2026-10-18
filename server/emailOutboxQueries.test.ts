import { describe, expect, it } from "vitest";
import { buildDueDeliveriesQuery } from "./newsletterAutomation";
import { buildDueAccountEmailQuery } from "./accountEmailAutomation";

describe("durable email outbox query compatibility", () => {
  it("uses a code-controlled literal LIMIT for the newsletter TiDB prepared query", () => {
    const now = new Date("2026-10-18T00:00:00.000Z");
    const query = buildDueDeliveriesQuery(now, 42);

    expect(query.sql).toContain("LIMIT 50");
    expect(query.sql).not.toContain("LIMIT ?");
    expect(query.params).toEqual(["active", "pending", "retry", now, 42]);
  });

  it("uses the same TiDB-safe LIMIT rule for account emails", () => {
    const now = new Date("2026-10-18T00:00:00.000Z");
    const query = buildDueAccountEmailQuery(now);

    expect(query.sql).toContain("LIMIT 50");
    expect(query.sql).not.toContain("LIMIT ?");
    expect(query.params).toEqual([now]);
  });
});
