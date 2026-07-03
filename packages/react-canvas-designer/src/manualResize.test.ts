import { CANVAS_DPI } from "@jeffgo10/shared-types";
import { computeScaleFromUnitDimensions } from "./manualResize";
import { DEFAULT_MIN_RESIZE_SIZE_MM } from "./resizeConstraints";

const baseInput = {
  localWidth: 72,
  localHeight: 80,
  currentScaleX: 1,
  currentScaleY: 1,
  unit: "mm" as const,
  dpi: CANVAS_DPI,
  minResizeSizeMm: DEFAULT_MIN_RESIZE_SIZE_MM,
};

describe("computeScaleFromUnitDimensions", () => {
  it("returns null when neither width nor height is provided", () => {
    expect(computeScaleFromUnitDimensions(baseInput)).toBeNull();
  });

  it("returns null for non-positive values", () => {
    expect(
      computeScaleFromUnitDimensions({ ...baseInput, width: 0 }),
    ).toBeNull();
    expect(
      computeScaleFromUnitDimensions({ ...baseInput, height: -5 }),
    ).toBeNull();
  });

  it("scales width and height proportionally when only width is set", () => {
    const result = computeScaleFromUnitDimensions({
      ...baseInput,
      width: 50.8,
    });
    expect(result).not.toBeNull();
    expect(result!.scaleX).toBeCloseTo(2, 5);
    expect(result!.scaleY).toBeCloseTo(2, 5);
  });

  it("scales width and height proportionally when only height is set", () => {
    const currentHeightMm = (80 / CANVAS_DPI) * 25.4;
    const result = computeScaleFromUnitDimensions({
      ...baseInput,
      height: currentHeightMm * 2,
    });
    expect(result).not.toBeNull();
    expect(result!.scaleX).toBeCloseTo(2, 5);
    expect(result!.scaleY).toBeCloseTo(2, 5);
  });

  it("allows independent axes when aspect ratio is unlocked", () => {
    const result = computeScaleFromUnitDimensions({
      ...baseInput,
      width: 50.8,
      height: 25.4,
      lockAspectRatio: false,
    });
    expect(result).not.toBeNull();
    expect(result!.scaleX).toBeCloseTo(2, 5);
    expect(result!.scaleY).toBeCloseTo(0.9, 5);
  });

  it("clamps to minimum resize size", () => {
    const result = computeScaleFromUnitDimensions({
      ...baseInput,
      width: 1,
    });
    expect(result).not.toBeNull();
    const minSidePx = Math.min(
      baseInput.localWidth * Math.abs(result!.scaleX),
      baseInput.localHeight * Math.abs(result!.scaleY),
    );
    expect(minSidePx).toBeGreaterThanOrEqual(
      (DEFAULT_MIN_RESIZE_SIZE_MM / 25.4) * CANVAS_DPI - 1e-6,
    );
  });
});
