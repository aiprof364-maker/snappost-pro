import { describe, expect, it } from "vitest";
import { parseBusinessPhone, parseBusinessWebsite } from "./brandContact";

describe("business phone", () => {
  it("formats US numbers and leaves a blank optional field blank", () => {
    expect(parseBusinessPhone("")).toEqual({ ok: true, value: null });
    expect(parseBusinessPhone("   ")).toEqual({ ok: true, value: null });
    expect(parseBusinessPhone("5125550142")).toEqual({
      ok: true,
      value: "(512) 555-0142",
    });
    expect(parseBusinessPhone("(512) 555-0142")).toEqual({
      ok: true,
      value: "(512) 555-0142",
    });
    expect(parseBusinessPhone("512-555-0142")).toEqual({
      ok: true,
      value: "(512) 555-0142",
    });
    expect(parseBusinessPhone("+1 512 555 0142")).toEqual({
      ok: true,
      value: "(512) 555-0142",
    });
    expect(parseBusinessPhone("1-512-555-0142")).toEqual({
      ok: true,
      value: "(512) 555-0142",
    });
  });

  it("rejects numbers that are not a US phone", () => {
    expect(parseBusinessPhone("555-0142").ok).toBe(false);
    expect(parseBusinessPhone("0125550142").ok).toBe(false);
    expect(parseBusinessPhone("call me").ok).toBe(false);
    expect(parseBusinessPhone("512555014299").ok).toBe(false);
  });
});

describe("business website", () => {
  it("keeps a domain or URL and drops the scheme", () => {
    expect(parseBusinessWebsite("")).toEqual({ ok: true, value: null });
    expect(parseBusinessWebsite("northsidedecks.com")).toEqual({
      ok: true,
      value: "northsidedecks.com",
    });
    expect(parseBusinessWebsite("HTTPS://NorthsideDecks.com/quote/")).toEqual({
      ok: true,
      value: "northsidedecks.com/quote",
    });
    expect(parseBusinessWebsite("www.northsidedecks.com")).toEqual({
      ok: true,
      value: "www.northsidedecks.com",
    });
  });

  it("rejects text that is not a website", () => {
    expect(parseBusinessWebsite("not a website").ok).toBe(false);
    expect(parseBusinessWebsite("javascript:alert(1)").ok).toBe(false);
    expect(parseBusinessWebsite("localhost").ok).toBe(false);
    expect(parseBusinessWebsite("https://user:pass@northsidedecks.com").ok).toBe(
      false
    );
  });
});
