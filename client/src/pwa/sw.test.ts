import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildServiceWorkerSource } from "./buildServiceWorker";

describe("installable service worker", () => {
  it("handles share posts without caching documents or assets", async () => {
    const source = await buildServiceWorkerSource();
    expect(source).toContain('addEventListener("fetch"');
    expect(source).toContain('addEventListener("install"');
    expect(source).toContain('addEventListener("activate"');
    expect(source).toContain("/share-target");
    expect(source).toContain("303");
    expect(source).toContain("SamsungBrowser");
    expect(source).toContain("x-snappost-bypass-sw");
    expect(source).not.toContain("caches.open");
    expect(source).not.toContain("cache.put");
    expect(source).not.toContain("pushManager");
    expect(source).not.toContain('addEventListener("push"');
  });

  it("is registered from the shell used by preview and the signed-in app", () => {
    const main = readFileSync(new URL("../main.tsx", import.meta.url), "utf8");
    const html = readFileSync(
      new URL("../../index.html", import.meta.url),
      "utf8"
    );
    expect(main).toContain("registerShareTargetServiceWorker()");
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('href="/manifest.webmanifest"');
    expect(html).toContain('name="theme-color" content="#4c4dc3"');
  });
});
