import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const cache = new Map<string, Buffer>();

/**
 * Fonts sit in server/fonts during development. The production process runs
 * the esbuild bundle at dist/index.js, which does not contain those files
 * unless the build copies them and we also look beside the bundle.
 */
export function snapPostFontCandidates(filename: string, moduleUrl: string | URL) {
  return [
    new URL(`./fonts/${filename}`, moduleUrl),
    new URL(`../server/fonts/${filename}`, moduleUrl),
  ];
}

export function readSnapPostFont(filename: string): Buffer {
  const cached = cache.get(filename);
  if (cached) return cached;

  const misses: string[] = [];
  for (const url of snapPostFontCandidates(filename, import.meta.url)) {
    const path = fileURLToPath(url);
    if (!existsSync(path)) {
      misses.push(path);
      continue;
    }
    const bytes = readFileSync(path);
    cache.set(filename, bytes);
    return bytes;
  }

  const error = new Error(
    `ENOENT: SnapPost font file is missing (${filename}). Looked in ${misses.join(", ")}`
  );
  (error as NodeJS.ErrnoException).code = "ENOENT";
  throw error;
}
