import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ user: null as null | { id: number } }));
vi.mock("react", () => ({
  useMemo: (factory: () => unknown) => factory(),
  useEffect: () => undefined,
  useCallback: (callback: unknown) => callback,
}));
vi.mock("@/const", () => ({ getLoginUrl: () => "/login" }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ auth: { me: { setData: vi.fn() } } }),
    auth: {
      me: {
        useQuery: () => ({
          data: state.user,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      logout: { useMutation: () => ({ isPending: false, error: null }) },
    },
  },
}));

import { useAuth } from "./useAuth";

afterEach(() => {
  state.user = null;
  vi.unstubAllGlobals();
});

describe("optional authentication cache", () => {
  it("does not crash public pages when localStorage access is blocked", () => {
    const win = {};
    Object.defineProperty(win, "localStorage", {
      get() {
        throw new Error("Storage blocked");
      },
    });
    vi.stubGlobal("window", win);
    expect(() => useAuth()).not.toThrow();
    expect(useAuth().isAuthenticated).toBe(false);
  });

  it("retains the server authentication result when cache writes fail", () => {
    state.user = { id: 42 };
    vi.stubGlobal("window", {
      localStorage: {
        setItem: () => {
          throw new Error("Quota exceeded");
        },
      },
    });
    const result = useAuth();
    expect(result.user).toEqual(state.user);
    expect(result.isAuthenticated).toBe(true);
  });

  it("keeps existing cache behavior when storage is available", () => {
    const setItem = vi.fn();
    vi.stubGlobal("window", { localStorage: { setItem } });
    useAuth();
    expect(setItem).toHaveBeenCalledWith("snappost-user-info", "null");
  });
});
