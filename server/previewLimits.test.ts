import { describe, expect, it } from "vitest";
import {
  consumePreviewAllowance,
  previewClientKey,
  previewLimitMessage,
  readPreviewLimitConfig,
  refundPreviewAllowance,
  type PreviewRateStore,
} from "./previewLimits";

const limits = { ipHourlyLimit: 2, ipDailyLimit: 3, globalDailyCap: 10 };

describe("anonymous preview limits", () => {
  it("reads safe defaults and ignores invalid overrides", () => {
    expect(readPreviewLimitConfig({})).toEqual({
      ipHourlyLimit: 4,
      ipDailyLimit: 8,
      globalDailyCap: 200,
    });
    expect(
      readPreviewLimitConfig({
        PREVIEW_IP_HOURLY_LIMIT: "6",
        PREVIEW_IP_DAILY_LIMIT: "0",
        PREVIEW_GLOBAL_DAILY_CAP: "nope",
      })
    ).toEqual({
      ipHourlyLimit: 6,
      ipDailyLimit: 0,
      globalDailyCap: 200,
    });
  });

  it("uses the forwarded client address ahead of the socket address", () => {
    expect(
      previewClientKey({
        headers: { "x-forwarded-for": "203.0.113.8, 10.0.0.4" },
        ip: "10.0.0.4",
      })
    ).toBe("203.0.113.8");
    expect(previewClientKey({ headers: {}, ip: "192.0.2.9" })).toBe(
      "192.0.2.9"
    );
    expect(previewClientKey({ headers: {} })).toBe("unknown");
  });

  it("stops one client after the hourly limit and resets when the hour passes", () => {
    const store: PreviewRateStore = new Map();
    const start = 1_000_000;
    expect(
      consumePreviewAllowance(store, "203.0.113.8", start, limits).ok
    ).toBe(true);
    expect(
      consumePreviewAllowance(store, "203.0.113.8", start + 10, limits).ok
    ).toBe(true);
    const blocked = consumePreviewAllowance(
      store,
      "203.0.113.8",
      start + 20,
      limits
    );
    expect(blocked).toEqual({ ok: false, scope: "hourly" });
    expect(
      consumePreviewAllowance(store, "203.0.113.9", start + 20, limits).ok
    ).toBe(true);

    const later = consumePreviewAllowance(
      store,
      "203.0.113.8",
      start + 60 * 60 * 1000,
      limits
    );
    expect(later.ok).toBe(true);
  });

  it("enforces the rolling daily cap after the hourly window resets", () => {
    const store: PreviewRateStore = new Map();
    const start = 5_000_000;
    expect(consumePreviewAllowance(store, "a", start, limits).ok).toBe(true);
    expect(consumePreviewAllowance(store, "a", start + 1, limits).ok).toBe(
      true
    );
    expect(
      consumePreviewAllowance(store, "a", start + 60 * 60 * 1000, limits).ok
    ).toBe(true);
    const blocked = consumePreviewAllowance(
      store,
      "a",
      start + 60 * 60 * 1000 + 1,
      limits
    );
    expect(blocked).toEqual({ ok: false, scope: "daily" });
    expect(previewLimitMessage("daily", limits)).toContain("3");
    expect(previewLimitMessage("global", limits)).toContain("3 free posts");
  });

  it("refunds a counted attempt that never reached the caption model", () => {
    const store: PreviewRateStore = new Map();
    expect(consumePreviewAllowance(store, "a", 10, limits).ok).toBe(true);
    expect(consumePreviewAllowance(store, "a", 11, limits).ok).toBe(true);
    refundPreviewAllowance(store, "a");
    expect(consumePreviewAllowance(store, "a", 12, limits).ok).toBe(true);
    expect(consumePreviewAllowance(store, "a", 13, limits).ok).toBe(false);
  });
});
