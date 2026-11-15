import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { compositeSnapPostMark, renderSnapPostMarkOverlay } from "./snapPostMark";

describe("Made with SnapPost mark", () => {
  it("draws a small dark credit in the top-left and leaves the logo corner clear", async () => {
    const overlay = await renderSnapPostMarkOverlay(800, 600);
    expect(overlay).not.toBeNull();
    const photo = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#ffffff" },
    })
      .jpeg()
      .toBuffer();
    const marked = await compositeSnapPostMark(photo);
    expect(marked).not.toBeNull();
    const { data, info } = await sharp(marked!)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixel = (x: number, y: number) => {
      const offset = (y * info.width + x) * info.channels;
      return [data[offset], data[offset + 1], data[offset + 2]];
    };
    let dark = 0;
    for (let y = 12; y < 56; y++) {
      for (let x = 12; x < 220; x++) {
        const [red, green, blue] = pixel(x, y);
        if (red < 110 && green < 110 && blue < 160 && blue > red) dark += 1;
      }
    }
    expect(dark).toBeGreaterThan(80);
    const center = pixel(400, 300);
    expect(center[0]).toBeGreaterThan(245);
    const lowerRight = pixel(770, 570);
    expect(lowerRight[0]).toBeGreaterThan(245);
  });

  it("skips photos that are too small to hold a readable mark", async () => {
    expect(await renderSnapPostMarkOverlay(40, 20)).toBeNull();
    const tiny = await sharp({
      create: { width: 40, height: 20, channels: 3, background: "#ffffff" },
    })
      .jpeg()
      .toBuffer();
    expect(await compositeSnapPostMark(tiny)).toBeNull();
  });
});
