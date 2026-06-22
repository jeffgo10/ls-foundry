import {
  CANVAS_DPI,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DPI_SCALE,
  PRINT_DPI,
  PRINT_HEIGHT,
  PRINT_WIDTH,
  canvasPixelsToUnit,
  createEmptyLayout,
  formatCanvasDimensions,
  getDesignDpi,
  getLayoutDpiScale,
  getPrintDimensions,
  getPrintDpi,
  isCanvasLayout,
  mmToCanvasPixels,
} from "./index";

describe("@jeffgo10/shared-types", () => {
  it("exports A4 canvas and print constants", () => {
    expect(CANVAS_DPI).toBe(72);
    expect(CANVAS_WIDTH).toBe(595);
    expect(CANVAS_HEIGHT).toBe(842);
    expect(PRINT_DPI).toBe(300);
    expect(PRINT_WIDTH).toBe(2481);
    expect(PRINT_HEIGHT).toBe(3507);
    expect(DPI_SCALE).toBeCloseTo(PRINT_DPI / CANVAS_DPI);
  });

  describe("mmToCanvasPixels", () => {
    it("converts millimeters at default DPI", () => {
      expect(mmToCanvasPixels(25.4)).toBeCloseTo(72);
      expect(mmToCanvasPixels(10, 72)).toBeCloseTo(28.346, 2);
    });
  });

  describe("canvasPixelsToUnit", () => {
    it("converts to mm, cm, and inches", () => {
      expect(canvasPixelsToUnit(72, "mm")).toBeCloseTo(25.4);
      expect(canvasPixelsToUnit(72, "cm")).toBeCloseTo(2.54);
      expect(canvasPixelsToUnit(72, "in")).toBeCloseTo(1);
    });
  });

  describe("formatCanvasDimensions", () => {
    it("formats width and height with unit", () => {
      expect(formatCanvasDimensions(72, 144, "mm", 72, 1)).toBe(
        "25.4 × 50.8 mm",
      );
    });
  });

  describe("getDesignDpi / getPrintDpi", () => {
    it("returns layout values or fallbacks", () => {
      expect(getDesignDpi({})).toBe(CANVAS_DPI);
      expect(getDesignDpi({ designDpi: 96 })).toBe(96);
      expect(getPrintDpi({})).toBe(PRINT_DPI);
      expect(getPrintDpi({ printDpi: 600 })).toBe(600);
    });
  });

  describe("getLayoutDpiScale", () => {
    it("computes print/design ratio", () => {
      expect(getLayoutDpiScale({})).toBeCloseTo(DPI_SCALE);
      expect(getLayoutDpiScale({ designDpi: 72, printDpi: 144 })).toBe(2);
    });
  });

  describe("getPrintDimensions", () => {
    it("scales canvas size to print pixels", () => {
      const dims = getPrintDimensions({
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
      });
      expect(dims.width).toBe(Math.round(CANVAS_WIDTH * DPI_SCALE));
      expect(dims.height).toBe(Math.round(CANVAS_HEIGHT * DPI_SCALE));
    });
  });

  describe("createEmptyLayout", () => {
    it("creates default A4 layout", () => {
      const layout = createEmptyLayout();
      expect(layout.version).toBe(1);
      expect(layout.canvasWidth).toBe(CANVAS_WIDTH);
      expect(layout.canvasHeight).toBe(CANVAS_HEIGHT);
      expect(layout.designDpi).toBe(CANVAS_DPI);
      expect(layout.printDpi).toBe(PRINT_DPI);
      expect(layout.items).toEqual([]);
    });

    it("accepts custom canvas options", () => {
      const layout = createEmptyLayout({
        canvasWidth: 100,
        canvasHeight: 200,
        designDpi: 96,
        printDpi: 300,
      });
      expect(layout.canvasWidth).toBe(100);
      expect(layout.designDpi).toBe(96);
    });
  });

  describe("isCanvasLayout", () => {
    const valid = createEmptyLayout();

    it("accepts a valid layout", () => {
      expect(isCanvasLayout(valid)).toBe(true);
      expect(
        isCanvasLayout({
          ...valid,
          items: [
            {
              instanceId: "a",
              assetId: "asset-1",
              x: 0,
              y: 0,
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
            },
          ],
        }),
      ).toBe(true);
    });

    it("rejects invalid values", () => {
      expect(isCanvasLayout(null)).toBe(false);
      expect(isCanvasLayout({ version: 2 })).toBe(false);
      expect(isCanvasLayout({ ...valid, canvasWidth: -1 })).toBe(false);
      expect(isCanvasLayout({ ...valid, designDpi: 0 })).toBe(false);
      expect(isCanvasLayout({ ...valid, printDpi: -5 })).toBe(false);
      expect(isCanvasLayout({ ...valid, items: "nope" })).toBe(false);
      expect(
        isCanvasLayout({
          ...valid,
          items: [{ instanceId: 123, assetId: "x", x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }],
        }),
      ).toBe(false);
    });
  });
});
