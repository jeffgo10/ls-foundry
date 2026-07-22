type Point = [number, number];

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

/** Cap bake working size so large logos do not freeze the UI. */
export const BAKE_CUTLINE_MAX_DIMENSION = 768;

export type BakeCutLineOffsetOptions = {
  /**
   * Opaque fill for the expanded ring. When omitted, samples the most common
   * color along the art's alpha boundary (see `dominantEdgeColorFromAlphaData`).
   */
  fill?: string;
  /** Alpha threshold matching `traceAlphaContour`. Default 20. */
  alphaThreshold?: number;
  /** RDP simplification in output pixels. Default 1.25. */
  simplifyTolerance?: number;
  /** Downsample longest edge before dilate/composite. Default 768. */
  maxDimension?: number;
};

export type BakeCutLineOffsetResult = {
  /** PNG data URL of art + solid-color offset pad. */
  dataUrl: string;
  width: number;
  height: number;
  /** Outer contour of the baked bitmap (tight; no extra expand). */
  cutLinePoints: number[];
  /** Padding in pixels applied on each side (at bake resolution). */
  pad: number;
  /**
   * How much the source was scaled for baking (`1` = full res).
   * Placement scale should be divided by this so on-canvas art size stays the same.
   */
  contentScale: number;
};

type Rgb = [number, number, number];

/**
 * Pick the mode RGB along opaque alpha edges (4-connected boundary pixels).
 * Near-transparent pixels are excluded via `alphaThreshold`.
 */
export function dominantEdgeColorFromAlphaData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold = 20,
  quantizeShift = 4,
): Rgb {
  const isOpaque = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    return data[(y * width + x) * 4 + 3]! > alphaThreshold;
  };

  const buckets = new Map<
    number,
    { count: number; r: number; g: number; b: number }
  >();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isOpaque(x, y)) continue;
      if (
        isOpaque(x - 1, y) &&
        isOpaque(x + 1, y) &&
        isOpaque(x, y - 1) &&
        isOpaque(x, y + 1)
      ) {
        continue;
      }

      const i = (y * width + x) * 4;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const key =
        ((r >> quantizeShift) << 16) |
        ((g >> quantizeShift) << 8) |
        (b >> quantizeShift);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.count += 1;
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
      } else {
        buckets.set(key, { count: 1, r, g, b });
      }
    }
  }

  if (buckets.size === 0) {
    return [255, 255, 255];
  }

  let best = buckets.values().next().value!;
  for (const bucket of buckets.values()) {
    if (bucket.count > best.count) {
      best = bucket;
    }
  }

  return [
    Math.round(best.r / best.count),
    Math.round(best.g / best.count),
    Math.round(best.b / best.count),
  ];
}

function parseCssColor(fill: string): Rgb {
  if (fill === "#fff" || fill === "#ffffff" || fill === "white") {
    return [255, 255, 255];
  }
  const hex = /^#([0-9a-f]{6})$/i.exec(fill.trim());
  if (hex) {
    const value = Number.parseInt(hex[1]!, 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }
  return [255, 255, 255];
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
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
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
 * Expand a binary mask by Chebyshev distance ≤ radius via multi-source BFS.
 * O(width × height) — much cheaper than stamping a disk per opaque pixel.
 */
export function dilateBinaryMaskFast(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  const r = Math.max(0, Math.ceil(radius));
  if (r === 0 || mask.length === 0) {
    return mask.slice();
  }

  const dist = new Int16Array(width * height);
  dist.fill(32767);
  const queueX = new Int32Array(width * height);
  const queueY = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (mask[i] !== 1) continue;
      dist[i] = 0;
      queueX[tail] = x;
      queueY[tail] = y;
      tail += 1;
    }
  }

  while (head < tail) {
    const x = queueX[head]!;
    const y = queueY[head]!;
    head += 1;
    const d = dist[y * width + x]!;
    if (d >= r) continue;

    for (const [dx, dy] of NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const ni = ny * width + nx;
      const nd = d + 1;
      if (nd < dist[ni]!) {
        dist[ni] = nd;
        queueX[tail] = nx;
        queueY[tail] = ny;
        tail += 1;
      }
    }
  }

  const out = new Uint8Array(width * height);
  for (let i = 0; i < dist.length; i += 1) {
    if (dist[i]! <= r) out[i] = 1;
  }
  return out;
}

/**
 * Bake a Silhouette-style cutline pad into the bitmap: dilate alpha, draw the
 * art, then fill the expanded ring with a solid color (dominant edge color by
 * default). Large sources are downsampled first so drop/place stays responsive.
 */
export function bakeCutLineOffset(
  image: HTMLImageElement,
  offsetPx: number,
  options: BakeCutLineOffsetOptions = {},
): BakeCutLineOffsetResult {
  const alphaThreshold = options.alphaThreshold ?? 20;
  const simplifyTolerance = options.simplifyTolerance ?? 1.25;
  const maxDimension = options.maxDimension ?? BAKE_CUTLINE_MAX_DIMENSION;

  const srcW = Math.max(1, image.naturalWidth || image.width);
  const srcH = Math.max(1, image.naturalHeight || image.height);
  const longest = Math.max(srcW, srcH);
  const contentScale = longest > maxDimension ? maxDimension / longest : 1;
  const workW = Math.max(1, Math.round(srcW * contentScale));
  const workH = Math.max(1, Math.round(srcH * contentScale));
  const workOffsetPx = offsetPx * contentScale;

  if (!(offsetPx > 0)) {
    const canvas = document.createElement("canvas");
    canvas.width = workW;
    canvas.height = workH;
    const context = canvas.getContext("2d");
    if (!context) {
      return {
        dataUrl: "",
        width: workW,
        height: workH,
        cutLinePoints: [],
        pad: 0,
        contentScale,
      };
    }
    context.drawImage(image, 0, 0, workW, workH);
    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: workW,
      height: workH,
      cutLinePoints: [],
      pad: 0,
      contentScale,
    };
  }

  const pad = Math.ceil(workOffsetPx);
  const width = workW + pad * 2;
  const height = workH + pad * 2;

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = workW;
  srcCanvas.height = workH;
  const srcContext = srcCanvas.getContext("2d", { willReadFrequently: true });
  if (!srcContext) {
    return {
      dataUrl: "",
      width: workW,
      height: workH,
      cutLinePoints: [],
      pad: 0,
      contentScale,
    };
  }
  srcContext.drawImage(image, 0, 0, workW, workH);
  const { data } = srcContext.getImageData(0, 0, workW, workH);
  const [fillR, fillG, fillB] = options.fill
    ? parseCssColor(options.fill)
    : dominantEdgeColorFromAlphaData(data, workW, workH, alphaThreshold);

  const mask = new Uint8Array(width * height);
  for (let y = 0; y < workH; y += 1) {
    for (let x = 0; x < workW; x += 1) {
      if (data[(y * workW + x) * 4 + 3]! > alphaThreshold) {
        mask[(y + pad) * width + (x + pad)] = 1;
      }
    }
  }

  const dilated = dilateBinaryMaskFast(mask, width, height, workOffsetPx);

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const outContext = out.getContext("2d");
  if (!outContext) {
    return {
      dataUrl: "",
      width,
      height,
      cutLinePoints: [],
      pad,
      contentScale,
    };
  }

  outContext.drawImage(image, pad, pad, workW, workH);
  const pixels = outContext.getImageData(0, 0, width, height);
  for (let i = 0; i < dilated.length; i += 1) {
    if (dilated[i] !== 1 || mask[i] === 1) continue;
    const p = i * 4;
    pixels.data[p] = fillR;
    pixels.data[p + 1] = fillG;
    pixels.data[p + 2] = fillB;
    pixels.data[p + 3] = 255;
  }
  outContext.putImageData(pixels, 0, 0);

  const isOpaque = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    return dilated[y * width + x] === 1;
  };
  const contour = walkOuterContour(isOpaque, width, height);
  const simplified = simplifyRdp(contour, simplifyTolerance);
  const cutLinePoints = simplified.flatMap(([x, y]) => [x, y]);

  return {
    dataUrl: out.toDataURL("image/png"),
    width,
    height,
    cutLinePoints,
    pad,
    contentScale,
  };
}
