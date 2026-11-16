import { shouldLeaveShareToServer } from "@shared/shareTarget";
import { saveSharedPhoto } from "./shareDb";
import { handleShareTargetRequest } from "./shareTargetHandler";

const worker = self as unknown as {
  skipWaiting?: () => void;
  clients?: { claim?: () => Promise<void> };
  addEventListener: (type: string, listener: (event: Event) => void) => void;
};

const SHARE_BYPASS_HEADER = "x-snappost-bypass-sw";

worker.addEventListener("install", () => {
  worker.skipWaiting?.();
});

worker.addEventListener("activate", event => {
  const activate = event as Event & {
    waitUntil?: (promise: Promise<unknown>) => void;
  };
  const claim = worker.clients?.claim?.();
  if (claim) activate.waitUntil?.(claim);
});

// Fetch handler is required for installability. It does not cache HTML, API,
// or Vite's hashed assets, so a deploy's new index-*.js is picked up from
// the revalidated document.
worker.addEventListener("fetch", event => {
  const fetchEvent = event as Event & {
    request?: Request;
    respondWith?: (response: Promise<Response> | Response) => void;
  };
  const request = fetchEvent.request;
  if (!request || !fetchEvent.respondWith) return;
  if (request.headers.get(SHARE_BYPASS_HEADER) === "1") return;

  const url = new URL(request.url);
  if (request.method !== "POST" || url.pathname !== "/share-target") return;

  // Samsung Internet puts the file on the network POST and throws if the
  // worker reads it. Let that navigation hit the server unchanged.
  if (shouldLeaveShareToServer(request.headers.get("user-agent"))) return;

  fetchEvent.respondWith(
    handleShareTargetRequest(request, {
      save: saveSharedPhoto,
      forward: original => {
        const headers = new Headers(original.headers);
        headers.set(SHARE_BYPASS_HEADER, "1");
        return fetch(new Request(original, { headers }));
      },
    })
  );
});
