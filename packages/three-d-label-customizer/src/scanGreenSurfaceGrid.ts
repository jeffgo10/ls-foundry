import { canvasToLocal, localToCanvas } from "./orientedCoords";
import { isNeonGreenPixel } from "./scanNeonGreenBounds";
import type { SurfaceGrid, TargetBounds } from "./types";

const MAX_GRID_LINES = 8;
const MIN_GRID_LINES = 3;
const MAX_DARK_LUMINANCE = 130;
const HISTOGRAM_BINS = 180;

export function isDarkGridPixel(r: number, g: number, b: number): boolean {
  if (isNeonGreenPixel(r, g, b)) return false;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance <= MAX_DARK_LUMINANCE;
}

export function isDarkGridPixelOnGreenSurface(
  imageData: ImageData,
  x: number,
  y: number,
): boolean {
  const { width, height, data } = imageData;
  const i = (y * width + x) * 4;
  const r = data[i] ?? 0;
  const g = data[i + 1] ?? 0;
  const b = data[i + 2] ?? 0;
  if (!isDarkGridPixel(r, g, b)) return false;

  for (let ny = y - 3; ny <= y + 3; ny += 1) {
    for (let nx = x - 3; nx <= x + 3; nx += 1) {
      if (nx === x && ny === y) continue;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const ni = (ny * width + nx) * 4;
      if (
        isNeonGreenPixel(
          data[ni] ?? 0,
          data[ni + 1] ?? 0,
          data[ni + 2] ?? 0,
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

function smoothHistogram(values: number[], radius: number): number[] {
  const output = new Array<number>(values.length).fill(0);
  for (let i = 0; i < values.length; i += 1) {
    let sum = 0;
    let count = 0;
    for (let j = i - radius; j <= i + radius; j += 1) {
      if (j < 0 || j >= values.length) continue;
      sum += values[j] ?? 0;
      count += 1;
    }
    output[i] = count > 0 ? sum / count : 0;
  }
  return output;
}

function findHistogramPeaks(
  histogram: number[],
  minDistanceBins: number,
): number[] {
  const smoothed = smoothHistogram(histogram, 2);
  const threshold = Math.max(...smoothed) * 0.35;
  const peaks: number[] = [];

  for (let i = 1; i < smoothed.length - 1; i += 1) {
    const value = smoothed[i] ?? 0;
    if (value < threshold) continue;
    if (value < (smoothed[i - 1] ?? 0) || value < (smoothed[i + 1] ?? 0)) {
      continue;
    }
    const last = peaks[peaks.length - 1];
    if (last !== undefined && i - last < minDistanceBins) {
      if (value > (smoothed[last] ?? 0)) {
        peaks[peaks.length - 1] = i;
      }
      continue;
    }
    peaks.push(i);
  }

  return peaks;
}

function pickEvenlySpacedLines(
  peaks: number[],
  span: number,
): number[] | null {
  if (peaks.length < MIN_GRID_LINES) return null;

  let best: { lines: number[]; score: number } | null = null;

  for (let count = MIN_GRID_LINES; count <= MAX_GRID_LINES; count += 1) {
    if (peaks.length < count) break;

    for (let start = 0; start <= peaks.length - count; start += 1) {
      const candidate = peaks.slice(start, start + count);
      const spacings: number[] = [];
      for (let i = 1; i < candidate.length; i += 1) {
        spacings.push((candidate[i] ?? 0) - (candidate[i - 1] ?? 0));
      }
      const mean =
        spacings.reduce((sum, value) => sum + value, 0) / spacings.length;
      const variance =
        spacings.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        spacings.length;
      const edgePenalty =
        Math.abs((candidate[0] ?? 0) - span * 0.05) +
        Math.abs((candidate[candidate.length - 1] ?? 0) - span * 0.95);
      const countPenalty = Math.max(0, count - 6) * span * 0.08;
      const score = variance + edgePenalty * 0.02 + countPenalty;

      if (!best || score < best.score) {
        best = { lines: candidate, score };
      }
    }
  }

  return best?.lines ?? null;
}

function refineIntersection(
  imageData: ImageData,
  centerX: number,
  centerY: number,
  axisAngleRad: number,
  u: number,
  v: number,
  searchRadius: number,
): { x: number; y: number; foundDark: boolean } {
  const { width, height, data } = imageData;
  let bestScore = -Infinity;
  let bestX = centerX;
  let bestY = centerY;
  let foundDark = false;

  const seed = localToCanvas(u, v, centerX, centerY, axisAngleRad);

  for (let y = Math.max(0, Math.floor(seed.y - searchRadius)); y <= Math.min(height - 1, Math.ceil(seed.y + searchRadius)); y += 1) {
    for (let x = Math.max(0, Math.floor(seed.x - searchRadius)); x <= Math.min(width - 1, Math.ceil(seed.x + searchRadius)); x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      if (!isDarkGridPixelOnGreenSurface(imageData, x, y)) continue;

      const local = canvasToLocal(x, y, centerX, centerY, axisAngleRad);
      const du = local.u - u;
      const dv = local.v - v;
      const distancePenalty = du * du + dv * dv;
      const darkness = 255 - (0.299 * r + 0.587 * g + 0.114 * b);
      const score = darkness - distancePenalty * 0.05;

      if (score > bestScore) {
        bestScore = score;
        bestX = x;
        bestY = y;
        foundDark = true;
      }
    }
  }

  return { x: bestX, y: bestY, foundDark };
}

function validateSurfaceGrid(
  grid: SurfaceGrid,
  bounds: TargetBounds,
  foundDarkFlags: boolean[][],
): boolean {
  if (grid.cols > 8 || grid.rows > 8) return false;

  let darkHits = 0;
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      if (foundDarkFlags[row]?.[col]) darkHits += 1;
    }
  }

  const requiredHits = Math.max(4, Math.floor(grid.cols * grid.rows * 0.25));
  if (darkHits < requiredHits) return false;

  const topLeft = grid.points[0]?.[0];
  const topRight = grid.points[0]?.[grid.cols - 1];
  const bottomLeft = grid.points[grid.rows - 1]?.[0];
  const bottomRight = grid.points[grid.rows - 1]?.[grid.cols - 1];
  if (!topLeft || !topRight || !bottomLeft || !bottomRight) return false;

  const spanX = Math.max(
    Math.abs(topRight.x - topLeft.x),
    Math.abs(bottomRight.x - bottomLeft.x),
  );
  const spanY = Math.max(
    Math.abs(bottomLeft.y - topLeft.y),
    Math.abs(bottomRight.y - topRight.y),
  );

  return (
    spanX >= bounds.width * 0.25 &&
    spanY >= bounds.height * 0.25
  );
}

/**
 * Detect the black guide grid drawn on the neon-green label patch.
 * Returns intersection points ordered top-to-bottom, left-to-right in image space.
 */
export function scanGreenSurfaceGrid(
  imageData: ImageData,
  bounds: TargetBounds,
): SurfaceGrid | null {
  const { width, height, data } = imageData;
  const axisAngleRad = (bounds.rotationDegrees * Math.PI) / 180;
  const padU = Math.max(4, bounds.width * 0.06);
  const padV = Math.max(4, bounds.height * 0.06);
  const halfW = bounds.width / 2 + padU;
  const halfH = bounds.height / 2 + padV;
  const spanU = bounds.width + padU * 2;
  const spanV = bounds.height + padV * 2;

  const uHist = new Array<number>(HISTOGRAM_BINS).fill(0);
  const vHist = new Array<number>(HISTOGRAM_BINS).fill(0);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;

      const local = canvasToLocal(
        x,
        y,
        bounds.centerX,
        bounds.centerY,
        axisAngleRad,
      );
      if (Math.abs(local.u) > halfW || Math.abs(local.v) > halfH) continue;

      const onGreen = isNeonGreenPixel(r, g, b);
      if (!onGreen && !isDarkGridPixelOnGreenSurface(imageData, x, y)) continue;

      if (isDarkGridPixelOnGreenSurface(imageData, x, y)) {
        const uBin = Math.min(
          HISTOGRAM_BINS - 1,
          Math.max(
            0,
            Math.round(((local.u + halfW) / spanU) * (HISTOGRAM_BINS - 1)),
          ),
        );
        const vBin = Math.min(
          HISTOGRAM_BINS - 1,
          Math.max(
            0,
            Math.round(((local.v + halfH) / spanV) * (HISTOGRAM_BINS - 1)),
          ),
        );
        uHist[uBin] += 1;
        vHist[vBin] += 1;
      }
    }
  }

  const minDistance = Math.max(
    4,
    Math.round(Math.min(bounds.width, bounds.height) / 24),
  );
  const uPeaks = findHistogramPeaks(uHist, minDistance);
  const vPeaks = findHistogramPeaks(vHist, minDistance);
  const uLines = pickEvenlySpacedLines(uPeaks, HISTOGRAM_BINS - 1);
  const vLines = pickEvenlySpacedLines(vPeaks, HISTOGRAM_BINS - 1);

  if (!uLines || !vLines || uLines.length < MIN_GRID_LINES || vLines.length < MIN_GRID_LINES) {
    return null;
  }

  const cols = uLines.length;
  const rows = vLines.length;
  const searchRadius = Math.max(
    3,
    Math.round(Math.min(bounds.width, bounds.height) / (Math.max(cols, rows) * 3)),
  );

  const points: { x: number; y: number }[][] = [];
  const foundDarkFlags: boolean[][] = [];

  for (let row = 0; row < rows; row += 1) {
    const v =
      ((vLines[row] ?? 0) / (HISTOGRAM_BINS - 1)) * spanV - halfH;
    const rowPoints: { x: number; y: number }[] = [];
    const rowFlags: boolean[] = [];
    for (let col = 0; col < cols; col += 1) {
      const u =
        ((uLines[col] ?? 0) / (HISTOGRAM_BINS - 1)) * spanU - halfW;
      const refined = refineIntersection(
        imageData,
        bounds.centerX,
        bounds.centerY,
        axisAngleRad,
        u,
        v,
        searchRadius,
      );
      rowPoints.push({ x: refined.x, y: refined.y });
      rowFlags.push(refined.foundDark);
    }
    points.push(rowPoints);
    foundDarkFlags.push(rowFlags);
  }

  if (points.length > 1) {
    const firstY = points[0]?.[0]?.y ?? 0;
    const lastY = points[points.length - 1]?.[0]?.y ?? 0;
    if (firstY > lastY) {
      points.reverse();
    }
  }

  const grid: SurfaceGrid = {
    cols,
    rows,
    points,
  };

  if (!validateSurfaceGrid(grid, bounds, foundDarkFlags)) {
    return null;
  }

  return grid;
}
