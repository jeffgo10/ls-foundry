import {
  commitGestureHistory,
  createHistoryStacks,
  DEFAULT_HISTORY_LIMIT,
  getCanRedo,
  getCanUndo,
  pushUndoSnapshot,
  redoStep,
  type HistoryStacks,
  type HistoryStepResult as GenericHistoryStepResult,
  undoStep,
} from "@jeffgo10/history";

/** Sticker placement row stored in canvas undo/redo snapshots. */
export type HistoryPlacedImage = {
  instanceId: string;
  assetId: string;
  src: string;
  mimeType: string;
  width: number;
  height: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  cutLinePoints?: number[];
  sourceSrc?: string;
  cutLineOffsetMm?: number;
  cutLineOffsetBakedMm?: number;
  cutLineBakeContentScale?: number;
  cutLineBakePad?: number;
};

export type CanvasHistoryStacks = HistoryStacks<HistoryPlacedImage[]>;

export { DEFAULT_HISTORY_LIMIT };

export function cloneItemsForHistory<T extends HistoryPlacedImage>(
  items: readonly T[],
): T[] {
  return items.map((item) => ({
    ...item,
    cutLinePoints: item.cutLinePoints ? [...item.cutLinePoints] : undefined,
  }));
}

function itemsEqual(
  a: readonly HistoryPlacedImage[],
  b: readonly HistoryPlacedImage[],
): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index += 1) {
    const left = a[index]!;
    const right = b[index]!;
    if (
      left.instanceId !== right.instanceId ||
      left.assetId !== right.assetId ||
      left.src !== right.src ||
      left.mimeType !== right.mimeType ||
      left.width !== right.width ||
      left.height !== right.height ||
      left.x !== right.x ||
      left.y !== right.y ||
      left.scaleX !== right.scaleX ||
      left.scaleY !== right.scaleY ||
      left.rotation !== right.rotation
    ) {
      return false;
    }

    const leftPoints = left.cutLinePoints ?? [];
    const rightPoints = right.cutLinePoints ?? [];
    if (leftPoints.length !== rightPoints.length) {
      return false;
    }
    for (let pointIndex = 0; pointIndex < leftPoints.length; pointIndex += 1) {
      if (leftPoints[pointIndex] !== rightPoints[pointIndex]) {
        return false;
      }
    }
  }

  return true;
}

export function createCanvasHistoryStacks(
  limit = DEFAULT_HISTORY_LIMIT,
): CanvasHistoryStacks {
  return createHistoryStacks<HistoryPlacedImage[]>({
    limit,
    clone: cloneItemsForHistory,
    equals: itemsEqual,
  });
}

export {
  commitGestureHistory,
  getCanRedo,
  getCanUndo,
  pushUndoSnapshot,
};

export type HistoryStepResult<T extends HistoryPlacedImage> = {
  stacks: CanvasHistoryStacks;
  items: T[];
} | null;

function toCanvasStepResult<T extends HistoryPlacedImage>(
  result: GenericHistoryStepResult<HistoryPlacedImage[]> | null,
): HistoryStepResult<T> {
  if (!result) {
    return null;
  }

  return {
    stacks: result.stacks,
    items: result.snapshot as T[],
  };
}

export function undoHistoryStep<T extends HistoryPlacedImage>(
  stacks: CanvasHistoryStacks,
  currentItems: readonly T[],
): HistoryStepResult<T> {
  return toCanvasStepResult(undoStep(stacks, [...currentItems]));
}

export function redoHistoryStep<T extends HistoryPlacedImage>(
  stacks: CanvasHistoryStacks,
  currentItems: readonly T[],
): HistoryStepResult<T> {
  return toCanvasStepResult(redoStep(stacks, [...currentItems]));
}
