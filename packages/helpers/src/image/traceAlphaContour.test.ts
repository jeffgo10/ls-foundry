import {
  dilateBinaryMask,
  normalizeCutLinePoints,
  refineClosedContour,
  splitCutLineContours,
  traceAlphaContour,
  walkAllContours,
  walkAllHoleContours,
} from "./traceAlphaContour";

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

describe("splitCutLineContours / normalizeCutLinePoints", () => {
  it("splits NaN-separated contours", () => {
    const points = [
      0, 0, 10, 0, 10, 10, 0, 10, NaN, NaN, 20, 20, 30, 20, 30, 30, 20, 30,
    ];
    expect(splitCutLineContours(points)).toEqual([
      [0, 0, 10, 0, 10, 10, 0, 10],
      [20, 20, 30, 20, 30, 30, 20, 30],
    ]);
  });

  it("returns a single contour when there is no separator", () => {
    expect(splitCutLineContours([0, 0, 1, 0, 1, 1, 0, 1])).toEqual([
      [0, 0, 1, 0, 1, 1, 0, 1],
    ]);
  });

  it("rehydrates null separators from JSON", () => {
    const parsed = JSON.parse(
      JSON.stringify([
        0, 0, 1, 0, 1, 1, 0, 1, NaN, NaN, 2, 2, 3, 2, 3, 3, 2, 3,
      ]),
    ) as Array<number | null>;
    const normalized = normalizeCutLinePoints(parsed);
    expect(splitCutLineContours(normalized)).toHaveLength(2);
  });
});

describe("refineClosedContour", () => {
  it("Chaikin passes increase vertex count and round a sharp square", () => {
    const square: Array<[number, number]> = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    const refined = refineClosedContour(square, {
      simplifyTolerance: 0,
      smoothIterations: 2,
    });
    // 4 → 8 → 16 vertices
    expect(refined.length).toBe(16);
    // Corners are no longer exactly on the original square vertices
    expect(refined.some(([x, y]) => x === 0 && y === 0)).toBe(false);
    // Still roughly centered on the square
    const cx =
      refined.reduce((sum, [x]) => sum + x, 0) / refined.length;
    const cy =
      refined.reduce((sum, [, y]) => sum + y, 0) / refined.length;
    expect(cx).toBeGreaterThan(4);
    expect(cx).toBeLessThan(6);
    expect(cy).toBeGreaterThan(4);
    expect(cy).toBeLessThan(6);
  });

  it("skips Chaikin when smoothIterations is 0", () => {
    const square: Array<[number, number]> = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    expect(
      refineClosedContour(square, {
        simplifyTolerance: 0,
        smoothIterations: 0,
      }),
    ).toEqual(square);
  });
});

describe("walkAllHoleContours", () => {
  it("traces an enclosed transparent hole inside an opaque ring", () => {
    // 9×9 ring: outer border opaque, center 3×3 transparent.
    const w = 9;
    const isOpaque = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= w || y >= w) return false;
      if (x >= 3 && x <= 5 && y >= 3 && y <= 5) return false;
      return true;
    };

    const holes = walkAllHoleContours(isOpaque, w, w);
    expect(holes.length).toBe(1);
    expect(holes[0]!.length).toBeGreaterThanOrEqual(3);

    const all = walkAllContours(isOpaque, w, w, { includeHoles: true });
    expect(all.length).toBe(2);
  });

  it("ignores exterior transparent regions", () => {
    // Solid block in the middle — exterior transparent is not a hole.
    const w = 9;
    const isOpaque = (x: number, y: number) =>
      x >= 3 && x <= 5 && y >= 3 && y <= 5;
    expect(walkAllHoleContours(isOpaque, w, w)).toEqual([]);
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
    expect(splitCutLineContours(contour)).toHaveLength(1);
    restore();
  });

  it("traces every disconnected opaque island", () => {
    // Two separate blobs: a small square near the top and a larger one below —
    // mirrors multi-asset PNGs (e.g. star above a crest).
    const restore = mockCanvasContext(
      20,
      20,
      buildAlphaGrid(20, 20, (x, y) => {
        if (x >= 8 && x <= 11 && y >= 1 && y <= 4) return 255;
        if (x >= 4 && x <= 15 && y >= 10 && y <= 18) return 255;
        return 0;
      }),
    );
    const contour = traceAlphaContour(image, 20, 20, { simplifyTolerance: 0 });
    const parts = splitCutLineContours(contour);
    expect(parts).toHaveLength(2);

    const centers = parts.map((pts) => {
      const xs = pts.filter((_, i) => i % 2 === 0);
      const ys = pts.filter((_, i) => i % 2 === 1);
      return {
        x: (Math.min(...xs) + Math.max(...xs)) / 2,
        y: (Math.min(...ys) + Math.max(...ys)) / 2,
      };
    });
    centers.sort((a, b) => a.y - b.y);
    expect(centers[0]!.y).toBeLessThan(8);
    expect(centers[1]!.y).toBeGreaterThan(8);
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
      const xs = pts.filter((_, i) => i % 2 === 0 && Number.isFinite(pts[i]!));
      const ys = pts.filter((_, i) => i % 2 === 1 && Number.isFinite(pts[i]!));
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
