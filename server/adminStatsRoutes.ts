import type { Express, Request, Response } from "express";
import {
  authorizeAdminStatsRequest,
  type AdminStatsAuth,
} from "./adminStatsAuth";
import { loadAdminStats, type AdminStats } from "./adminStats";

type AdminStatsRouteDeps = {
  authorize?: (authorizationHeader: string | undefined) => AdminStatsAuth;
  loadStats?: (now: Date) => Promise<AdminStats>;
  now?: () => Date;
};

function authorizationHeader(req: Request) {
  const header = req.headers.authorization;
  return typeof header === "string" ? header : undefined;
}

function sendJson(res: Response, status: number, body: unknown) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}

/**
 * Read-only machine view of the admin dashboard counts.
 * Disabled with 404 when ADMIN_STATS_TOKEN is unset.
 */
export function registerAdminStatsRoutes(
  app: Express,
  deps: AdminStatsRouteDeps = {}
) {
  const authorize = deps.authorize ?? authorizeAdminStatsRequest;
  const loadStats = deps.loadStats ?? loadAdminStats;
  const now = deps.now ?? (() => new Date());

  app.get("/api/admin/stats", async (req: Request, res: Response) => {
    const decision = authorize(authorizationHeader(req));
    if (decision.status === "disabled") {
      sendJson(res, 404, { error: "not_found" });
      return;
    }
    if (decision.status !== "ok") {
      res.setHeader("WWW-Authenticate", "Bearer");
      sendJson(res, 401, { error: "unauthorized" });
      return;
    }

    try {
      sendJson(res, 200, await loadStats(now()));
    } catch (error) {
      console.error(
        "[Admin stats] read failed",
        error instanceof Error ? error.name : "unknown"
      );
      sendJson(res, 503, { error: "unavailable" });
    }
  });
}
