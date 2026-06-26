import * as React from "react";

import { getAngle, getCentroid, getDistance, getLogicalScaleFactor, type Point2D } from "./geometry";

type GestureSession<T> = {
  mode: "pan" | "pinch";
  startValue: T;
  startPointer?: Point2D;
  startDistance?: number;
  startAngle?: number;
  startCentroid?: Point2D;
};

export type UsePointerTransformGesturesOptions<T> = {
  elementRef: React.RefObject<HTMLElement | null>;
  value: T;
  onChange: (value: T) => void;
  enabled: boolean;
  /** Logical canvas/export size used to scale CSS pointer deltas. */
  logicalSize: number;
  clamp: (value: T) => T;
  onPan: (start: T, deltaX: number, deltaY: number) => T;
  onPinch: (
    start: T,
    scaleRatio: number,
    angleDeltaDeg: number,
    centroidDeltaX: number,
    centroidDeltaY: number,
  ) => T;
};

export function usePointerTransformGestures<T>({
  elementRef,
  value,
  onChange,
  enabled,
  logicalSize,
  clamp,
  onPan,
  onPinch,
}: UsePointerTransformGesturesOptions<T>) {
  const valueRef = React.useRef(value);
  const pointersRef = React.useRef(new Map<number, Point2D>());
  const gestureRef = React.useRef<GestureSession<T> | null>(null);
  const isDraggingRef = React.useRef(false);

  React.useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const getScaleFactor = React.useCallback(() => {
    return getLogicalScaleFactor(elementRef.current, logicalSize);
  }, [elementRef, logicalSize]);

  const getLocalPoint = React.useCallback(
    (event: React.PointerEvent<HTMLElement>): Point2D => {
      const rect = event.currentTarget.getBoundingClientRect();

      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    },
    [],
  );

  const beginGesture = React.useCallback(() => {
    const pointers: Point2D[] = Array.from(pointersRef.current.values());

    if (pointers.length === 1) {
      gestureRef.current = {
        mode: "pan",
        startValue: valueRef.current,
        startPointer: pointers[0],
      };
      return;
    }

    if (pointers.length === 2) {
      const [first, second] = pointers;
      gestureRef.current = {
        mode: "pinch",
        startValue: valueRef.current,
        startDistance: getDistance(first, second),
        startAngle: getAngle(first, second),
        startCentroid: getCentroid(first, second),
      };
    }
  }, []);

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }

      event.currentTarget.setPointerCapture?.(event.pointerId);
      pointersRef.current.set(event.pointerId, getLocalPoint(event));
      isDraggingRef.current = true;
      beginGesture();
    },
    [beginGesture, enabled, getLocalPoint],
  );

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!enabled || !pointersRef.current.has(event.pointerId)) {
        return;
      }

      event.preventDefault();
      pointersRef.current.set(event.pointerId, getLocalPoint(event));

      const gesture = gestureRef.current;

      if (!gesture) {
        return;
      }

      const scaleFactor = getScaleFactor();
      const pointers: Point2D[] = Array.from(pointersRef.current.values());

      if (gesture.mode === "pan" && pointers.length === 1 && gesture.startPointer) {
        const [pointer] = pointers;
        const deltaX = (pointer.x - gesture.startPointer.x) * scaleFactor;
        const deltaY = (pointer.y - gesture.startPointer.y) * scaleFactor;

        onChange(clamp(onPan(gesture.startValue, deltaX, deltaY)));
        return;
      }

      if (
        gesture.mode === "pinch" &&
        pointers.length === 2 &&
        gesture.startDistance &&
        gesture.startDistance > 0 &&
        gesture.startAngle !== undefined &&
        gesture.startCentroid
      ) {
        const [first, second] = pointers;
        const currentDistance = getDistance(first, second);
        const currentAngle = getAngle(first, second);
        const currentCentroid = getCentroid(first, second);
        const scaleRatio = currentDistance / gesture.startDistance;
        const angleDeltaDeg =
          ((currentAngle - gesture.startAngle) * 180) / Math.PI;
        const centroidDeltaX =
          (currentCentroid.x - gesture.startCentroid.x) * scaleFactor;
        const centroidDeltaY =
          (currentCentroid.y - gesture.startCentroid.y) * scaleFactor;

        onChange(
          clamp(
            onPinch(
              gesture.startValue,
              scaleRatio,
              angleDeltaDeg,
              centroidDeltaX,
              centroidDeltaY,
            ),
          ),
        );
      }
    },
    [clamp, enabled, getLocalPoint, getScaleFactor, onChange, onPan, onPinch],
  );

  const handlePointerUp = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }

      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      }

      pointersRef.current.delete(event.pointerId);

      if (pointersRef.current.size === 0) {
        gestureRef.current = null;
        isDraggingRef.current = false;
        return;
      }

      beginGesture();
    },
    [beginGesture, enabled],
  );

  const handlePointerCancel = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      handlePointerUp(event);
    },
    [handlePointerUp],
  );

  return {
    isDragging: isDraggingRef.current,
    pointerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onPointerLeave: handlePointerUp,
    },
  };
}
