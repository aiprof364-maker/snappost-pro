import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({ buffer: Buffer.alloc(0), put: vi.fn() }));
vi.mock("./storage", () => ({
  storagePut: storage.put,
  storageGetSignedUrl: vi.fn(),
}));
import { brandImage } from "./branding";

beforeEach(() => {
  storage.put.mockReset();
  storage.buffer = Buffer.alloc(0);
  storage.put.mockImplementation(async (key: string, buffer: Buffer) => {
    storage.buffer = buffer;
    return { key, url: "https://example.invalid/local-test.jpg" };
  });
});

async function photo(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: "white" } })
    .png()
    .toBuffer();
}

describe("shared branding generator", () => {
  it("keeps the no-logo path working and uploads a JPEG only once", async () => {
    await brandImage({
      photoBuffer: await photo(40, 20),
      destKeyPrefix: "test",
    });
    const meta = await sharp(storage.buffer).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(40);
    expect(meta.height).toBe(20);
    expect(storage.put).toHaveBeenCalledTimes(1);
    expect(storage.put.mock.calls[0][2]).toBe("image/jpeg");
  });

  it("rotates EXIF photos before choosing the final dimensions", async () => {
    const input = await sharp(await photo(1400, 700))
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    await brandImage({ photoBuffer: input, destKeyPrefix: "test" });
    const meta = await sharp(storage.buffer).metadata();
    expect(meta.width).toBe(700);
    expect(meta.height).toBe(1400);
  });

  it.each([
    [40, 20],
    [1080, 4],
    [2, 2],
  ])(
    "never clips or rejects a tall logo on a %ix%i photo",
    async (width, height) => {
      const logo = await sharp({
        create: { width: 30, height: 300, channels: 4, background: "#19375a" },
      })
        .png()
        .toBuffer();
      await brandImage({
        photoBuffer: await photo(width, height),
        logoBuffer: logo,
        destKeyPrefix: "test",
      });
      const meta = await sharp(storage.buffer).metadata();
      expect(meta.width).toBe(width);
      expect(meta.height).toBe(height);
    }
  );

  it("composites the real cleaned logo at lower right without its checkerboard box", async () => {
    const logoBuffer = await readFile(
      new URL("./fixtures/checkerboard-logo.png", import.meta.url)
    );
    await brandImage({
      photoBuffer: await photo(1080, 720),
      logoBuffer,
      destKeyPrefix: "test",
    });
    const { data, info } = await sharp(storage.buffer)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const offset = (x: number, y: number) =>
      (y * info.width + x) * info.channels;
    // Old 239px checkerboard occupied this position; the new fitted logo does not.
    expect(data[offset(850, 500)]).toBeGreaterThan(245);
    let darkRight = 0;
    for (let y = 576; y < 720; y++) {
      for (let x = 907; x < 1080; x++) {
        if (data[offset(x, y)] < 120) darkRight++;
      }
    }
    expect(darkRight).toBeGreaterThan(200);
  });

  it("cover-crops a tall photo to a square Facebook frame from the centre", async () => {
    const width = 180;
    const height = 540;
    const raw = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y++) {
      const color =
        y < 180 ? [210, 20, 20] : y < 360 ? [20, 150, 40] : [20, 30, 200];
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 3;
        raw[index] = color[0];
        raw[index + 1] = color[1];
        raw[index + 2] = color[2];
      }
    }
    const photoBuffer = await sharp(raw, {
      raw: { width, height, channels: 3 },
    })
      .png()
      .toBuffer();
    await brandImage({
      photoBuffer,
      destKeyPrefix: "test",
      frame: "square",
    });
    const { data, info } = await sharp(storage.buffer)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(info.width).toBe(180);
    expect(info.height).toBe(180);
    const mid = (90 * info.width + 90) * info.channels;
    expect(data[mid + 1]).toBeGreaterThan(data[mid]);
    expect(data[mid + 1]).toBeGreaterThan(data[mid + 2]);
  });

  it("draws the business name badge only when there is no logo", async () => {
    const photoBuffer = await sharp({
      create: { width: 640, height: 960, channels: 3, background: "#2f7d46" },
    })
      .png()
      .toBuffer();
    const badge = {
      businessName: "Northside Decks",
      suburb: "Richmond",
      callToAction: "Call us for a free quote",
    };
    await brandImage({
      photoBuffer,
      destKeyPrefix: "test",
      frame: "square",
      textBadge: badge,
    });
    const branded = await sharp(storage.buffer)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(branded.info.width).toBe(branded.info.height);
    const colors = countColors(branded.data, branded.info, 0, 420, 460, 640);
    expect(colors.indigo).toBeGreaterThan(400);
    expect(colors.amber).toBeGreaterThan(40);
    expect(colors.white).toBeGreaterThan(20);

    const logo = await sharp({
      create: { width: 80, height: 40, channels: 4, background: "#111111" },
    })
      .png()
      .toBuffer();
    await brandImage({
      photoBuffer: await sharp({
        create: { width: 640, height: 640, channels: 3, background: "white" },
      })
        .png()
        .toBuffer(),
      logoBuffer: logo,
      destKeyPrefix: "test",
      frame: "square",
      textBadge: badge,
    });
    const withLogo = await sharp(storage.buffer)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const lowerLeft = countColors(
      withLogo.data,
      withLogo.info,
      0,
      420,
      220,
      640
    );
    const lowerRight = countColors(
      withLogo.data,
      withLogo.info,
      500,
      560,
      640,
      640
    );
    expect(lowerLeft.indigo).toBe(0);
    expect(lowerRight.dark).toBeGreaterThan(50);
  });

  it("does not invent a badge when the visitor skipped their business details", async () => {
    await brandImage({
      photoBuffer: await sharp({
        create: { width: 640, height: 800, channels: 3, background: "#2f7d46" },
      })
        .png()
        .toBuffer(),
      destKeyPrefix: "test",
      frame: "square",
      textBadge: { callToAction: "Call us for a free quote" },
    });
    const { data, info } = await sharp(storage.buffer)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(countColors(data, info, 0, 0, info.width, info.height).indigo).toBe(
      0
    );
  });
});

function countColors(
  data: Buffer,
  info: { width: number; channels: number },
  x0: number,
  y0: number,
  x1: number,
  y1: number
) {
  const counts = { indigo: 0, amber: 0, white: 0, dark: 0 };
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const index = (y * info.width + x) * info.channels;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      if (blue > 100 && blue > red + 30 && blue > green + 30) counts.indigo++;
      if (red > 190 && green > 110 && green < 200 && blue < 100) counts.amber++;
      if (red > 235 && green > 235 && blue > 235) counts.white++;
      if (red < 40 && green < 40 && blue < 40) counts.dark++;
    }
  }
  return counts;
}
