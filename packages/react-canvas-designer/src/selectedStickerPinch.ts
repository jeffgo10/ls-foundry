export type TouchPoint = {
  clientX: number;
  clientY: number;
};

export type StagePoint = {
  x: number;
  y: number;
};

export type PinchTransformSession = {
  startDistance: number;
  startAngleRad: number;
  startPivotStage: StagePoint;
  /** Sticker-local point that sat under the pinch centroid at session start. */
  anchorLocal: StagePoint;
  startScaleX: number;
  startScaleY: number;
  startRotation: number;
};

export type PinchTransformResult = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};

/** Fired on the sticker node after imperative pinch updates (no Konva transform event). */
export const PINCH_LIVE_NODE_EVENT = "pinchlive";

export function getTouchPairDistance(a: TouchPoint, b: TouchPoint): number {
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
}

export function getTouchPairAngleRad(a: TouchPoint, b: TouchPoint): number {
  return Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX);
}

export function getTouchPairCentroid(a: TouchPoint, b: TouchPoint): TouchPoint {
  return {
    clientX: (a.clientX + b.clientX) / 2,
    clientY: (a.clientY + b.clientY) / 2,
  };
}

export function touchClientToStage(
  touch: TouchPoint,
  containerRect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  stageWidth: number,
  stageHeight: number,
): StagePoint {
  if (containerRect.width <= 0 || containerRect.height <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: ((touch.clientX - containerRect.left) / containerRect.width) * stageWidth,
    y: ((touch.clientY - containerRect.top) / containerRect.height) * stageHeight,
  };
}

export function touchPairCentroidToStage(
  pair: [TouchPoint, TouchPoint],
  containerRect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  stageWidth: number,
  stageHeight: number,
): StagePoint {
  const centroid = getTouchPairCentroid(pair[0], pair[1]);
  return touchClientToStage(centroid, containerRect, stageWidth, stageHeight);
}

/** Maps a local sticker point to parent offset after scale + rotation (Konva order). */
export function localPointToParentOffset(
  local: StagePoint,
  scaleX: number,
  scaleY: number,
  rotationDeg: number,
): StagePoint {
  const scaledX = local.x * scaleX;
  const scaledY = local.y * scaleY;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return {
    x: scaledX * cos - scaledY * sin,
    y: scaledX * sin + scaledY * cos,
  };
}

/**
 * Inverse of {@link localPointToParentOffset} plus node translation.
 * Use parent/layer (design) coords — not Konva absolute/stage-buffer coords —
 * so pinch anchors stay correct when `fitToContainer` scales the Stage.
 */
export function parentPointToLocal(
  parent: StagePoint,
  nodeX: number,
  nodeY: number,
  scaleX: number,
  scaleY: number,
  rotationDeg: number,
): StagePoint {
  const dx = parent.x - nodeX;
  const dy = parent.y - nodeY;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // Konva: scale then rotate → inverse is unrotate then unscale.
  const unrotatedX = dx * cos + dy * sin;
  const unrotatedY = -dx * sin + dy * cos;
  const safeScaleX = Math.abs(scaleX) < 1e-8 ? 1e-8 : scaleX;
  const safeScaleY = Math.abs(scaleY) < 1e-8 ? 1e-8 : scaleY;
  return {
    x: unrotatedX / safeScaleX,
    y: unrotatedY / safeScaleY,
  };
}

export function beginPinchTransformSession(
  startDistance: number,
  startAngleRad: number,
  startPivotStage: StagePoint,
  anchorLocal: StagePoint,
  startScaleX: number,
  startScaleY: number,
  startRotation: number,
): PinchTransformSession | null {
  if (startDistance <= 0) {
    return null;
  }

  return {
    startDistance,
    startAngleRad,
    startPivotStage,
    anchorLocal,
    startScaleX,
    startScaleY,
    startRotation,
  };
}

/** Scale + rotate around the moving pinch centroid. */
export function transformFromPinchSession(
  session: PinchTransformSession,
  currentDistance: number,
  currentAngleRad: number,
  currentPivotStage: StagePoint,
  scaleOverride?: { scaleX: number; scaleY: number },
): PinchTransformResult {
  const scaleRatio = currentDistance / session.startDistance;
  const scaleX = scaleOverride?.scaleX ?? session.startScaleX * scaleRatio;
  const scaleY = scaleOverride?.scaleY ?? session.startScaleY * scaleRatio;
  const rotation =
    session.startRotation +
    ((currentAngleRad - session.startAngleRad) * 180) / Math.PI;
  const offset = localPointToParentOffset(
    session.anchorLocal,
    scaleX,
    scaleY,
    rotation,
  );

  return {
    x: currentPivotStage.x - offset.x,
    y: currentPivotStage.y - offset.y,
    scaleX,
    scaleY,
    rotation,
  };
}

export function isPinchResizeTouchCount(count: number): boolean {
  return count >= 2;
}

export function getTouchPairFromList(
  touches: TouchList | readonly Touch[],
): [TouchPoint, TouchPoint] | null {
  if (touches.length < 2) {
    return null;
  }

  const first = touches[0];
  const second = touches[1];
  if (!first || !second) {
    return null;
  }

  return [
    { clientX: first.clientX, clientY: first.clientY },
    { clientX: second.clientX, clientY: second.clientY },
  ];
}

/** True when a single sticker is selected and pinch transform is allowed. */
export function canPinchResizeSelection(
  touchProfileEnabled: boolean,
  selectedCount: number,
): boolean {
  return touchProfileEnabled && selectedCount === 1;
}

/** True if any touch lies on `element` (or its descendants). */
export function isAnyTouchOnElement(
  touches: TouchList | readonly Touch[],
  element: Element | null,
): boolean {
  if (!element) {
    return false;
  }

  for (let index = 0; index < touches.length; index += 1) {
    const touch = touches[index];
    if (!touch) {
      continue;
    }
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target && element.contains(target)) {
      return true;
    }
  }

  return false;
}

/** @deprecated Use {@link beginPinchTransformSession}. */
export type PinchResizeSession = Pick<
  PinchTransformSession,
  "startDistance" | "startScaleX" | "startScaleY"
>;

/** @deprecated Use {@link beginPinchTransformSession}. */
export function beginPinchResizeSession(
  startDistance: number,
  startScaleX: number,
  startScaleY: number,
): PinchResizeSession | null {
  if (startDistance <= 0) {
    return null;
  }

  return { startDistance, startScaleX, startScaleY };
}

/** @deprecated Use {@link transformFromPinchSession}. */
export function scaleFromPinchSession(
  session: PinchResizeSession,
  currentDistance: number,
): { scaleX: number; scaleY: number } {
  const ratio = currentDistance / session.startDistance;
  return {
    scaleX: session.startScaleX * ratio,
    scaleY: session.startScaleY * ratio,
  };
}
