import { isNeonGreenPixel } from "./scanNeonGreenBounds";
import type { TargetBounds } from "./types";

const DEFAULT_BOTTLE_RGB: [number, number, number] = [28, 32, 26];

function accumulateSample(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  totals: { rSum: number; gSum: number; bSum: number; count: number },
): void {
  const i = (y * width + x) * 4;
  const r = data[i] ?? 0;
  const g = data[i + 1] ?? 0;
  const b = data[i + 2] ?? 0;
  if (isNeonGreenPixel(r, g, b)) return;

  totals.rSum += r;
  totals.gSum += g;
  totals.bSum += b;
  totals.count += 1;
}

/** Sample non-green pixels above/below the label bounds (bottle glass, not hands). */
export function sampleBottleFillColor(
  imageData: ImageData,
  bounds: TargetBounds,
  ring = 10,
): [number, number, number] {
  const { width, height, data } = imageData;
  const totals = { rSum: 0, gSum: 0, bSum: 0, count: 0 };

  const minX = Math.max(0, Math.floor(bounds.minX));
  const maxX = Math.min(width - 1, Math.ceil(bounds.maxX));
  const topY = Math.max(0, Math.floor(bounds.minY));
  const bottomY = Math.min(height - 1, Math.ceil(bounds.maxY));

  for (let x = minX; x <= maxX; x += 2) {
    for (let offset = 1; offset <= ring; offset += 1) {
      const above = topY - offset;
      const below = bottomY + offset;
      if (above >= 0) accumulateSample(data, width, x, above, totals);
      if (below < height) accumulateSample(data, width, x, below, totals);
    }
  }

  if (totals.count === 0) {
    const outerMinX = Math.max(0, minX - ring);
    const outerMaxX = Math.min(width - 1, maxX + ring);
    const outerMinY = Math.max(0, topY - ring);
    const outerMaxY = Math.min(height - 1, bottomY + ring);

    for (let y = outerMinY; y <= outerMaxY; y += 1) {
      for (let x = outerMinX; x <= outerMaxX; x += 1) {
        const insideBounds = x >= minX && x <= maxX && y >= topY && y <= bottomY;
        if (insideBounds) continue;
        accumulateSample(data, width, x, y, totals);
      }
    }
  }

  if (totals.count === 0) return DEFAULT_BOTTLE_RGB;

  return [
    Math.round(totals.rSum / totals.count),
    Math.round(totals.gSum / totals.count),
    Math.round(totals.bSum / totals.count),
  ];
}

/**
 * Replace only neon-green pixels (not the axis-aligned bounds box) with a bottle tone.
 * Avoids a visible upright "olive" rectangle when the green patch is rotated.
 */
export function replaceGreenRegionForDisplay(
  imageData: ImageData,
  bounds: TargetBounds,
): void {
  const fill = sampleBottleFillColor(imageData, bounds);
  const { width, height, data } = imageData;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      if (!isNeonGreenPixel(r, g, b)) continue;
      data[i] = fill[0];
      data[i + 1] = fill[1];
      data[i + 2] = fill[2];
    }
  }
}

/** Build a display-ready product image with the green placement area neutralized. */
export function createDisplayProductImageSrc(
  image: HTMLImageElement,
  bounds: TargetBounds,
): string {
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;

  const canvas = document.createElement("canvas");
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return image.src;

  ctx.drawImage(image, 0, 0, imageWidth, imageHeight);
  const imageData = ctx.getImageData(0, 0, imageWidth, imageHeight);
  replaceGreenRegionForDisplay(imageData, bounds);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}
