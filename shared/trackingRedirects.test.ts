import { describe, expect, it } from "vitest";
import {
  isTrackingRedirectPath,
  trackingRedirectLocation,
} from "./trackingRedirects";

const shortLinks = [
  ["/fb", "facebook", "social", "short_fb"],
  ["/ig", "instagram", "social", "short_ig"],
  ["/pin", "pinterest", "social", "short_pin"],
  ["/yt", "youtube", "video", "short_yt"],
  ["/tt", "tiktok", "social", "short_tt"],
  ["/th", "threads", "social", "short_th"],
  ["/x", "x", "social", "short_x"],
  ["/li", "linkedin", "social", "short_li"],
  ["/email", "email", "email", "short_email"],
] as const;

describe("tracking short links", () => {
  it("sends each short path to /preview with its default UTM params", () => {
    for (const [path, source, medium, campaign] of shortLinks) {
      const location = `/preview?utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}`;
      expect(trackingRedirectLocation(path), path).toBe(location);
      expect(trackingRedirectLocation(`${path}/`), path).toBe(location);
      expect(trackingRedirectLocation(path.toUpperCase()), path).toBe(location);
      expect(isTrackingRedirectPath(`${path}/`)).toBe(true);
    }
  });

  it("lets incoming query params override the defaults and keeps the rest", () => {
    expect(trackingRedirectLocation("/ig", "?utm_campaign=reel_salons")).toBe(
      "/preview?utm_source=instagram&utm_medium=social&utm_campaign=reel_salons"
    );
    expect(
      trackingRedirectLocation(
        "/ig/",
        "?utm_source=partner&fbclid=abc&utm_campaign=reel_salons"
      )
    ).toBe(
      "/preview?utm_source=partner&utm_medium=social&utm_campaign=reel_salons&fbclid=abc"
    );
  });

  it("does not treat nearby paths as short links", () => {
    for (const path of [
      "/",
      "/preview",
      "/facebook",
      "/ig/extra",
      "/email-settings",
      "/xtra",
      "/share-target",
    ]) {
      expect(trackingRedirectLocation(path), path).toBeNull();
      expect(isTrackingRedirectPath(path), path).toBe(false);
    }
  });
});
