import * as THREE from "three";
import type { TargetBounds, SurfaceGrid } from "../types";
import {
  canvasRotationToThreeZ,
  canvasToThreeY,
} from "../labelSceneCoords";
import {
  buildLabelGeometry,
  computeLabelMeshParams,
} from "./labelGeometry";

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

describe("labelGeometry", () => {
  it("converts canvas Y to Three Y", () => {
    expect(canvasToThreeY(0, 100)).toBe(100);
    expect(canvasToThreeY(100, 100)).toBe(0);
  });

  it("negates canvas tilt for Three.js Z rotation", () => {
    expect(canvasRotationToThreeZ(32)).toBeCloseTo((-32 * Math.PI) / 180);
    expect(canvasRotationToThreeZ(-30)).toBeCloseTo((30 * Math.PI) / 180);
  });

  it("uses a flat plane at z=1 for low curvature", () => {
    const params = computeLabelMeshParams(bounds, 80, {
      curvature: 10,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
    });
    expect(params.mode).toBe("plane");
    expect(params.position[2]).toBe(1);

    const geometry = buildLabelGeometry(bounds, params);
    expect(geometry).toBeInstanceOf(THREE.PlaneGeometry);
    geometry.dispose();
  });

  it("offsets curved cylinder so the visible face sits at z=1", () => {
    const flat = computeLabelMeshParams(bounds, 80, {
      curvature: 0,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
    });
    const curved = computeLabelMeshParams(bounds, 80, {
      curvature: 100,
      offsetX: 5,
      offsetY: -3,
      rotation: 10,
    });
    expect(curved.mode).toBe("cylinder");
    expect(curved.radius).toBeLessThan(flat.radius);
    expect(curved.position[0]).toBe(bounds.centerX + 5);
    expect(curved.position[2]).toBe(1 - curved.radius);
    expect(curved.rotationZ).toBeCloseTo((10 * Math.PI) / 180);
  });

  it("combines detected bounds rotation with manual fine-tune", () => {
    const tiltedBounds: TargetBounds = { ...bounds, rotationDegrees: -30 };
    const params = computeLabelMeshParams(tiltedBounds, 80, {
      curvature: 10,
      offsetX: 0,
      offsetY: 0,
      rotation: 5,
    });
    expect(params.rotationZ).toBeCloseTo((35 * Math.PI) / 180);
  });

  it("maps portrait label art via texture rotation while mesh matches green size", () => {
    const landscapeBounds: TargetBounds = {
      ...bounds,
      width: 120,
      height: 60,
      aspectRatio: 2,
      rotationDegrees: -30,
    };
    const params = computeLabelMeshParams(
      landscapeBounds,
      80,
      { curvature: 10, offsetX: 0, offsetY: 0, rotation: 0 },
      { width: 400, height: 800 },
    );
    expect(params.meshWidth).toBe(120);
    expect(params.meshHeight).toBe(60);
    expect(params.rotationZ).toBeCloseTo((30 * Math.PI) / 180);
    expect(params.textureRotationRadians).toBeCloseTo(Math.PI / 2);
  });

  it("uses grid warp geometry when a surface grid is provided", () => {
    const surfaceGrid: SurfaceGrid = {
      cols: 3,
      rows: 3,
      points: [
        [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 40, y: 0 },
        ],
        [
          { x: 0, y: 20 },
          { x: 20, y: 20 },
          { x: 40, y: 20 },
        ],
        [
          { x: 0, y: 40 },
          { x: 20, y: 40 },
          { x: 40, y: 40 },
        ],
      ],
    };
    const params = computeLabelMeshParams(
      bounds,
      80,
      { curvature: 10, offsetX: 0, offsetY: 0, rotation: 0 },
      undefined,
      surfaceGrid,
    );
    expect(params.mode).toBe("grid");
    expect(params.textureRotationRadians).toBe(0);

    const geometry = buildLabelGeometry(bounds, params, {
      surfaceGrid,
      imageHeight: 80,
      curvature: 10,
    });
    expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(geometry.getAttribute("position").count).toBe(9);
    geometry.dispose();
  });

  it("builds open cylinder geometry for higher curvature", () => {
    const params = computeLabelMeshParams(bounds, 80, {
      curvature: 50,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
    });
    const geometry = buildLabelGeometry(bounds, params);
    expect(geometry).toBeInstanceOf(THREE.CylinderGeometry);
    geometry.dispose();
  });
});
