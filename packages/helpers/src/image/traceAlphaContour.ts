type Point = [number, number];

export type TraceAlphaContourOptions = {
  /** Pixels with alpha above this value are treated as opaque. */
  alphaThreshold?: number;
  /** Downsample longest edge to this many pixels before tracing. */
  maxDimension?: number;
  /** RDP simplification tolerance in sample pixels. */
  simplifyTolerance?: number;
};

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point) {
  const [px, py] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

function simplifyRdp(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;

  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i += 1) {
    const distance = perpendicularDistance(points[i]!, points[0]!, points[end]!);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance > tolerance) {
    const left = simplifyRdp(points.slice(0, index + 1), tolerance);
    const right = simplifyRdp(points.slice(index), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0]!, points[end]!];
}

const NEIGHBORS: Point[] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

/**
 * Trace the outer opaque boundary of a PNG alpha channel for cut-line preview.
 * Returns flat [x, y, ...] points in image-local coordinates.
 */
export function traceAlphaContour(
  image: HTMLImageElement,
  imageWidth: number,
  imageHeight: number,
  options: TraceAlphaContourOptions = {},
): number[] {
  const alphaThreshold = options.alphaThreshold ?? 20;
  const maxDimension = options.maxDimension ?? 400;
  const simplifyTolerance = options.simplifyTolerance ?? 1.25;

  const longest = Math.max(image.naturalWidth, image.naturalHeight, 1);
  const sampleScale = longest > maxDimension ? maxDimension / longest : 1;
  const sampleWidth = Math.max(1, Math.round(image.naturalWidth * sampleScale));
  const sampleHeight = Math.max(1, Math.round(image.naturalHeight * sampleScale));

  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];

  context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);

  const isOpaque = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= sampleWidth || y >= sampleHeight) return false;
    return data[(y * sampleWidth + x) * 4 + 3]! > alphaThreshold;
  };

  const isBoundary = (x: number, y: number) => {
    if (!isOpaque(x, y)) return false;
    return (
      !isOpaque(x - 1, y) ||
      !isOpaque(x + 1, y) ||
      !isOpaque(x, y - 1) ||
      !isOpaque(x, y + 1)
    );
  };

  let start: Point | null = null;
  outer: for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      if (isBoundary(x, y)) {
        start = [x, y];
        break outer;
      }
    }
  }
  if (!start) return [];

  const contour: Point[] = [start];
  let [currentX, currentY] = start;
  let backtrack = 7;
  const maxSteps = sampleWidth * sampleHeight * 4;

  for (let step = 0; step < maxSteps; step += 1) {
    let moved = false;

    for (let i = 0; i < 8; i += 1) {
      const direction = (backtrack + i) % 8;
      const [dx, dy] = NEIGHBORS[direction]!;
      const nextX = currentX + dx;
      const nextY = currentY + dy;

      if (!isOpaque(nextX, nextY)) continue;

      currentX = nextX;
      currentY = nextY;
      backtrack = (direction + 6) % 8;
      moved = true;

      if (
        currentX === start[0] &&
        currentY === start[1] &&
        contour.length > 3
      ) {
        moved = false;
        break;
      }

      contour.push([currentX, currentY]);
      break;
    }

    if (!moved) break;
  }

  const simplified = simplifyRdp(contour, simplifyTolerance);
  const scaleX = imageWidth / sampleWidth;
  const scaleY = imageHeight / sampleHeight;

  return simplified.flatMap(([x, y]) => [x * scaleX, y * scaleY]);
}
