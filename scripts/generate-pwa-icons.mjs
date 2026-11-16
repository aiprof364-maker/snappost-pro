import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const logo = path.join(root, "client/src/assets/brand/snappost-pro-logo.jpg");
const outDir = path.join(root, "client/public/icons");

// Logo field sampled from the brand asset. Maskable icons need this color
// full-bleed so the circular Android mask does not show a white edge.
const navy = { r: 16, g: 32, b: 57, alpha: 1 };

await mkdir(outDir, { recursive: true });

await sharp(logo)
  .resize(192, 192, { fit: "cover" })
  .png()
  .toFile(path.join(outDir, "icon-192.png"));

await sharp(logo)
  .resize(512, 512, { fit: "cover" })
  .png()
  .toFile(path.join(outDir, "icon-512.png"));

// Maskable safe zone is the center circle (about 80% of the canvas).
// Scale the whole logo to 68% so the shield and wordmark stay inside it.
const maskable = 512;
const inner = Math.round(maskable * 0.68);
const resized = await sharp(logo)
  .resize(inner, inner, { fit: "cover" })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: maskable,
    height: maskable,
    channels: 3,
    background: navy,
  },
})
  .composite([{ input: resized, gravity: "centre" }])
  .png()
  .toFile(path.join(outDir, "icon-maskable-512.png"));
