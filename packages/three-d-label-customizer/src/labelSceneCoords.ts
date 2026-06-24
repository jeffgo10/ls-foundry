/**
 * Pixel-ortho scene conventions (camera bottom=0, top=imageHeight, textures flipY=true).
 *
 * Green scan + PCA run in canvas space (origin top-left, Y down). These helpers
 * convert to the Three.js world so the label stays upright AND follows tilt:
 * - `canvasToThreeY` — flip Y for mesh position
 * - `canvasRotationToThreeZ` — negate tilt for mesh.rotation.z
 * - `LABEL_TEXTURE_UPRIGHT_RADIANS` — 0° upright spin (paired with negated tilt)
 *
 * Do not change one constant without verifying the others —
 * see `labelOrientationRegression.test.ts`.
 */
import { canvasToLocal } from "./orientedCoords";
import type { LabelImageSize, TargetBounds } from "./types";

export const PACKAGE_VERSION = "0.1.0";
export const LABEL_TEXTURE_UPRIGHT_RADIANS = 0;

/** Convert canvas Y (down) to Three.js Y (up) with bottom-left origin. */
export function canvasToThreeY(canvasY: number, imageHeight: number): number {
  return imageHeight - canvasY;
}

/** Negate canvas tilt so Z rotation matches the Y-flipped Three.js scene. */
export function canvasRotationToThreeZ(rotationDegrees: number): number {
  return (-rotationDegrees * Math.PI) / 180;
}

/**
 * Grid cols follow PCA U (bounds.width / long axis). Texture U is horizontal on the
 * label art. When the long axis is more vertical than horizontal, bow along columns.
 */
export function colsRunAlongTextureHorizontal(rotationDegrees: number): boolean {
  const rad = (rotationDegrees * Math.PI) / 180;
  return Math.abs(Math.cos(rad)) >= Math.abs(Math.sin(rad));
}

export function isPortraitLabelArt(labelSize?: LabelImageSize | null): boolean {
  if (!labelSize || labelSize.width <= 0 || labelSize.height <= 0) {
    return true;
  }
  return labelSize.height >= labelSize.width;
}

/** Whether landscape label art needs a quarter-turn on a bottle patch. */
export function labelNeedsTextureUvSwap(
  bounds: TargetBounds,
  labelSize: LabelImageSize,
): boolean {
  void bounds;
  return !isPortraitLabelArt(labelSize);
}

/**
 * Map a canvas grid intersection to texture UV in PCA-local patch space so the
 * label art rotates with the warped mesh (not locked to screen axes).
 *
 * Portrait art: texture U = wrap (local V / bounds.height), V = height (local U).
 */
export function mapGridPointToTextureUv(
  canvasX: number,
  canvasY: number,
  bounds: TargetBounds,
  labelSize?: LabelImageSize | null,
): [u: number, v: number] {
  const axisAngleRad = (bounds.rotationDegrees * Math.PI) / 180;
  const { u: localU, v: localV } = canvasToLocal(
    canvasX,
    canvasY,
    bounds.centerX,
    bounds.centerY,
    axisAngleRad,
  );

  const halfW = bounds.width / 2;
  const halfH = bounds.height / 2;

  let uNorm = (localV + halfH) / bounds.height;
  let vNorm = (localU + halfW) / bounds.width;

  if (labelSize && labelNeedsTextureUvSwap(bounds, labelSize)) {
    [uNorm, vNorm] = [vNorm, uNorm];
  }

  const u = Math.min(1, Math.max(0, 1 - uNorm));
  const v = Math.min(1, Math.max(0, 1 - vNorm));
  return [u, v];
}

/** @deprecated Use mapGridPointToTextureUv — index-based mapping mirrors portrait labels. */
export function mapGridVertexToTextureUv(
  col: number,
  row: number,
  cols: number,
  rows: number,
  rotationDegrees: number,
): [u: number, v: number] {
  if (colsRunAlongTextureHorizontal(rotationDegrees)) {
    return [
      cols > 1 ? col / (cols - 1) : 0.5,
      rows > 1 ? 1 - row / (rows - 1) : 0.5,
    ];
  }
  return [
    rows > 1 ? row / (rows - 1) : 0.5,
    cols > 1 ? 1 - col / (cols - 1) : 0.5,
  ];
}
