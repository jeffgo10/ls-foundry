import {
  CANVAS_DPI,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  mmToCanvasPixels,
} from "@jeffgo10/shared-types";
import {
  buildDuplicatesToFit,
  buildGroupDuplicatesToFit,
  getAdjacentCopyPosition,
  type DuplicateFillDirection,
} from "./duplicateFill";
import type { MarginBoundsItem } from "./canvasMargin";
import { getItemAxisAlignedBounds } from "./canvasMargin";

type TestItem = MarginBoundsItem & {
  instanceId: string;
  assetId: string;
};

function makeItem(overrides: Partial<TestItem> = {}): TestItem {
  return {
    instanceId: "source",
    assetId: "asset-1",
    x: 50,
    y: 40,
    width: 100,
    height: 80,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    ...overrides,
  };
}

function duplicate(
  source: TestItem,
  direction: DuplicateFillDirection,
  options: Partial<Parameters<typeof buildDuplicatesToFit>[2]> = {},
) {
  let counter = 0;
  return buildDuplicatesToFit(source, direction, {
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    designDpi: CANVAS_DPI,
    createInstanceId: () => `copy-${++counter}`,
    ...options,
  });
}

describe("getAdjacentCopyPosition", () => {
  it("places the next copy to the right using axis-aligned bounds", () => {
    const source = makeItem();
    expect(getAdjacentCopyPosition(source, "horizontal")).toEqual({
      x: 150,
      y: 40,
    });
  });

  it("places the next copy below using axis-aligned bounds", () => {
    const source = makeItem();
    expect(getAdjacentCopyPosition(source, "vertical")).toEqual({
      x: 50,
      y: 120,
    });
  });

  it("accounts for rotation when offsetting horizontally", () => {
    const source = makeItem({ rotation: 90 });
    const position = getAdjacentCopyPosition(source, "horizontal");
    expect(position.x - source.x).toBeCloseTo(80, 0);
    expect(position.y).toBe(source.y);
  });

  it("adds cut-line gap between copies", () => {
    const source = makeItem();
    const gapPx = mmToCanvasPixels(5, CANVAS_DPI);
    const position = getAdjacentCopyPosition(source, "horizontal", gapPx);
    expect(position.x).toBeCloseTo(150 + gapPx, 1);
  });
});

describe("buildDuplicatesToFit", () => {
  it("adds horizontal copies until the right printable edge", () => {
    const { copies, addedCount } = duplicate(makeItem(), "horizontal");
    expect(addedCount).toBe(4);
    expect(copies.map((copy) => copy.x)).toEqual([150, 250, 350, 450]);
    expect(new Set(copies.map((copy) => copy.instanceId)).size).toBe(4);
    expect(copies.every((copy) => copy.assetId === "asset-1")).toBe(true);
  });

  it("adds vertical copies until the bottom printable edge", () => {
    const source = makeItem({ height: 200 });
    const { addedCount, copies } = duplicate(source, "vertical");
    expect(addedCount).toBe(3);
    expect(copies.map((copy) => copy.y)).toEqual([240, 440, 640]);
  });

  it("respects canvas margin when fitting copies", () => {
    const source = makeItem({ x: 30, y: 30 });
    const { addedCount } = duplicate(source, "horizontal", { marginMm: 10 });
    expect(addedCount).toBe(4);
  });

  it("returns no copies when the source already touches the edge", () => {
    const source = makeItem({ x: 495 });
    const { addedCount, copies } = duplicate(source, "horizontal");
    expect(addedCount).toBe(0);
    expect(copies).toEqual([]);
  });

  it("uses cut-line bounds when provided", () => {
    const source = makeItem({
      width: 200,
      cutLinePoints: [0, 0, 50, 0, 50, 50, 0, 50],
    });
    const { addedCount } = duplicate(source, "horizontal");
    expect(addedCount).toBeGreaterThan(8);
  });

  it("honors maxCopies", () => {
    const { addedCount } = duplicate(makeItem(), "horizontal", { maxCopies: 2 });
    expect(addedCount).toBe(2);
  });

  it("fits fewer copies when cut-line gap is set", () => {
    const withoutGap = duplicate(makeItem(), "horizontal");
    const withGap = duplicate(makeItem(), "horizontal", { gapMm: 5 });
    expect(withGap.addedCount).toBeLessThan(withoutGap.addedCount);
    expect(withGap.copies[0]!.x).toBeGreaterThan(withoutGap.copies[0]!.x);
  });

  it("keeps cut-line gap between source and first copy", () => {
    const source = makeItem();
    const gapMm = 5;
    const gapPx = mmToCanvasPixels(gapMm, CANVAS_DPI);
    const { copies } = duplicate(source, "horizontal", { gapMm });
    const sourceBounds = getItemAxisAlignedBounds(source);
    const firstCopyBounds = getItemAxisAlignedBounds(copies[0]!);
    expect(firstCopyBounds.minX - sourceBounds.maxX).toBeCloseTo(gapPx, 1);
  });
});

describe("buildGroupDuplicatesToFit", () => {
  function duplicateGroup(
    sources: TestItem[],
    direction: DuplicateFillDirection,
    options: Partial<Parameters<typeof buildGroupDuplicatesToFit>[2]> = {},
  ) {
    let counter = 0;
    return buildGroupDuplicatesToFit(sources, direction, {
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      designDpi: CANVAS_DPI,
      createInstanceId: () => `copy-${++counter}`,
      ...options,
    });
  }

  it("delegates to single-item fill when only one source is provided", () => {
    const single = duplicate(makeItem(), "horizontal");
    const group = duplicateGroup([makeItem()], "horizontal");
    expect(group.addedCount).toBe(single.addedCount);
  });

  it("duplicates every selected sticker together as a block", () => {
    const left = makeItem({ instanceId: "left", x: 40, y: 50 });
    const right = makeItem({
      instanceId: "right",
      assetId: "asset-2",
      x: 180,
      y: 50,
    });

    const { copies, addedCount } = duplicateGroup([left, right], "horizontal");
    expect(addedCount).toBeGreaterThan(0);
    expect(addedCount % 2).toBe(0);

    const firstGeneration = copies.slice(0, 2);
    expect(firstGeneration[1]!.x - firstGeneration[0]!.x).toBeCloseTo(
      right.x - left.x,
      1,
    );
    expect(firstGeneration[1]!.y - firstGeneration[0]!.y).toBeCloseTo(
      right.y - left.y,
      1,
    );
  });

  it("returns no copies when the block already touches the edge", () => {
    const left = makeItem({ instanceId: "left", x: 40, y: 50 });
    const right = makeItem({ instanceId: "right", x: 480, y: 50, width: 100 });
    const { addedCount, copies } = duplicateGroup([left, right], "horizontal");
    expect(addedCount).toBe(0);
    expect(copies).toEqual([]);
  });
});
