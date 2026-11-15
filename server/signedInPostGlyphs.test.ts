import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({ buffer: Buffer.alloc(0), put: vi.fn() }));
vi.mock("./storage", () => ({
  storagePut: storage.put,
  storageGetSignedUrl: vi.fn(),
}));

import { storeMarkedImage } from "./freeMark";

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
    const stored = await storeMarkedImage(photo, "posts/1/marked.jpg");
    expect(stored).not.toBeNull();
    const { data, info } = await sharp(storage.buffer)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const heights: number[] = [];
    let light = 0;
    for (let x = 24; x < 240; x++) {
      let column = 0;
      for (let y = 16; y < 56; y++) {
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
    expect(light).toBeGreaterThan(80);
    expect(ink.length).toBeGreaterThan(40);
    expect(new Set(ink).size).toBeGreaterThan(6);
  });
});
