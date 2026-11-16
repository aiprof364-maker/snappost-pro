import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { serveStatic } from "./_core/vite";
import { registerTrackingRedirects } from "./trackingRedirects";

let server: Server;
let origin: string;
let distPath: string;

beforeAll(async () => {
  distPath = await mkdtemp(path.join(tmpdir(), "snappost-short-links-"));
  await writeFile(
    path.join(distPath, "index.html"),
    "<!doctype html><title>SnapPost Pro</title>"
  );

  const app = express();
  registerTrackingRedirects(app);
  serveStatic(app, distPath);
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) =>
      server.close(err => (err ? reject(err) : resolve()))
    );
  }
  if (distPath) await rm(distPath, { recursive: true, force: true });
});

async function redirect(urlPath: string, method: "GET" | "HEAD" = "GET") {
  const response = await fetch(`${origin}${urlPath}`, {
    method,
    redirect: "manual",
  });
  return {
    status: response.status,
    location: response.headers.get("location"),
    body: method === "HEAD" ? "" : await response.text(),
  };
}

describe("short tracking redirects", () => {
  it("is registered before the dev server and the production SPA shell", () => {
    const source = readFileSync(
      new URL("./_core/index.ts", import.meta.url),
      "utf8"
    );
    const redirect = source.indexOf("registerTrackingRedirects(app)");
    const dev = source.indexOf("setupVite(app, server)");
    const prod = source.indexOf("serveStatic(app)");
    expect(redirect).toBeGreaterThan(-1);
    expect(redirect).toBeLessThan(dev);
    expect(redirect).toBeLessThan(prod);
  });

  it("301s a direct hit, including a trailing slash, ahead of the SPA shell", async () => {
    const direct = await redirect("/ig");
    expect(direct.status).toBe(301);
    expect(direct.location).toBe(
      "/preview?utm_source=instagram&utm_medium=social&utm_campaign=short_ig"
    );
    expect(direct.body).not.toContain("SnapPost Pro");

    const slashed = await redirect("/ig/", "HEAD");
    expect(slashed.status).toBe(301);
    expect(slashed.location).toBe(
      "/preview?utm_source=instagram&utm_medium=social&utm_campaign=short_ig"
    );
  });

  it("merges query params and lets the request override defaults", async () => {
    const response = await redirect("/ig?utm_campaign=reel_salons", "HEAD");
    expect(response.status).toBe(301);
    expect(response.location).toBe(
      "/preview?utm_source=instagram&utm_medium=social&utm_campaign=reel_salons"
    );
  });

  it("redirects every short link and still serves the app shell", async () => {
    const cases = [
      ["/fb", "utm_source=facebook&utm_medium=social&utm_campaign=short_fb"],
      ["/pin", "utm_source=pinterest&utm_medium=social&utm_campaign=short_pin"],
      ["/yt", "utm_source=youtube&utm_medium=video&utm_campaign=short_yt"],
      ["/tt", "utm_source=tiktok&utm_medium=social&utm_campaign=short_tt"],
      ["/th", "utm_source=threads&utm_medium=social&utm_campaign=short_th"],
      ["/x/", "utm_source=x&utm_medium=social&utm_campaign=short_x"],
      ["/li", "utm_source=linkedin&utm_medium=social&utm_campaign=short_li"],
      ["/email/", "utm_source=email&utm_medium=email&utm_campaign=short_email"],
    ] as const;

    for (const [urlPath, query] of cases) {
      const response = await redirect(urlPath, "HEAD");
      expect(response.status, urlPath).toBe(301);
      expect(response.location, urlPath).toBe(`/preview?${query}`);
    }

    const home = await redirect("/");
    expect(home.status).toBe(200);
    expect(home.body).toContain("SnapPost Pro");

    const preview = await redirect("/preview");
    expect(preview.status).toBe(200);
    expect(preview.body).toContain("SnapPost Pro");
  });
});
