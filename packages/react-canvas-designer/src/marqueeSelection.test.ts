import {
  getMarqueeHitInstanceIds,
  isMarqueeClick,
  mergeMarqueeSelection,
  normalizeMarqueeRect,
  rectsIntersect,
} from "./marqueeSelection";

describe("marqueeSelection", () => {
  it("normalizes negative drag dimensions", () => {
    expect(normalizeMarqueeRect(100, 80, 40, 30)).toEqual({
      x: 40,
      y: 30,
      width: 60,
      height: 50,
    });
  });

  it("detects intersecting rects", () => {
    expect(
      rectsIntersect(
        { minX: 0, minY: 0, maxX: 100, maxY: 100 },
        { minX: 50, minY: 50, maxX: 150, maxY: 150 },
      ),
    ).toBe(true);
    expect(
      rectsIntersect(
        { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        { minX: 20, minY: 20, maxX: 30, maxY: 30 },
      ),
    ).toBe(false);
  });

  it("returns stickers whose cut-line bounds intersect the marquee", () => {
    const hitIds = getMarqueeHitInstanceIds(
      [
        {
          instanceId: "a",
          x: 10,
          y: 10,
          width: 50,
          height: 40,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        },
        {
          instanceId: "b",
          x: 200,
          y: 200,
          width: 50,
          height: 40,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        },
      ],
      { x: 0, y: 0, width: 100, height: 100 },
    );

    expect(hitIds).toEqual(["a"]);
  });

  it("merges additive marquee hits into the current selection", () => {
    expect(mergeMarqueeSelection(["x"], ["a", "b"], true)).toEqual([
      "x",
      "a",
      "b",
    ]);
    expect(mergeMarqueeSelection(["x"], ["a"], false)).toEqual(["a"]);
  });

  it("treats tiny drags as clicks", () => {
    expect(isMarqueeClick({ x: 0, y: 0, width: 2, height: 2 })).toBe(true);
    expect(isMarqueeClick({ x: 0, y: 0, width: 10, height: 2 })).toBe(false);
  });
});
