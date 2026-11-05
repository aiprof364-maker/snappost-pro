import sharp from "sharp";

const MAX_LOGO_PIXELS = 16_000_000;
const MAX_WORKING_EDGE = 1024;

/** Detect a repeated, two-tone neutral checkerboard, not a plain white background. */
function checkerboardTones(
  pixels: Buffer,
  width: number,
  height: number
): { low: number; high: number } | null {
  const patchSize = Math.min(96, Math.floor(Math.min(width, height) / 4));
  if (patchSize < 16) return null;

  const origins = [
    [0, 0],
    [width - patchSize, 0],
    [0, height - patchSize],
    [width - patchSize, height - patchSize],
  ];
  const patches: number[][] = [];
  for (const [left, top] of origins) {
    const values: number[] = [];
    let neutral = 0;
    for (let y = 0; y < patchSize; y++) {
      for (let x = 0; x < patchSize; x++) {
        const i = ((top + y) * width + left + x) * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        if (Math.max(r, g, b) - Math.min(r, g, b) <= 14) neutral++;
        values.push((r + g + b) / 3);
      }
    }
    // All four corners must show the same neutral background, without foreground.
    if (neutral / values.length < 0.97) return null;
    patches.push(values);
  }

  const values = patches.flat().sort((a, b) => a - b);
  let low = values[Math.floor(values.length * 0.2)];
  let high = values[Math.floor(values.length * 0.8)];
  for (let iteration = 0; iteration < 6; iteration++) {
    const midpoint = (low + high) / 2;
    let lowSum = 0;
    let lowCount = 0;
    let highSum = 0;
    let highCount = 0;
    for (const value of values) {
      if (value < midpoint) {
        lowSum += value;
        lowCount++;
      } else {
        highSum += value;
        highCount++;
      }
    }
    if (lowCount < values.length * 0.25 || highCount < values.length * 0.25) {
      return null;
    }
    low = lowSum / lowCount;
    high = highSum / highCount;
  }
  if (low < 115 || high < 200 || high - low < 25 || high - low > 110) {
    return null;
  }
  const midpoint = (low + high) / 2;

  // A true checkerboard alternates at one cell and repeats at two cells in BOTH
  // axes. Require all four corners to agree on the same repeating cell size.
  for (let cell = 2; cell <= Math.floor(patchSize / 3); cell++) {
    const matches = patches.every(patch => {
      const bits = patch.map(value => value >= midpoint);
      const score = (offset: number, horizontal: boolean, same: boolean) => {
        let matching = 0;
        let count = 0;
        for (let y = 0; y < patchSize - (horizontal ? 0 : offset); y++) {
          for (let x = 0; x < patchSize - (horizontal ? offset : 0); x++) {
            const i = y * patchSize + x;
            const j = horizontal ? i + offset : i + offset * patchSize;
            if ((bits[i] === bits[j]) === same) matching++;
            count++;
          }
        }
        return matching / count;
      };
      return (
        score(cell, true, false) >= 0.79 &&
        score(cell, false, false) >= 0.79 &&
        score(cell * 2, true, true) >= 0.83 &&
        score(cell * 2, false, true) >= 0.83
      );
    });
    if (matches) return { low, high };
  }
  return null;
}

/**
 * Prepare only the logo; never alter the customer's photograph.
 * Recognizable baked-in checkerboard grays become transparent. Existing alpha,
 * coloured artwork, dark lettering and ambiguous/plain backgrounds are retained.
 */
export async function prepareLogoForBranding(
  logoBuffer: Buffer,
  photoWidth: number,
  photoHeight: number
): Promise<Buffer | null> {
  const { data, info } = await sharp(logoBuffer, {
    limitInputPixels: MAX_LOGO_PIXELS,
  })
    .rotate()
    .toColourspace("srgb")
    .resize({
      width: MAX_WORKING_EDGE,
      height: MAX_WORKING_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  // Native transparency must not trigger background removal (e.g. grey logos).
  let hasTransparency = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) {
      hasTransparency = true;
      break;
    }
  }
  const tones = hasTransparency ? null : checkerboardTones(data, width, height);
  if (tones) {
    const background = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0;
    let tail = 0;
    const enqueue = (pixel: number) => {
      if (background[pixel]) return;
      const i = pixel * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      // Include JPEG/grid-edge interpolation between the two detected tones.
      if (
        Math.max(r, g, b) - Math.min(r, g, b) <= 18 &&
        brightness >= tones.low - 40 &&
        brightness <= tones.high + 40
      ) {
        background[pixel] = 1;
        queue[tail++] = pixel;
      }
    };
    for (let x = 0; x < width; x++) {
      enqueue(x);
      enqueue((height - 1) * width + x);
    }
    for (let y = 0; y < height; y++) {
      enqueue(y * width);
      enqueue(y * width + width - 1);
    }
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      if (x > 0) enqueue(pixel - 1);
      if (x + 1 < width) enqueue(pixel + 1);
      if (y > 0) enqueue(pixel - width);
      if (y + 1 < height) enqueue(pixel + width);
      if (x > 0 && y > 0) enqueue(pixel - width - 1);
      if (x + 1 < width && y > 0) enqueue(pixel - width + 1);
      if (x > 0 && y + 1 < height) enqueue(pixel + width - 1);
      if (x + 1 < width && y + 1 < height) enqueue(pixel + width + 1);
    }
    for (let pixel = 0; pixel < background.length; pixel++) {
      if (background[pixel]) data[pixel * 4 + 3] = 0;
    }
  }

  // Trim transparent canvas only, not white fills or intentional logo artwork.
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < left || bottom < top) return null;

  const margin = Math.max(
    1,
    Math.round(Math.min(photoWidth, photoHeight) * 0.03)
  );
  const maxWidth = Math.max(
    1,
    Math.min(Math.floor(photoWidth * 0.16), photoWidth - margin * 2)
  );
  const maxHeight = Math.max(
    1,
    Math.min(Math.floor(photoHeight * 0.2), photoHeight - margin * 2)
  );
  return sharp(data, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
}
