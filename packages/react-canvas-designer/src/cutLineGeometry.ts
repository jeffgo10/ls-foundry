import type { MarginBoundsItem } from "./canvasMargin";
import { getCutLineAxisAlignedBounds } from "./canvasMargin";

export type StagePoint = { x: number; y: number };

function transformLocalPoint(
  x: number,
  y: number,
  scaleX: number,
  scaleY: number,
  rotationDeg: number,
  originX: number,
  originY: number,
): StagePoint {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const sx = x * scaleX;
  const sy = y * scaleY;
  return {
    x: originX + sx * cos - sy * sin,
    y: originY + sx * sin + sy * cos,
  };
}

/** Cut-line contour vertices in stage space. */
export function getCutLineStagePolygon(
  item: MarginBoundsItem,
  cutLinePoints: number[],
  position?: { x: number; y: number },
): StagePoint[] {
  const originX = position?.x ?? item.x;
  const originY = position?.y ?? item.y;
  const polygon: StagePoint[] = [];

  for (let i = 0; i < cutLinePoints.length; i += 2) {
    polygon.push(
      transformLocalPoint(
        cutLinePoints[i]!,
        cutLinePoints[i + 1]!,
        item.scaleX,
        item.scaleY,
        item.rotation,
        originX,
        originY,
      ),
    );
  }

  return polygon;
}

export function pointInPolygon(point: StagePoint, polygon: StagePoint[]): boolean {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i]!.x;
    const yi = polygon[i]!.y;
    const xj = polygon[j]!.x;
    const yj = polygon[j]!.y;
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function dot(ax: number, ay: number, bx: number, by: number): number {
  return ax * bx + ay * by;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Shortest distance from `point` to line segment `a`–`b`. */
export function pointSegmentDistance(
  point: StagePoint,
  a: StagePoint,
  b: StagePoint,
): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;

  if (lengthSq === 0) {
    return Math.hypot(point.x - a.x, point.y - a.y);
  }

  const t = clamp(dot(point.x - a.x, point.y - a.y, abx, aby) / lengthSq, 0, 1);
  const projX = a.x + t * abx;
  const projY = a.y + t * aby;
  return Math.hypot(point.x - projX, point.y - projY);
}

/** Shortest distance between two line segments. */
export function segmentSegmentDistance(
  a1: StagePoint,
  a2: StagePoint,
  b1: StagePoint,
  b2: StagePoint,
): number {
  return Math.min(
    pointSegmentDistance(a1, b1, b2),
    pointSegmentDistance(a2, b1, b2),
    pointSegmentDistance(b1, a1, a2),
    pointSegmentDistance(b2, a1, a2),
  );
}

function polygonEdges(polygon: StagePoint[]): Array<[StagePoint, StagePoint]> {
  const edges: Array<[StagePoint, StagePoint]> = [];
  for (let i = 0; i < polygon.length; i += 1) {
    edges.push([polygon[i]!, polygon[(i + 1) % polygon.length]!]);
  }
  return edges;
}

/**
 * Minimum distance between two closed cut-line polygons in stage space.
 * Returns 0 when polygons overlap or touch.
 */
export function polygonsMinDistance(
  polygonA: StagePoint[],
  polygonB: StagePoint[],
): number {
  if (polygonA.length < 3 || polygonB.length < 3) {
    return Infinity;
  }

  for (const point of polygonA) {
    if (pointInPolygon(point, polygonB)) {
      return 0;
    }
  }

  for (const point of polygonB) {
    if (pointInPolygon(point, polygonA)) {
      return 0;
    }
  }

  let minDistance = Infinity;
  const edgesA = polygonEdges(polygonA);
  const edgesB = polygonEdges(polygonB);

  for (const [a1, a2] of edgesA) {
    for (const point of polygonB) {
      minDistance = Math.min(minDistance, pointSegmentDistance(point, a1, a2));
    }
  }

  for (const [b1, b2] of edgesB) {
    for (const point of polygonA) {
      minDistance = Math.min(minDistance, pointSegmentDistance(point, b1, b2));
    }
  }

  for (const [a1, a2] of edgesA) {
    for (const [b1, b2] of edgesB) {
      minDistance = Math.min(
        minDistance,
        segmentSegmentDistance(a1, a2, b1, b2),
      );
    }
  }

  return minDistance;
}

/** True when cut-line polygons overlap or are closer than `gapPx` (edge-to-edge). */
export function cutLinesViolateGap(
  itemA: MarginBoundsItem,
  cutLineA: number[],
  itemB: MarginBoundsItem,
  cutLineB: number[],
  gapPx: number,
): boolean {
  const polygonA = getCutLineStagePolygon(itemA, cutLineA);
  const polygonB = getCutLineStagePolygon(itemB, cutLineB);

  if (gapPx <= 0) {
    return polygonsMinDistance(polygonA, polygonB) === 0;
  }

  const boundsA = getCutLineAxisAlignedBounds(itemA, cutLineA);
  const boundsB = getCutLineAxisAlignedBounds(itemB, cutLineB);
  const separatedX =
    boundsA.maxX + gapPx <= boundsB.minX || boundsB.maxX + gapPx <= boundsA.minX;
  const separatedY =
    boundsA.maxY + gapPx <= boundsB.minY || boundsB.maxY + gapPx <= boundsA.minY;

  if (separatedX || separatedY) {
    return false;
  }

  return polygonsMinDistance(polygonA, polygonB) < gapPx;
}
