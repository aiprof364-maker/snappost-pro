// Load .env.local FIRST, before any other imports (workaround for Manus platform limitation)
import fs from "fs";
import path from "path";

const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) return;
    const [key, ...valueParts] = trimmedLine.split("=");
    if (key && valueParts.length > 0) {
      const value = valueParts.join("=").trim();
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
}

// Now load dotenv (it won't override already-set env vars)
import "dotenv/config";

// Log environment variables for debugging
console.log("[Server] Environment variables at startup:");
console.log("  STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY ? "SET" : "NOT SET");
console.log("  STRIPE_STARTER_PRICE_ID:", process.env.STRIPE_STARTER_PRICE_ID ? "SET" : "NOT SET");
console.log("  STRIPE_PRO_PRICE_ID:", process.env.STRIPE_PRO_PRICE_ID ? "SET" : "NOT SET");
console.log("  STRIPE_WEBHOOK_SECRET:", process.env.STRIPE_WEBHOOK_SECRET ? "SET" : "NOT SET");

import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerIntegrationRoutes } from "../integrationRoutes";
import { registerScheduledRoutes } from "../scheduledRoutes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { COOKIE_NAME } from "@shared/const";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // Facebook OAuth callback + Stripe webhook (raw body handled inside)
  registerIntegrationRoutes(app);
  // Scheduled email routes (must be before Vite/static fallthrough)
  registerScheduledRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`[Server] Port ${preferredPort} unavailable, using ${port}`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`[Scheduled] Endpoints available at /api/scheduled/*`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
