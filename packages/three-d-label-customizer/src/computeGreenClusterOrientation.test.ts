import {
  computeGreenClusterOrientation,
  type GreenPixelPoint,
} from "./computeGreenClusterOrientation";

function pointInRotatedRect(
  x: number,
  y: number,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  angleRad: number,
): boolean {
  const dx = x - cx;
  const dy = y - cy;
  const cos = Math.cos(-angleRad);
  const sin = Math.sin(-angleRad);
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  return Math.abs(lx) <= halfW && Math.abs(ly) <= halfH;
}

function makeRotatedGreenPoints(
  width: number,
  height: number,
  cx: number,
  cy: number,
  rectW: number,
  rectH: number,
  angleDeg: number,
): GreenPixelPoint[] {
  const angleRad = (angleDeg * Math.PI) / 180;
  const points: GreenPixelPoint[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pointInRotatedRect(x, y, cx, cy, rectW / 2, rectH / 2, angleRad)) {
        points.push({ x, y });
      }
    }
  }
  return points;
}

describe("computeGreenClusterOrientation", () => {
  it("returns near-zero rotation for an axis-aligned rectangle", () => {
    const points = makeRotatedGreenPoints(120, 120, 60, 60, 80, 40, 0);
    const oriented = computeGreenClusterOrientation(points);
    expect(oriented).not.toBeNull();
    expect(oriented!.rotationDegrees).toBeCloseTo(0, 0);
    expect(oriented!.width).toBeGreaterThan(oriented!.height);
    expect(oriented!.width).toBeCloseTo(80, -1);
    expect(oriented!.height).toBeCloseTo(40, -1);
  });

  it("detects clockwise tilt for a rotated green rectangle", () => {
    const points = makeRotatedGreenPoints(240, 240, 120, 120, 120, 60, 32);
    const oriented = computeGreenClusterOrientation(points);
    expect(oriented).not.toBeNull();
    expect(oriented!.rotationDegrees).toBeCloseTo(32, 0);
    expect(oriented!.centerX).toBeCloseTo(120, 0);
    expect(oriented!.centerY).toBeCloseTo(120, 0);
  });

  it("returns null for too few points", () => {
    expect(computeGreenClusterOrientation([{ x: 0, y: 0 }])).toBeNull();
  });
});
