export type Point2D = {
  x: number;
  y: number;
};

export function getDistance(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function getAngle(a: Point2D, b: Point2D): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function getCentroid(a: Point2D, b: Point2D): Point2D {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

/** Maps CSS pixel deltas to logical canvas/export coordinates. */
export function getLogicalScaleFactor(
  element: HTMLElement | null,
  logicalSize: number,
): number {
  if (!element) {
    return 1;
  }

  const rect = element.getBoundingClientRect();

  if (rect.width <= 0) {
    return 1;
  }

  return logicalSize / rect.width;
}
