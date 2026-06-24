import { synthesizeSurfaceGrid } from "./synthesizeSurfaceGrid";
import type { TargetBounds } from "./types";

const bounds: TargetBounds = {
  minX: 20,
  maxX: 99,
  minY: 10,
  maxY: 49,
  centerX: 59.5,
  centerY: 29.5,
  width: 80,
  height: 40,
  aspectRatio: 2,
  rotationDegrees: 0,
};

describe("synthesizeSurfaceGrid", () => {
  it("creates a bowed 5×6 grid from oriented bounds", () => {
    const grid = synthesizeSurfaceGrid(bounds);
    expect(grid.cols).toBe(5);
    expect(grid.rows).toBe(6);
    expect(grid.source).toBe("estimated");

    const topLeft = grid.points[0]![0]!;
    const bottomLeft = grid.points[grid.rows - 1]![0]!;
    const midCol = grid.points[2]![0]!;
    const midDist = Math.hypot(
      midCol.x - (topLeft.x + bottomLeft.x) / 2,
      midCol.y - (topLeft.y + bottomLeft.y) / 2,
    );
    expect(midDist).toBeGreaterThan(0.5);
  });

  it("follows bounds rotation", () => {
    const tilted = synthesizeSurfaceGrid({ ...bounds, rotationDegrees: 30 });
    const axis = synthesizeSurfaceGrid(bounds);
    expect(tilted.points[0]![0]!.x).not.toBeCloseTo(axis.points[0]![0]!.x);
  });
});
