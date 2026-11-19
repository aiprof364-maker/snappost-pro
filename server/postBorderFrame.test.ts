import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { layoutPostBorder } from "@shared/postBorder";

const storage = vi.hoisted(() => ({ buffer: Buffer.alloc(0), put: vi.fn() }));
vi.mock("./storage", () => ({
  storagePut: storage.put,
  storageGetSignedUrl: vi.fn(),
}));

import { brandImage } from "./branding";
import { framePostImage, planBarText } from "./postBorderFrame";
import { brandSignedInPhoto } from "./signedInBranding";

beforeEach(() => {
  storage.put.mockReset();
  storage.buffer = Buffer.alloc(0);
  storage.put.mockImplementation(async (key: string, buffer: Buffer) => {
    storage.buffer = buffer;
    return { key, url: "https://example.invalid/local-test.jpg" };
  });
});

async function photo(width: number, height: number, background: string) {
  return sharp({ create: { width, height, channels: 3, background } })
    .png()
    .toBuffer();
}

function pixel(
  data: Buffer,
  info: { width: number; channels: number },
  x: number,
  y: number
) {
  const index = (y * info.width + x) * info.channels;
  return [data[index], data[index + 1], data[index + 2]] as const;
}

function near(
  actual: readonly [number, number, number],
  expected: readonly [number, number, number],
  tolerance = 22
) {
  return actual.every(
    (channel, index) => Math.abs(channel - expected[index]) <= tolerance
  );
}

async function raw(buffer: Buffer) {
  return sharp(buffer).raw().toBuffer({ resolveWithObject: true });
}

function countWhere(
  data: Buffer,
  info: { width: number; height: number; channels: number },
  y0: number,
  y1: number,
  match: (red: number, green: number, blue: number) => boolean
) {
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < info.width; x++) {
      const [red, green, blue] = pixel(data, info, x, y);
      if (match(red, green, blue)) count += 1;
    }
  }
  return count;
}

describe("post border renderer", () => {
  it("returns the original buffer for none", async () => {
    const input = await sharp(await photo(80, 120, "#2f7d46"))
      .jpeg()
      .toBuffer();
    const output = await framePostImage(input, {
      style: "none",
      color: "#ff0000",
      businessName: "Northside Decks",
    });
    expect(output).toBe(input);
  });

  it("keeps none identical to today's branded photo", async () => {
    const photoBuffer = await photo(120, 80, "#2f7d46");
    await brandImage({ photoBuffer, destKeyPrefix: "plain" });
    const plain = Buffer.from(storage.buffer);
    await brandImage({
      photoBuffer,
      destKeyPrefix: "none",
      border: {
        style: "none",
        color: "#C2410C",
        businessName: "Northside Decks",
        suburb: "Austin, TX",
      },
    });
    expect(storage.buffer.equals(plain)).toBe(true);
  });

  it("frames square and portrait photos without changing their size", async () => {
    await brandImage({
      photoBuffer: await photo(180, 540, "#2f7d46"),
      destKeyPrefix: "square",
      frame: "square",
      border: { style: "solid" },
    });
    const square = await raw(storage.buffer);
    expect(square.info.width).toBe(180);
    expect(square.info.height).toBe(180);
    expect(near(pixel(square.data, square.info, 0, 0), [243, 240, 234])).toBe(
      true
    );
    expect(pixel(square.data, square.info, 90, 90)[1]).toBeGreaterThan(80);

    await brandImage({
      photoBuffer: await photo(640, 960, "#2f7d46"),
      destKeyPrefix: "portrait",
      border: { style: "brand", color: "#C2410C" },
    });
    const portrait = await raw(storage.buffer);
    expect(portrait.info.width).toBe(640);
    expect(portrait.info.height).toBe(960);
    expect(near(pixel(portrait.data, portrait.info, 0, 0), [194, 65, 12])).toBe(
      true
    );
    const layout = layoutPostBorder({
      width: 640,
      height: 960,
      style: "brand",
      color: "#C2410C",
    });
    const inside = pixel(
      portrait.data,
      portrait.info,
      320,
      (layout?.top ?? 0) + 40
    );
    expect(inside[1]).toBeGreaterThan(inside[0]);
  });

  it("draws a thin line on the edge and leaves the photo inside it", async () => {
    const framed = await framePostImage(await photo(400, 500, "#2f7d46"), {
      style: "line",
    });
    const { data, info } = await raw(framed);
    expect(info.width).toBe(400);
    expect(info.height).toBe(500);
    expect(pixel(data, info, 0, 0)[0]).toBeLessThan(40);
    expect(pixel(data, info, 24, 24)[1]).toBeGreaterThan(80);
  });

  it("prints the name only in the bottom bar, including on a light brand color", async () => {
    for (const [width, height] of [
      [1080, 1080],
      [1080, 1350],
    ] as const) {
      const plan = planBarText(width, height, height - 140, 140, {
        businessName: "Northside Decks",
        suburb: "Austin, TX",
      });
      expect(plan?.[0]?.fontSize).toBeGreaterThanOrEqual(40);
      expect(plan?.[0]?.baseline).toBeGreaterThan(height * 0.25);
    }

    const framed = await framePostImage(await photo(900, 1200, "#2f7d46"), {
      style: "bar",
      color: "#F4E04D",
      businessName: "Northside Decks",
      suburb: "Austin, TX",
    });
    const { data, info } = await raw(framed);
    expect(info.width).toBe(900);
    expect(info.height).toBe(1200);
    const topQuarter = Math.floor(info.height * 0.25);
    expect(
      countWhere(
        data,
        info,
        0,
        topQuarter,
        (red, green, blue) => red < 40 && green < 40 && blue < 40
      )
    ).toBe(0);
    expect(
      countWhere(
        data,
        info,
        info.height - Math.floor(info.height * 0.12),
        info.height,
        (red, green, blue) => red < 50 && green < 50 && blue < 50
      )
    ).toBeGreaterThan(40);
    expect(near(pixel(data, info, 8, 8), [244, 224, 77])).toBe(true);
  });

  it("does not invent a phone number or website when those fields are absent", async () => {
    const plan = planBarText(800, 800, 680, 120, {
      businessName: "Northside Decks",
    });
    expect(plan).toHaveLength(1);
    expect(plan?.[0]?.text).toBe("Northside Decks");
    const empty = await framePostImage(await photo(200, 260, "#2f7d46"), {
      style: "bar",
      color: "#3C2E86",
    });
    const { data, info } = await raw(empty);
    expect(
      countWhere(
        data,
        info,
        0,
        info.height,
        (red, green, blue) => red > 230 && green > 230 && blue > 230
      )
    ).toBe(0);
  });

  it("keeps a logo inside the photo and still names the business on the bar", async () => {
    const logo = await sharp({
      create: { width: 80, height: 40, channels: 4, background: "#111111" },
    })
      .png()
      .toBuffer();
    const branded = await brandSignedInPhoto({
      photoBuffer: await photo(640, 640, "#f7f7f7"),
      logoBuffer: logo,
      businessName: "Northside Decks",
      suburb: "Austin, TX",
      destKeyPrefix: "logo-bar",
      border: { style: "bar", color: "#C2410C" },
    });
    const { data, info } = await raw(branded.buffer);
    const layout = layoutPostBorder({
      width: info.width,
      height: info.height,
      style: "bar",
      color: "#C2410C",
    });
    expect(layout).not.toBeNull();
    expect(near(pixel(data, info, 1, 1), [194, 65, 12])).toBe(true);
    let logoInk = 0;
    let borderInk = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const [red, green, blue] = pixel(data, info, x, y);
        const dark = red < 40 && green < 40 && blue < 40;
        if (!dark) continue;
        const inPhoto =
          x >= layout!.left &&
          x < info.width - layout!.right &&
          y >= layout!.top &&
          y < info.height - layout!.bottom;
        if (inPhoto) logoInk += 1;
        else borderInk += 1;
      }
    }
    expect(logoInk).toBeGreaterThan(30);
    expect(borderInk).toBe(0);
    const barTop = info.height - layout!.bottom;
    expect(
      countWhere(data, info, barTop, info.height, (red, green, blue) => {
        return red > 230 && green > 230 && blue > 230;
      })
    ).toBeGreaterThan(20);
  });

  it("frames the free-plan copy as well as the clean post", async () => {
    const branded = await brandImage({
      photoBuffer: await photo(480, 480, "#2f7d46"),
      destKeyPrefix: "marked",
      watermark: true,
      border: {
        style: "solid",
        businessName: "Northside Decks",
      },
    });
    expect(branded.watermarkedBuffer).toBeInstanceOf(Buffer);
    const clean = await raw(branded.buffer);
    const marked = await raw(branded.watermarkedBuffer!);
    expect(marked.info.width).toBe(clean.info.width);
    expect(marked.info.height).toBe(clean.info.height);
    expect(near(pixel(clean.data, clean.info, 0, 0), [243, 240, 234])).toBe(
      true
    );
    expect(near(pixel(marked.data, marked.info, 0, 0), [243, 240, 234])).toBe(
      true
    );
  });

  it("does not throw on a tiny photo", async () => {
    for (const style of ["solid", "line", "brand", "bar"] as const) {
      const framed = await framePostImage(await photo(40, 20, "#2f7d46"), {
        style,
        color: "#3C2E86",
        businessName: "Northside Decks",
        suburb: "Austin, TX",
      });
      const meta = await sharp(framed).metadata();
      expect(meta.width).toBe(40);
      expect(meta.height).toBe(20);
    }
  });
});
