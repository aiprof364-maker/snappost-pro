import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  WATERMARK_TEXT,
  compositeSnapPostMark,
  layoutSnapPostMark,
  photoFitsSnapPostMark,
  renderSnapPostMarkOverlay,
} from "./snapPostMark";

describe("Made with SnapPost Pro watermark", () => {
  it("uses the free-plan credit line", () => {
    expect(WATERMARK_TEXT).toBe("Made with SnapPost Pro · snappostpro.com");
  });

  it("draws a small dark pill in the bottom-left and leaves the logo corner clear", async () => {
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
      return [data[offset], data[offset + 1], data[offset + 2]] as const;
    };
    const pill = bounds(data, info, (red, green, blue) => {
      return red < 140 && green < 140 && blue < 170 && blue >= red;
    });
    expect(pill).not.toBeNull();
    expect(pill!.minY).toBeGreaterThan(info.height * 0.85);
    expect(pill!.maxX).toBeLessThan(info.width * 0.7);
    expect(pill!.maxY - pill!.minY).toBeGreaterThan(8);
    expect(pill!.maxY - pill!.minY).toBeLessThan(info.height * 0.06);

    const letters = lightLetterStats(
      data,
      info,
      pill!.minX + 16,
      pill!.minY,
      pill!.maxX - 4,
      pill!.maxY + 1
    );
    expect(letters.light).toBeGreaterThan(40);
    expect(letters.inkColumns).toBeGreaterThan(40);
    expect(letters.uniqueColumnHeights).toBeGreaterThan(4);

    const center = pixel(400, 300);
    expect(center[0]).toBeGreaterThan(245);
    const lowerRight = pixel(770, 570);
    expect(lowerRight[0]).toBeGreaterThan(245);
  });

  it("scales the pill with the image height", () => {
    const small = layoutSnapPostMark(640, 640);
    const large = layoutSnapPostMark(1280, 1280);
    expect(small).not.toBeNull();
    expect(large).not.toBeNull();
    expect(small!.pillHeight).toBe(Math.round(640 * 0.03));
    expect(large!.pillHeight).toBe(Math.round(1280 * 0.03));
    expect(large!.pillHeight).toBe(small!.pillHeight * 2);
    expect(large!.fontSize).toBeGreaterThan(small!.fontSize);
    expect(large!.left).toBeGreaterThan(small!.left);
  });

  it("puts the pill in the opposite bottom corner when asked", () => {
    const right = layoutSnapPostMark(1000, 800, { corner: "bottom-right" });
    const left = layoutSnapPostMark(1000, 800, { corner: "bottom-left" });
    expect(right).not.toBeNull();
    expect(left).not.toBeNull();
    expect(right!.left).toBeGreaterThan(left!.left + left!.pillWidth);
    expect(right!.pillHeight).toBe(left!.pillHeight);
  });

  it("skips photos that are too small to hold a readable mark", async () => {
    expect(await renderSnapPostMarkOverlay(40, 20)).toBeNull();
    const tiny = await sharp({
      create: { width: 40, height: 20, channels: 3, background: "#ffffff" },
    })
      .jpeg()
      .toBuffer();
    expect(await compositeSnapPostMark(tiny)).toBeNull();
    expect(await photoFitsSnapPostMark(tiny)).toBe(false);
  });
});

function bounds(
  data: Buffer,
  info: { width: number; height: number; channels: number },
  match: (red: number, green: number, blue: number) => boolean
) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = -1;
  let maxY = -1;
  let count = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const index = (y * info.width + x) * info.channels;
      if (!match(data[index], data[index + 1], data[index + 2])) continue;
      count += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return count === 0 ? null : { minX, minY, maxX, maxY, count };
}

function lightLetterStats(
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
      if (data[index] > 210 && data[index + 1] > 210 && data[index + 2] > 210) {
        column += 1;
      }
    }
    heights.push(column);
    light += column;
  }
  const ink = heights.filter(height => height > 0);
  return {
    light,
    inkColumns: ink.length,
    uniqueColumnHeights: new Set(ink).size,
  };
}
