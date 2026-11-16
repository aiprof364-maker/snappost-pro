import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { accountShowsWatermark } from "./freeMark";

const storage = vi.hoisted(() => ({ put: vi.fn() }));
vi.mock("./storage", () => ({
  storagePut: storage.put,
  storageGetSignedUrl: vi.fn(),
}));

import { brandImage } from "./branding";

beforeEach(() => {
  storage.put.mockReset();
  storage.put.mockImplementation(async (key: string, buffer: Buffer) => {
    return { key, url: `https://example.invalid/${key}` };
  });
});

describe("free-plan image watermark", () => {
  it("watermarks free posts and anonymous previews, not Starter or Pro", async () => {
    const free = { plan: "free", subscriptionStatus: "none" };
    const starter = { plan: "starter", subscriptionStatus: "active" };
    const starterTrial = { plan: "starter", subscriptionStatus: "trialing" };
    const pro = { plan: "pro", subscriptionStatus: "active" };
    const proTrial = { plan: "pro", subscriptionStatus: "trialing" };

    expect(accountShowsWatermark(free)).toBe(true);
    expect(accountShowsWatermark(null)).toBe(true);
    expect(accountShowsWatermark(undefined)).toBe(true);
    expect(accountShowsWatermark(starter)).toBe(false);
    expect(accountShowsWatermark(starterTrial)).toBe(false);
    expect(accountShowsWatermark(pro)).toBe(false);
    expect(accountShowsWatermark(proTrial)).toBe(false);

    const photoBuffer = await scene(960, 720);
    const logoBuffer = await logo();

    const freeImage = await brandImage({
      photoBuffer,
      logoBuffer,
      destKeyPrefix: "free",
      watermark: accountShowsWatermark(free),
    });
    const previewImage = await brandImage({
      photoBuffer,
      logoBuffer,
      destKeyPrefix: "preview",
      frame: "square",
      watermark: accountShowsWatermark(null),
    });
    const starterImage = await brandImage({
      photoBuffer,
      logoBuffer,
      destKeyPrefix: "starter",
      watermark: accountShowsWatermark(starter),
    });
    const proImage = await brandImage({
      photoBuffer,
      logoBuffer,
      destKeyPrefix: "pro",
      watermark: accountShowsWatermark(pro),
    });
    const untouched = await brandImage({
      photoBuffer,
      logoBuffer,
      destKeyPrefix: "plain",
    });

    expect(freeImage.watermarkedBuffer).toBeInstanceOf(Buffer);
    expect(previewImage.watermarkedBuffer).toBeInstanceOf(Buffer);
    expect(starterImage.watermarkedBuffer).toBeNull();
    expect(proImage.watermarkedBuffer).toBeNull();

    const paidPixels = await raw(starterImage.buffer);
    const proPixels = await raw(proImage.buffer);
    const plainPixels = await raw(untouched.buffer);
    expect(Buffer.compare(paidPixels.data, plainPixels.data)).toBe(0);
    expect(Buffer.compare(proPixels.data, plainPixels.data)).toBe(0);
    expect(Buffer.compare(await raw(freeImage.buffer).then(image => image.data), plainPixels.data)).toBe(0);

    const marked = await raw(freeImage.watermarkedBuffer!);
    const pill = bounds(marked.data, marked.info, (red, green, blue, x, y) => {
      return x < marked.info.width * 0.6 && y > marked.info.height * 0.75 && isPill(red, green, blue);
    });
    const customerLogo = bounds(marked.data, marked.info, (red, green, blue, x) => {
      return x > marked.info.width * 0.7 && isCustomerLogo(red, green, blue);
    });
    expect(pill).not.toBeNull();
    expect(customerLogo).not.toBeNull();
    expect(overlaps(pill!, customerLogo!)).toBe(false);
    expect(pill!.maxX).toBeLessThan(customerLogo!.minX);
    expect(pill!.minY).toBeGreaterThan(marked.info.height * 0.8);
    expect(customerLogo!.minX).toBeGreaterThan(marked.info.width * 0.7);

    const center = pixel(marked, Math.round(marked.info.width / 2), Math.round(marked.info.height / 2));
    const paidCenter = pixel(paidPixels, Math.round(paidPixels.info.width / 2), Math.round(paidPixels.info.height / 2));
    expect(center).toEqual(paidCenter);
    expect(center[0]).toBeGreaterThan(180);
    expect(center[1]).toBeLessThan(80);

    const preview = await raw(previewImage.watermarkedBuffer!);
    const previewPill = bounds(preview.data, preview.info, isPill);
    expect(preview.info.width).toBe(preview.info.height);
    expect(previewPill).not.toBeNull();
    expect(previewPill!.minY).toBeGreaterThan(preview.info.height * 0.8);
  });

  it("scales the composited watermark with the image", async () => {
    const small = await brandImage({
      photoBuffer: await scene(540, 540),
      logoBuffer: await logo(),
      destKeyPrefix: "small",
      watermark: true,
    });
    const large = await brandImage({
      photoBuffer: await scene(1080, 1080),
      logoBuffer: await logo(),
      destKeyPrefix: "large",
      watermark: true,
    });
    const smallRaw = await raw(small.watermarkedBuffer!);
    const largeRaw = await raw(large.watermarkedBuffer!);
    const smallPill = bounds(smallRaw.data, smallRaw.info, (red, green, blue, x, y) => {
      return x < smallRaw.info.width * 0.55 && y > smallRaw.info.height * 0.75 && isPill(red, green, blue);
    });
    const largePill = bounds(largeRaw.data, largeRaw.info, (red, green, blue, x, y) => {
      return x < largeRaw.info.width * 0.55 && y > largeRaw.info.height * 0.75 && isPill(red, green, blue);
    });
    expect(smallPill).not.toBeNull();
    expect(largePill).not.toBeNull();
    const smallHeight = smallPill!.maxY - smallPill!.minY + 1;
    const largeHeight = largePill!.maxY - largePill!.minY + 1;
    expect(smallHeight / 540).toBeGreaterThan(0.02);
    expect(smallHeight / 540).toBeLessThan(0.045);
    expect(largeHeight / 1080).toBeGreaterThan(0.02);
    expect(largeHeight / 1080).toBeLessThan(0.045);
    expect(largeHeight / smallHeight).toBeGreaterThan(1.7);
    expect(largeHeight / smallHeight).toBeLessThan(2.3);
  });
});

async function scene(width: number, height: number) {
  const rawPixels = Buffer.alloc(width * height * 3, 255);
  const left = Math.round(width * 0.35);
  const right = Math.round(width * 0.65);
  const top = Math.round(height * 0.3);
  const bottom = Math.round(height * 0.7);
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const index = (y * width + x) * 3;
      rawPixels[index] = 210;
      rawPixels[index + 1] = 40;
      rawPixels[index + 2] = 36;
    }
  }
  return sharp(rawPixels, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
}

function logo() {
  return sharp({
    create: { width: 160, height: 80, channels: 4, background: "#111111" },
  })
    .png()
    .toBuffer();
}

function raw(buffer: Buffer) {
  return sharp(buffer).raw().toBuffer({ resolveWithObject: true });
}

function pixel(
  image: { data: Buffer; info: { width: number; channels: number } },
  x: number,
  y: number
) {
  const index = (y * image.info.width + x) * image.info.channels;
  return [image.data[index], image.data[index + 1], image.data[index + 2]] as const;
}

function isPill(red: number, green: number, blue: number) {
  return red < 170 && green < 170 && blue < 200 && blue + 12 >= red && red > 25 && red + green + blue < 480;
}

function isCustomerLogo(red: number, green: number, blue: number) {
  return red < 30 && green < 30 && blue < 30;
}

function bounds(
  data: Buffer,
  info: { width: number; height: number; channels: number },
  match: (red: number, green: number, blue: number, x: number, y: number) => boolean
) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = -1;
  let maxY = -1;
  let count = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const index = (y * info.width + x) * info.channels;
      if (!match(data[index], data[index + 1], data[index + 2], x, y)) continue;
      count += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return count < 20 ? null : { minX, minY, maxX, maxY, count };
}

function overlaps(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number }
) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}
