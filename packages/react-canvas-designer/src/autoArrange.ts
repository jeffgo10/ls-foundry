import {
  CANVAS_DPI,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  mmToCanvasPixels,
  type CanvasItem,
} from "@jeffgo10/shared-types";
import { buildCutLinePoints, cutLineOffsetLocalPx } from "./cutLine";

export type AutoArrangeItem = CanvasItem & {
  src: string;
  mimeType: string;
  width: number;
  height: number;
  /** Cached alpha contour (already offset / baked when present). */
  cutLinePoints?: number[];
  /** When set (>0), `src` already includes a white offset pad — do not re-expand. */
  cutLineOffsetBakedMm?: number;
};

export type AutoArrangeOptions = {
  /** Minimum gap between cut-line outlines in millimeters. Default 5. */
  gapMm?: number;
  /** Restricted edge inset in millimeters (same as `canvasMarginMm` on the designer). Default 0. */
  canvasMarginMm?: number;
  /** Canvas width in pixels. Default A4 @ 72 DPI. */
  canvasWidth?: number;
  /** Canvas height in pixels. Default A4 @ 72 DPI. */
  canvasHeight?: number;
  /** Design DPI for mm→px gap conversion. Default 72. */
  designDpi?: number;
  /**
   * Outward cut-line pad in millimeters when re-tracing non-baked stickers
   * (Silhouette-style virtual contour). Ignored when `cutLinePoints` are
   * cached or when the sticker already has a baked white pad. Default **0** —
   * do not invent an offset when the user has not enabled cut-line offset.
   */
  cutLineOffsetMm?: number;
};

export type AutoArrangeResult = {
  items: AutoArrangeItem[];
  /** False when one or more items could not fit on the canvas. */
  allPlaced: boolean;
};

type Rect = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type PlacementBox = {
  paddedMinX: number;
  paddedMinY: number;
  paddedWidth: number;
  paddedHeight: number;
  area: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image for auto-arrange"));
    image.src = src;
  });
}

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

function contourBoundsAtOrigin(
  item: AutoArrangeItem,
  contour: number[],
  gapPx: number,
): PlacementBox {
  const halfGap = gapPx / 2;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const samplePoints =
    contour.length >= 4
      ? contour
      : [0, 0, item.width, 0, item.width, item.height, 0, item.height];

  for (let i = 0; i < samplePoints.length; i += 2) {
    const { x, y } = transformLocalPoint(
      samplePoints[i]!,
      samplePoints[i + 1]!,
      item.scaleX,
      item.scaleY,
      item.rotation,
      0,
      0,
    );
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  const paddedMinX = minX - halfGap;
  const paddedMinY = minY - halfGap;
  const paddedMaxX = maxX + halfGap;
  const paddedMaxY = maxY + halfGap;

  return {
    paddedMinX,
    paddedMinY,
    paddedWidth: paddedMaxX - paddedMinX,
    paddedHeight: paddedMaxY - paddedMinY,
    area: (paddedMaxX - paddedMinX) * (paddedMaxY - paddedMinY),
  };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

function groupPositionForPackOrigin(
  packX: number,
  packY: number,
  box: PlacementBox,
): { x: number; y: number } {
  return {
    x: packX - box.paddedMinX,
    y: packY - box.paddedMinY,
  };
}

function findPackPosition(
  box: PlacementBox,
  placed: Rect[],
  canvasWidth: number,
  canvasHeight: number,
  gapPx: number,
  canvasMarginPx: number,
): { x: number; y: number } | null {
  const margin = Math.max(gapPx / 2, canvasMarginPx);
  const step = Math.max(4, Math.floor(gapPx / 2));

  for (let packY = margin; packY + box.paddedHeight <= canvasHeight - margin; packY += step) {
    for (let packX = margin; packX + box.paddedWidth <= canvasWidth - margin; packX += step) {
      const candidate: Rect = {
        minX: packX,
        minY: packY,
        maxX: packX + box.paddedWidth,
        maxY: packY + box.paddedHeight,
      };

      if (placed.some((rect) => rectsOverlap(candidate, rect))) {
        continue;
      }

      return groupPositionForPackOrigin(packX, packY, box);
    }
  }

  return null;
}

/**
 * Pack stickers so alpha-contour cut lines do not overlap and stay at least
 * `gapMm` apart (measured between outlines, edge-to-edge).
 */
export async function autoArrangeItems(
  items: AutoArrangeItem[],
  options: AutoArrangeOptions = {},
): Promise<AutoArrangeResult> {
  if (items.length === 0) {
    return { items: [], allPlaced: true };
  }

  const gapMm = options.gapMm ?? 5;
  const canvasMarginMm = options.canvasMarginMm ?? 0;
  const canvasWidth = options.canvasWidth ?? CANVAS_WIDTH;
  const canvasHeight = options.canvasHeight ?? CANVAS_HEIGHT;
  const designDpi = options.designDpi ?? CANVAS_DPI;
  const cutLineOffsetMm = options.cutLineOffsetMm ?? 0;
  const gapPx = mmToCanvasPixels(gapMm, designDpi);
  const canvasMarginPx = mmToCanvasPixels(canvasMarginMm, designDpi);

  const prepared = await Promise.all(
    items.map(async (item) => {
      let contour = item.cutLinePoints;
      if (!contour || contour.length < 4) {
        const image = await loadImage(item.src);
        // Baked stickers already include the white pad in `src` — tight-trace only.
        // Non-baked stickers only dilate when the caller opts in via options.
        const alreadyBaked = (item.cutLineOffsetBakedMm ?? 0) > 0;
        const offsetLocalPx = alreadyBaked
          ? 0
          : cutLineOffsetLocalPx(
              cutLineOffsetMm,
              designDpi,
              item.scaleX,
              item.scaleY,
            );
        contour = buildCutLinePoints(
          image,
          item.width,
          item.height,
          offsetLocalPx,
        );
      }
      const box = contourBoundsAtOrigin(item, contour, gapPx);
      return { item, box };
    }),
  );

  prepared.sort((a, b) => b.box.area - a.box.area);

  const placedRects: Rect[] = [];
  const nextItems: AutoArrangeItem[] = [];
  let allPlaced = true;

  for (const { item, box } of prepared) {
    const position = findPackPosition(
      box,
      placedRects,
      canvasWidth,
      canvasHeight,
      gapPx,
      canvasMarginPx,
    );

    if (!position) {
      allPlaced = false;
      nextItems.push(item);
      continue;
    }

    placedRects.push({
      minX: position.x + box.paddedMinX,
      minY: position.y + box.paddedMinY,
      maxX: position.x + box.paddedMinX + box.paddedWidth,
      maxY: position.y + box.paddedMinY + box.paddedHeight,
    });

    nextItems.push({
      ...item,
      x: position.x,
      y: position.y,
    });
  }

  const order = new Map(items.map((item, index) => [item.instanceId, index]));
  nextItems.sort(
    (a, b) => (order.get(a.instanceId) ?? 0) - (order.get(b.instanceId) ?? 0),
  );

  return { items: nextItems, allPlaced };
}
