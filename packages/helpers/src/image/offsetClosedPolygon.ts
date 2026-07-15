type Point = { x: number; y: number };

const EPSILON = 1e-8;

function flatToPoints(points: number[]): Point[] {
  const vertices: Point[] = [];
  for (let i = 0; i < points.length - 1; i += 2) {
    vertices.push({ x: points[i]!, y: points[i + 1]! });
  }

  if (vertices.length > 1) {
    const first = vertices[0]!;
    const last = vertices[vertices.length - 1]!;
    if (
      Math.abs(first.x - last.x) < EPSILON &&
      Math.abs(first.y - last.y) < EPSILON
    ) {
      vertices.pop();
    }
  }

  return vertices;
}

function pointsToFlat(vertices: Point[]): number[] {
  return vertices.flatMap((point) => [point.x, point.y]);
}

function signedArea(vertices: Point[]): number {
  let area = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    const current = vertices[i]!;
    const next = vertices[(i + 1) % vertices.length]!;
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

function nearlySame(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;
}

/**
 * Offset each edge by a uniform distance, then connect consecutive offset
 * edges with a short bevel (chamfer) at corners.
 *
 * Bevel joins avoid miter spikes on acute letter peaks — each corner emits
 * two points (end of previous offset edge + start of next), never a bisector
 * tip that can fly outward.
 */
function offsetVertices(vertices: Point[], distance: number): Point[] {
  const count = vertices.length;
  const area = signedArea(vertices);
  // Positive area = CCW. Right normals of CCW edges point outward.
  const outwardSign = area >= 0 ? 1 : -1;
  const result: Point[] = [];

  for (let i = 0; i < count; i += 1) {
    const prev = vertices[(i - 1 + count) % count]!;
    const curr = vertices[i]!;
    const next = vertices[(i + 1) % count]!;

    const e1x = curr.x - prev.x;
    const e1y = curr.y - prev.y;
    const e2x = next.x - curr.x;
    const e2y = next.y - curr.y;
    const len1 = Math.hypot(e1x, e1y) || 1;
    const len2 = Math.hypot(e2x, e2y) || 1;
    const u1x = e1x / len1;
    const u1y = e1y / len1;
    const u2x = e2x / len2;
    const u2y = e2y / len2;

    // Right normal of unit edge (ux, uy) is (uy, -ux).
    const n1x = outwardSign * u1y;
    const n1y = outwardSign * -u1x;
    const n2x = outwardSign * u2y;
    const n2y = outwardSign * -u2x;

    const fromPrev = {
      x: curr.x + n1x * distance,
      y: curr.y + n1y * distance,
    };
    const toNext = {
      x: curr.x + n2x * distance,
      y: curr.y + n2y * distance,
    };

    const last = result[result.length - 1];
    if (!last || !nearlySame(last, fromPrev)) {
      result.push(fromPrev);
    }
    if (!nearlySame(fromPrev, toNext)) {
      result.push(toNext);
    }
  }

  // Drop a trailing point that duplicates the first (closed path).
  if (result.length > 1 && nearlySame(result[0]!, result[result.length - 1]!)) {
    result.pop();
  }

  return result;
}

/**
 * Offset a closed polygon by a uniform distance.
 * Flat `[x, y, ...]` input/output in the same coordinate space.
 *
 * Positive `offset` expands outward from the graphic (Silhouette-style cutline
 * pad). Negative values shrink inward. Sharp corners use bevel joins (connected
 * line segments) so acute angles do not produce miter spikes. Returns a copy
 * when offset is 0 or the polygon has fewer than 3 vertices.
 */
export function offsetClosedPolygon(points: number[], offset: number): number[] {
  if (!Number.isFinite(offset) || offset === 0 || points.length < 6) {
    return points.slice();
  }

  const vertices = flatToPoints(points);
  if (vertices.length < 3) {
    return points.slice();
  }

  return pointsToFlat(offsetVertices(vertices, offset));
}
