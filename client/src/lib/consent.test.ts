import React, { type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  states: [] as unknown[],
  cursor: 0,
  mounted: false,
  effects: [] as Array<() => void | (() => void)>,
  cleanups: [] as Array<() => void>,
}));
vi.mock("react", async importOriginal => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.states)) {
      hooks.states[index] = typeof initial === "function" ? initial() : initial;
    }
    return [
      hooks.states[index],
      (value: unknown) => {
        hooks.states[index] = value;
      },
    ];
  },
  useEffect: (effect: () => void | (() => void)) => {
    if (!hooks.mounted) hooks.effects.push(effect);
  },
}));
vi.mock("@/components/ui/button", () => ({ Button: "button" }));
vi.mock("wouter", () => ({ Link: "a" }));

const GA_KEY = "snappost-google-analytics-consent";
const META_KEY = "snappost-meta-pixel-consent";

function browser(
  options: {
    blockedLocal?: boolean;
    blockedCookies?: boolean;
    blockedSession?: boolean;
    silentCookies?: boolean;
    readOnlyLocal?: boolean;
    protocol?: string;
  } = {}
) {
  const local = new Map<string, string>();
  const session = new Map<string, string>();
  const cookies = new Map<string, string>();
  const cookieWrites: string[] = [];
  const scripts: Array<{
    src: string;
    dataset: Record<string, string>;
    load?: () => void;
  }> = [];
  const storage = (
    data: Map<string, string>,
    blocked: boolean,
    readOnly = false
  ) => ({
    getItem: vi.fn((key: string) => {
      if (blocked) throw new Error("Blocked storage");
      return data.get(key) ?? null;
    }),
    setItem: vi.fn((key: string, value: string) => {
      if (blocked || readOnly) throw new Error("Blocked storage");
      data.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      if (blocked) throw new Error("Blocked storage");
      data.delete(key);
    }),
  });
  const win = Object.assign(new EventTarget(), {
    location: {
      protocol: options.protocol ?? "https:",
      pathname: "/",
      origin: "https://snappostpro.com",
    },
    localStorage: storage(local, !!options.blockedLocal, options.readOnlyLocal),
    sessionStorage: storage(session, !!options.blockedSession),
  });
  const doc = {
    title: "SnapPost Pro",
    get cookie() {
      if (options.blockedCookies) throw new Error("Blocked cookies");
      return [...cookies].map(([key, value]) => `${key}=${value}`).join("; ");
    },
    set cookie(value: string) {
      if (options.blockedCookies) throw new Error("Blocked cookies");
      cookieWrites.push(value);
      if (!options.silentCookies) {
        const [key, choice] = value.split(";")[0].split("=");
        cookies.set(key, choice);
      }
    },
    createElement: vi.fn(() => {
      const script = {
        src: "",
        dataset: {} as Record<string, string>,
        load: undefined as (() => void) | undefined,
        addEventListener: (name: string, callback: () => void) => {
          if (name === "load") script.load = callback;
        },
      };
      return script;
    }),
    head: {
      appendChild: vi.fn(script => {
        scripts.push(script);
      }),
    },
  };
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("React", React);
  return { local, session, cookies, cookieWrites, scripts, win, doc };
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");
  hooks.states = [];
  hooks.cursor = 0;
  hooks.mounted = false;
  hooks.effects = [];
  hooks.cleanups = [];
});
afterEach(() => {
  hooks.cleanups.forEach(cleanup => cleanup());
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("consent preference storage", () => {
  it.each(["granted", "denied"] as const)(
    "migrates legacy %s keys and keeps the choice after a reload",
    async choice => {
      const b = browser();
      b.local.set(GA_KEY, choice);
      const storage = await import("./consentStorage");
      expect(storage.readConsentPreference(GA_KEY)).toBe(choice);
      expect(b.cookies.get(GA_KEY)).toBe(choice);
      expect(b.cookieWrites[0]).toContain(
        "Max-Age=31536000; Path=/; SameSite=Lax; Secure"
      );
      vi.resetModules();
      expect(
        (await import("./googleAnalytics")).hasGoogleAnalyticsChoice()
      ).toBe(true);
    }
  );

  it("rejects malformed preferences rather than treating them as saved consent", async () => {
    const b = browser();
    b.local.set(GA_KEY, "true");
    b.cookies.set(META_KEY, "allowed");
    const ga = await import("./googleAnalytics");
    const meta = await import("./metaPixel");
    expect(ga.hasGoogleAnalyticsChoice()).toBe(false);
    expect(ga.hasGoogleAnalyticsConsent()).toBe(false);
    expect(meta.hasMetaPixelChoice()).toBe(false);
    expect(meta.hasMetaPixelConsent()).toBe(false);
    expect(ga.setGoogleAnalyticsConsent("allowed" as never)).toBe(false);
    expect(b.scripts).toHaveLength(0);
  });

  it("persists denial via essential cookies when localStorage is blocked", async () => {
    const b = browser({ blockedLocal: true });
    const ga = await import("./googleAnalytics");
    const meta = await import("./metaPixel");
    expect(ga.setGoogleAnalyticsConsent("denied")).toBe(true);
    expect(meta.setMetaPixelConsent("denied")).toBe(true);
    vi.resetModules();
    expect((await import("./googleAnalytics")).hasGoogleAnalyticsChoice()).toBe(
      true
    );
    expect((await import("./metaPixel")).hasMetaPixelChoice()).toBe(true);
    expect((await import("./metaPixel")).hasMetaPixelConsent()).toBe(false);
    expect(b.scripts).toHaveLength(0);
  });

  it("uses the latest denial instead of stale read-only localStorage grants", async () => {
    const b = browser({ readOnlyLocal: true });
    b.local.set(META_KEY, "granted");
    const meta = await import("./metaPixel");
    expect(meta.setMetaPixelConsent("denied")).toBe(true);
    vi.resetModules();
    expect((await import("./metaPixel")).hasMetaPixelConsent()).toBe(false);
  });

  it.each([{ blockedCookies: true }, { silentCookies: true }])(
    "uses page memory without claiming persistence when all writes are blocked: %j",
    async cookieMode => {
      browser({ blockedLocal: true, blockedSession: true, ...cookieMode });
      const ga = await import("./googleAnalytics");
      const meta = await import("./metaPixel");
      expect(ga.setGoogleAnalyticsConsent("denied")).toBe(false);
      expect(meta.setMetaPixelConsent("denied")).toBe(false);
      expect(ga.hasGoogleAnalyticsChoice()).toBe(true);
      expect(meta.hasMetaPixelChoice()).toBe(true);
      expect(meta.trackMetaEvent("Lead")).toBe(false);
      vi.resetModules();
      expect((await import("./metaPixel")).hasMetaPixelChoice()).toBe(false);
    }
  );

  it("omits Secure for a local HTTP preference cookie", async () => {
    const b = browser({ protocol: "http:" });
    const storage = await import("./consentStorage");
    storage.writeConsentPreference(GA_KEY, "denied");
    expect(b.cookieWrites[0]).not.toContain("Secure");
  });
});

describe("optional tracking consent gates", () => {
  it.each([undefined, "denied"])(
    "makes no tag requests or tracking calls without a grant (%s)",
    async choice => {
      const b = browser({ blockedSession: true });
      if (choice) {
        b.local.set(GA_KEY, choice);
        b.local.set(META_KEY, choice);
      }
      const ga = await import("./googleAnalytics");
      const meta = await import("./metaPixel");
      expect(ga.initializeGoogleAnalytics()).toBe(false);
      expect(ga.trackGooglePageView()).toBe(false);
      expect(ga.trackGoogleAnalyticsEvent("test_event")).toBe(false);
      expect(meta.initializeMetaPixel()).toBe(false);
      expect(meta.trackMetaEvent("Lead")).toBe(false);
      expect(meta.trackMetaCustomEvent("test_event")).toBe(false);
      expect(b.scripts).toHaveLength(0);
      expect(window.gtag).toBeUndefined();
      expect(window.fbq).toBeUndefined();
    }
  );

  it("queues Meta revoke before init, revokes immediately on withdrawal, and guards delayed load", async () => {
    const b = browser();
    const meta = await import("./metaPixel");
    meta.setMetaPixelConsent("granted");
    expect(b.scripts).toHaveLength(1);
    expect(window.fbq?.queue.slice(0, 3)).toEqual([
      ["consent", "revoke"],
      ["init", meta.META_PIXEL_ID],
      ["track", "PageView"],
    ]);
    meta.setMetaPixelConsent("denied");
    expect(window.fbq?.queue.at(-1)).toEqual(["consent", "revoke"]);
    const length = window.fbq!.queue.length;
    b.scripts[0].load?.();
    expect(window.fbq?.queue).toHaveLength(length);
    expect(meta.trackMetaEvent("Lead")).toBe(false);
    expect(window.fbq?.queue).toHaveLength(length);
    meta.setMetaPixelConsent("granted");
    expect(window.fbq?.queue).toContainEqual(["consent", "grant"]);
    expect(b.scripts).toHaveLength(1);
    expect(window.fbq?.queue.filter(call => call[0] === "init")).toHaveLength(
      1
    );
  });

  it("grants Meta on load only while consent remains affirmative", async () => {
    const b = browser();
    const meta = await import("./metaPixel");
    meta.setMetaPixelConsent("granted");
    b.scripts[0].load?.();
    expect(window.fbq?.queue.at(-1)).toEqual(["consent", "grant"]);
  });

  it("does not queue an early Meta grant for pending events while the script is loading", async () => {
    const b = browser();
    const meta = await import("./metaPixel");
    expect(meta.trackMetaEvent("CompleteRegistration")).toBe(false);
    meta.setMetaPixelConsent("granted");
    expect(meta.trackMetaEvent("Lead")).toBe(true);
    expect(window.fbq?.queue).not.toContainEqual(["consent", "grant"]);
    meta.setMetaPixelConsent("denied");
    b.scripts[0].load?.();
    expect(window.fbq?.queue).not.toContainEqual(["consent", "grant"]);
    expect(window.fbq?.queue.at(-1)).toEqual(["consent", "revoke"]);
  });

  it("revokes an already loaded Meta function immediately and resumes on re-grant", async () => {
    browser();
    const calls = vi.fn();
    window.fbq = Object.assign(calls, { queue: [] });
    const meta = await import("./metaPixel");
    meta.setMetaPixelConsent("granted");
    meta.setMetaPixelConsent("denied");
    expect(calls).toHaveBeenLastCalledWith("consent", "revoke");
    const count = calls.mock.calls.length;
    expect(meta.trackMetaEvent("Lead")).toBe(false);
    expect(calls).toHaveBeenCalledTimes(count);
    meta.setMetaPixelConsent("granted");
    expect(calls).toHaveBeenCalledWith("consent", "grant");
    expect(calls.mock.calls.filter(call => call[0] === "init")).toHaveLength(1);
  });

  it("keeps GA independent, stops on withdrawal, and resumes without another script", async () => {
    const b = browser();
    const ga = await import("./googleAnalytics");
    const meta = await import("./metaPixel");
    ga.setGoogleAnalyticsConsent("granted");
    expect(b.scripts).toHaveLength(1);
    expect(b.scripts[0].src).toContain("googletagmanager.com");
    expect(meta.hasMetaPixelConsent()).toBe(false);
    expect(window.fbq).toBeUndefined();
    expect(window.dataLayer).toContainEqual([
      "consent",
      "default",
      { analytics_storage: "denied" },
    ]);
    ga.setGoogleAnalyticsConsent("denied");
    expect(window.dataLayer?.at(-1)).toEqual([
      "consent",
      "update",
      { analytics_storage: "denied" },
    ]);
    const count = window.dataLayer!.length;
    expect(ga.trackGoogleAnalyticsEvent("not_allowed")).toBe(false);
    expect(window.dataLayer).toHaveLength(count);
    ga.setGoogleAnalyticsConsent("granted");
    expect(ga.trackGoogleAnalyticsEvent("allowed")).toBe(true);
    expect(b.scripts).toHaveLength(1);
  });

  it("notifies the banner after privacy-page setters", async () => {
    const b = browser();
    const updated = vi.fn();
    b.win.addEventListener("snappost-consent-updated", updated);
    (await import("./googleAnalytics")).setGoogleAnalyticsConsent("denied");
    (await import("./metaPixel")).setMetaPixelConsent("denied");
    expect(updated).toHaveBeenCalledTimes(2);
  });
});

type Node = ReactElement<Record<string, any>>;
function nodes(tree: unknown): Node[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!React.isValidElement(tree)) return [];
  const element = tree as Node;
  return [element, ...nodes(element.props.children)];
}
function text(tree: unknown): string {
  if (Array.isArray(tree)) return tree.map(text).join("");
  if (React.isValidElement(tree)) return text((tree as Node).props.children);
  return typeof tree === "string" ? tree : "";
}
async function notice() {
  const CookieConsent = (await import("../components/CookieConsent")).default;
  const render = () => {
    hooks.cursor = 0;
    const tree = CookieConsent();
    const effects = hooks.effects.splice(0);
    hooks.mounted = true;
    effects.forEach(effect => {
      const cleanup = effect();
      if (cleanup) hooks.cleanups.push(cleanup);
    });
    return tree;
  };
  render();
  return render;
}
function button(tree: unknown, name: string) {
  const found = nodes(tree).find(
    node => node.type === "button" && text(node.props.children) === name
  );
  if (!found) throw new Error(`Button not found: ${name}`);
  return found;
}

describe("compact cookie notice", () => {
  it("offers equally prominent default actions with non-modal accessible labeling", async () => {
    browser();
    const render = await notice();
    const tree = render();
    expect(tree?.type).toBe("aside");
    expect(tree?.props["aria-label"]).toBe("Cookie preferences");
    expect(tree?.props["aria-modal"]).toBeUndefined();
    expect(String(tree?.props.className)).toContain("top-0");
    expect(String(tree?.props.className)).not.toContain("bottom-");
    expect(text(tree)).toContain("--cookie-offset");
    expect(text(tree)).toContain(
      "Optional cookies help us measure site visits and ads. You can decline and still use SnapPost Pro."
    );
    expect(button(tree, "Decline optional").props.variant).toBe(
      button(tree, "Allow all").props.variant
    );
    expect(button(tree, "Customize")).toBeDefined();
    expect(nodes(tree).filter(node => node.type === "input")).toHaveLength(0);
  });

  it.each(["Decline optional", "Allow all", "close"])(
    "saves both categories using %s and stays hidden after remount",
    async action => {
      const b = browser();
      const render = await notice();
      const tree = render();
      if (action === "close") {
        nodes(tree)
          .find(
            node =>
              node.props["aria-label"] === "Decline optional cookies and close"
          )!
          .props.onClick();
      } else {
        button(tree, action).props.onClick();
      }
      expect(render()).toBeNull();
      const choice = action === "Allow all" ? "granted" : "denied";
      expect(b.local.get(GA_KEY)).toBe(choice);
      expect(b.local.get(META_KEY)).toBe(choice);
      // Simulate a new mount/navigation; saved choices prevent a fresh prompt.
      hooks.states = [];
      hooks.mounted = false;
      expect((await notice())()).toBeNull();
    }
  );

  it("customizes independently from off, saves analytics-only, and syncs reopening and external changes", async () => {
    const b = browser();
    const render = await notice();
    button(render(), "Customize").props.onClick();
    const inputs = nodes(render()).filter(node => node.type === "input");
    expect(inputs.map(input => input.props.checked)).toEqual([false, false]);
    inputs[0].props.onChange({ target: { checked: true } });
    button(render(), "Save choices").props.onClick();
    expect(render()).toBeNull();
    expect(b.local.get(GA_KEY)).toBe("granted");
    expect(b.local.get(META_KEY)).toBe("denied");
    b.win.dispatchEvent(new Event("snappost-open-cookie-settings"));
    expect(
      nodes(render())
        .filter(node => node.type === "input")
        .map(input => input.props.checked)
    ).toEqual([true, false]);
    (await import("./googleAnalytics")).setGoogleAnalyticsConsent("denied");
    expect(render()).toBeNull();
    b.win.dispatchEvent(new Event("snappost-open-cookie-settings"));
    expect(
      nodes(render())
        .filter(node => node.type === "input")
        .map(input => input.props.checked)
    ).toEqual([false, false]);
  });

  it("stays dismissed during the current page when all preference storage is blocked", async () => {
    browser({ blockedLocal: true, blockedCookies: true });
    const render = await notice();
    button(render(), "Decline optional").props.onClick();
    expect(render()).toBeNull();
    hooks.states = [];
    hooks.mounted = false;
    expect((await notice())()).toBeNull();
  });
});
