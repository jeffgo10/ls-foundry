/** A4 portrait at 72 DPI — design-time canvas size. */
export const CANVAS_DPI = 72;
export const CANVAS_WIDTH = 595;
export const CANVAS_HEIGHT = 842;

/** A4 portrait at 300 DPI — print output size. */
export const PRINT_DPI = 300;
export const PRINT_WIDTH = 2481;
export const PRINT_HEIGHT = 3507;

export const DPI_SCALE = PRINT_DPI / CANVAS_DPI;

/** Convert millimeters to pixels at the design canvas DPI (72 by default). */
export function mmToCanvasPixels(mm: number, dpi: number = CANVAS_DPI): number {
  return (mm / 25.4) * dpi;
}

export type CanvasItem = {
  assetId: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};

export type CanvasLayout = {
  version: 1;
  canvasWidth: typeof CANVAS_WIDTH;
  canvasHeight: typeof CANVAS_HEIGHT;
  items: CanvasItem[];
};

/** Image payload attached to a layout export from the canvas designer. */
export type CanvasLayoutAsset = {
  assetId: string;
  mimeType: string;
  dataUrl: string;
};

export type CanvasLayoutExport = {
  layout: CanvasLayout;
  assets: CanvasLayoutAsset[];
};

export function createEmptyLayout(): CanvasLayout {
  return {
    version: 1,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    items: [],
  };
}

export function isCanvasLayout(value: unknown): value is CanvasLayout {
  if (!value || typeof value !== "object") return false;

  const layout = value as Partial<CanvasLayout>;
  if (layout.version !== 1) return false;
  if (layout.canvasWidth !== CANVAS_WIDTH) return false;
  if (layout.canvasHeight !== CANVAS_HEIGHT) return false;
  if (!Array.isArray(layout.items)) return false;

  return layout.items.every((item) => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<CanvasItem>;
    return (
      typeof candidate.assetId === "string" &&
      typeof candidate.x === "number" &&
      typeof candidate.y === "number" &&
      typeof candidate.scaleX === "number" &&
      typeof candidate.scaleY === "number" &&
      typeof candidate.rotation === "number"
    );
  });
}
