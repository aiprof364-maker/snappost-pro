import type { Express, NextFunction, Request, Response } from "express";
import {
  TRACKING_SHORT_LINKS,
  trackingRedirectLocation,
} from "@shared/trackingRedirects";

function sendTrackingRedirect(req: Request, res: Response, next: NextFunction) {
  const url = new URL(req.originalUrl, "http://127.0.0.1");
  const location = trackingRedirectLocation(url.pathname, url.search);
  if (!location) {
    next();
    return;
  }
  res.redirect(301, location);
}

/** Permanent short links. Register this before the SPA fallback. */
export function registerTrackingRedirects(app: Express) {
  for (const link of TRACKING_SHORT_LINKS) {
    app.get(link.path, sendTrackingRedirect);
  }
}
