import * as THREE from "three";
import type { TargetBounds } from "./types";
import { canvasRotationToThreeZ } from "./labelSceneCoords";
import { resolveLabelOrientation } from "./resolveLabelOrientation";
import { computeLabelMeshParams } from "./scene/labelGeometry";

const axisAlignedBounds: TargetBounds = {
  minX: 40,
  maxX: 159,
  minY: 80,
  maxY: 139,
  centerX: 99.5,
  centerY: 109.5,
  width: 120,
  height: 60,
  aspectRatio: 2,
  rotationDegrees: 0,
};

const tiltedBounds: TargetBounds = {
  ...axisAlignedBounds,
  rotationDegrees: 32,
};

describe("label orientation regression", () => {
  it("keeps axis-aligned labels upright with zero texture spin", () => {
    const params = computeLabelMeshParams(
      axisAlignedBounds,
      400,
      { curvature: 10, offsetX: 0, offsetY: 0, rotation: 0 },
      { width: 800, height: 400 },
    );

    expect(params.rotationZ).toBe(0);
    expect(params.textureRotationRadians).toBe(0);
  });

  it("negates canvas tilt while keeping zero upright texture spin", () => {
    const params = computeLabelMeshParams(
      tiltedBounds,
      400,
      { curvature: 10, offsetX: 0, offsetY: 0, rotation: 0 },
      { width: 800, height: 400 },
    );

    expect(params.rotationZ).toBeCloseTo(canvasRotationToThreeZ(32));
    expect(params.textureRotationRadians).toBe(0);
  });

  it("quarter-turns portrait art without re-introducing the 180 upright spin", () => {
    const orientation = resolveLabelOrientation(120, 60, 400, 800);
    expect(orientation.textureRotationRadians).toBeCloseTo(Math.PI / 2);

    const params = computeLabelMeshParams(
      tiltedBounds,
      400,
      { curvature: 10, offsetX: 0, offsetY: 0, rotation: 0 },
      { width: 400, height: 800 },
    );

    expect(params.rotationZ).toBeCloseTo(canvasRotationToThreeZ(32));
    expect(params.textureRotationRadians).toBeCloseTo(Math.PI / 2);
  });

  it("adds manual fine-tune in world space after canvas tilt conversion", () => {
    const params = computeLabelMeshParams(
      { ...axisAlignedBounds, rotationDegrees: -30 },
      400,
      { curvature: 10, offsetX: 0, offsetY: 0, rotation: 5 },
      { width: 800, height: 400 },
    );

    expect(params.rotationZ).toBeCloseTo(
      canvasRotationToThreeZ(-30) + (5 * Math.PI) / 180,
    );
    expect(params.textureRotationRadians).toBe(0);
  });

  it("documents the v0.1.11 / v0.1.12 regression matrix", () => {
    const directTexture = resolveLabelOrientation(120, 60, 800, 400);
    expect(directTexture.textureRotationRadians).toBe(0);

    const negatedTilt = canvasRotationToThreeZ(32);
    expect(negatedTilt).toBeCloseTo((-32 * Math.PI) / 180);
    expect(negatedTilt).not.toBeCloseTo((32 * Math.PI) / 180);
    expect(THREE.MathUtils.radToDeg(directTexture.textureRotationRadians)).toBe(
      0,
    );
  });
});
