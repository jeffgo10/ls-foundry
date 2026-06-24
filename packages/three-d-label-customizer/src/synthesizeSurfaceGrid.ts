import { localToCanvas } from "./orientedCoords";
import type { SurfaceGrid, TargetBounds } from "./types";

const DEFAULT_COLS = 5;
const DEFAULT_ROWS = 6;

/**
 * Build a guide grid from the oriented green bounds when painted lines are not detected.
 * Rows bow horizontally to approximate cylindrical label wrap in image space.
 */
export function synthesizeSurfaceGrid(
  bounds: TargetBounds,
  cols = DEFAULT_COLS,
  rows = DEFAULT_ROWS,
): SurfaceGrid {
  const axisAngleRad = (bounds.rotationDegrees * Math.PI) / 180;
  const sin = Math.sin(axisAngleRad);
  const cos = Math.cos(axisAngleRad);
  const halfW = bounds.width / 2;
  const halfH = bounds.height / 2;
  const uFromVLocal = Math.abs(sin) > Math.abs(cos);
  const points: { x: number; y: number }[][] = [];

  for (let row = 0; row < rows; row += 1) {
    const vNorm = rows > 1 ? row / (rows - 1) : 0.5;
    let v = -halfH + vNorm * (2 * halfH);
    const rowPoints: { x: number; y: number }[] = [];

    for (let col = 0; col < cols; col += 1) {
      const uNorm = cols > 1 ? col / (cols - 1) : 0.5;
      let u = -halfW + uNorm * (2 * halfW);
      const edgeFactor = Math.sin(
        (uFromVLocal ? vNorm : uNorm) * Math.PI,
      );
      const rowFactor = 1 - Math.abs(vNorm - 0.5) * 1.6;
      const bow =
        edgeFactor * rowFactor * (uFromVLocal ? halfH : halfW) * 0.14;
      if (uFromVLocal) {
        v += bow;
      } else {
        u += bow;
      }

      rowPoints.push(
        localToCanvas(u, v, bounds.centerX, bounds.centerY, axisAngleRad),
      );
    }
    points.push(rowPoints);
  }

  return {
    cols,
    rows,
    points,
    source: "estimated",
  };
}
