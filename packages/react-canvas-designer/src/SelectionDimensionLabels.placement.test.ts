import { getOrientedLabelPlacements } from "./SelectionDimensionLabels";

describe("getOrientedLabelPlacements", () => {
  it("uses layer-local transform, not stage-absolute transform", () => {
    const node = {
      getTransform: () => ({
        point: ({ x, y }: { x: number; y: number }) => ({ x: x + 5, y: y + 5 }),
      }),
      getAbsoluteTransform: () => ({
        point: ({ x, y }: { x: number; y: number }) => ({ x: x * 0.25, y: y * 0.25 }),
      }),
    };

    const placements = getOrientedLabelPlacements(
      node as never,
      100,
      80,
      6,
    );

    expect(placements.width.x).toBeCloseTo(55);
    expect(placements.width.y).toBeCloseTo(91);
    expect(placements.height.x).not.toBeCloseTo(55 * 0.25);
  });
});
