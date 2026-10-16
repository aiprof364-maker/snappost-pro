import type { Express } from "express";
import { unsubscribeNewsletter } from "./db";
import { isValidNewsletterUnsubscribeRequest } from "./newsletter";

/** Registers the public one-click newsletter unsubscribe endpoint. */
export function registerNewsletterRoutes(app: Express) {
  app.get("/api/newsletter/unsubscribe", async (req, res) => {
    const email = typeof req.query.email === "string" ? req.query.email : "";
    const token = typeof req.query.token === "string" ? req.query.token : "";

    if (!isValidNewsletterUnsubscribeRequest(email, token)) {
      return res.status(400).type("html").send(`
        <!doctype html>
        <html><head><title>Invalid unsubscribe link</title></head>
        <body style="font-family:Arial,sans-serif;max-width:640px;margin:64px auto;color:#172033">
          <h1>That unsubscribe link is invalid.</h1>
          <p>Please use the unsubscribe link from your SnapPost Pro email.</p>
        </body></html>
      `);
    }

    await unsubscribeNewsletter(email);
    return res.status(200).type("html").send(`
      <!doctype html>
      <html><head><title>Unsubscribed from SnapPost Pro</title></head>
      <body style="font-family:Arial,sans-serif;max-width:640px;margin:64px auto;color:#172033">
        <h1>You have been unsubscribed.</h1>
        <p>You will no longer receive SnapPost Pro newsletter emails at this address.</p>
      </body></html>
    `);
  });
}
