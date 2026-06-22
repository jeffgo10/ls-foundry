import type { CSSProperties } from "react";
import type Konva from "konva";

/** Applied to the designer shell so long-press does not open the browser image menu. */
export const CANVAS_INTERACTION_STYLE: CSSProperties = {
  WebkitTouchCallout: "none",
  WebkitUserSelect: "none",
  userSelect: "none",
  touchAction: "none",
};

export type TransformerTouchProfile = {
  anchorSize: number;
  rotateAnchorOffset: number;
  borderStrokeWidth: number;
  anchorHitStrokeWidth: number;
};

const DEFAULT_TOUCH_PROFILE: TransformerTouchProfile = {
  anchorSize: 14,
  rotateAnchorOffset: 36,
  borderStrokeWidth: 2,
  anchorHitStrokeWidth: 28,
};

/** True on phones/tablets and other coarse-pointer devices. */
export function isCoarsePointerDevice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if ("ontouchstart" in window) {
    return true;
  }
  return window.matchMedia?.("(pointer: coarse)").matches ?? false;
}

/**
 * Larger visible anchors and expanded invisible hit areas for touch editing.
 * Returns `null` on fine-pointer desktops unless `touchFriendly` is forced on.
 */
export function getTransformerTouchProfile(
  touchFriendly?: boolean,
): TransformerTouchProfile | null {
  const enabled = touchFriendly ?? isCoarsePointerDevice();
  return enabled ? DEFAULT_TOUCH_PROFILE : null;
}

export function applyTransformerAnchorHitArea(
  anchor: Konva.Rect,
  hitStrokeWidth: number,
): void {
  anchor.hitStrokeWidth(hitStrokeWidth);
}
