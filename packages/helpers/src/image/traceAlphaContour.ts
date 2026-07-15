type Point = [number, number];

export type TraceAlphaContourOptions = {
  /** Pixels with alpha above this value are treated as opaque. */
  alphaThreshold?: number;
  /** Downsample longest edge to this many pixels before tracing. */
  maxDimension?: number;
  /** RDP simplification tolerance in sample pixels. */
  simplifyTolerance?: number;
  /**
   * Morphological outward expand in **local image pixels** before tracing.
   * Dilates the alpha mask then walks the outer boundary — yields a simple
   * (non-self-intersecting) contour, unlike polyline offset on sharp letterforms.
   */
  expandPx?: number;
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

/** Circular disk offsets for morphological dilation. */
function buildDiskOffsets(radius: number): Point[] {
  const r = Math.max(0, radius);
  const rCeil = Math.ceil(r);
  const rSq = r * r;
  const offsets: Point[] = [];
  for (let dy = -rCeil; dy <= rCeil; dy += 1) {
    for (let dx = -rCeil; dx <= rCeil; dx += 1) {
      if (dx * dx + dy * dy <= rSq + 1e-8) {
        offsets.push([dx, dy]);
      }
    }
  }
  return offsets;
}

/**
 * Dilate a binary mask (1 = opaque) with a circular kernel of the given radius.
 */
export function dilateBinaryMask(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  if (radius <= 0 || mask.length === 0) {
    return mask.slice();
  }

  const out = new Uint8Array(width * height);
  const disk = buildDiskOffsets(radius);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] !== 1) continue;
      for (const [dx, dy] of disk) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        out[ny * width + nx] = 1;
      }
    }
  }

  return out;
}

function walkOuterContour(
  isOpaque: (x: number, y: number) => boolean,
  width: number,
  height: number,
): Point[] {
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
  outer: for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
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
  const maxSteps = width * height * 4;

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

  return contour;
}

/**
 * Trace the outer opaque boundary of a PNG alpha channel for cut-line preview.
 * Returns flat [x, y, ...] points in image-local coordinates.
 *
 * With `expandPx > 0`, morphologically dilates the alpha before tracing so the
 * result is a simple outer path (no self-crossing valley loops).
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
  const expandPx = Math.max(0, options.expandPx ?? 0);

  const longest = Math.max(image.naturalWidth, image.naturalHeight, 1);
  const sampleScale = longest > maxDimension ? maxDimension / longest : 1;
  const sampleWidth = Math.max(1, Math.round(image.naturalWidth * sampleScale));
  const sampleHeight = Math.max(1, Math.round(image.naturalHeight * sampleScale));
  const expandSamplePx = expandPx * sampleScale;
  const pad = expandSamplePx > 0 ? Math.ceil(expandSamplePx) + 1 : 0;
  const paddedWidth = sampleWidth + pad * 2;
  const paddedHeight = sampleHeight + pad * 2;

  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];

  context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);

  const mask = new Uint8Array(paddedWidth * paddedHeight);
  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      if (data[(y * sampleWidth + x) * 4 + 3]! > alphaThreshold) {
        mask[(y + pad) * paddedWidth + (x + pad)] = 1;
      }
    }
  }

  const opaqueMask =
    expandSamplePx > 0
      ? dilateBinaryMask(mask, paddedWidth, paddedHeight, expandSamplePx)
      : mask;

  const isOpaque = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= paddedWidth || y >= paddedHeight) return false;
    return opaqueMask[y * paddedWidth + x] === 1;
  };

  const contour = walkOuterContour(isOpaque, paddedWidth, paddedHeight);
  if (contour.length === 0) return [];

  const simplified = simplifyRdp(contour, simplifyTolerance);
  const scaleX = imageWidth / sampleWidth;
  const scaleY = imageHeight / sampleHeight;

  // Remove pad so expanded contours can sit outside 0…imageWidth/Height.
  return simplified.flatMap(([x, y]) => [
    (x - pad) * scaleX,
    (y - pad) * scaleY,
  ]);
}
