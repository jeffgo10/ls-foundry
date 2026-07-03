import { unitToCanvasPixels, type DimensionUnit } from "@jeffgo10/shared-types";
import { clampNodeScale } from "./resizeConstraints";

export type SetSelectedSizeInput = {
  /** Target width in `unit`. Omit to derive from height when aspect ratio is locked. */
  width?: number;
  /** Target height in `unit`. Omit to derive from width when aspect ratio is locked. */
  height?: number;
  unit: DimensionUnit;
  dpi: number;
  /** When true (default), changing one axis scales the other proportionally. */
  lockAspectRatio?: boolean;
};

export type SetSelectedSizeOptions = {
  width?: number;
  height?: number;
  unit: DimensionUnit;
  dpi?: number;
  lockAspectRatio?: boolean;
};

export type ComputeScaleFromUnitDimensionsInput = SetSelectedSizeInput & {
  localWidth: number;
  localHeight: number;
  currentScaleX: number;
  currentScaleY: number;
  minResizeSizeMm: number;
};

function isPositiveNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Compute Konva scale values from typed physical dimensions. Returns null when input is invalid. */
export function computeScaleFromUnitDimensions(
  input: ComputeScaleFromUnitDimensionsInput,
): { scaleX: number; scaleY: number } | null {
  const hasWidth = isPositiveNumber(input.width);
  const hasHeight = isPositiveNumber(input.height);
  if (!hasWidth && !hasHeight) {
    return null;
  }

  const lockAspectRatio = input.lockAspectRatio !== false;
  const signX = Math.sign(input.currentScaleX) || 1;
  const signY = Math.sign(input.currentScaleY) || 1;
  const currentWidthPx =
    input.localWidth * Math.abs(input.currentScaleX);
  const currentHeightPx =
    input.localHeight * Math.abs(input.currentScaleY);

  let targetWidthPx = hasWidth
    ? unitToCanvasPixels(input.width!, input.unit, input.dpi)
    : currentWidthPx;
  let targetHeightPx = hasHeight
    ? unitToCanvasPixels(input.height!, input.unit, input.dpi)
    : currentHeightPx;

  if (lockAspectRatio) {
    if (hasWidth && !hasHeight) {
      const ratio = targetWidthPx / currentWidthPx;
      targetHeightPx = currentHeightPx * ratio;
    } else if (hasHeight && !hasWidth) {
      const ratio = targetHeightPx / currentHeightPx;
      targetWidthPx = currentWidthPx * ratio;
    } else {
      const widthRatio = targetWidthPx / currentWidthPx;
      const heightRatio = targetHeightPx / currentHeightPx;
      const ratio = Math.abs(widthRatio - heightRatio) < 1e-6
        ? widthRatio
        : widthRatio;
      targetWidthPx = currentWidthPx * ratio;
      targetHeightPx = currentHeightPx * ratio;
    }
  }

  let scaleX = signX * (targetWidthPx / input.localWidth);
  let scaleY = signY * (targetHeightPx / input.localHeight);

  return clampNodeScale(
    scaleX,
    scaleY,
    input.localWidth,
    input.localHeight,
    input.minResizeSizeMm,
    input.dpi,
  );
}
