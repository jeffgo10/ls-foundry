import { traceAlphaContour } from "./traceAlphaContour";

function buildAlphaGrid(
  width: number,
  height: number,
  alphaFn: (x: number, y: number) => number,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      data[i + 3] = alphaFn(x, y);
    }
  }
  return data;
}

function mockCanvasContext(sampleWidth: number, sampleHeight: number, alphaData: Uint8ClampedArray) {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function getContext(type) {
    if (type !== "2d") {
      return original.call(this, type);
    }
    return {
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({
        data: alphaData,
        width: sampleWidth,
        height: sampleHeight,
      })),
    } as unknown as CanvasRenderingContext2D;
  };
  return () => {
    HTMLCanvasElement.prototype.getContext = original;
  };
}

describe("traceAlphaContour", () => {
  const image = {
    naturalWidth: 20,
    naturalHeight: 20,
  } as HTMLImageElement;

  it("returns empty array for fully transparent image", () => {
    const restore = mockCanvasContext(20, 20, buildAlphaGrid(20, 20, () => 0));
    expect(traceAlphaContour(image, 20, 20)).toEqual([]);
    restore();
  });

  it("traces a simple opaque rectangle", () => {
    const restore = mockCanvasContext(
      20,
      20,
      buildAlphaGrid(20, 20, (x, y) => {
        if (x >= 5 && x <= 14 && y >= 5 && y <= 14) return 255;
        return 0;
      }),
    );
    const contour = traceAlphaContour(image, 20, 20);
    expect(contour.length).toBeGreaterThanOrEqual(8);
    restore();
  });

  it("respects simplifyTolerance option", () => {
    const restore = mockCanvasContext(10, 10, buildAlphaGrid(10, 10, () => 255));
    const detailed = traceAlphaContour(image, 10, 10, { simplifyTolerance: 0 });
    const simplified = traceAlphaContour(image, 10, 10, { simplifyTolerance: 5 });
    expect(simplified.length).toBeLessThanOrEqual(detailed.length);
    restore();
  });

  it("returns empty when canvas context is unavailable", () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = () => null;
    expect(traceAlphaContour(image, 10, 10)).toEqual([]);
    HTMLCanvasElement.prototype.getContext = original;
  });
});
