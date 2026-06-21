/** A4 portrait at 72 DPI — design-time canvas size. */
export const CANVAS_DPI = 72;
export const CANVAS_WIDTH = 595;
export const CANVAS_HEIGHT = 842;

/** A4 portrait at 300 DPI — print output size. */
export const PRINT_DPI = 300;
export const PRINT_WIDTH = 2481;
export const PRINT_HEIGHT = 3507;

export const DPI_SCALE = PRINT_DPI / CANVAS_DPI;

export type CanvasSizeOptions = {
  canvasWidth?: number;
  canvasHeight?: number;
  designDpi?: number;
  printDpi?: number;
};

/** Convert millimeters to pixels at the design canvas DPI (72 by default). */
export function mmToCanvasPixels(mm: number, dpi: number = CANVAS_DPI): number {
  return (mm / 25.4) * dpi;
}

export type DimensionUnit = "mm" | "cm" | "in";

/** Convert canvas pixels to a physical length at the given DPI. */
export function canvasPixelsToUnit(
  pixels: number,
  unit: DimensionUnit,
  dpi: number = CANVAS_DPI,
): number {
  const inches = pixels / dpi;
  if (unit === "in") return inches;
  if (unit === "cm") return (inches * 25.4) / 10;
  return inches * 25.4;
}

/** Format scaled canvas item width/height for display. */
export function formatCanvasDimensions(
  widthPx: number,
  heightPx: number,
  unit: DimensionUnit,
  dpi: number = CANVAS_DPI,
  decimalPlaces = 1,
): string {
  const width = canvasPixelsToUnit(widthPx, unit, dpi);
  const height = canvasPixelsToUnit(heightPx, unit, dpi);
  const fixed = (value: number) => value.toFixed(decimalPlaces);
  return `${fixed(width)} × ${fixed(height)} ${unit}`;
}

export type CanvasItem = {
  /** Unique per sticker on the canvas — selection, transforms, React keys. */
  instanceId: string;
  /** Library / S3 asset reference shared by duplicate placements. */
  assetId: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};

export type CanvasLayout = {
  version: 1;
  canvasWidth: number;
  canvasHeight: number;
  /** Design-time DPI when canvasWidth/Height were chosen. Defaults to 72. */
  designDpi?: number;
  /** Target print DPI for upscale. Defaults to 300. */
  printDpi?: number;
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

export function getDesignDpi(
  layout: Pick<CanvasLayout, "designDpi">,
  fallback: number = CANVAS_DPI,
): number {
  return layout.designDpi ?? fallback;
}

export function getPrintDpi(
  layout: Pick<CanvasLayout, "printDpi">,
  fallback: number = PRINT_DPI,
): number {
  return layout.printDpi ?? fallback;
}

/** Scale factor from design canvas pixels to print output pixels. */
export function getLayoutDpiScale(
  layout: Pick<CanvasLayout, "designDpi" | "printDpi">,
): number {
  return getPrintDpi(layout) / getDesignDpi(layout);
}

/** Print output dimensions in pixels derived from layout canvas size and DPI settings. */
export function getPrintDimensions(
  layout: Pick<CanvasLayout, "canvasWidth" | "canvasHeight" | "designDpi" | "printDpi">,
): { width: number; height: number } {
  const scale = getLayoutDpiScale(layout);
  return {
    width: Math.round(layout.canvasWidth * scale),
    height: Math.round(layout.canvasHeight * scale),
  };
}

export function createEmptyLayout(options: CanvasSizeOptions = {}): CanvasLayout {
  return {
    version: 1,
    canvasWidth: options.canvasWidth ?? CANVAS_WIDTH,
    canvasHeight: options.canvasHeight ?? CANVAS_HEIGHT,
    designDpi: options.designDpi ?? CANVAS_DPI,
    printDpi: options.printDpi ?? PRINT_DPI,
    items: [],
  };
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isCanvasLayout(value: unknown): value is CanvasLayout {
  if (!value || typeof value !== "object") return false;

  const layout = value as Partial<CanvasLayout>;
  if (layout.version !== 1) return false;
  if (!isPositiveNumber(layout.canvasWidth)) return false;
  if (!isPositiveNumber(layout.canvasHeight)) return false;
  if (layout.designDpi !== undefined && !isPositiveNumber(layout.designDpi)) {
    return false;
  }
  if (layout.printDpi !== undefined && !isPositiveNumber(layout.printDpi)) {
    return false;
  }
  if (!Array.isArray(layout.items)) return false;

  return layout.items.every((item) => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<CanvasItem>;
    return (
      typeof candidate.assetId === "string" &&
      (candidate.instanceId === undefined ||
        typeof candidate.instanceId === "string") &&
      typeof candidate.x === "number" &&
      typeof candidate.y === "number" &&
      typeof candidate.scaleX === "number" &&
      typeof candidate.scaleY === "number" &&
      typeof candidate.rotation === "number"
    );
  });
}
