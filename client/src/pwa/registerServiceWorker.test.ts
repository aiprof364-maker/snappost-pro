import { describe, expect, it } from "vitest";
import { registerShareTargetServiceWorker } from "./registerServiceWorker";

describe("service worker registration", () => {
  it("registers the root worker when the document is already loaded", async () => {
    const registered: Array<{ url: string; scope: string }> = [];
    registerShareTargetServiceWorker({
      readyState: "complete",
      serviceWorker: {
        register: async (url, options) => {
          registered.push({ url, scope: options.scope });
        },
      },
    });
    await Promise.resolve();
    expect(registered).toEqual([{ url: "/sw.js", scope: "/" }]);
  });

  it("waits for load when the document is still parsing", () => {
    const listeners: Array<() => void> = [];
    registerShareTargetServiceWorker({
      readyState: "loading",
      addEventListener: (_type, listener) => {
        listeners.push(listener);
      },
      serviceWorker: {
        register: async () => {
          throw new Error("registered too early");
        },
      },
    });
    expect(listeners).toHaveLength(1);
  });

  it("does nothing when the browser has no service worker", () => {
    expect(() =>
      registerShareTargetServiceWorker({ serviceWorker: undefined })
    ).not.toThrow();
  });
});
