import { mmToCanvasPixels } from "@jeffgo10/shared-types";

/** Default minimum shorter-side size when resizing stickers (1 inch). */
export const DEFAULT_MIN_RESIZE_SIZE_MM = 25.4;

export type ResizeBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

/** Minimum uniform scale so the shorter displayed side is at least `minResizeSizeMm`. */
export function getMinResizeScale(
  localWidth: number,
  localHeight: number,
  minResizeSizeMm: number,
  dpi: number,
): number {
  const minSidePx = mmToCanvasPixels(minResizeSizeMm, dpi);
  return minSidePx / Math.min(localWidth, localHeight);
}

/** Minimum axis-aligned size (rotation = 0) preserving aspect ratio. */
export function getMinResizeDimensionsPx(
  localWidth: number,
  localHeight: number,
  minResizeSizeMm: number,
  dpi: number,
): { minWidthPx: number; minHeightPx: number } {
  const minScale = getMinResizeScale(localWidth, localHeight, minResizeSizeMm, dpi);
  return {
    minWidthPx: localWidth * minScale,
    minHeightPx: localHeight * minScale,
  };
}

export function clampResizeBox(
  oldBox: ResizeBox,
  newBox: ResizeBox,
  minWidthPx: number,
  minHeightPx: number,
): ResizeBox {
  if (newBox.width < minWidthPx || newBox.height < minHeightPx) {
    return oldBox;
  }
  return newBox;
}

export type ScaledItemDimensions = {
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
};

/** Whether uniformly scaling items by `ratio` keeps every sticker above min size. */
export function isMultiSelectResizeRatioAllowed(
  items: readonly ScaledItemDimensions[],
  minResizeSizeMm: number,
  dpi: number,
  ratio: number,
): boolean {
  if (ratio >= 1) {
    return true;
  }

  for (const item of items) {
    const scaledX = item.scaleX * ratio;
    const scaledY = item.scaleY * ratio;
    const clamped = clampNodeScale(
      scaledX,
      scaledY,
      item.width,
      item.height,
      minResizeSizeMm,
      dpi,
    );
    if (
      Math.abs(clamped.scaleX - scaledX) > 1e-9 ||
      Math.abs(clamped.scaleY - scaledY) > 1e-9
    ) {
      return false;
    }
  }

  return true;
}

/** Multi-select transformer box: allow move/rotate; only block scale-below-min. */
export function constrainMultiSelectBoundBox(
  oldBox: ResizeBox,
  newBox: ResizeBox,
  items: readonly ScaledItemDimensions[],
  minResizeSizeMm: number,
  dpi: number,
): ResizeBox {
  if (Math.abs(newBox.rotation - oldBox.rotation) > 1e-4) {
    return newBox;
  }

  const widthUnchanged = Math.abs(newBox.width - oldBox.width) < 1e-3;
  const heightUnchanged = Math.abs(newBox.height - oldBox.height) < 1e-3;
  if (widthUnchanged && heightUnchanged) {
    return newBox;
  }

  const ratio = oldBox.width > 0 ? newBox.width / oldBox.width : 1;
  if (isMultiSelectResizeRatioAllowed(items, minResizeSizeMm, dpi, ratio)) {
    return newBox;
  }

  return oldBox;
}

/** Clamp uniform scale on a Konva group so the shorter side stays above the minimum. */
export function clampNodeScale(
  scaleX: number,
  scaleY: number,
  localWidth: number,
  localHeight: number,
  minResizeSizeMm: number,
  dpi: number,
): { scaleX: number; scaleY: number } {
  const minSidePx = mmToCanvasPixels(minResizeSizeMm, dpi);
  const shorterSidePx = Math.min(
    localWidth * Math.abs(scaleX),
    localHeight * Math.abs(scaleY),
  );
  if (shorterSidePx >= minSidePx) {
    return { scaleX, scaleY };
  }
  const minScale = getMinResizeScale(localWidth, localHeight, minResizeSizeMm, dpi);
  const signX = Math.sign(scaleX) || 1;
  const signY = Math.sign(scaleY) || 1;
  return { scaleX: signX * minScale, scaleY: signY * minScale };
}
