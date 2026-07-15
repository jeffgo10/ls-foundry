import { dilateBinaryMask, traceAlphaContour } from "./traceAlphaContour";

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

function mockCanvasContext(
  sampleWidth: number,
  sampleHeight: number,
  alphaData: Uint8ClampedArray,
) {
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

describe("dilateBinaryMask", () => {
  it("expands a single pixel into a disk", () => {
    const mask = new Uint8Array(7 * 7);
    mask[3 * 7 + 3] = 1;
    const dilated = dilateBinaryMask(mask, 7, 7, 2);
    expect(dilated[3 * 7 + 3]).toBe(1);
    expect(dilated[3 * 7 + 5]).toBe(1);
    expect(dilated[1 * 7 + 3]).toBe(1);
    // Corner of 2px box is outside radius-2 circle (~2.8)
    expect(dilated[1 * 7 + 1]).toBe(0);
  });

  it("returns a copy when radius is 0", () => {
    const mask = new Uint8Array([1, 0, 0, 1]);
    const copy = dilateBinaryMask(mask, 2, 2, 0);
    expect(copy).toEqual(mask);
    expect(copy).not.toBe(mask);
  });
});

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
    const simplified = traceAlphaContour(image, 10, 10, {
      simplifyTolerance: 5,
    });
    expect(simplified.length).toBeLessThanOrEqual(detailed.length);
    restore();
  });

  it("returns empty when canvas context is unavailable", () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = () => null;
    expect(traceAlphaContour(image, 10, 10)).toEqual([]);
    HTMLCanvasElement.prototype.getContext = original;
  });

  it("expandPx grows the contour AABB without self-crossing valley spikes", () => {
    const restore = mockCanvasContext(
      20,
      20,
      buildAlphaGrid(20, 20, (x, y) => {
        if (x >= 5 && x <= 14 && y >= 5 && y <= 14) return 255;
        return 0;
      }),
    );
    const tight = traceAlphaContour(image, 20, 20);
    const expanded = traceAlphaContour(image, 20, 20, { expandPx: 3 });
    restore();

    const bounds = (pts: number[]) => {
      const xs = pts.filter((_, i) => i % 2 === 0);
      const ys = pts.filter((_, i) => i % 2 === 1);
      return {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      };
    };

    const tightB = bounds(tight);
    const expandedB = bounds(expanded);
    expect(expandedB.minX).toBeLessThan(tightB.minX);
    expect(expandedB.maxX).toBeGreaterThan(tightB.maxX);
    expect(expandedB.minY).toBeLessThan(tightB.minY);
    expect(expandedB.maxY).toBeGreaterThan(tightB.maxY);

    // Outer walk of a dilated solid should not revisit intermediate vertices
    // enough to look like polyline miter loops (length stays moderate).
    expect(expanded.length).toBeLessThan(tight.length * 4);
  });
});
