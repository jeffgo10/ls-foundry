import * as THREE from "three";
import { canvasToThreeY, mapGridPointToTextureUv } from "./labelSceneCoords";
import type { LabelImageSize, SurfaceGrid, TargetBounds } from "./types";
import type { LabelMeshParams } from "./scene/labelGeometry";

export interface GridWarpContext {
  centerX: number;
  centerY: number;
  imageHeight: number;
  rotationZ: number;
  bounds: TargetBounds;
  labelSize?: LabelImageSize | null;
  z: number;
}

/** Push grid vertices slightly outward so the label fully covers the green patch edges. */
export function bleedGridPoint(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  bleed = 0.02,
): { x: number; y: number } {
  return {
    x: centerX + (x - centerX) * (1 + bleed),
    y: centerY + (y - centerY) * (1 + bleed),
  };
}

/** Map a canvas grid intersection into mesh-local XY (no bounds tilt — grid encodes it). */
export function canvasGridPointToLocal(
  x: number,
  y: number,
  context: GridWarpContext,
): [number, number, number] {
  const meshThreeY = canvasToThreeY(context.centerY, context.imageHeight);
  const pointThreeY = canvasToThreeY(y, context.imageHeight);
  const localX = x - context.centerX;
  const localY = pointThreeY - meshThreeY;
  return [localX, localY, 0];
}

/**
 * Build a subdivided mesh whose vertices sit on the scanned guide-grid intersections.
 */
export function buildGridWarpGeometry(
  grid: SurfaceGrid,
  params: LabelMeshParams,
  context: GridWarpContext,
): THREE.BufferGeometry {
  const rows = grid.rows;
  const cols = grid.cols;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const point = grid.points[row]?.[col];
      if (!point) continue;
      const bleeded = bleedGridPoint(
        point.x,
        point.y,
        context.bounds.centerX,
        context.bounds.centerY,
      );
      const [lx, ly, lz] = canvasGridPointToLocal(
        bleeded.x,
        bleeded.y,
        context,
      );
      positions.push(lx, ly, lz + context.z);
      const [u, v] = mapGridPointToTextureUv(
        bleeded.x,
        bleeded.y,
        context.bounds,
        context.labelSize,
      );
      uvs.push(u, v);
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      const a = row * cols + col;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
