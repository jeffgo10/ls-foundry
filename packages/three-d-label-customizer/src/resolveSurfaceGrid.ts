import { scanGreenSurfaceGrid } from "./scanGreenSurfaceGrid";
import { synthesizeSurfaceGrid } from "./synthesizeSurfaceGrid";
import type { SurfaceGrid, TargetBounds } from "./types";

/** Prefer painted guide lines; otherwise synthesize a bowed grid from green bounds. */
export function resolveSurfaceGrid(
  imageData: ImageData,
  bounds: TargetBounds,
): SurfaceGrid {
  const scanned = scanGreenSurfaceGrid(imageData, bounds);
  if (scanned) {
    return { ...scanned, source: "detected" };
  }
  return synthesizeSurfaceGrid(bounds);
}
