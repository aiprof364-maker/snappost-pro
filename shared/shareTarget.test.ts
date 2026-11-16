import { describe, expect, it } from "vitest";
import {
  hasSessionCookie,
  imageFileFromShare,
  isShareLanding,
  searchWithoutShareParams,
  safeShareType,
  shareLandingPath,
  sharedFileName,
  shouldLeaveShareToServer,
  signedInShareDestination,
} from "./shareTarget";

describe("share target routing", () => {
  it("treats a non-empty session cookie as signed in", () => {
    expect(hasSessionCookie(null)).toBe(false);
    expect(hasSessionCookie("")).toBe(false);
    expect(hasSessionCookie("app_session_id=")).toBe(false);
    expect(hasSessionCookie("other=1")).toBe(false);
    expect(hasSessionCookie("app_session_id=abc")).toBe(true);
    expect(hasSessionCookie("theme=light; app_session_id=abc")).toBe(true);
  });

  it("sends a signed-in share to the dashboard and everyone else to preview", () => {
    expect(shareLandingPath(undefined, "abcdefghij1234")).toBe(
      "/preview?shared=1&sid=abcdefghij1234"
    );
    expect(shareLandingPath("app_session_id=token", "abcdefghij1234")).toBe(
      "/dashboard?shared=1&sid=abcdefghij1234"
    );
    expect(shareLandingPath("app_session_id=token")).toBe(
      "/dashboard?shared=1"
    );
    expect(shareLandingPath(undefined, "../admin")).toBe("/preview?shared=1");
  });

  it("keeps other query params when the share params are removed", () => {
    expect(isShareLanding("?shared=1&landing=contractors")).toBe(true);
    expect(isShareLanding("?landing=contractors")).toBe(false);
    expect(
      searchWithoutShareParams(
        "?shared=1&landing=contractors&sid=abcdefghij1234"
      )
    ).toBe("?landing=contractors");
    expect(signedInShareDestination("?shared=1&sid=abcdefghij1234")).toBe(
      "/dashboard?shared=1&sid=abcdefghij1234"
    );
    expect(signedInShareDestination("?token=preview")).toBeNull();
  });

  it("reads the photo field and ignores shared text", () => {
    const form = new FormData();
    form.set("title", "Finished deck");
    form.set("text", "https://example.com/job");
    form.set(
      "photo",
      new File([Uint8Array.from([1, 2, 3])], "deck.jpg", {
        type: "image/jpeg",
      })
    );
    const file = imageFileFromShare(form);
    expect(file?.name).toBe("deck.jpg");
    expect(file?.type).toBe("image/jpeg");
    expect(sharedFileName("folder/deck.jpg", "image/jpeg")).toBe("deck.jpg");
    expect(sharedFileName("", "image/png")).toBe("shared-photo.png");
  });

  it("does not serve svg or html as an active content type", () => {
    expect(safeShareType("image/svg+xml")).toBe("application/octet-stream");
    expect(safeShareType("text/html")).toBe("application/octet-stream");
    expect(safeShareType("image/jpeg; charset=binary")).toBe("image/jpeg");
    expect(safeShareType("image/jpg")).toBe("image/jpeg");
    expect(safeShareType("")).toBe("image/jpeg");
  });

  it("leaves Samsung Internet shares on the network request", () => {
    expect(
      shouldLeaveShareToServer(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 SamsungBrowser/30.0 Chrome/143.0.0.0 Mobile"
      )
    ).toBe(true);
    expect(
      shouldLeaveShareToServer(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile"
      )
    ).toBe(false);
    expect(shouldLeaveShareToServer(null)).toBe(false);
  });
});
