import * as THREE from "three";
import {
  buildGridWarpGeometry,
  canvasGridPointToLocal,
} from "./buildGridWarpGeometry";
import type { LabelMeshParams } from "./scene/labelGeometry";
import type { SurfaceGrid, TargetBounds } from "./types";

const bounds: TargetBounds = {
  minX: 10,
  maxX: 49,
  minY: 20,
  maxY: 59,
  centerX: 29.5,
  centerY: 39.5,
  width: 40,
  height: 40,
  aspectRatio: 1,
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
  points: [
    [
      { x: 10, y: 10 },
      { x: 50, y: 12 },
      { x: 90, y: 14 },
    ],
    [
      { x: 12, y: 50 },
      { x: 50, y: 50 },
      { x: 88, y: 52 },
    ],
    [
      { x: 14, y: 90 },
      { x: 50, y: 88 },
      { x: 86, y: 86 },
    ],
  ],
};

describe("buildGridWarpGeometry", () => {
  it("maps canvas grid points into mesh-local coordinates", () => {
    const [lx, ly] = canvasGridPointToLocal(50, 50, {
      centerX: 50,
      centerY: 50,
      imageHeight: 100,
      rotationZ: 0,
      bounds,
      z: 0,
    });
    expect(lx).toBeCloseTo(0);
    expect(ly).toBeCloseTo(0);
  });

  it("builds a subdivided mesh with one quad per grid cell", () => {
    const geometry = buildGridWarpGeometry(grid, params, {
      centerX: 50,
      centerY: 50,
      imageHeight: 100,
      rotationZ: 0,
      bounds,
      z: 0,
    });

    expect(geometry.getAttribute("position").count).toBe(9);
    expect(geometry.index?.count).toBe(24);
    geometry.dispose();
  });

  it("warps corner vertices toward the scanned intersections", () => {
    const geometry = buildGridWarpGeometry(grid, params, {
      centerX: 50,
      centerY: 50,
      imageHeight: 100,
      rotationZ: 0,
      bounds,
      z: 0,
    });
    const position = geometry.getAttribute("position");
    const topLeftX = position.getX(0);
    const topLeftY = position.getY(0);
    expect(topLeftX).toBeCloseTo(-40.39, 1);
    expect(topLeftY).toBeCloseTo(40.59, 1);
    geometry.dispose();
  });
});
