import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TRACKING_SHORT_LINKS } from "@shared/trackingRedirects";
import { buildServiceWorkerSource } from "./buildServiceWorker";

type FetchEventLike = {
  request?: Request;
  respondWith?: (response: Promise<Response> | Response) => void;
};

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

  it("does not claim short tracking navigations", async () => {
    const workerSource = readFileSync(
      new URL("./sw.ts", import.meta.url),
      "utf8"
    );
    const bypass = workerSource.indexOf("isTrackingRedirectPath(url.pathname)");
    const claim = workerSource.indexOf("fetchEvent.respondWith(");
    expect(bypass).toBeGreaterThan(-1);
    expect(bypass).toBeLessThan(claim);

    const source = await buildServiceWorkerSource();
    expect(source).toContain("isTrackingRedirectPath");
    expect(source).not.toContain("caches.open");

    const listeners = new Map<string, (event: FetchEventLike) => void>();
    const fakeSelf = {
      skipWaiting() {},
      clients: { claim: () => Promise.resolve() },
      addEventListener(
        type: string,
        listener: (event: FetchEventLike) => void
      ) {
        listeners.set(type, listener);
      },
    };
    const previous = Object.getOwnPropertyDescriptor(globalThis, "self");
    Object.defineProperty(globalThis, "self", {
      configurable: true,
      writable: true,
      value: fakeSelf,
    });
    try {
      new Function(source)();
    } finally {
      if (previous) Object.defineProperty(globalThis, "self", previous);
      else Reflect.deleteProperty(globalThis, "self");
    }

    const onFetch = listeners.get("fetch");
    expect(onFetch).toBeTypeOf("function");

    for (const link of TRACKING_SHORT_LINKS) {
      for (const pathname of [link.path, `${link.path}/`]) {
        let claimed = false;
        onFetch?.({
          request: new Request(
            `https://snappostpro.com${pathname}?utm_campaign=custom`
          ),
          respondWith() {
            claimed = true;
          },
        });
        expect(claimed, pathname).toBe(false);
      }
    }

    const previousFetch = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve(new Response(null, { status: 303 }));
    try {
      let shareClaimed = false;
      onFetch?.({
        request: new Request("https://snappostpro.com/share-target", {
          method: "POST",
        }),
        respondWith(response) {
          shareClaimed = true;
          void Promise.resolve(response).catch(() => undefined);
        },
      });
      expect(shareClaimed).toBe(true);
    } finally {
      globalThis.fetch = previousFetch;
    }
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
