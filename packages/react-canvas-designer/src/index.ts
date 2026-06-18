export {
  CanvasDesigner,
  type CanvasDesignerHandle,
  type CanvasDesignerProps,
  type ImageSourceFromUrl,
  type LayoutLoadInput,
} from "./CanvasDesigner";
export type { AutoArrangeOptions } from "./autoArrange";
export type {
  FormatSelectionDimensions,
  SelectionDimensionsResult,
} from "./selectionDimensions";
export type {
  CanvasLayoutAsset,
  CanvasLayoutExport,
} from "./types";
export {
  canvasPixelsToUnit,
  formatCanvasDimensions,
  mmToCanvasPixels,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_DPI,
  PRINT_DPI,
  getPrintDimensions,
  type DimensionUnit,
  type CanvasSizeOptions,
} from "@jeffgo10/shared-types";
