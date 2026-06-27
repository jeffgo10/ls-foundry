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

  it("applies pinch deltas when two pointers move", () => {
    const onChange = jest.fn();
    const onPinch = jest.fn(
      (start, scaleRatio, angleDeltaDeg, centroidDeltaX, centroidDeltaY) => ({
        ...start,
        scale: start.scale * scaleRatio,
        rotation: start.rotation + angleDeltaDeg,
        offsetX: start.offsetX + centroidDeltaX,
        offsetY: start.offsetY + centroidDeltaY,
      }),
    );
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
        onPinch,
      }),
    );

    result.current.pointerHandlers.onPointerDown(
      createPointerEvent(target, { pointerId: 1, clientX: 156, clientY: 256 }),
    );
    result.current.pointerHandlers.onPointerDown(
      createPointerEvent(target, { pointerId: 2, clientX: 356, clientY: 256 }),
    );
    onChange.mockClear();

    result.current.pointerHandlers.onPointerMove(
      createPointerEvent(target, { pointerId: 1, clientX: 106, clientY: 256 }),
    );
    result.current.pointerHandlers.onPointerMove(
      createPointerEvent(target, { pointerId: 2, clientX: 406, clientY: 256 }),
    );

    expect(onPinch).toHaveBeenCalledWith(
      INITIAL,
      1.5,
      0,
      0,
      0,
    );
    expect(onChange).toHaveBeenCalledWith({
      offsetX: 0,
      offsetY: 0,
      scale: 1.5,
      rotation: 0,
    });
  });

  it("invokes clamp after pinch", () => {
    const clamp = jest.fn((value: Transform) => ({
      ...value,
      scale: Math.min(2, value.scale),
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
        onPan: (start) => start,
        onPinch: (start, scaleRatio) => ({
          ...start,
          scale: start.scale * scaleRatio,
        }),
      }),
    );

    result.current.pointerHandlers.onPointerDown(
      createPointerEvent(target, { pointerId: 1, clientX: 100, clientY: 256 }),
    );
    result.current.pointerHandlers.onPointerDown(
      createPointerEvent(target, { pointerId: 2, clientX: 300, clientY: 256 }),
    );
    result.current.pointerHandlers.onPointerMove(
      createPointerEvent(target, { pointerId: 1, clientX: 50, clientY: 256 }),
    );
    result.current.pointerHandlers.onPointerMove(
      createPointerEvent(target, { pointerId: 2, clientX: 450, clientY: 256 }),
    );

    expect(clamp).toHaveBeenCalled();
  });

  it("releases pointer capture and clears gesture on pointer up", () => {
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
    onChange.mockClear();

    result.current.pointerHandlers.onPointerUp(
      createPointerEvent(target, { pointerId: 1, clientX: 10, clientY: 20 }),
    );

    expect(target.releasePointerCapture).toHaveBeenCalledWith(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("restarts pan when one pointer lifts during a pinch", () => {
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
      createPointerEvent(target, { pointerId: 1, clientX: 100, clientY: 256 }),
    );
    result.current.pointerHandlers.onPointerDown(
      createPointerEvent(target, { pointerId: 2, clientX: 300, clientY: 256 }),
    );
    result.current.pointerHandlers.onPointerUp(
      createPointerEvent(target, { pointerId: 1, clientX: 100, clientY: 256 }),
    );
    onChange.mockClear();

    result.current.pointerHandlers.onPointerMove(
      createPointerEvent(target, { pointerId: 2, clientX: 320, clientY: 276 }),
    );

    expect(onChange).toHaveBeenCalledWith({
      offsetX: 40,
      offsetY: 40,
      scale: 1,
      rotation: 0,
    });
  });

  it("handles pointer cancel and pointer leave like pointer up", () => {
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
        onPan: (start) => start,
        onPinch: (start) => start,
      }),
    );

    const down = createPointerEvent(target, { pointerId: 1, clientX: 10, clientY: 20 });
    const up = createPointerEvent(target, { pointerId: 1, clientX: 10, clientY: 20 });

    result.current.pointerHandlers.onPointerDown(down);
    result.current.pointerHandlers.onPointerCancel(up);
    expect(target.releasePointerCapture).toHaveBeenCalledWith(1);

    target.releasePointerCapture.mockClear();
    result.current.pointerHandlers.onPointerDown(down);
    result.current.pointerHandlers.onPointerLeave(up);
    expect(target.releasePointerCapture).toHaveBeenCalledWith(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores pointer move for untracked pointers", () => {
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

    result.current.pointerHandlers.onPointerMove(
      createPointerEvent(target, { pointerId: 99, clientX: 20, clientY: 30 }),
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not handle pointer up when disabled", () => {
    const onChange = jest.fn();
    const target = createPointerTarget(512);
    const canvasRef = { current: target as unknown as HTMLCanvasElement };

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        usePointerTransformGestures<Transform>({
          elementRef: canvasRef,
          value: INITIAL,
          onChange,
          enabled,
          logicalSize: 1024,
          clamp: (value) => value,
          onPan: (start) => start,
          onPinch: (start) => start,
        }),
      { initialProps: { enabled: true } },
    );

    result.current.pointerHandlers.onPointerDown(
      createPointerEvent(target, { pointerId: 1, clientX: 10, clientY: 20 }),
    );
    rerender({ enabled: false });
    target.releasePointerCapture.mockClear();

    result.current.pointerHandlers.onPointerUp(
      createPointerEvent(target, { pointerId: 1, clientX: 10, clientY: 20 }),
    );

    expect(target.releasePointerCapture).not.toHaveBeenCalled();
  });

  it("skips capture release when the target has no capture API", () => {
    const onChange = jest.fn();
    const target = {
      ...createPointerTarget(512),
      setPointerCapture: undefined,
      hasPointerCapture: undefined,
      releasePointerCapture: undefined,
    };
    const canvasRef = { current: target as unknown as HTMLCanvasElement };

    const { result } = renderHook(() =>
      usePointerTransformGestures<Transform>({
        elementRef: canvasRef,
        value: INITIAL,
        onChange,
        enabled: true,
        logicalSize: 1024,
        clamp: (value) => value,
        onPan: (start) => start,
        onPinch: (start) => start,
      }),
    );

    expect(() => {
      result.current.pointerHandlers.onPointerDown(
        createPointerEvent(target, { pointerId: 1, clientX: 10, clientY: 20 }),
      );
      result.current.pointerHandlers.onPointerUp(
        createPointerEvent(target, { pointerId: 1, clientX: 10, clientY: 20 }),
      );
    }).not.toThrow();
  });

  it("uses unit scale factor when element ref is null", () => {
    const onChange = jest.fn();
    const target = createPointerTarget(512);
    const canvasRef = { current: null };

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
      offsetX: 10,
      offsetY: 10,
      scale: 1,
      rotation: 0,
    });
  });
});
