import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({ buffer: Buffer.alloc(0), put: vi.fn() }));
vi.mock("./storage", () => ({
  storagePut: storage.put,
  storageGetSignedUrl: vi.fn(),
}));

import { brandImage } from "./branding";

beforeEach(() => {
  storage.buffer = Buffer.alloc(0);
  storage.put.mockReset();
  storage.put.mockImplementation(async (_key: string, buffer: Buffer) => {
    storage.buffer = buffer;
    return { key: "marked", url: "https://example.invalid/marked.jpg" };
  });
});

describe("signed-in post images", () => {
  it("draws the free-plan mark through the same helper posts.create uses", async () => {
    const photo = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#6b7280" },
    })
      .jpeg()
      .toBuffer();
    const branded = await brandImage({
      photoBuffer: photo,
      destKeyPrefix: "posts/1",
      watermark: true,
    });
    expect(branded.watermarkedBuffer).not.toBeNull();
    const { data, info } = await sharp(branded.watermarkedBuffer!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const heights: number[] = [];
    let light = 0;
    for (let x = 40; x < 280; x++) {
      let column = 0;
      for (let y = info.height - 48; y < info.height - 8; y++) {
        const index = (y * info.width + x) * info.channels;
        if (
          data[index] > 210 &&
          data[index + 1] > 210 &&
          data[index + 2] > 210
        ) {
          column += 1;
        }
      }
      heights.push(column);
      light += column;
    }
    const ink = heights.filter(height => height > 0);
    expect(light).toBeGreaterThan(40);
    expect(ink.length).toBeGreaterThan(30);
    expect(new Set(ink).size).toBeGreaterThan(4);
  });
});
