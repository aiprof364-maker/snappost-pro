import type { Express, Request, Response } from "express";
import { getSessionCookieOptions } from "./_core/cookies";
import {
  consumeMagicLinkToken,
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieMaxAge,
} from "./auth";
import { logConversionEvent } from "./db";
import {
  queueAccountEmail,
  runAccountEmailAutomation,
} from "./accountEmailAutomation";

function safeReturnPath(value: unknown) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : "/dashboard";
}

function supportedLanding(
  value: string | null
): "contractors" | "hairdressers" | undefined {
  return value === "contractors" || value === "hairdressers"
    ? value
    : undefined;
}

function loginProblemPath(
  error: "expired-link" | "invalid-link" | "sign-in-failed",
  next: string
) {
  const params = new URLSearchParams({ error, next });
  return `/login?${params.toString()}`;
}

export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/verify", async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const next = safeReturnPath(req.query.next);
    if (!token) {
      res.redirect(302, loginProblemPath("invalid-link", next));
      return;
    }
    try {
      const redirectUrl = new URL(next, "https://snappostpro.com");
      const landing = supportedLanding(redirectUrl.searchParams.get("landing"));
      const authResult = await consumeMagicLinkToken(
        token,
        landing ? { landing } : undefined
      );
      if (authResult.status !== "ok") {
        res.redirect(
          302,
          loginProblemPath(
            authResult.status === "expired" ? "expired-link" : "invalid-link",
            next
          )
        );
        return;
      }
      await logConversionEvent(
        authResult.user.id,
        "magic_link_opened",
        landing ? { landing } : undefined
      );
      const session = await createSessionToken(authResult.user);
      res.cookie(SESSION_COOKIE, session, {
        ...getSessionCookieOptions(req),
        maxAge: sessionCookieMaxAge(),
      });
      if (authResult.accountCreated) {
        redirectUrl.searchParams.set("account_created", "1");
        if (authResult.user.role !== "admin") {
          try {
            await queueAccountEmail({
              userId: authResult.user.id,
              entityKey: `user:${authResult.user.id}`,
              campaignKey: "onboarding-welcome:v1",
              kind: "onboarding-welcome",
            });
            void runAccountEmailAutomation();
          } catch {
            console.error("[Onboarding] immediate welcome could not be queued");
          }
        }
      }
      res.redirect(302, `${redirectUrl.pathname}${redirectUrl.search}`);
    } catch (error) {
      console.error("[Auth] Magic-link verification failed", error);
      res.redirect(302, loginProblemPath("sign-in-failed", next));
    }
  });
}
