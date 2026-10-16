import type { Express, Request, Response } from "express";
import {
  getNewsletterAutomationHealth,
  isValidNewsletterUnsubscribeToken,
  unsubscribeNewsletterByToken,
} from "./newsletterAutomation";

function tokenFromRequest(req: Request): string | null {
  const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
  const bodyToken = typeof req.body?.token === "string" ? req.body.token : undefined;
  const token = bodyToken ?? queryToken;
  return token && token.length >= 32 ? token : null;
}

function setNoStore(res: Response): void {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
}

function confirmationHtml(token: string): string {
  // Current generated tokens are base64url, but escape defensively so a future
  // token representation cannot become HTML injection.
  const escapedToken = token
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe | SnapPost Pro</title></head>
  <body style="font-family:Arial,sans-serif;max-width:560px;margin:48px auto;padding:0 20px;color:#172033">
    <h1>Unsubscribe from SnapPost Pro emails?</h1>
    <p>Confirm to stop newsletter emails from SnapPost Pro. You can close this page to keep your subscription.</p>
    <form method="post" action="/api/newsletter/unsubscribe">
      <input type="hidden" name="token" value="${escapedToken}">
      <button type="submit">Confirm unsubscribe</button>
    </form>
  </body>
</html>`;
}

function successHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed | SnapPost Pro</title></head>
  <body style="font-family:Arial,sans-serif;max-width:560px;margin:48px auto;padding:0 20px;color:#172033">
    <h1>You are unsubscribed</h1>
    <p>You will no longer receive SnapPost Pro newsletter emails.</p>
  </body>
</html>`;
}

function isOneClickRequest(req: Request): boolean {
  return (
    req.get("List-Unsubscribe")?.toLowerCase() === "one-click" ||
    req.body?.["List-Unsubscribe"] === "One-Click"
  );
}

/** Register routes before static/Vite fallback so unsubscribe works in production. */
export function registerNewsletterRoutes(app: Express): void {
  app.get("/api/newsletter/health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(getNewsletterAutomationHealth());
  });

  // GET validates and displays a confirmation only. It never changes status so
  // link scanners and mail previewers cannot accidentally unsubscribe someone.
  app.get("/api/newsletter/unsubscribe", async (req, res) => {
    setNoStore(res);
    const token = tokenFromRequest(req);
    if (!token) {
      res.status(400).type("text/plain").send("Invalid unsubscribe request.");
      return;
    }
    try {
      if (!(await isValidNewsletterUnsubscribeToken(token))) {
        res.status(404).type("text/plain").send("Unsubscribe link not found.");
        return;
      }
      res.type("html").send(confirmationHtml(token));
    } catch {
      res.status(503).type("text/plain").send("Unsubscribe service unavailable.");
    }
  });

  // RFC 8058 one-click requests may POST the URI token with a
  // List-Unsubscribe=One-Click form field. Manual confirmation posts a hidden
  // token. Both are intentionally idempotent and return no subscriber data.
  app.post("/api/newsletter/unsubscribe", async (req, res) => {
    setNoStore(res);
    const token = tokenFromRequest(req);
    if (!token) {
      res.status(400).type("text/plain").send("Invalid unsubscribe request.");
      return;
    }
    try {
      const found = await unsubscribeNewsletterByToken(token);
      if (!found) {
        res.status(404).type("text/plain").send("Unsubscribe link not found.");
        return;
      }
      if (isOneClickRequest(req)) {
        res.status(200).end();
        return;
      }
      res.status(200).type("html").send(successHtml());
    } catch {
      res.status(503).type("text/plain").send("Unsubscribe service unavailable.");
    }
  });
}
