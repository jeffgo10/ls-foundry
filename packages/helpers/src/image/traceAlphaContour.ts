type Point = [number, number];

export type TraceAlphaContourOptions = {
  /** Pixels with alpha above this value are treated as opaque. */
  alphaThreshold?: number;
  /** Downsample longest edge to this many pixels before tracing. */
  maxDimension?: number;
  /**
   * RDP simplification tolerance in sample pixels.
   * Default **1.25** for tight (no-offset) traces. Offset bake uses a lower
   * value via {@link OFFSET_CONTOUR_SIMPLIFY_TOLERANCE}.
   */
  simplifyTolerance?: number;
  /**
   * Chaikin corner-cutting iterations after RDP (closed polyline).
   * Default **0** (off) for tight traces — only offset-enabled paths should
   * enable this (see {@link OFFSET_CONTOUR_SMOOTH_ITERATIONS}).
   */
  smoothIterations?: number;
  /**
   * Morphological outward expand in **local image pixels** before tracing.
   * Dilates the alpha mask then walks the outer boundary — yields a simple
   * (non-self-intersecting) contour, unlike polyline offset on sharp letterforms.
   */
  expandPx?: number;
  /**
   * Also trace enclosed transparent holes (e.g. the gap trapped when offset
   * merges two nearby islands). Default **false** for tight traces; offset
   * bake enables this.
   */
  includeHoles?: boolean;
};

/** Default RDP tolerance for tight (no-offset) alpha contours. */
export const DEFAULT_CONTOUR_SIMPLIFY_TOLERANCE = 1.25;

/** Default Chaikin passes for tight traces — disabled so sharp art stays faithful. */
export const DEFAULT_CONTOUR_SMOOTH_ITERATIONS = 0;

/** RDP tolerance used when baking / expanding a cut-line offset pad. */
export const OFFSET_CONTOUR_SIMPLIFY_TOLERANCE = 0.35;

/** Chaikin passes for offset-enabled cut lines (rounded pad preview). */
export const OFFSET_CONTOUR_SMOOTH_ITERATIONS = 2;

/**
 * Flat cut-line points may contain multiple closed contours separated by a
 * `NaN` coordinate pair (`[…x,y, NaN, NaN, x,y…]`). Konva skips NaN segments;
 * use {@link splitCutLineContours} for geometry that needs discrete polygons.
 *
 * `JSON.stringify` turns `NaN` into `null` — rehydrate with
 * {@link normalizeCutLinePoints} after parse.
 */
export function splitCutLineContours(points: number[]): number[][] {
  if (points.length < 4) return [];

  const contours: number[][] = [];
  let current: number[] = [];

  for (let i = 0; i < points.length; i += 2) {
    const x = points[i]!;
    const y = points[i + 1]!;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      if (current.length >= 4) contours.push(current);
      current = [];
      continue;
    }
    current.push(x, y);
  }

  if (current.length >= 4) contours.push(current);
  return contours;
}

/**
 * Rehydrate cut-line points after `JSON.parse` (`null` ↔ `NaN` separators).
 */
export function normalizeCutLinePoints(
  points: Array<number | null | undefined> | null | undefined,
): number[] {
  if (!points || points.length === 0) return [];
  return points.map((value) =>
    value == null || (typeof value === "number" && !Number.isFinite(value))
      ? Number.NaN
      : value,
  );
}

function joinContours(contours: number[][]): number[] {
  if (contours.length === 0) return [];
  if (contours.length === 1) return contours[0]!;

  const out: number[] = [];
  for (let i = 0; i < contours.length; i += 1) {
    if (i > 0) {
      out.push(Number.NaN, Number.NaN);
    }
    out.push(...contours[i]!);
  }
  return out;
}

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

/**
 * One Chaikin corner-cutting pass on a closed polyline.
 * Replaces each edge with points at 25% / 75% — rounds polygon corners.
 */
function chaikinClosed(points: Point[]): Point[] {
  if (points.length < 3) return points;
  const out: Point[] = [];
  const n = points.length;
  for (let i = 0; i < n; i += 1) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[(i + 1) % n]!;
    out.push([x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25]);
    out.push([x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75]);
  }
  return out;
}

/**
 * Mild RDP + optional Chaikin so cut-line previews stay smooth on curves
 * instead of long chord facets.
 */
export function refineClosedContour(
  points: Point[],
  options: {
    simplifyTolerance?: number;
    smoothIterations?: number;
  } = {},
): Point[] {
  if (points.length < 3) return points;

  const tolerance =
    options.simplifyTolerance ?? DEFAULT_CONTOUR_SIMPLIFY_TOLERANCE;
  const iterations = Math.max(
    0,
    Math.floor(options.smoothIterations ?? DEFAULT_CONTOUR_SMOOTH_ITERATIONS),
  );

  let result = tolerance > 0 ? simplifyRdp(points, tolerance) : points.slice();
  for (let i = 0; i < iterations; i += 1) {
    result = chaikinClosed(result);
  }
  return result;
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

/**
 * Moore-neighborhood walk of the outer boundary for pixels where `isOpaque`.
 * Starts at the first boundary pixel in raster order (outer silhouette).
 */
export function walkOuterContour(
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
 * Trace an outer contour for every 8-connected opaque island.
 * Disconnected assets in one PNG (e.g. star above a crest) each get a path.
 */
export function walkAllOuterContours(
  isOpaque: (x: number, y: number) => boolean,
  width: number,
  height: number,
): Point[][] {
  const claimed = new Uint8Array(width * height);
  const contours: Point[][] = [];
  const queueX = new Int32Array(width * height);
  const queueY = new Int32Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const startIndex = y * width + x;
      if (!isOpaque(x, y) || claimed[startIndex] === 1) continue;

      const component = new Uint8Array(width * height);
      let head = 0;
      let tail = 0;
      queueX[tail] = x;
      queueY[tail] = y;
      tail += 1;
      claimed[startIndex] = 1;
      component[startIndex] = 1;
      let pixelCount = 0;

      while (head < tail) {
        const cx = queueX[head]!;
        const cy = queueY[head]!;
        head += 1;
        pixelCount += 1;

        for (const [dx, dy] of NEIGHBORS) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (claimed[ni] === 1 || !isOpaque(nx, ny)) continue;
          claimed[ni] = 1;
          component[ni] = 1;
          queueX[tail] = nx;
          queueY[tail] = ny;
          tail += 1;
        }
      }

      // Ignore single-pixel / speck noise from compression.
      if (pixelCount < 4) continue;

      const contour = walkOuterContour(
        (px, py) => {
          if (px < 0 || py < 0 || px >= width || py >= height) return false;
          return component[py * width + px] === 1;
        },
        width,
        height,
      );
      if (contour.length >= 3) {
        contours.push(contour);
      }
    }
  }

  return contours;
}

/**
 * Trace boundaries of transparent regions fully enclosed by opaque pixels
 * (holes). Used when cut-line offset merges nearby islands and traps a gap
 * between them — that gap needs its own cut-line stroke.
 */
export function walkAllHoleContours(
  isOpaque: (x: number, y: number) => boolean,
  width: number,
  height: number,
): Point[][] {
  const exterior = new Uint8Array(width * height);
  const queueX = new Int32Array(width * height);
  const queueY = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const enqueueExterior = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (exterior[i] === 1 || isOpaque(x, y)) return;
    exterior[i] = 1;
    queueX[tail] = x;
    queueY[tail] = y;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueueExterior(x, 0);
    enqueueExterior(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueueExterior(0, y);
    enqueueExterior(width - 1, y);
  }

  while (head < tail) {
    const cx = queueX[head]!;
    const cy = queueY[head]!;
    head += 1;
    for (const [dx, dy] of NEIGHBORS) {
      enqueueExterior(cx + dx, cy + dy);
    }
  }

  const claimed = new Uint8Array(width * height);
  const contours: Point[][] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const startIndex = y * width + x;
      if (
        isOpaque(x, y) ||
        exterior[startIndex] === 1 ||
        claimed[startIndex] === 1
      ) {
        continue;
      }

      const hole = new Uint8Array(width * height);
      head = 0;
      tail = 0;
      queueX[tail] = x;
      queueY[tail] = y;
      tail += 1;
      claimed[startIndex] = 1;
      hole[startIndex] = 1;
      let pixelCount = 0;

      while (head < tail) {
        const cx = queueX[head]!;
        const cy = queueY[head]!;
        head += 1;
        pixelCount += 1;

        for (const [dx, dy] of NEIGHBORS) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (
            claimed[ni] === 1 ||
            exterior[ni] === 1 ||
            isOpaque(nx, ny)
          ) {
            continue;
          }
          claimed[ni] = 1;
          hole[ni] = 1;
          queueX[tail] = nx;
          queueY[tail] = ny;
          tail += 1;
        }
      }

      // Tiny holes are usually compression noise.
      if (pixelCount < 8) continue;

      const contour = walkOuterContour(
        (px, py) => {
          if (px < 0 || py < 0 || px >= width || py >= height) return false;
          return hole[py * width + px] === 1;
        },
        width,
        height,
      );
      if (contour.length >= 3) {
        contours.push(contour);
      }
    }
  }

  return contours;
}

/**
 * Outer opaque islands, optionally plus enclosed transparent holes.
 */
export function walkAllContours(
  isOpaque: (x: number, y: number) => boolean,
  width: number,
  height: number,
  options: { includeHoles?: boolean } = {},
): Point[][] {
  const outer = walkAllOuterContours(isOpaque, width, height);
  if (!options.includeHoles) {
    return outer;
  }
  return [...outer, ...walkAllHoleContours(isOpaque, width, height)];
}

/**
 * Trace the opaque boundary of a PNG alpha channel for cut-line preview.
 * Returns flat [x, y, ...] points in image-local coordinates.
 *
 * Disconnected opaque regions each contribute a closed contour, joined with
 * `NaN` separators (see {@link splitCutLineContours}). With `includeHoles`,
 * enclosed transparent gaps (common after offset merges) are traced too.
 *
 * With `expandPx > 0`, morphologically dilates the alpha before tracing so the
 * result is a simple outer path (no self-crossing valley loops). Nearby islands
 * may merge when the dilation bridges the gap between them.
 */
export function traceAlphaContour(
  image: HTMLImageElement,
  imageWidth: number,
  imageHeight: number,
  options: TraceAlphaContourOptions = {},
): number[] {
  const alphaThreshold = options.alphaThreshold ?? 20;
  const maxDimension = options.maxDimension ?? 400;
  const simplifyTolerance =
    options.simplifyTolerance ?? DEFAULT_CONTOUR_SIMPLIFY_TOLERANCE;
  const smoothIterations =
    options.smoothIterations ?? DEFAULT_CONTOUR_SMOOTH_ITERATIONS;
  const expandPx = Math.max(0, options.expandPx ?? 0);
  const includeHoles = options.includeHoles ?? expandPx > 0;

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

  const contours = walkAllContours(isOpaque, paddedWidth, paddedHeight, {
    includeHoles,
  });
  if (contours.length === 0) return [];

  const scaleX = imageWidth / sampleWidth;
  const scaleY = imageHeight / sampleHeight;

  // Remove pad so expanded contours can sit outside 0…imageWidth/Height.
  const scaled = contours.map((contour) => {
    const refined = refineClosedContour(contour, {
      simplifyTolerance,
      smoothIterations,
    });
    return refined.flatMap(([x, y]) => [
      (x - pad) * scaleX,
      (y - pad) * scaleY,
    ]);
  });

  return joinContours(scaled);
}
