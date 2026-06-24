import { computeGreenClusterOrientation } from "./computeGreenClusterOrientation";
import type { GreenPixelPoint } from "./computeGreenClusterOrientation";
import type { TargetBounds } from "./types";

/** Minimum green channel value (0–255) for a pixel to qualify as neon green. */
export const MIN_GREEN = 120;

/** Green must exceed red and blue by at least this amount. */
export const GREEN_DELTA = 40;

/** Green / max(red, blue, 1) must exceed this ratio. */
export const GREEN_RATIO_THRESHOLD = 1.4;

/** Reject clusters smaller than this fraction of total image pixels. */
export const MIN_CLUSTER_AREA_RATIO = 0.01;

export interface ScanNeonGreenOptions {
  minGreen?: number;
  greenDelta?: number;
  greenRatioThreshold?: number;
  minClusterAreaRatio?: number;
}

export function isNeonGreenPixel(
  r: number,
  g: number,
  b: number,
  options: ScanNeonGreenOptions = {},
): boolean {
  const resolved: Required<ScanNeonGreenOptions> = {
    minGreen: options.minGreen ?? MIN_GREEN,
    greenDelta: options.greenDelta ?? GREEN_DELTA,
    greenRatioThreshold: options.greenRatioThreshold ?? GREEN_RATIO_THRESHOLD,
    minClusterAreaRatio: options.minClusterAreaRatio ?? MIN_CLUSTER_AREA_RATIO,
  };
  if (g < resolved.minGreen) return false;
  if (g - r < resolved.greenDelta) return false;
  if (g - b < resolved.greenDelta) return false;
  const denominator = Math.max(r, b, 1);
  return g / denominator >= resolved.greenRatioThreshold;
}

/**
 * Scan ImageData for a neon-green cluster and return axis-aligned bounds.
 * Returns null when no sufficiently large green region is found.
 */
export function scanNeonGreenBounds(
  imageData: ImageData,
  options: ScanNeonGreenOptions = {},
): TargetBounds | null {
  const resolved: Required<ScanNeonGreenOptions> = {
    minGreen: options.minGreen ?? MIN_GREEN,
    greenDelta: options.greenDelta ?? GREEN_DELTA,
    greenRatioThreshold: options.greenRatioThreshold ?? GREEN_RATIO_THRESHOLD,
    minClusterAreaRatio: options.minClusterAreaRatio ?? MIN_CLUSTER_AREA_RATIO,
  };

  const { width, height, data } = imageData;
  const totalPixels = width * height;
  if (totalPixels === 0) return null;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let matchCount = 0;
  const greenPixels: GreenPixelPoint[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;

      if (!isNeonGreenPixel(r, g, b, resolved)) continue;

      matchCount += 1;
      greenPixels.push({ x, y });
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0 || matchCount / totalPixels < resolved.minClusterAreaRatio) {
    return null;
  }

  const oriented = computeGreenClusterOrientation(greenPixels);
  const boundsWidth = oriented?.width ?? maxX - minX + 1;
  const boundsHeight = oriented?.height ?? maxY - minY + 1;

  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX: oriented?.centerX ?? minX + (maxX - minX + 1) / 2,
    centerY: oriented?.centerY ?? minY + (maxY - minY + 1) / 2,
    width: boundsWidth,
    height: boundsHeight,
    aspectRatio: boundsWidth / boundsHeight,
    rotationDegrees: oriented?.rotationDegrees ?? 0,
  };
}

export function createFallbackBounds(
  imageWidth: number,
  imageHeight: number,
): TargetBounds {
  const width = imageWidth * 0.3;
  const height = imageHeight * 0.3;
  const minX = (imageWidth - width) / 2;
  const minY = (imageHeight - height) / 2;
  const maxX = minX + width - 1;
  const maxY = minY + height - 1;

  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX: imageWidth / 2,
    centerY: imageHeight / 2,
    width,
    height,
    aspectRatio: width / height,
    rotationDegrees: 0,
  };
}
