import {
  CANVAS_DPI,
  canvasPixelsToUnit,
  formatCanvasDimensions,
  type DimensionUnit,
} from "@jeffgo10/shared-types";

export type { DimensionUnit } from "@jeffgo10/shared-types";

export type SelectionDimensionsInput = {
  widthPx: number;
  heightPx: number;
  unit: DimensionUnit;
  dpi: number;
};

export type SelectionDimensionsResult = SelectionDimensionsInput & {
  width: number;
  height: number;
  label: string;
};

export type FormatSelectionDimensions = (
  input: SelectionDimensionsInput,
) => string;

export function formatDimensionAxisValue(
  value: number,
  unit: DimensionUnit,
  decimalPlaces: number,
): string {
  return `${value.toFixed(decimalPlaces)} ${unit}`;
}

export function getSelectionDimensions(
  widthPx: number,
  heightPx: number,
  unit: DimensionUnit,
  dpi: number,
  decimalPlaces: number,
  format?: FormatSelectionDimensions,
): SelectionDimensionsResult {
  const width = canvasPixelsToUnit(widthPx, unit, dpi);
  const height = canvasPixelsToUnit(heightPx, unit, dpi);
  const label = format
    ? format({ widthPx, heightPx, unit, dpi })
    : formatCanvasDimensions(widthPx, heightPx, unit, dpi, decimalPlaces);

  return { widthPx, heightPx, unit, dpi, width, height, label };
}

export const DEFAULT_DIMENSION_DPI = CANVAS_DPI;
