import type { Express, Request, Response } from "express";
import { getSessionCookieOptions } from "./_core/cookies";
import { consumeMagicLinkToken, createSessionToken, SESSION_COOKIE, sessionCookieMaxAge } from "./auth";

function safeReturnPath(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/verify", async (req: Request, res: Response) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token) {
      res.redirect(302, "/login?error=invalid-link");
      return;
    }
    try {
      const user = await consumeMagicLinkToken(token);
      if (!user) {
        res.redirect(302, "/login?error=expired-link");
        return;
      }
      const session = await createSessionToken(user);
      res.cookie(SESSION_COOKIE, session, {
        ...getSessionCookieOptions(req),
        maxAge: sessionCookieMaxAge(),
      });
      res.redirect(302, safeReturnPath(req.query.next));
    } catch (error) {
      console.error("[Auth] Magic-link verification failed", error);
      res.redirect(302, "/login?error=sign-in-failed");
    }
  });
}
