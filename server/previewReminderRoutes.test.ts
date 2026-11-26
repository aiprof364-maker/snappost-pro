import express from "express";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { previewReminderUnsubscribeUrl } from "./previewReminderEmail";

const checks = vi.hoisted(() => ({ optOut: vi.fn() }));

vi.mock("./accountEmailAutomation", () => ({
  optOutPreviewReminders: checks.optOut,
}));

let server: Server;
let origin: string;

beforeAll(async () => {
  process.env.AUTH_SESSION_SECRET = "preview-reminder-route-secret";
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  const { registerPreviewReminderRoutes } = await import("./previewReminderRoutes");
  registerPreviewReminderRoutes(app);
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

beforeEach(() => {
  checks.optOut.mockReset();
  checks.optOut.mockResolvedValue(undefined);
  process.env.AUTH_SESSION_SECRET = "preview-reminder-route-secret";
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close(error => (error ? reject(error) : resolve()))
  );
});

function unsubscribeTarget() {
  const url = new URL(previewReminderUnsubscribeUrl("owner@example.com"));
  return `${origin}${url.pathname}${url.search}`;
}

describe("preview reminder unsubscribe", () => {
  it("shows a confirmation and does not opt out on a scanner GET", async () => {
    const response = await fetch(unsubscribeTarget());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toContain("Stop preview reminder emails?");
    expect(checks.optOut).not.toHaveBeenCalled();
  });

  it("opts out on the confirmation POST and on one-click", async () => {
    const confirmed = await fetch(unsubscribeTarget(), { method: "POST" });
    expect(confirmed.status).toBe(200);
    expect(await confirmed.text()).toContain(
      "You will no longer receive SnapPost Pro preview reminder emails."
    );
    expect(checks.optOut).toHaveBeenCalledWith("owner@example.com");

    checks.optOut.mockClear();
    const oneClick = await fetch(unsubscribeTarget(), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "List-Unsubscribe=One-Click",
    });
    expect(oneClick.status).toBe(200);
    expect(await oneClick.text()).toBe("");
    expect(checks.optOut).toHaveBeenCalledWith("owner@example.com");
  });

  it("rejects a tampered link without opting out", async () => {
    const response = await fetch(
      `${origin}/api/preview-reminders/unsubscribe?email=owner@example.com&token=${"a".repeat(43)}`
    );
    expect(response.status).toBe(404);
    expect(checks.optOut).not.toHaveBeenCalled();
  });

  it("is registered before the production SPA shell", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      new URL("./_core/index.ts", import.meta.url),
      "utf8"
    );
    const registerAt = source.indexOf("registerPreviewReminderRoutes(app)");
    const staticAt = source.indexOf("serveStatic(app)");
    expect(registerAt).toBeGreaterThan(-1);
    expect(staticAt).toBeGreaterThan(registerAt);
  });
});
