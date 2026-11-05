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
});
