import {
  commitGestureHistory,
  createHistoryStacks,
  defaultClone,
  defaultEquals,
  getCanRedo,
  getCanUndo,
  pushUndoSnapshot,
  redoStep,
  resetHistoryStacks,
  undoStep,
} from "./history";

describe("@jeffgo10/history", () => {
  it("clones with structuredClone by default", () => {
    const source = { items: [{ id: "a", values: [1, 2] }] };
    const cloned = defaultClone(source);
    expect(cloned).toEqual(source);
    expect(cloned).not.toBe(source);
    expect(cloned.items[0]).not.toBe(source.items[0]);
  });

  it("falls back to JSON cloning when structuredClone fails", () => {
    const original = globalThis.structuredClone;
    globalThis.structuredClone = jest.fn(() => {
      throw new Error("not cloneable");
    }) as typeof structuredClone;

    try {
      const source = { items: [{ id: "a" }] };
      const cloned = defaultClone(source);
      expect(cloned).toEqual(source);
      expect(cloned).not.toBe(source);
    } finally {
      globalThis.structuredClone = original;
    }
  });

  it("falls back to JSON cloning when structuredClone is unavailable", () => {
    const original = globalThis.structuredClone;
    // @ts-expect-error test fallback when API is missing
    delete globalThis.structuredClone;

    try {
      const source = { count: 2 };
      const cloned = defaultClone(source);
      expect(cloned).toEqual(source);
      expect(cloned).not.toBe(source);
    } finally {
      globalThis.structuredClone = original;
    }
  });

  it("reports undo/redo availability", () => {
    let stacks = createHistoryStacks<string>();
    expect(getCanUndo(stacks)).toBe(false);
    expect(getCanRedo(stacks)).toBe(false);

    stacks = pushUndoSnapshot(stacks, "a");
    expect(getCanUndo(stacks)).toBe(true);
    expect(getCanRedo(stacks)).toBe(false);

    const undone = undoStep(stacks, "b");
    expect(getCanUndo(undone!.stacks)).toBe(false);
    expect(getCanRedo(undone!.stacks)).toBe(true);
  });

  it("returns null when undo or redo stacks are empty", () => {
    const stacks = createHistoryStacks<string>();
    expect(undoStep(stacks, "current")).toBeNull();
    expect(redoStep(stacks, "current")).toBeNull();
  });

  it("compares snapshots with defaultEquals", () => {
    expect(defaultEquals({ x: 1 }, { x: 1 })).toBe(true);
    expect(defaultEquals({ x: 1 }, { x: 2 })).toBe(false);
  });

  it("pushes undo snapshots and clears redo", () => {
    let stacks = createHistoryStacks<string>({ limit: 3 });
    stacks = pushUndoSnapshot(stacks, "a");
    stacks = pushUndoSnapshot(stacks, "b");
    stacks = { ...stacks, redo: ["old"] };

    stacks = pushUndoSnapshot(stacks, "c");
    expect(stacks.undo).toEqual(["a", "b", "c"]);
    expect(stacks.redo).toEqual([]);
  });

  it("skips duplicate consecutive undo snapshots", () => {
    let stacks = createHistoryStacks<number>();
    stacks = pushUndoSnapshot(stacks, 1);
    stacks = pushUndoSnapshot(stacks, 1);
    expect(stacks.undo).toEqual([1]);
  });

  it("undoes and redoes snapshots", () => {
    let stacks = createHistoryStacks<string>();
    stacks = pushUndoSnapshot(stacks, "before");

    const undone = undoStep(stacks, "after");
    expect(undone?.snapshot).toBe("before");
    expect(undone?.stacks.redo).toEqual(["after"]);

    const redone = redoStep(undone!.stacks, undone!.snapshot);
    expect(redone?.snapshot).toBe("after");
  });

  it("commits gesture history only when snapshots changed", () => {
    let stacks = createHistoryStacks<string>();
    stacks = commitGestureHistory(stacks, "a", "a");
    expect(stacks.undo).toHaveLength(0);

    stacks = commitGestureHistory(stacks, "a", "b");
    expect(stacks.undo).toEqual(["a"]);
  });

  it("trims undo stack to the configured limit", () => {
    let stacks = createHistoryStacks<number>({ limit: 2 });
    stacks = pushUndoSnapshot(stacks, 1);
    stacks = pushUndoSnapshot(stacks, 2);
    stacks = pushUndoSnapshot(stacks, 3);
    expect(stacks.undo).toEqual([2, 3]);
  });

  it("resets undo and redo stacks", () => {
    let stacks = createHistoryStacks<string>();
    stacks = pushUndoSnapshot(stacks, "a");
    stacks = resetHistoryStacks(stacks);
    expect(stacks.undo).toEqual([]);
    expect(stacks.redo).toEqual([]);
    expect(stacks.clone).toBeDefined();
  });

  it("uses custom clone and equals", () => {
    const clone = jest.fn((value: { n: number }) => ({ n: value.n }));
    const equals = jest.fn((a: { n: number }, b: { n: number }) => a.n === b.n);
    let stacks = createHistoryStacks({ clone, equals, limit: 5 });

    stacks = pushUndoSnapshot(stacks, { n: 1 });
    stacks = pushUndoSnapshot(stacks, { n: 1 });

    expect(clone).toHaveBeenCalled();
    expect(equals).toHaveBeenCalled();
    expect(stacks.undo).toHaveLength(1);
  });
});
