import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { prepareLogoForBranding } from "./logoPreparation";

async function pixels(buffer: Buffer) {
  return sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

/** Exact synthetic pixel fixtures exercise the algorithm; no generated artwork. */
async function checkerFixture(cell = 8, enclosed = false) {
  const width = 256;
  const data = Buffer.alloc(width * width * 4);
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const tone =
        (Math.floor((x + 3) / cell) + Math.floor((y + 5) / cell)) % 2
          ? 150
          : 225;
      const inside = x >= 75 && x < 181 && y >= 75 && y < 181;
      const outline = inside && (x < 80 || x >= 176 || y < 80 || y >= 176);
      const ink = enclosed ? outline : inside;
      data[i] = ink ? 25 : tone;
      data[i + 1] = ink ? 55 : tone;
      data[i + 2] = ink ? 90 : tone;
      data[i + 3] = 255;
    }
  }
  return sharp(data, { raw: { width, height: width, channels: 4 } })
    .png()
    .toBuffer();
}

describe("prepareLogoForBranding", () => {
  it("removes the real JPEG-compressed checkerboard without losing the dark logo", async () => {
    const input = await readFile(
      new URL("./fixtures/checkerboard-logo.png", import.meta.url)
    );
    const output = await prepareLogoForBranding(input, 2500, 1667);
    expect(output).not.toBeNull();
    const { data, info } = await pixels(output!);
    expect(info.width).toBeLessThan(180);
    expect(info.height).toBeLessThan(150);
    // A verified checker-filled hole inside the real roof symbol, not just its
    // outer rectangular backdrop, must become transparent too.
    expect(data[(39 * info.width + 69) * 4 + 3]).toBe(0);
    let transparent = 0;
    let blueInk = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) transparent++;
      if (data[i + 3] > 200 && data[i + 2] > data[i] + 15) blueInk++;
    }
    expect(transparent / (data.length / 4)).toBeGreaterThan(0.45);
    expect(blueInk).toBeGreaterThan(300);
  });

  it.each([4, 8, 16])(
    "cleans a shifted %ipx checkerboard and trims its transparent border",
    async cell => {
      const output = await prepareLogoForBranding(
        await checkerFixture(cell),
        1000,
        1000
      );
      const { data, info } = await pixels(output!);
      expect(info.width).toBe(106);
      expect(info.height).toBe(106);
      expect([...data.subarray(0, 4)]).toEqual([25, 55, 90, 255]);
    }
  );

  it("preserves enclosed checker-pattern artwork instead of globally deleting grey pixels", async () => {
    const output = await prepareLogoForBranding(
      await checkerFixture(8, true),
      1000,
      1000
    );
    const { data, info } = await pixels(output!);
    const centerAlpha =
      data[
        (Math.floor(info.height / 2) * info.width +
          Math.floor(info.width / 2)) *
          4 +
          3
      ];
    expect(centerAlpha).toBe(255);
  });

  it("does not strip an ordinary solid white logo background", async () => {
    const input = await sharp({
      create: { width: 80, height: 40, channels: 4, background: "white" },
    })
      .png()
      .toBuffer();
    const output = await prepareLogoForBranding(input, 1000, 1000);
    const { data, info } = await pixels(output!);
    expect(info.width).toBe(80);
    expect(info.height).toBe(40);
    expect([...data.subarray(0, 4)]).toEqual([255, 255, 255, 255]);
  });

  it("preserves nonperiodic grayscale backgrounds", async () => {
    const data = Buffer.alloc(128 * 128 * 4);
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const i = (y * 128 + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 140 + Math.floor(x / 2);
        data[i + 3] = 255;
      }
    }
    const input = await sharp(data, {
      raw: { width: 128, height: 128, channels: 4 },
    })
      .png()
      .toBuffer();
    const output = await prepareLogoForBranding(input, 1000, 1000);
    const result = await pixels(output!);
    expect(result.data.equals(data)).toBe(true);
  });

  it("trims existing transparency without removing grey artwork or partial alpha", async () => {
    const data = Buffer.alloc(80 * 60 * 4);
    for (let y = 20; y < 40; y++) {
      for (let x = 20; x < 60; x++) {
        const i = (y * 80 + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 170;
        data[i + 3] = x === 20 ? 128 : 255;
      }
    }
    const input = await sharp(data, {
      raw: { width: 80, height: 60, channels: 4 },
    })
      .png()
      .toBuffer();
    const output = await prepareLogoForBranding(input, 1000, 1000);
    const { data: result, info } = await pixels(output!);
    expect(info.width).toBe(40);
    expect(info.height).toBe(20);
    expect([...result.subarray(0, 4)]).toEqual([170, 170, 170, 128]);
  });

  it("returns null for a fully transparent logo", async () => {
    const input = await sharp({
      create: {
        width: 40,
        height: 40,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();
    expect(await prepareLogoForBranding(input, 1080, 720)).toBeNull();
  });

  it.each([
    [30, 300, 1080, 720],
    [300, 30, 1080, 720],
    [200, 200, 40, 20],
    [200, 200, 1080, 4],
    [200, 200, 2, 2],
    [10, 5, 1080, 1920],
  ])(
    "fits %ix%i logos safely inside %ix%i photos without enlarging",
    async (width, height, photoWidth, photoHeight) => {
      const input = await sharp({
        create: { width, height, channels: 4, background: "#19375a" },
      })
        .png()
        .toBuffer();
      const output = await prepareLogoForBranding(
        input,
        photoWidth,
        photoHeight
      );
      const info = await sharp(output!).metadata();
      expect(info.width).toBeLessThanOrEqual(
        Math.max(1, Math.floor(photoWidth * 0.16))
      );
      expect(info.height).toBeLessThanOrEqual(
        Math.max(1, Math.floor(photoHeight * 0.2))
      );
      expect(info.width).toBeLessThanOrEqual(width);
      expect(info.height).toBeLessThanOrEqual(height);
    }
  );

  it("fails explicitly on invalid image bytes instead of corrupting output", async () => {
    await expect(
      prepareLogoForBranding(Buffer.from("not an image"), 1080, 720)
    ).rejects.toThrow();
  });
});
