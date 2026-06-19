import { mmToCanvasPixels } from "@jeffgo10/shared-types";

export type MarginBoundsItem = {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  /** Alpha contour in local image space; image rect used when absent or empty. */
  cutLinePoints?: number[];
};

export type AxisAlignedBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function transformLocalPoint(
  x: number,
  y: number,
  scaleX: number,
  scaleY: number,
  rotationDeg: number,
  originX: number,
  originY: number,
): { x: number; y: number } {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const sx = x * scaleX;
  const sy = y * scaleY;
  return {
    x: originX + sx * cos - sy * sin,
    y: originY + sx * sin + sy * cos,
  };
}

function getBoundsSamplePoints(item: MarginBoundsItem): number[] {
  const contour = item.cutLinePoints;
  if (contour && contour.length >= 4) {
    return contour;
  }
  return [0, 0, item.width, 0, item.width, item.height, 0, item.height];
}

/** Axis-aligned bounds of a sticker's cut line (or image rect) in stage space. */
export function getItemAxisAlignedBounds(
  item: MarginBoundsItem,
  position?: { x: number; y: number },
): AxisAlignedBounds {
  const originX = position?.x ?? item.x;
  const originY = position?.y ?? item.y;
  const samplePoints = getBoundsSamplePoints(item);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < samplePoints.length; i += 2) {
    const { x, y } = transformLocalPoint(
      samplePoints[i]!,
      samplePoints[i + 1]!,
      item.scaleX,
      item.scaleY,
      item.rotation,
      originX,
      originY,
    );
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return { minX, minY, maxX, maxY };
}

export function getCanvasMarginPx(marginMm: number, designDpi: number): number {
  if (marginMm <= 0) {
    return 0;
  }
  return mmToCanvasPixels(marginMm, designDpi);
}

/** Whether the sticker cut line can fit entirely inside the margin inset. */
export function canItemFitInCanvasMargin(
  item: MarginBoundsItem,
  canvasWidth: number,
  canvasHeight: number,
  marginMm: number,
  designDpi: number,
): boolean {
  const marginPx = getCanvasMarginPx(marginMm, designDpi);
  const bounds = getItemAxisAlignedBounds(item);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  return (
    width <= canvasWidth - marginPx * 2 &&
    height <= canvasHeight - marginPx * 2
  );
}

/** Shift group origin so the cut-line AABB stays inside the margin inset (or canvas edges when margin is 0). */
export function clampItemPosition(
  item: MarginBoundsItem,
  canvasWidth: number,
  canvasHeight: number,
  marginMm: number,
  designDpi: number,
  position?: { x: number; y: number },
): { x: number; y: number } {
  const marginPx = getCanvasMarginPx(marginMm, designDpi);
  let x = position?.x ?? item.x;
  let y = position?.y ?? item.y;
  const minXLimit = marginPx;
  const minYLimit = marginPx;
  const maxXLimit = canvasWidth - marginPx;
  const maxYLimit = canvasHeight - marginPx;

  for (let pass = 0; pass < 2; pass += 1) {
    const bounds = getItemAxisAlignedBounds(item, { x, y });
    if (bounds.minX < minXLimit) {
      x += minXLimit - bounds.minX;
    }
    if (bounds.maxX > maxXLimit) {
      x += maxXLimit - bounds.maxX;
    }
    if (bounds.minY < minYLimit) {
      y += minYLimit - bounds.minY;
    }
    if (bounds.maxY > maxYLimit) {
      y += maxYLimit - bounds.maxY;
    }
  }

  return { x, y };
}

export function clampItemToCanvasMargin<T extends MarginBoundsItem>(
  item: T,
  canvasWidth: number,
  canvasHeight: number,
  marginMm: number,
  designDpi: number,
): T {
  const { x, y } = clampItemPosition(
    item,
    canvasWidth,
    canvasHeight,
    marginMm,
    designDpi,
  );
  if (x === item.x && y === item.y) {
    return item;
  }
  return { ...item, x, y };
}

/** Reject resize boxes that extend past the margin inset (or canvas edges when margin is 0). */
export function clampResizeBoxToCanvasMargin(
  oldBox: { x: number; y: number; width: number; height: number; rotation: number },
  newBox: { x: number; y: number; width: number; height: number; rotation: number },
  canvasWidth: number,
  canvasHeight: number,
  marginMm: number,
  designDpi: number,
): { x: number; y: number; width: number; height: number; rotation: number } {
  const marginPx = getCanvasMarginPx(marginMm, designDpi);
  const minXLimit = marginPx;
  const minYLimit = marginPx;
  const maxXLimit = canvasWidth - marginPx;
  const maxYLimit = canvasHeight - marginPx;

  if (
    newBox.x < minXLimit ||
    newBox.y < minYLimit ||
    newBox.x + newBox.width > maxXLimit ||
    newBox.y + newBox.height > maxYLimit
  ) {
    return oldBox;
  }

  return newBox;
}

/** Uniformly scale a sticker so its cut-line bounds fit inside the margin inset. */
export function fitItemToCanvasArea<T extends MarginBoundsItem>(
  item: T,
  canvasWidth: number,
  canvasHeight: number,
  marginMm: number,
  designDpi: number,
): T {
  const marginPx = getCanvasMarginPx(marginMm, designDpi);
  const availableWidth = canvasWidth - marginPx * 2;
  const availableHeight = canvasHeight - marginPx * 2;

  if (availableWidth <= 0 || availableHeight <= 0) {
    return item;
  }

  const bounds = getItemAxisAlignedBounds(item);
  const itemWidth = bounds.maxX - bounds.minX;
  const itemHeight = bounds.maxY - bounds.minY;

  if (itemWidth <= 0 || itemHeight <= 0) {
    return item;
  }

  if (itemWidth <= availableWidth && itemHeight <= availableHeight) {
    return item;
  }

  const fitScale = Math.min(availableWidth / itemWidth, availableHeight / itemHeight);
  return {
    ...item,
    scaleX: item.scaleX * fitScale,
    scaleY: item.scaleY * fitScale,
  };
}

/** Scale to fit, then place at the default printable-area origin. */
export function prepareItemForCanvasPlacement<T extends MarginBoundsItem>(
  item: T,
  canvasWidth: number,
  canvasHeight: number,
  marginMm: number,
  designDpi: number,
): T {
  const fitted = fitItemToCanvasArea(
    item,
    canvasWidth,
    canvasHeight,
    marginMm,
    designDpi,
  );
  const { x, y } = getDefaultPlacementPosition(
    fitted,
    canvasWidth,
    canvasHeight,
    marginMm,
    designDpi,
  );
  return { ...fitted, x, y };
}

/** Default drop position: top-left of the printable area, or clamped if oversized. */
export function getDefaultPlacementPosition(
  item: MarginBoundsItem,
  canvasWidth: number,
  canvasHeight: number,
  marginMm: number,
  designDpi: number,
): { x: number; y: number } {
  const marginPx = getCanvasMarginPx(marginMm, designDpi);
  const bounds = getItemAxisAlignedBounds(item, { x: 0, y: 0 });
  const offsetX = marginPx - bounds.minX;
  const offsetY = marginPx - bounds.minY;
  return clampItemPosition(
    item,
    canvasWidth,
    canvasHeight,
    marginMm,
    designDpi,
    { x: offsetX, y: offsetY },
  );
}
