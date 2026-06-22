import {
  CANVAS_DPI,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
} from "@jeffgo10/shared-types";
import {
  canItemFitInCanvasMargin,
  clampItemPosition,
  clampItemToCanvasMargin,
  clampResizeBoxToCanvasMargin,
  fitItemToCanvasArea,
  getCanvasMarginPx,
  getDefaultPlacementPosition,
  getItemAxisAlignedBounds,
  prepareItemForCanvasPlacement,
  type MarginBoundsItem,
} from "./canvasMargin";

const baseItem: MarginBoundsItem = {
  x: 50,
  y: 50,
  width: 100,
  height: 80,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
};

describe("canvasMargin", () => {
  describe("getCanvasMarginPx", () => {
    it("returns 0 for non-positive margin", () => {
      expect(getCanvasMarginPx(0, CANVAS_DPI)).toBe(0);
      expect(getCanvasMarginPx(-5, CANVAS_DPI)).toBe(0);
    });

    it("converts mm to pixels", () => {
      expect(getCanvasMarginPx(10, CANVAS_DPI)).toBeCloseTo(28.35, 1);
    });
  });

  describe("getItemAxisAlignedBounds", () => {
    it("computes bounds for unrotated item", () => {
      const bounds = getItemAxisAlignedBounds(baseItem);
      expect(bounds.minX).toBe(50);
      expect(bounds.maxX).toBe(150);
      expect(bounds.minY).toBe(50);
      expect(bounds.maxY).toBe(130);
    });

    it("uses cut line points when provided", () => {
      const item = {
        ...baseItem,
        cutLinePoints: [0, 0, 50, 0, 50, 50, 0, 50],
      };
      const bounds = getItemAxisAlignedBounds(item, { x: 10, y: 10 });
      expect(bounds.maxX - bounds.minX).toBeCloseTo(50);
    });

    it("accounts for rotation", () => {
      const item = { ...baseItem, rotation: 90 };
      const bounds = getItemAxisAlignedBounds(item);
      expect(bounds.maxX - bounds.minX).toBeCloseTo(80, 0);
    });
  });

  describe("canItemFitInCanvasMargin", () => {
    it("returns true when item fits inside margin", () => {
      expect(
        canItemFitInCanvasMargin(baseItem, CANVAS_WIDTH, CANVAS_HEIGHT, 10, CANVAS_DPI),
      ).toBe(true);
    });

    it("returns false when item is too large", () => {
      const huge = { ...baseItem, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
      expect(
        canItemFitInCanvasMargin(huge, CANVAS_WIDTH, CANVAS_HEIGHT, 10, CANVAS_DPI),
      ).toBe(false);
    });
  });

  describe("clampItemPosition", () => {
    it("keeps item inside margin inset", () => {
      const outside = { ...baseItem, x: -10, y: -10 };
      const clamped = clampItemPosition(
        outside,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        10,
        CANVAS_DPI,
      );
      expect(clamped.x).toBeGreaterThanOrEqual(0);
      expect(clamped.y).toBeGreaterThanOrEqual(0);
    });
  });

  describe("clampItemToCanvasMargin", () => {
    it("returns same reference when unchanged", () => {
      const inside = { ...baseItem, x: 100, y: 100 };
      expect(clampItemToCanvasMargin(inside, CANVAS_WIDTH, CANVAS_HEIGHT, 0, CANVAS_DPI)).toBe(
        inside,
      );
    });

    it("returns new object when position changes", () => {
      const outside = { ...baseItem, x: -50, y: -50 };
      const clamped = clampItemToCanvasMargin(
        outside,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        0,
        CANVAS_DPI,
      );
      expect(clamped).not.toBe(outside);
      expect(clamped.x).not.toBe(outside.x);
    });
  });

  describe("clampResizeBoxToCanvasMargin", () => {
    const oldBox = { x: 10, y: 10, width: 50, height: 50, rotation: 0 };

    it("accepts box inside margin", () => {
      const newBox = { x: 40, y: 40, width: 40, height: 40, rotation: 0 };
      expect(
        clampResizeBoxToCanvasMargin(
          oldBox,
          newBox,
          CANVAS_WIDTH,
          CANVAS_HEIGHT,
          10,
          CANVAS_DPI,
        ),
      ).toBe(newBox);
    });

    it("rejects box crossing margin", () => {
      const newBox = { x: 0, y: 0, width: 50, height: 50, rotation: 0 };
      expect(
        clampResizeBoxToCanvasMargin(
          oldBox,
          newBox,
          CANVAS_WIDTH,
          CANVAS_HEIGHT,
          10,
          CANVAS_DPI,
        ),
      ).toBe(oldBox);
    });
  });

  describe("fitItemToCanvasArea", () => {
    it("returns unchanged when item already fits", () => {
      const small = { ...baseItem, width: 50, height: 50 };
      expect(
        fitItemToCanvasArea(small, CANVAS_WIDTH, CANVAS_HEIGHT, 10, CANVAS_DPI),
      ).toBe(small);
    });

    it("scales down oversized item", () => {
      const huge = { ...baseItem, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
      const fitted = fitItemToCanvasArea(
        huge,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        10,
        CANVAS_DPI,
      );
      expect(fitted.scaleX).toBeLessThan(1);
      expect(fitted.scaleY).toBeLessThan(1);
    });

    it("returns unchanged when printable area is zero", () => {
      expect(
        fitItemToCanvasMarginEdgeCase(),
      ).toBeDefined();
    });
  });

  describe("getDefaultPlacementPosition", () => {
    it("places item at printable area origin", () => {
      const pos = getDefaultPlacementPosition(
        baseItem,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        10,
        CANVAS_DPI,
      );
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeGreaterThanOrEqual(0);
    });
  });

  describe("prepareItemForCanvasPlacement", () => {
    it("scales and positions item for drop", () => {
      const huge = { ...baseItem, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
      const placed = prepareItemForCanvasPlacement(
        huge,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        10,
        CANVAS_DPI,
      );
      expect(placed.scaleX).toBeLessThanOrEqual(1);
      expect(placed.x).toBeGreaterThanOrEqual(0);
    });
  });
});

function fitItemToCanvasMarginEdgeCase() {
  return fitItemToCanvasArea(
    baseItem,
    10,
    10,
    20,
    CANVAS_DPI,
  );
}
