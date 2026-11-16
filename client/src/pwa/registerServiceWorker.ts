type ServiceWorkerContainerLike = {
  register: (url: string, options: { scope: string }) => Promise<unknown>;
};

type RegisterEnv = {
  serviceWorker?: ServiceWorkerContainerLike;
  readyState?: DocumentReadyState;
  addEventListener?: (
    type: string,
    listener: () => void,
    options?: { once?: boolean }
  ) => void;
};

/**
 * Registers the installability worker for the shared HTML shell, which is
 * what /preview and the signed-in app both load.
 */
export function registerShareTargetServiceWorker(env: RegisterEnv = {}): void {
  const serviceWorker =
    "serviceWorker" in env
      ? env.serviceWorker
      : typeof navigator === "undefined"
        ? undefined
        : navigator.serviceWorker;
  if (!serviceWorker) return;

  const register = () => {
    serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Install and share still work once the worker is available. The
      // server POST /share-target route covers the first share.
    });
  };

  const readyState =
    env.readyState ??
    (typeof document === "undefined" ? "complete" : document.readyState);
  if (readyState === "complete") {
    register();
    return;
  }

  const addEventListener =
    env.addEventListener ??
    (typeof window === "undefined"
      ? undefined
      : window.addEventListener.bind(window));
  addEventListener?.("load", register, { once: true });
}
