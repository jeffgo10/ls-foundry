import {
  cloneItemsForHistory,
  commitGestureHistory,
  createCanvasHistoryStacks,
  pushUndoSnapshot,
  redoHistoryStep,
  undoHistoryStep,
} from "./canvasHistory";

const sampleA = [
  {
    instanceId: "a",
    assetId: "asset-a",
    src: "blob:1",
    mimeType: "image/png",
    width: 100,
    height: 80,
    x: 10,
    y: 20,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    cutLinePoints: [0, 0, 10, 0],
  },
];

const sampleB = [
  {
    ...sampleA[0]!,
    x: 50,
  },
];

describe("canvasHistory", () => {
  it("clones cutLinePoints arrays", () => {
    const cloned = cloneItemsForHistory(sampleA);
    expect(cloned).toEqual(sampleA);
    expect(cloned[0]!.cutLinePoints).not.toBe(sampleA[0]!.cutLinePoints);
  });

  it("wires canvas snapshots through @jeffgo10/history", () => {
    let stacks = createCanvasHistoryStacks(3);
    stacks = pushUndoSnapshot(stacks, sampleA);
    stacks = pushUndoSnapshot(stacks, sampleB);
    stacks = { ...stacks, redo: [cloneItemsForHistory(sampleA)] };

    stacks = pushUndoSnapshot(stacks, sampleA);
    expect(stacks.undo).toHaveLength(3);
    expect(stacks.redo).toEqual([]);
  });

  it("undoes and redoes canvas item arrays", () => {
    let stacks = createCanvasHistoryStacks();
    stacks = pushUndoSnapshot(stacks, sampleA);

    const undone = undoHistoryStep(stacks, sampleB);
    expect(undone?.items).toEqual(sampleA);
    expect(undone?.stacks.redo).toHaveLength(1);

    const redone = redoHistoryStep(undone!.stacks, undone!.items);
    expect(redone?.items).toEqual(sampleB);
  });

  it("commits gesture history only when items changed", () => {
    let stacks = createCanvasHistoryStacks();
    stacks = commitGestureHistory(stacks, sampleA, sampleA);
    expect(stacks.undo).toHaveLength(0);

    stacks = commitGestureHistory(stacks, sampleA, sampleB);
    expect(stacks.undo).toHaveLength(1);
    expect(stacks.undo[0]).toEqual(sampleA);
  });
});
