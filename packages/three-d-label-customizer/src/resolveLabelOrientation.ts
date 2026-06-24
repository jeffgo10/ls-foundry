import { LABEL_TEXTURE_UPRIGHT_RADIANS } from "./labelSceneCoords";

export interface ResolvedLabelOrientation {
  /** Always matches the scanned green surface width. */
  meshWidth: number;
  /** Always matches the scanned green surface height. */
  meshHeight: number;
  /** Texture rotation in radians (aspect quarter-turn + upright correction). */
  textureRotationRadians: number;
}

function aspectMismatch(surfaceAspect: number, labelAspect: number): number {
  return Math.abs(Math.log(surfaceAspect / labelAspect));
}

/**
 * Keep the mesh aligned to the green surface dimensions; map portrait/landscape
 * label art via texture rotation only so the plane fully covers the green patch.
 */
export function resolveLabelOrientation(
  surfaceWidth: number,
  surfaceHeight: number,
  labelWidth: number,
  labelHeight: number,
): ResolvedLabelOrientation {
  const meshWidth = surfaceWidth;
  const meshHeight = surfaceHeight;

  if (
    surfaceWidth <= 0 ||
    surfaceHeight <= 0 ||
    labelWidth <= 0 ||
    labelHeight <= 0
  ) {
    return {
      meshWidth,
      meshHeight,
      textureRotationRadians: LABEL_TEXTURE_UPRIGHT_RADIANS,
    };
  }

  const surfaceAspect = surfaceWidth / surfaceHeight;
  const labelAspect = labelWidth / labelHeight;
  const labelAspectRotated = labelHeight / labelWidth;

  const directScore = aspectMismatch(surfaceAspect, labelAspect);
  const rotatedScore = aspectMismatch(surfaceAspect, labelAspectRotated);
  const needsQuarterTurn = rotatedScore < directScore;

  const textureRotationRadians =
    LABEL_TEXTURE_UPRIGHT_RADIANS +
    (needsQuarterTurn ? Math.PI / 2 : 0);

  return {
    meshWidth,
    meshHeight,
    textureRotationRadians,
  };
}
