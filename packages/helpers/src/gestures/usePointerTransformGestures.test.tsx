import { renderHook } from "@testing-library/react";
import { useRef } from "react";

import { usePointerTransformGestures } from "./usePointerTransformGestures";

type Transform = {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
};

const INITIAL: Transform = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotation: 0,
};

function createPointerTarget(width: number) {
  return {
    getBoundingClientRect: () => ({
      width,
      height: width,
      top: 0,
      left: 0,
      right: width,
      bottom: width,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
    setPointerCapture: jest.fn(),
    hasPointerCapture: jest.fn(() => true),
    releasePointerCapture: jest.fn(),
  };
}

function createPointerEvent(
  target: ReturnType<typeof createPointerTarget>,
  init: { pointerId: number; clientX: number; clientY: number },
) {
  return {
    pointerId: init.pointerId,
    clientX: init.clientX,
    clientY: init.clientY,
    preventDefault: jest.fn(),
    currentTarget: target,
  } as unknown as React.PointerEvent<HTMLElement>;
}

describe("usePointerTransformGestures", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns pointer handlers", () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => {
      const elementRef = useRef<HTMLCanvasElement>(null);
      return usePointerTransformGestures({
        elementRef,
        value: INITIAL,
        onChange,
        enabled: true,
        logicalSize: 1024,
        clamp: (value) => value,
        onPan: (start, dx, dy) => ({
          ...start,
          offsetX: start.offsetX + dx,
          offsetY: start.offsetY + dy,
        }),
        onPinch: (start) => start,
      });
    });

    expect(result.current.pointerHandlers.onPointerDown).toBeDefined();
    expect(result.current.pointerHandlers.onPointerMove).toBeDefined();
  });

  it("applies pan deltas scaled to logical coordinates", () => {
    const onChange = jest.fn();
    const target = createPointerTarget(512);
    const canvasRef = { current: target as unknown as HTMLCanvasElement };

    const { result } = renderHook(() =>
      usePointerTransformGestures<Transform>({
        elementRef: canvasRef,
        value: INITIAL,
        onChange,
        enabled: true,
        logicalSize: 1024,
        clamp: (value) => value,
        onPan: (start, deltaX, deltaY) => ({
          ...start,
          offsetX: start.offsetX + deltaX,
          offsetY: start.offsetY + deltaY,
        }),
        onPinch: (start) => start,
      }),
    );

    result.current.pointerHandlers.onPointerDown(
      createPointerEvent(target, { pointerId: 1, clientX: 10, clientY: 20 }),
    );
    result.current.pointerHandlers.onPointerMove(
      createPointerEvent(target, { pointerId: 1, clientX: 20, clientY: 30 }),
    );

    expect(onChange).toHaveBeenCalledWith({
      offsetX: 20,
      offsetY: 20,
      scale: 1,
      rotation: 0,
    });
  });

  it("does not handle pointer events when disabled", () => {
    const onChange = jest.fn();
    const target = createPointerTarget(512);
    const canvasRef = { current: target as unknown as HTMLCanvasElement };

    const { result } = renderHook(() =>
      usePointerTransformGestures<Transform>({
        elementRef: canvasRef,
        value: INITIAL,
        onChange,
        enabled: false,
        logicalSize: 1024,
        clamp: (value) => value,
        onPan: (start, deltaX, deltaY) => ({
          ...start,
          offsetX: start.offsetX + deltaX,
          offsetY: start.offsetY + deltaY,
        }),
        onPinch: (start) => start,
      }),
    );

    result.current.pointerHandlers.onPointerDown(
      createPointerEvent(target, { pointerId: 1, clientX: 10, clientY: 20 }),
    );
    result.current.pointerHandlers.onPointerMove(
      createPointerEvent(target, { pointerId: 1, clientX: 20, clientY: 30 }),
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  it("invokes clamp after pan", () => {
    const clamp = jest.fn((value: Transform) => ({
      ...value,
      offsetX: Math.min(100, value.offsetX),
    }));
    const onChange = jest.fn();
    const target = createPointerTarget(512);
    const canvasRef = { current: target as unknown as HTMLCanvasElement };

    const { result } = renderHook(() =>
      usePointerTransformGestures<Transform>({
        elementRef: canvasRef,
        value: INITIAL,
        onChange,
        enabled: true,
        logicalSize: 1024,
        clamp,
        onPan: (start, deltaX, deltaY) => ({
          ...start,
          offsetX: start.offsetX + deltaX,
          offsetY: start.offsetY + deltaY,
        }),
        onPinch: (start) => start,
      }),
    );

    result.current.pointerHandlers.onPointerDown(
      createPointerEvent(target, { pointerId: 1, clientX: 0, clientY: 0 }),
    );
    result.current.pointerHandlers.onPointerMove(
      createPointerEvent(target, { pointerId: 1, clientX: 100, clientY: 0 }),
    );

    expect(clamp).toHaveBeenCalled();
  });
});
