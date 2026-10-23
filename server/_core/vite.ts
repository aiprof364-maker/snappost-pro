import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

const PREVIEW_PAGE_TITLE =
  "Create a Branded Facebook Post From Your Photo | SnapPost Pro";
const PREVIEW_PAGE_DESCRIPTION =
  "Upload a completed-job, product, salon or result photo. Add your logo if you have one, then review a branded Facebook post and AI-written caption free.";

function withPreviewMetadata(template: string) {
  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${PREVIEW_PAGE_TITLE}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/>/,
      `<meta name="description" content="${PREVIEW_PAGE_DESCRIPTION}" />`
    )
    .replace(
      /<meta property="og:url" content="[^"]*"\s*\/>/,
      '<meta property="og:url" content="https://snappostpro.com/preview" />'
    )
    .replace(
      /<meta property="og:title" content="[^"]*"\s*\/>/,
      `<meta property="og:title" content="${PREVIEW_PAGE_TITLE}" />`
    )
    .replace(
      /<meta property="og:description" content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${PREVIEW_PAGE_DESCRIPTION}" />`
    );
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      if (new URL(url, "http://localhost").pathname === "/preview") {
        template = withPreviewMetadata(template);
      }
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  app.get("/preview", async (_req, res, next) => {
    try {
      const template = await fs.promises.readFile(
        path.resolve(distPath, "index.html"),
        "utf-8"
      );
      res
        .status(200)
        .set({ "Content-Type": "text/html" })
        .end(withPreviewMetadata(template));
    } catch (error) {
      next(error);
    }
  });

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
