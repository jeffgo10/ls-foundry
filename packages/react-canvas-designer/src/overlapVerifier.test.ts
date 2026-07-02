import { CANVAS_DPI, mmToCanvasPixels } from "@jeffgo10/shared-types";
import {
  cutLinesViolateGap,
  getCutLineStagePolygon,
  pointInPolygon,
  pointSegmentDistance,
  polygonsMinDistance,
  segmentSegmentDistance,
} from "./cutLineGeometry";
import { verifyItemOverlaps, type OverlapVerifyItem } from "./overlapVerifier";

function makeItem(
  id: string,
  overrides: Partial<OverlapVerifyItem> = {},
): OverlapVerifyItem {
  return {
    instanceId: id,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    ...overrides,
  };
}

const smallSquareCutLine = [30, 30, 70, 30, 70, 70, 30, 70];
const mediumSquareCutLine = [20, 20, 80, 20, 80, 80, 20, 80];

describe("cutLineGeometry", () => {
  it("returns 0 when one polygon contains a vertex of the other", () => {
    const square = getCutLineStagePolygon(
      makeItem("a"),
      [0, 0, 40, 0, 40, 40, 0, 40],
    );
    const inner = getCutLineStagePolygon(
      makeItem("b", { x: 10, y: 10 }),
      [0, 0, 10, 0, 10, 10, 0, 10],
    );
    expect(polygonsMinDistance(square, inner)).toBe(0);
  });

  it("measures horizontal edge distance when y ranges overlap", () => {
    const gapPx = mmToCanvasPixels(5, CANVAS_DPI);
    const left = getCutLineStagePolygon(makeItem("a"), mediumSquareCutLine);
    const right = getCutLineStagePolygon(
      makeItem("b", { x: 80 + gapPx - 20, y: 45 }),
      mediumSquareCutLine,
    );
    expect(polygonsMinDistance(left, right)).toBeCloseTo(gapPx, 2);
  });

  it("detects point-in-polygon containment", () => {
    const square = getCutLineStagePolygon(makeItem("a"), mediumSquareCutLine);
    expect(pointInPolygon({ x: 50, y: 50 }, square)).toBe(true);
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(false);
  });

  it("measures point-to-segment distance", () => {
    expect(
      pointSegmentDistance(
        { x: 5, y: 5 },
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ),
    ).toBe(5);
  });

  it("measures parallel segment distance", () => {
    expect(
      segmentSegmentDistance(
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 0, y: 5 },
        { x: 10, y: 5 },
      ),
    ).toBe(5);
  });
});

describe("verifyItemOverlaps", () => {
  it("returns valid for fewer than two items", async () => {
    await expect(verifyItemOverlaps([])).resolves.toEqual({
      valid: true,
      overlappingIds: [],
      pairs: [],
    });
    await expect(verifyItemOverlaps([makeItem("a")])).resolves.toEqual({
      valid: true,
      overlappingIds: [],
      pairs: [],
    });
  });

  it("detects cut-line overlap", async () => {
    const result = await verifyItemOverlaps([
      makeItem("a", { x: 0, y: 0, cutLinePoints: smallSquareCutLine }),
      makeItem("b", { x: 35, y: 35, cutLinePoints: smallSquareCutLine }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.overlappingIds.sort()).toEqual(["a", "b"]);
    expect(result.pairs).toEqual([{ a: "a", b: "b" }]);
  });

  it("returns valid when cut lines are separated", async () => {
    const result = await verifyItemOverlaps([
      makeItem("a", { x: 0, y: 0, cutLinePoints: smallSquareCutLine }),
      makeItem("b", { x: 50, y: 0, cutLinePoints: smallSquareCutLine }),
    ]);
    expect(result).toEqual({
      valid: true,
      overlappingIds: [],
      pairs: [],
    });
  });

  it("approves side-by-side stickers with 5mm gap when the right one is lowered", async () => {
    const gapPx = mmToCanvasPixels(5, CANVAS_DPI);
    const itemA = makeItem("a", { x: 0, y: 0, cutLinePoints: mediumSquareCutLine });
    const itemB = makeItem("b", {
      x: 80 + gapPx - 20,
      y: 80,
      cutLinePoints: mediumSquareCutLine,
    });

    expect(cutLinesViolateGap(itemA, mediumSquareCutLine, itemB, mediumSquareCutLine, gapPx)).toBe(
      false,
    );

    const result = await verifyItemOverlaps([itemA, itemB], {
      minGapMm: 5,
      designDpi: CANVAS_DPI,
    });
    expect(result.valid).toBe(true);
  });

  it("approves lowered sticker that keeps 5mm horizontal gap with overlapping y bands", async () => {
    const gapPx = mmToCanvasPixels(5, CANVAS_DPI);
    const result = await verifyItemOverlaps(
      [
        makeItem("a", { x: 0, y: 0, cutLinePoints: mediumSquareCutLine }),
        makeItem("b", {
          x: 80 + gapPx - 20,
          y: 40,
          cutLinePoints: mediumSquareCutLine,
        }),
      ],
      { minGapMm: 5, designDpi: CANVAS_DPI },
    );
    expect(result.valid).toBe(true);
  });

  it("approves horizontally aligned stickers with 5mm gap", async () => {
    const gapPx = mmToCanvasPixels(5, CANVAS_DPI);
    const itemA = makeItem("a", { x: 0, y: 0, cutLinePoints: mediumSquareCutLine });
    const itemB = makeItem("b", {
      x: 80 + gapPx,
      y: 0,
      cutLinePoints: mediumSquareCutLine,
    });

    const result = await verifyItemOverlaps([itemA, itemB], {
      minGapMm: 5,
      designDpi: CANVAS_DPI,
    });
    expect(result.valid).toBe(true);
  });

  it("ignores full image bounds when cut lines are smaller and separated", async () => {
    const result = await verifyItemOverlaps([
      makeItem("a", {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        cutLinePoints: smallSquareCutLine,
      }),
      makeItem("b", {
        x: 61,
        y: 0,
        width: 100,
        height: 100,
        cutLinePoints: [10, 30, 50, 30, 50, 70, 10, 70],
      }),
    ]);
    expect(result.valid).toBe(true);
  });

  it("does not use image rectangles when cut lines are missing", async () => {
    const result = await verifyItemOverlaps([
      makeItem("a", { x: 0, y: 0 }),
      makeItem("b", { x: 10, y: 10 }),
    ]);
    expect(result.valid).toBe(true);
  });

  it("treats cut lines closer than minGapMm as violations", async () => {
    const result = await verifyItemOverlaps(
      [
        makeItem("a", { x: 0, y: 0, cutLinePoints: smallSquareCutLine }),
        makeItem("b", { x: 48, y: 0, cutLinePoints: smallSquareCutLine }),
      ],
      { minGapMm: 10, designDpi: 72 },
    );
    expect(result.valid).toBe(false);
    expect(result.overlappingIds.sort()).toEqual(["a", "b"]);
  });

  it("reports multiple overlapping cut-line pairs", async () => {
    const result = await verifyItemOverlaps([
      makeItem("a", { x: 0, y: 0, cutLinePoints: smallSquareCutLine }),
      makeItem("b", { x: 20, y: 20, cutLinePoints: smallSquareCutLine }),
      makeItem("c", { x: 40, y: 40, cutLinePoints: smallSquareCutLine }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.pairs.length).toBeGreaterThan(0);
    expect(result.overlappingIds.sort()).toEqual(["a", "b", "c"]);
  });
});
