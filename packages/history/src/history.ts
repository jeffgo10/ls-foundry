export const DEFAULT_HISTORY_LIMIT = 50;

export type HistoryConfig<T> = {
  /** Maximum undo snapshots kept in memory. Default 50. */
  limit?: number;
  /** Deep-clone a snapshot before storing it on a stack. */
  clone?: (snapshot: T) => T;
  /** Return true when two snapshots are equivalent (skips duplicate undo pushes). */
  equals?: (a: T, b: T) => boolean;
};

export type HistoryStacks<T> = {
  undo: T[];
  redo: T[];
  limit: number;
  clone: (snapshot: T) => T;
  equals: (a: T, b: T) => boolean;
};

export type HistoryStepResult<T> = {
  stacks: HistoryStacks<T>;
  snapshot: T;
};

export function defaultClone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // Non-cloneable values fall through to JSON cloning.
    }
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function defaultEquals<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function createHistoryStacks<T>(
  config: HistoryConfig<T> = {},
): HistoryStacks<T> {
  return {
    undo: [],
    redo: [],
    limit: config.limit ?? DEFAULT_HISTORY_LIMIT,
    clone: config.clone ?? defaultClone,
    equals: config.equals ?? defaultEquals,
  };
}

function trimUndoStack<T>(stacks: HistoryStacks<T>): HistoryStacks<T> {
  if (stacks.undo.length <= stacks.limit) {
    return stacks;
  }

  return {
    ...stacks,
    undo: stacks.undo.slice(stacks.undo.length - stacks.limit),
  };
}

/** Push a snapshot onto the undo stack and clear redo. */
export function pushUndoSnapshot<T>(
  stacks: HistoryStacks<T>,
  snapshot: T,
): HistoryStacks<T> {
  const cloned = stacks.clone(snapshot);
  const last = stacks.undo[stacks.undo.length - 1];
  if (last !== undefined && stacks.equals(last, cloned)) {
    return stacks;
  }

  return trimUndoStack({
    ...stacks,
    undo: [...stacks.undo, cloned],
    redo: [],
  });
}

export function getCanUndo<T>(stacks: HistoryStacks<T>): boolean {
  return stacks.undo.length > 0;
}

export function getCanRedo<T>(stacks: HistoryStacks<T>): boolean {
  return stacks.redo.length > 0;
}

export function resetHistoryStacks<T>(stacks: HistoryStacks<T>): HistoryStacks<T> {
  return {
    ...stacks,
    undo: [],
    redo: [],
  };
}

export function undoStep<T>(
  stacks: HistoryStacks<T>,
  currentSnapshot: T,
): HistoryStepResult<T> | null {
  if (stacks.undo.length === 0) {
    return null;
  }

  const previous = stacks.undo[stacks.undo.length - 1]!;
  const nextUndo = stacks.undo.slice(0, -1);
  const current = stacks.clone(currentSnapshot);

  return {
    stacks: {
      ...stacks,
      undo: nextUndo,
      redo: [...stacks.redo, current],
    },
    snapshot: stacks.clone(previous),
  };
}

export function redoStep<T>(
  stacks: HistoryStacks<T>,
  currentSnapshot: T,
): HistoryStepResult<T> | null {
  if (stacks.redo.length === 0) {
    return null;
  }

  const next = stacks.redo[stacks.redo.length - 1]!;
  const nextRedo = stacks.redo.slice(0, -1);
  const current = stacks.clone(currentSnapshot);

  return {
    stacks: {
      ...stacks,
      undo: [...stacks.undo, current],
      redo: nextRedo,
    },
    snapshot: stacks.clone(next),
  };
}

/**
 * Commit a gesture-level change: push `before` onto undo when it differs from `after`.
 * Returns the updated stacks (unchanged when equal).
 */
export function commitGestureHistory<T>(
  stacks: HistoryStacks<T>,
  before: T,
  after: T,
): HistoryStacks<T> {
  if (stacks.equals(before, after)) {
    return stacks;
  }
  return pushUndoSnapshot(stacks, before);
}
