import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  files: new Map<string, Buffer>(),
  put: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: storage.put,
  storageGetSignedUrl: vi.fn(),
}));

import { brandImage } from "./branding";
import { brandSignedInPhoto } from "./signedInBranding";

beforeEach(() => {
  storage.files.clear();
  storage.put.mockReset();
  storage.put.mockImplementation(async (key: string, buffer: Buffer) => {
    storage.files.set(key, buffer);
    return { key, url: `https://example.invalid/${key}` };
  });
});

async function photo(width: number, height: number, background: string) {
  return sharp({
    create: { width, height, channels: 3, background },
  })
    .png()
    .toBuffer();
}

describe("signed-in post badge", () => {
  it("draws the business name, town, and trade call to action when there is no logo", async () => {
    const photoBuffer = await photo(800, 1000, "#2f7d46");
    const branded = await brandSignedInPhoto({
      photoBuffer,
      businessName: "Northside Decks",
      suburb: "Austin, TX",
      trade: "deck-builder",
      destKeyPrefix: "contractor",
      watermark: true,
    });
    expect(branded.watermarkedBuffer).toBeInstanceOf(Buffer);

    const { data, info } = await sharp(branded.watermarkedBuffer!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const badge = bounds(data, info, (red, green, blue) => {
      return blue > 100 && blue > red + 30 && blue > green + 30;
    });
    const mark = bounds(
      data,
      info,
      (red, green, blue, x, y) =>
        y > info.height * 0.8 &&
        x > info.width * 0.55 &&
        red > 220 &&
        green > 220 &&
        blue > 220
    );
    expect(badge).not.toBeNull();
    expect(mark).not.toBeNull();
    expect(overlaps(badge!, mark!)).toBe(false);
    expect(mark!.minX).toBeGreaterThan(badge!.maxX);
    expect(mark!.minY).toBeGreaterThan(info.height * 0.8);

    const nameBandBottom =
      badge!.minY + Math.round((badge!.maxY - badge!.minY) * 0.42);
    const nameInk = lightColumnStats(
      data,
      info,
      badge!.minX + 8,
      badge!.minY + 8,
      badge!.maxX - 8,
      nameBandBottom
    );
    expect(nameInk.light).toBeGreaterThan(80);
    expect(nameInk.inkColumns).toBeGreaterThan(30);
    expect(nameInk.uniqueColumnHeights).toBeGreaterThan(6);

    const markLetters = lightColumnStats(
      data,
      info,
      mark!.minX,
      mark!.minY,
      mark!.maxX + 1,
      mark!.maxY + 1
    );
    expect(markLetters.light).toBeGreaterThan(40);
    expect(markLetters.inkColumns).toBeGreaterThan(30);
    expect(markLetters.uniqueColumnHeights).toBeGreaterThan(4);

    const salon = await brandSignedInPhoto({
      photoBuffer,
      businessName: "Northside Decks",
      suburb: "Austin, TX",
      trade: "hair-salon",
      destKeyPrefix: "salon",
    });
    const salonRaw = await sharp(storage.files.get(salon.key)!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const contractorRaw = await sharp(storage.files.get(branded.key)!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(amberSignature(contractorRaw.data, contractorRaw.info)).not.toEqual(
      amberSignature(salonRaw.data, salonRaw.info)
    );
  });

  it("leaves the logo composite unchanged when a logo exists", async () => {
    const photoBuffer = await photo(640, 640, "#ffffff");
    const logoBuffer = await sharp({
      create: { width: 80, height: 40, channels: 4, background: "#111111" },
    })
      .png()
      .toBuffer();
    const logoOnly = await brandImage({
      photoBuffer,
      logoBuffer,
      destKeyPrefix: "logo-only",
    });
    const withName = await brandSignedInPhoto({
      photoBuffer,
      logoBuffer,
      businessName: "Northside Decks",
      suburb: "Austin, TX",
      trade: "deck-builder",
      destKeyPrefix: "logo-named",
    });
    const plain = await sharp(storage.files.get(logoOnly.key)!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const named = await sharp(storage.files.get(withName.key)!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(Buffer.compare(plain.data, named.data)).toBe(0);
    expect(
      countIndigo(
        named.data,
        named.info,
        0,
        0,
        named.info.width,
        named.info.height
      )
    ).toBe(0);
    const lowerRight = countDark(
      named.data,
      named.info,
      500,
      560,
      named.info.width,
      named.info.height
    );
    expect(lowerRight).toBeGreaterThan(50);
  });

  it("does not invent a badge from a town alone", async () => {
    const branded = await brandSignedInPhoto({
      photoBuffer: await photo(640, 800, "#2f7d46"),
      suburb: "Austin, TX",
      trade: "deck-builder",
      destKeyPrefix: "town-only",
    });
    const { data, info } = await sharp(storage.files.get(branded.key)!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(countIndigo(data, info, 0, 0, info.width, info.height)).toBe(0);
  });
});

function lightColumnStats(
  data: Buffer,
  info: { width: number; channels: number },
  x0: number,
  y0: number,
  x1: number,
  y1: number
) {
  const heights: number[] = [];
  let light = 0;
  for (let x = x0; x < x1; x++) {
    let column = 0;
    for (let y = y0; y < y1; y++) {
      const index = (y * info.width + x) * info.channels;
      if (data[index] > 220 && data[index + 1] > 220 && data[index + 2] > 220) {
        column += 1;
        light += 1;
      }
    }
    heights.push(column);
  }
  const ink = heights.filter(height => height > 0);
  return {
    light,
    inkColumns: ink.length,
    uniqueColumnHeights: new Set(ink).size,
  };
}

function bounds(
  data: Buffer,
  info: { width: number; height: number; channels: number },
  match: (
    red: number,
    green: number,
    blue: number,
    x: number,
    y: number
  ) => boolean
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
  return count === 0 ? null : { minX, minY, maxX, maxY, count };
}

function overlaps(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number }
) {
  return (
    a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
  );
}

function amberSignature(
  data: Buffer,
  info: { width: number; height: number; channels: number }
) {
  const heights: number[] = [];
  for (let x = 0; x < info.width; x++) {
    let column = 0;
    for (let y = 0; y < info.height; y++) {
      const index = (y * info.width + x) * info.channels;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      if (red > 190 && green > 110 && green < 200 && blue < 100) column += 1;
    }
    if (column > 0) heights.push(column);
  }
  return heights.join(",");
}

function countIndigo(
  data: Buffer,
  info: { width: number; channels: number },
  x0: number,
  y0: number,
  x1: number,
  y1: number
) {
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const index = (y * info.width + x) * info.channels;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      if (blue > 100 && blue > red + 30 && blue > green + 30) count += 1;
    }
  }
  return count;
}

function countDark(
  data: Buffer,
  info: { width: number; channels: number },
  x0: number,
  y0: number,
  x1: number,
  y1: number
) {
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const index = (y * info.width + x) * info.channels;
      if (data[index] < 40 && data[index + 1] < 40 && data[index + 2] < 40) {
        count += 1;
      }
    }
  }
  return count;
}
