import { CANVAS_DPI } from "@jeffgo10/shared-types";
import {
  clampNodeScale,
  clampResizeBox,
  DEFAULT_MIN_RESIZE_SIZE_MM,
  getMinResizeDimensionsPx,
  getMinResizeScale,
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
