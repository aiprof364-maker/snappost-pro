import type { Express, Request, Response } from "express";
import { optOutPreviewReminders } from "./accountEmailAutomation";
import { isValidPreviewReminderUnsubscribe } from "./previewReminderEmail";

function requestLink(req: Request) {
  const token =
    typeof req.body?.token === "string"
      ? req.body.token
      : typeof req.query.token === "string"
        ? req.query.token
        : "";
  const email =
    typeof req.body?.email === "string"
      ? req.body.email
      : typeof req.query.email === "string"
        ? req.query.email
        : "";
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token) || !email) return null;
  return { token, email };
}

function setNoStore(res: Response) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    character =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!
  );
}

function page(title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | SnapPost Pro</title></head><body style="font-family:Arial,sans-serif;max-width:560px;margin:48px auto;padding:0 20px;color:#172033">${body}</body></html>`;
}

/**
 * One-click unsubscribe for preview reminder emails.
 * GET only shows a confirmation so a mail scanner does not opt anyone out.
 * POST, including the List-Unsubscribe one-click body, is what stops mail.
 */
export function registerPreviewReminderRoutes(app: Express) {
  app.get("/api/preview-reminders/unsubscribe", (req, res) => {
    setNoStore(res);
    const link = requestLink(req);
    if (!link || !isValidPreviewReminderUnsubscribe(link.email, link.token)) {
      res.status(404).type("text/plain").send("Unsubscribe link not found.");
      return;
    }
    res
      .type("html")
      .send(
        page(
          "Unsubscribe",
          `<h1>Stop preview reminder emails?</h1><p>Confirm to stop the follow-up emails about your free SnapPost Pro preview. This does not cancel your account, billing emails, or the newsletter.</p><form method="post" action="/api/preview-reminders/unsubscribe"><input type="hidden" name="token" value="${escapeHtml(link.token)}"><input type="hidden" name="email" value="${escapeHtml(link.email)}"><button type="submit">Confirm unsubscribe</button></form>`
        )
      );
  });

  app.post("/api/preview-reminders/unsubscribe", async (req, res) => {
    setNoStore(res);
    const link = requestLink(req);
    if (!link || !isValidPreviewReminderUnsubscribe(link.email, link.token)) {
      res.status(404).type("text/plain").send("Unsubscribe link not found.");
      return;
    }
    try {
      await optOutPreviewReminders(link.email);
    } catch {
      res.status(503).type("text/plain").send("Unsubscribe service unavailable.");
      return;
    }
    if (req.body?.["List-Unsubscribe"] === "One-Click") {
      res.status(200).end();
      return;
    }
    res
      .status(200)
      .type("html")
      .send(
        page(
          "Unsubscribed",
          "<h1>You are unsubscribed</h1><p>You will no longer receive SnapPost Pro preview reminder emails.</p>"
        )
      );
  });
}
