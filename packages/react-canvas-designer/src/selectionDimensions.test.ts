import { CANVAS_DPI } from "@jeffgo10/shared-types";
import {
  formatDimensionAxisValue,
  getSelectionDimensions,
} from "./selectionDimensions";

describe("selectionDimensions", () => {
  describe("formatDimensionAxisValue", () => {
    it("formats value with unit", () => {
      expect(formatDimensionAxisValue(12.345, "mm", 1)).toBe("12.3 mm");
    });
  });

  describe("getSelectionDimensions", () => {
    it("computes physical dimensions and default label", () => {
      const result = getSelectionDimensions(72, 144, "mm", CANVAS_DPI, 1);
      expect(result.width).toBeCloseTo(25.4);
      expect(result.height).toBeCloseTo(50.8);
      expect(result.label).toContain("mm");
      expect(result.widthPx).toBe(72);
    });

    it("uses custom formatter when provided", () => {
      const result = getSelectionDimensions(72, 72, "in", CANVAS_DPI, 2, () => "custom");
      expect(result.label).toBe("custom");
    });

    it("supports cm unit", () => {
      const result = getSelectionDimensions(72, 72, "cm", CANVAS_DPI, 1);
      expect(result.width).toBeCloseTo(2.54);
    });
  });
});
