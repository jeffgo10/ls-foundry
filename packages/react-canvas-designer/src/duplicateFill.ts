import { mmToCanvasPixels } from "@jeffgo10/shared-types";
import {
  getCanvasMarginPx,
  getItemAxisAlignedBounds,
  type MarginBoundsItem,
} from "./canvasMargin";

export type DuplicateFillDirection = "horizontal" | "vertical";

export type DuplicateFillOptions = {
  canvasWidth: number;
  canvasHeight: number;
  designDpi: number;
  marginMm?: number;
  /** Minimum gap between cut-line outlines in millimeters. Default 0. */
  gapMm?: number;
  /** Safety cap on how many copies may be added. Default 500. */
  maxCopies?: number;
  createInstanceId: () => string;
};

export type DuplicateFillResult<T> = {
  copies: T[];
  addedCount: number;
};

const FIT_EPSILON = 1e-4;

/** Stage-space position for a copy placed after `source` along an axis. */
export function getAdjacentCopyPosition(
  source: MarginBoundsItem,
  direction: DuplicateFillDirection,
  gapPx = 0,
): { x: number; y: number } {
  const sourceBounds = getItemAxisAlignedBounds(source);
  const alignedBounds = getItemAxisAlignedBounds(source, {
    x: source.x,
    y: source.y,
  });

  if (direction === "horizontal") {
    const deltaX = sourceBounds.maxX - alignedBounds.minX + gapPx;
    return { x: source.x + deltaX, y: source.y };
  }

  const deltaY = sourceBounds.maxY - alignedBounds.minY + gapPx;
  return { x: source.x, y: source.y + deltaY };
}

function copyFitsInPrintableArea(
  item: MarginBoundsItem,
  canvasWidth: number,
  canvasHeight: number,
  marginPx: number,
): boolean {
  const bounds = getItemAxisAlignedBounds(item);
  return (
    bounds.minX >= marginPx - FIT_EPSILON &&
    bounds.minY >= marginPx - FIT_EPSILON &&
    bounds.maxX <= canvasWidth - marginPx + FIT_EPSILON &&
    bounds.maxY <= canvasHeight - marginPx + FIT_EPSILON
  );
}

/**
 * Create copies of `source` along a stage axis until the next copy would extend
 * past the printable area (canvas minus margin). Spacing uses cut-line bounds plus
 * `gapMm` between outlines (same convention as auto-arrange).
 */
export function buildDuplicatesToFit<T extends MarginBoundsItem & { instanceId: string }>(
  source: T,
  direction: DuplicateFillDirection,
  options: DuplicateFillOptions,
): DuplicateFillResult<T> {
  const marginPx = getCanvasMarginPx(options.marginMm ?? 0, options.designDpi);
  const gapPx = mmToCanvasPixels(options.gapMm ?? 0, options.designDpi);
  const maxCopies = options.maxCopies ?? 500;
  const copies: T[] = [];
  let lastItem: MarginBoundsItem = source;

  for (let index = 0; index < maxCopies; index += 1) {
    const { x, y } = getAdjacentCopyPosition(lastItem, direction, gapPx);
    const candidate = {
      ...source,
      instanceId: options.createInstanceId(),
      x,
      y,
    };

    if (
      !copyFitsInPrintableArea(
        candidate,
        options.canvasWidth,
        options.canvasHeight,
        marginPx,
      )
    ) {
      break;
    }

    copies.push(candidate);
    lastItem = candidate;
  }

  return { copies, addedCount: copies.length };
}

function getItemsAxisAlignedBounds(
  items: readonly MarginBoundsItem[],
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const item of items) {
    const bounds = getItemAxisAlignedBounds(item);
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  }

  return { minX, minY, maxX, maxY };
}

/** Cut-line spacing between the current block and the next copy block. */
export function getAdjacentBlockTranslation(
  block: readonly MarginBoundsItem[],
  direction: DuplicateFillDirection,
  gapPx = 0,
): { dx: number; dy: number } {
  const { minX, minY, maxX, maxY } = getItemsAxisAlignedBounds(block);
  const blockWidth = maxX - minX;
  const blockHeight = maxY - minY;

  if (direction === "horizontal") {
    return { dx: blockWidth + gapPx, dy: 0 };
  }

  return { dx: 0, dy: blockHeight + gapPx };
}

/**
 * Duplicate every item in `sources` together as a block along an axis until the
 * next block would extend past the printable area. Preserves relative layout.
 */
export function buildGroupDuplicatesToFit<
  T extends MarginBoundsItem & { instanceId: string },
>(
  sources: readonly T[],
  direction: DuplicateFillDirection,
  options: DuplicateFillOptions,
): DuplicateFillResult<T> {
  if (sources.length === 0) {
    return { copies: [], addedCount: 0 };
  }
  if (sources.length === 1) {
    return buildDuplicatesToFit(sources[0]!, direction, options);
  }

  const marginPx = getCanvasMarginPx(options.marginMm ?? 0, options.designDpi);
  const gapPx = mmToCanvasPixels(options.gapMm ?? 0, options.designDpi);
  const maxCopies = options.maxCopies ?? 500;
  const copies: T[] = [];
  let lastBlock: readonly MarginBoundsItem[] = sources;

  for (let generation = 0; generation < maxCopies; generation += 1) {
    const { dx, dy } = getAdjacentBlockTranslation(lastBlock, direction, gapPx);
    const candidates = sources.map((template, index) => ({
      ...template,
      instanceId: options.createInstanceId(),
      x: lastBlock[index]!.x + dx,
      y: lastBlock[index]!.y + dy,
    }));

    if (
      !candidates.every((candidate) =>
        copyFitsInPrintableArea(
          candidate,
          options.canvasWidth,
          options.canvasHeight,
          marginPx,
        ),
      )
    ) {
      break;
    }

    copies.push(...candidates);
    lastBlock = candidates;
  }

  return { copies, addedCount: copies.length };
}
