import { CANVAS_DPI } from "@jeffgo10/shared-types";
import {
  clampNodeScale,
  clampResizeBox,
  constrainMultiSelectBoundBox,
  DEFAULT_MIN_RESIZE_SIZE_MM,
  getMinResizeDimensionsPx,
  getMinResizeScale,
  isMultiSelectResizeRatioAllowed,
} from "./resizeConstraints";

describe("resizeConstraints", () => {
  it("exports default minimum resize size", () => {
    expect(DEFAULT_MIN_RESIZE_SIZE_MM).toBe(25.4);
  });

  describe("getMinResizeScale", () => {
    it("computes scale for shorter side minimum", () => {
      const scale = getMinResizeScale(200, 100, 25.4, CANVAS_DPI);
      expect(scale).toBeGreaterThan(0);
      expect(100 * scale).toBeGreaterThanOrEqual(
        (25.4 / 25.4) * CANVAS_DPI * (25.4 / 25.4) / CANVAS_DPI * 25.4 / 25.4 * CANVAS_DPI,
      );
    });
  });

  describe("getMinResizeDimensionsPx", () => {
    it("preserves aspect ratio", () => {
      const dims = getMinResizeDimensionsPx(200, 100, 25.4, CANVAS_DPI);
      expect(dims.minWidthPx / dims.minHeightPx).toBeCloseTo(2);
    });
  });

  describe("clampResizeBox", () => {
    const oldBox = { x: 0, y: 0, width: 100, height: 50, rotation: 0 };

    it("accepts box above minimum", () => {
      const newBox = { x: 0, y: 0, width: 120, height: 60, rotation: 0 };
      expect(clampResizeBox(oldBox, newBox, 50, 30)).toBe(newBox);
    });

    it("rejects box below minimum", () => {
      const newBox = { x: 0, y: 0, width: 10, height: 5, rotation: 0 };
      expect(clampResizeBox(oldBox, newBox, 50, 30)).toBe(oldBox);
    });
  });

  describe("constrainMultiSelectBoundBox", () => {
    const oldBox = { x: 0, y: 0, width: 200, height: 100, rotation: 0 };

    it("allows rotation even when the axis-aligned width shrinks", () => {
      const newBox = { x: 10, y: 10, width: 120, height: 180, rotation: 45 };
      expect(
        constrainMultiSelectBoundBox(
          oldBox,
          newBox,
          [{ width: 100, height: 80, scaleX: 1, scaleY: 1 }],
          25.4,
          CANVAS_DPI,
        ),
      ).toBe(newBox);
    });

    it("allows pure translation", () => {
      const newBox = { x: 30, y: 20, width: 200, height: 100, rotation: 0 };
      expect(
        constrainMultiSelectBoundBox(
          oldBox,
          newBox,
          [{ width: 100, height: 80, scaleX: 1, scaleY: 1 }],
          25.4,
          CANVAS_DPI,
        ),
      ).toBe(newBox);
    });

    it("rejects scale shrink below minimum", () => {
      const newBox = { x: 0, y: 0, width: 20, height: 10, rotation: 0 };
      expect(
        constrainMultiSelectBoundBox(
          oldBox,
          newBox,
          [{ width: 100, height: 100, scaleX: 0.05, scaleY: 0.05 }],
          25.4,
          CANVAS_DPI,
        ),
      ).toBe(oldBox);
    });
  });

  describe("isMultiSelectResizeRatioAllowed", () => {
    it("allows growth", () => {
      expect(
        isMultiSelectResizeRatioAllowed(
          [{ width: 100, height: 100, scaleX: 1, scaleY: 1 }],
          25.4,
          CANVAS_DPI,
          1.5,
        ),
      ).toBe(true);
    });

    it("rejects shrink below minimum for any item", () => {
      expect(
        isMultiSelectResizeRatioAllowed(
          [{ width: 100, height: 100, scaleX: 0.05, scaleY: 0.05 }],
          25.4,
          CANVAS_DPI,
          0.5,
        ),
      ).toBe(false);
    });

    it("allows moderate shrink when all items stay above minimum", () => {
      expect(
        isMultiSelectResizeRatioAllowed(
          [{ width: 200, height: 200, scaleX: 2, scaleY: 2 }],
          25.4,
          CANVAS_DPI,
          0.9,
        ),
      ).toBe(true);
    });
  });

  describe("clampNodeScale", () => {
    it("returns unchanged scale when above minimum", () => {
      expect(clampNodeScale(2, 2, 100, 100, 25.4, CANVAS_DPI)).toEqual({
        scaleX: 2,
        scaleY: 2,
      });
    });

    it("clamps scale while preserving sign", () => {
      const clamped = clampNodeScale(-0.01, -0.01, 100, 200, 25.4, CANVAS_DPI);
      expect(clamped.scaleX).toBeLessThan(0);
      expect(clamped.scaleY).toBeLessThan(0);
      expect(Math.abs(clamped.scaleX)).toBeGreaterThan(0.01);
    });
  });
});
