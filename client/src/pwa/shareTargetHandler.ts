import {
  imageFileFromShare,
  MAX_SHARE_BYTES,
  SHARE_OPEN_PATH,
} from "@shared/shareTarget";

export type SharePhotoStore = {
  save(file: File): Promise<void>;
};

/**
 * Chrome can read the multipart body in the service worker. When that read
 * fails (Samsung Internet throws on content:// files), `forward` sends the
 * original POST to the network so the server fallback can store the photo.
 * A successful read always answers with 303 and does not also hit the server,
 * so the photo is not stored twice.
 */
export async function handleShareTargetRequest(
  request: Request,
  deps: {
    save: (file: File) => Promise<void>;
    forward?: (request: Request) => Promise<Response>;
  }
): Promise<Response> {
  const openUrl = new URL(SHARE_OPEN_PATH, request.url).toString();
  const redirectToOpen = () => Response.redirect(openUrl, 303);

  try {
    const form = await request.clone().formData();
    const file = imageFileFromShare(form);
    if (file && file.size <= MAX_SHARE_BYTES) {
      await deps.save(file);
    }
    return redirectToOpen();
  } catch {
    // The body was not readable in this worker. Fall through.
  }

  if (!deps.forward) return redirectToOpen();

  try {
    const upstream = await deps.forward(request);
    if (upstream.redirected && upstream.url) {
      return Response.redirect(upstream.url, 303);
    }
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("location");
      if (location) {
        return Response.redirect(
          new URL(location, request.url).toString(),
          303
        );
      }
    }
    return upstream;
  } catch {
    return redirectToOpen();
  }
}
