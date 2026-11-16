import * as esbuild from "esbuild";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");

export async function buildServiceWorkerSource(): Promise<string> {
  const result = await esbuild.build({
    entryPoints: [path.join(root, "client/src/pwa/sw.ts")],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    legalComments: "none",
    alias: {
      "@shared": path.join(root, "shared"),
    },
  });
  const output = result.outputFiles[0];
  if (!output) throw new Error("Service worker bundle was empty");
  return output.text;
}
