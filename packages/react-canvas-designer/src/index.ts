export {
  CanvasDesigner,
  type CanvasDesignerHandle,
  type CanvasDesignerProps,
  type ImageSourceFromUrl,
  type LayoutLoadInput,
} from "./CanvasDesigner";
export type { AutoArrangeOptions } from "./autoArrange";
export {
  DEFAULT_MIN_RESIZE_SIZE_MM,
  getMinResizeDimensionsPx,
  getMinResizeScale,
} from "./resizeConstraints";
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
