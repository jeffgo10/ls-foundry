import { offsetClosedPolygon } from "./offsetClosedPolygon";

describe("offsetClosedPolygon", () => {
  it("returns a copy when offset is 0", () => {
    const square = [0, 0, 10, 0, 10, 10, 0, 10];
    const result = offsetClosedPolygon(square, 0);
    expect(result).toEqual(square);
    expect(result).not.toBe(square);
  });

  it("returns a copy for polygons with fewer than 3 vertices", () => {
    expect(offsetClosedPolygon([0, 0, 10, 0], 5)).toEqual([0, 0, 10, 0]);
  });

  it("expands an axis-aligned square by the offset on each side", () => {
    // CCW unit square 0..10 — bevel corners still keep edge AABB at ±offset
    const square = [0, 0, 10, 0, 10, 10, 0, 10];
    const expanded = offsetClosedPolygon(square, 5);

    const xs = expanded.filter((_, i) => i % 2 === 0);
    const ys = expanded.filter((_, i) => i % 2 === 1);
    expect(Math.min(...xs)).toBeCloseTo(-5, 5);
    expect(Math.max(...xs)).toBeCloseTo(15, 5);
    expect(Math.min(...ys)).toBeCloseTo(-5, 5);
    expect(Math.max(...ys)).toBeCloseTo(15, 5);
    // Bevel emits two points per corner (8) rather than one miter tip (4)
    expect(expanded.length).toBe(16);
  });

  it("expands a clockwise square the same way", () => {
    const square = [0, 0, 0, 10, 10, 10, 10, 0];
    const expanded = offsetClosedPolygon(square, 2);
    const xs = expanded.filter((_, i) => i % 2 === 0);
    const ys = expanded.filter((_, i) => i % 2 === 1);
    expect(Math.min(...xs)).toBeCloseTo(-2, 5);
    expect(Math.max(...xs)).toBeCloseTo(12, 5);
    expect(Math.min(...ys)).toBeCloseTo(-2, 5);
    expect(Math.max(...ys)).toBeCloseTo(12, 5);
  });

  it("shrinks when offset is negative", () => {
    const square = [0, 0, 20, 0, 20, 20, 0, 20];
    const shrunk = offsetClosedPolygon(square, -3);
    const xs = shrunk.filter((_, i) => i % 2 === 0);
    const ys = shrunk.filter((_, i) => i % 2 === 1);
    // Bevel chamfers stay inside the original AABB (no outward tips)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(20);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(20);

    const area = (pts: number[]) => {
      let sum = 0;
      const n = pts.length / 2;
      for (let i = 0; i < n; i += 1) {
        const x1 = pts[i * 2]!;
        const y1 = pts[i * 2 + 1]!;
        const x2 = pts[((i + 1) % n) * 2]!;
        const y2 = pts[((i + 1) % n) * 2 + 1]!;
        sum += x1 * y2 - x2 * y1;
      }
      return Math.abs(sum) / 2;
    };
    expect(area(shrunk)).toBeLessThan(area(square));
  });

  it("ignores a duplicate closing vertex", () => {
    const closed = [0, 0, 10, 0, 10, 10, 0, 10, 0, 0];
    const expanded = offsetClosedPolygon(closed, 1);
    expect(expanded.length).toBe(16);
    const xs = expanded.filter((_, i) => i % 2 === 0);
    expect(Math.min(...xs)).toBeCloseTo(-1, 5);
  });

  it("bevels sharp corners instead of emitting miter spikes", () => {
    // Acute peak at (50, 0) — a miter tip would shoot far above the peak
    const sharp = [0, 100, 50, 0, 100, 100];
    const offset = 10;
    const expanded = offsetClosedPolygon(sharp, offset);

    // Every bevel vertex sits exactly |offset| along an edge normal from some
    // source vertex, so none can stray farther than |offset| from the hull.
    for (let i = 0; i < expanded.length; i += 2) {
      const px = expanded[i]!;
      const py = expanded[i + 1]!;
      const distToHull = Math.min(
        Math.hypot(px - 0, py - 100),
        Math.hypot(px - 50, py - 0),
        Math.hypot(px - 100, py - 100),
      );
      expect(distToHull).toBeLessThanOrEqual(offset + 1e-6);
    }

    const ys = expanded.filter((_, i) => i % 2 === 1);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(-offset - 1e-6);
  });
});
