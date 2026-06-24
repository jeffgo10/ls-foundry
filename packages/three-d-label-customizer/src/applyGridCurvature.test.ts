import { applyGridCurvature } from "./applyGridCurvature";
import { buildGridWarpGeometry } from "./buildGridWarpGeometry";
import type { LabelMeshParams } from "./scene/labelGeometry";
import type { SurfaceGrid, TargetBounds } from "./types";

const portraitLabel = { width: 400, height: 800 };

const bounds: TargetBounds = {
  minX: 10,
  maxX: 89,
  minY: 10,
  maxY: 49,
  centerX: 49.5,
  centerY: 29.5,
  width: 80,
  height: 40,
  aspectRatio: 2,
  rotationDegrees: 0,
};

const params: LabelMeshParams = {
  mode: "grid",
  radius: 100,
  thetaLength: 1,
  thetaStart: 0,
  position: [50, 40, 1],
  rotationZ: 0,
  meshWidth: 80,
  meshHeight: 40,
  textureRotationRadians: 0,
};

const grid: SurfaceGrid = {
  cols: 3,
  rows: 3,
  source: "estimated",
  points: [
    [
      { x: 10, y: 10 },
      { x: 50, y: 10 },
      { x: 90, y: 10 },
    ],
    [
      { x: 10, y: 50 },
      { x: 50, y: 50 },
      { x: 90, y: 50 },
    ],
    [
      { x: 10, y: 90 },
      { x: 50, y: 90 },
      { x: 90, y: 90 },
    ],
  ],
};

describe("applyGridCurvature", () => {
  it("bows strip midpoints away from the chord line on portrait labels", () => {
    const geometry = buildGridWarpGeometry(grid, params, {
      centerX: 50,
      centerY: 50,
      imageHeight: 100,
      rotationZ: 0,
      bounds,
      z: 0,
    });
    const beforeY = geometry.getAttribute("position").getY(1);
    applyGridCurvature(geometry, grid, 80, 1, bounds, portraitLabel);
    const afterY = geometry.getAttribute("position").getY(1);
    expect(afterY).not.toBeCloseTo(beforeY);
    geometry.dispose();
  });
});
