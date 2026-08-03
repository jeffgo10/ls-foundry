import { localPointToParentOffset } from "./selectedStickerPinch";

/** Absolute angles (degrees) for Shift+rotate-handle snap. */
export const ROTATION_SNAPS_45 = [
  0, 45, 90, 135, 180, 225, 270, 315,
] as const;

/**
 * Half of the 45° snap step. Konva's snap picker keeps the *last* angle within
 * tolerance (not the nearest), so a wider value (e.g. 45°) lets both 0° and
 * 45°/315° match near upright and skips 0°. Keep this ≤ 22.5°.
 */
export const ROTATION_SNAP_TOLERANCE_SHIFT = 22.5;

/** Konva default when Shift is not held (snaps disabled via empty array). */
export const ROTATION_SNAP_TOLERANCE_DEFAULT = 5;

export type RotatableItem = {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};

/**
 * Rotate a sticker around its visual center (local midpoint), preserving
 * Konva translate → rotate → scale order via {@link localPointToParentOffset}.
 */
export function rotateItemAroundCenter<T extends RotatableItem>(
  item: T,
  deltaDeg: number,
): T {
  if (deltaDeg === 0) {
    return item;
  }

  const localCenter = { x: item.width / 2, y: item.height / 2 };
  const before = localPointToParentOffset(
    localCenter,
    item.scaleX,
    item.scaleY,
    item.rotation,
  );
  const nextRotation = item.rotation + deltaDeg;
  const after = localPointToParentOffset(
    localCenter,
    item.scaleX,
    item.scaleY,
    nextRotation,
  );

  return {
    ...item,
    rotation: nextRotation,
    x: item.x + before.x - after.x,
    y: item.y + before.y - after.y,
  };
}

/** Snap angles for the Konva Transformer when Shift is held (empty otherwise). */
export function getRotationSnapsForShift(shiftHeld: boolean): number[] {
  return shiftHeld ? [...ROTATION_SNAPS_45] : [];
}

export function getRotationSnapToleranceForShift(shiftHeld: boolean): number {
  return shiftHeld
    ? ROTATION_SNAP_TOLERANCE_SHIFT
    : ROTATION_SNAP_TOLERANCE_DEFAULT;
}
