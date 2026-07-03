export {
  CanvasDesigner,
  type CanvasDesignerHandle,
  type CanvasDesignerProps,
  type DuplicateFillHandleOptions,
  type ImageSourceFromUrl,
  type LayoutLoadInput,
  type SetSelectedSizeOptions,
} from "./CanvasDesigner";
export type { AutoArrangeOptions } from "./autoArrange";
export {
  verifyItemOverlaps,
  type OverlapVerifyItem,
} from "./overlapVerifier";
export {
  buildDuplicatesToFit,
  buildGroupDuplicatesToFit,
  getAdjacentCopyPosition,
  type DuplicateFillDirection,
  type DuplicateFillOptions,
  type DuplicateFillResult,
} from "./duplicateFill";
export {
  DEFAULT_MIN_RESIZE_SIZE_MM,
  getMinResizeDimensionsPx,
  getMinResizeScale,
} from "./resizeConstraints";
export {
  canItemFitInCanvasMargin,
  clampItemPosition,
  clampItemToCanvasMargin,
  fitItemToCanvasArea,
  getCanvasMarginPx,
  getDefaultPlacementPosition,
  getItemAxisAlignedBounds,
  prepareItemForCanvasPlacement,
} from "./canvasMargin";
export type {
  FormatSelectionDimensions,
  SelectionDimensionsResult,
} from "./selectionDimensions";
export type { SetSelectedSizeInput } from "./manualResize";
export { computeScaleFromUnitDimensions } from "./manualResize";
export {
  applyTransformerAnchorHitArea,
  CANVAS_INTERACTION_STYLE,
  getTransformerTouchProfile,
  isCoarsePointerDevice,
  type TransformerTouchProfile,
} from "./transformerTouch";
export type {
  CanvasLayoutAsset,
  CanvasLayoutExport,
} from "./types";
export type {
  OverlapVerifyOptions,
  OverlapVerifyResult,
} from "@jeffgo10/shared-types";
export {
  canvasPixelsToUnit,
  formatCanvasDimensions,
  mmToCanvasPixels,
  unitToCanvasPixels,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_DPI,
  PRINT_DPI,
  getPrintDimensions,
  type DimensionUnit,
  type CanvasSizeOptions,
} from "@jeffgo10/shared-types";
