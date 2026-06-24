export interface GreenPixelPoint {
  x: number;
  y: number;
}

export interface OrientedGreenBounds {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  /** Detected tilt in degrees (canvas/image space; negated when applied as mesh Z rotation). */
  rotationDegrees: number;
}

const PCA_SAMPLE_CAP = 12_000;

function pickPcaSample(points: GreenPixelPoint[]): GreenPixelPoint[] {
  if (points.length <= PCA_SAMPLE_CAP) return points;
  const step = Math.ceil(points.length / PCA_SAMPLE_CAP);
  return points.filter((_, index) => index % step === 0);
}

function measureOrientedExtents(
  points: GreenPixelPoint[],
  centerX: number,
  centerY: number,
  axisAngle: number,
): { width: number; height: number } {
  const cos = Math.cos(axisAngle);
  const sin = Math.sin(axisAngle);

  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;

  for (const point of points) {
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    const u = dx * cos + dy * sin;
    const v = -dx * sin + dy * cos;
    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
    minV = Math.min(minV, v);
    maxV = Math.max(maxV, v);
  }

  return {
    width: maxU - minU + 1,
    height: maxV - minV + 1,
  };
}

/**
 * Fit an oriented rectangle to neon-green pixels via PCA.
 * Width is always the longer span. Extents use every green pixel so the mesh
 * fully covers the chroma-key patch.
 */
export function computeGreenClusterOrientation(
  allPoints: GreenPixelPoint[],
): OrientedGreenBounds | null {
  if (allPoints.length < 4) return null;

  const pcaPoints = pickPcaSample(allPoints);
  const n = pcaPoints.length;

  let sumX = 0;
  let sumY = 0;
  for (const point of pcaPoints) {
    sumX += point.x;
    sumY += point.y;
  }

  const centerX = sumX / n;
  const centerY = sumY / n;

  let cxx = 0;
  let cyy = 0;
  let cxy = 0;
  for (const point of pcaPoints) {
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    cxx += dx * dx;
    cyy += dy * dy;
    cxy += dx * dy;
  }

  cxx /= n;
  cyy /= n;
  cxy /= n;

  const principalAngle = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
  let axisAngle = principalAngle;

  let { width, height } = measureOrientedExtents(
    allPoints,
    centerX,
    centerY,
    axisAngle,
  );

  if (height > width) {
    [width, height] = [height, width];
    axisAngle += Math.PI / 2;
    ({ width, height } = measureOrientedExtents(
      allPoints,
      centerX,
      centerY,
      axisAngle,
    ));
  }

  if (width <= 0 || height <= 0) return null;

  const rotationDegrees = (axisAngle * 180) / Math.PI;

  return {
    centerX,
    centerY,
    width,
    height,
    rotationDegrees,
  };
}
