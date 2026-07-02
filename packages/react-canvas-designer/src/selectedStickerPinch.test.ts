import {
  beginPinchResizeSession,
  beginPinchTransformSession,
  canPinchResizeSelection,
  getTouchPairAngleRad,
  getTouchPairCentroid,
  getTouchPairDistance,
  getTouchPairFromList,
  isAnyTouchOnElement,
  isPinchResizeTouchCount,
  localPointToParentOffset,
  scaleFromPinchSession,
  touchClientToStage,
  touchPairCentroidToStage,
  transformFromPinchSession,
} from "./selectedStickerPinch";

describe("selectedStickerPinch", () => {
  const containerRect = {
    left: 0,
    top: 0,
    width: 200,
    height: 400,
  };

  it("computes distance between two touch points", () => {
    expect(
      getTouchPairDistance({ clientX: 0, clientY: 0 }, { clientX: 3, clientY: 4 }),
    ).toBe(5);
  });

  it("computes touch centroid and angle", () => {
    const a = { clientX: 0, clientY: 0 };
    const b = { clientX: 10, clientY: 0 };
    expect(getTouchPairCentroid(a, b)).toEqual({ clientX: 5, clientY: 0 });
    expect(getTouchPairAngleRad(a, b)).toBeCloseTo(0);
  });

  it("maps client touches to stage coordinates", () => {
    expect(
      touchClientToStage({ clientX: 100, clientY: 200 }, containerRect, 100, 200),
    ).toEqual({ x: 50, y: 100 });
    expect(
      touchPairCentroidToStage(
        [
          { clientX: 0, clientY: 0 },
          { clientX: 200, clientY: 400 },
        ],
        containerRect,
        100,
        200,
      ),
    ).toEqual({ x: 50, y: 100 });
  });

  it("scales around a local anchor so the pivot stays fixed", () => {
    const session = beginPinchTransformSession(
      100,
      0,
      { x: 50, y: 50 },
      { x: 50, y: 50 },
      1,
      1,
      0,
    );
    expect(session).not.toBeNull();

    const scaled = transformFromPinchSession(session!, 200, 0, { x: 50, y: 50 });
    expect(scaled.scaleX).toBe(2);
    expect(scaled.scaleY).toBe(2);
    expect(scaled.x).toBe(-50);
    expect(scaled.y).toBe(-50);
  });

  it("rotates around the pinch pivot", () => {
    const session = beginPinchTransformSession(
      100,
      0,
      { x: 50, y: 50 },
      { x: 50, y: 50 },
      1,
      1,
      0,
    );

    const rotated = transformFromPinchSession(
      session!,
      100,
      Math.PI / 2,
      { x: 50, y: 50 },
    );
    expect(rotated.rotation).toBeCloseTo(90);
    expect(rotated.x).toBeCloseTo(100);
    expect(rotated.y).toBeCloseTo(0);
  });

  it("maps a local point through scale and rotation", () => {
    const offset = localPointToParentOffset({ x: 10, y: 0 }, 2, 2, 90);
    expect(offset.x).toBeCloseTo(0);
    expect(offset.y).toBeCloseTo(20);
  });

  it("requires at least two touches for pinch resize", () => {
    expect(isPinchResizeTouchCount(1)).toBe(false);
    expect(isPinchResizeTouchCount(2)).toBe(true);
  });

  it("reads the first two touches from a list", () => {
    const touches = [
      { clientX: 10, clientY: 20 },
      { clientX: 30, clientY: 40 },
    ] as unknown as TouchList;

    expect(getTouchPairFromList(touches)).toEqual([
      { clientX: 10, clientY: 20 },
      { clientX: 30, clientY: 40 },
    ]);
    expect(getTouchPairFromList([touches[0]!] as unknown as TouchList)).toBeNull();
  });

  it("allows pinch resize only for a single selected sticker on touch", () => {
    expect(canPinchResizeSelection(true, 1)).toBe(true);
    expect(canPinchResizeSelection(true, 0)).toBe(false);
    expect(canPinchResizeSelection(true, 2)).toBe(false);
    expect(canPinchResizeSelection(false, 1)).toBe(false);
  });

  it("detects touches on a canvas shell element", () => {
    const shell = document.createElement("div");
    const child = document.createElement("canvas");
    shell.appendChild(child);

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      writable: true,
      value: jest.fn(() => child),
    });

    const touches = [{ clientX: 0, clientY: 0 }] as unknown as TouchList;
    expect(isAnyTouchOnElement(touches, shell)).toBe(true);
    expect(isAnyTouchOnElement(touches, null)).toBe(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (document as any).elementFromPoint;
  });

  it("ignores missing touches when checking element hits", () => {
    const shell = document.createElement("div");
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      writable: true,
      value: jest.fn(() => null),
    });

    const sparseTouches = [{ clientX: 0, clientY: 0 }] as unknown as TouchList;
    Object.defineProperty(sparseTouches, "length", { value: 2 });
    expect(isAnyTouchOnElement(sparseTouches, shell)).toBe(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (document as any).elementFromPoint;
  });

  it("rejects invalid pinch transform sessions", () => {
    expect(beginPinchTransformSession(0, 0, { x: 0, y: 0 }, { x: 0, y: 0 }, 1, 1, 0)).toBeNull();
    expect(beginPinchResizeSession(0, 1, 1)).toBeNull();
  });

  it("supports deprecated pinch resize helpers", () => {
    const session = beginPinchResizeSession(100, 1, 1);
    expect(session).toEqual({ startDistance: 100, startScaleX: 1, startScaleY: 1 });
    expect(scaleFromPinchSession(session!, 200)).toEqual({ scaleX: 2, scaleY: 2 });
  });

  it("returns null when touch pair entries are missing", () => {
    const sparse = [{ clientX: 1, clientY: 2 }] as unknown as TouchList;
    Object.defineProperty(sparse, "length", { value: 2 });
    expect(getTouchPairFromList(sparse)).toBeNull();
  });
});
