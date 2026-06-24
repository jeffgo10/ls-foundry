import * as THREE from "three";
import { labelNeedsTextureUvSwap } from "./labelSceneCoords";
import type { LabelImageSize, SurfaceGrid, TargetBounds } from "./types";

function bowAlongStrips(
  position: THREE.BufferAttribute,
  cols: number,
  rows: number,
  stripCount: number,
  vertexIndex: (strip: number, along: number) => number,
  alongCount: (strip: number) => number,
  bowScale: number,
  detectedScale: number,
  blendT: number,
): void {
  for (let strip = 0; strip < stripCount; strip += 1) {
    const along = alongCount(strip);
    const start = vertexIndex(strip, 0);
    const end = vertexIndex(strip, along - 1);
    const startX = position.getX(start);
    const startY = position.getY(start);
    const endX = position.getX(end);
    const endY = position.getY(end);
    const dx = endX - startX;
    const dy = endY - startY;
    const chord = Math.hypot(dx, dy) || 1;
    const perpX = -dy / chord;
    const perpY = dx / chord;

    for (let i = 0; i < along; i += 1) {
      const index = vertexIndex(strip, i);
      const u = along > 1 ? i / (along - 1) : 0.5;
      const chordX = startX + dx * u;
      const chordY = startY + dy * u;
      const bow = Math.sin(u * Math.PI) * bowScale * detectedScale;
      const targetX = chordX + perpX * bow;
      const targetY = chordY + perpY * bow;
      const x = THREE.MathUtils.lerp(position.getX(index), targetX, blendT);
      const y = THREE.MathUtils.lerp(position.getY(index), targetY, blendT);
      const z =
        position.getZ(index) +
        (1 - Math.cos(u * Math.PI)) * bowScale * 0.08 * detectedScale;
      position.setXYZ(index, x, y, z);
    }
  }
}

/**
 * Bow along grid rows (long-axis strips) vs columns (short-axis strips).
 * Must match which axis maps to texture U in `mapGridPointToTextureUv`.
 */
/** Bow along grid rows when texture U follows the long-axis strips. */
export function shouldBowAlongGridRows(
  bounds: TargetBounds,
  labelSize?: LabelImageSize | null,
): boolean {
  const axisAngleRad = (bounds.rotationDegrees * Math.PI) / 180;
  const sin = Math.sin(axisAngleRad);
  const cos = Math.cos(axisAngleRad);
  const wrapAlongVLocal = Math.abs(sin) > Math.abs(cos);
  const swapped =
    labelSize != null && labelNeedsTextureUvSwap(bounds, labelSize);
  const bowColumns = wrapAlongVLocal !== swapped;
  return !bowColumns;
}

/**
 * Bend grid strips along a circular arc so cylindrical wrap is visible in the
 * orthographic scene. Bows along texture-horizontal (wrap) axis.
 */
export function applyGridCurvature(
  geometry: THREE.BufferGeometry,
  grid: SurfaceGrid,
  meshWidth: number,
  curvatureT: number,
  bounds: TargetBounds,
  labelSize?: LabelImageSize | null,
): void {
  const t = THREE.MathUtils.clamp(curvatureT, 0, 1);
  if (t <= 0.001) return;

  const position = geometry.getAttribute("position");
  if (!position) return;

  const cols = grid.cols;
  const rows = grid.rows;
  const bowScale = t * meshWidth * 0.22;
  const detectedScale = grid.source === "detected" ? 0.7 : 1;
  const blend = grid.source === "detected" ? t * 0.85 : t;
  const bowRows = shouldBowAlongGridRows(bounds, labelSize);

  if (bowRows) {
    bowAlongStrips(
      position,
      cols,
      rows,
      rows,
      (row, col) => row * cols + col,
      () => cols,
      bowScale,
      detectedScale,
      blend,
    );
  } else {
    bowAlongStrips(
      position,
      cols,
      rows,
      cols,
      (col, row) => row * cols + col,
      () => rows,
      bowScale,
      detectedScale,
      blend,
    );
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
}
