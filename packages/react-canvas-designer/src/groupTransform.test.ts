import {
  applyGroupTransformFromProxy,
  getSelectionAxisAlignedBox,
  readProxyState,
  type PlacedTransform,
} from "./groupTransform";

function item(
  overrides: Partial<PlacedTransform> & Pick<PlacedTransform, "instanceId">,
): PlacedTransform {
  return {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    width: 100,
    height: 80,
    ...overrides,
  };
}

describe("groupTransform", () => {
  it("builds a union box for multiple stickers", () => {
    const box = getSelectionAxisAlignedBox([
      item({ instanceId: "a", x: 10, y: 20, width: 100, height: 50 }),
      item({ instanceId: "b", x: 150, y: 40, width: 60, height: 60 }),
    ]);

    expect(box).toEqual({
      x: 10,
      y: 20,
      width: 200,
      height: 80,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    });
  });

  it("translates every selected sticker together", () => {
    const items = [
      item({ instanceId: "a", x: 10, y: 20 }),
      item({ instanceId: "b", x: 150, y: 40 }),
    ];
    const proxy = getSelectionAxisAlignedBox(items)!;
    const snapshot = { items, proxy };
    const moved = applyGroupTransformFromProxy(snapshot, {
      ...proxy,
      x: proxy.x + 30,
      y: proxy.y + 10,
    });

    expect(moved[0]).toMatchObject({ x: 40, y: 30 });
    expect(moved[1]).toMatchObject({ x: 180, y: 50 });
  });

  it("returns null for an empty selection box", () => {
    expect(getSelectionAxisAlignedBox([])).toBeNull();
  });

  it("rotates stickers while preserving spacing", () => {
    const items = [
      item({ instanceId: "a", x: 0, y: 0 }),
      item({ instanceId: "b", x: 100, y: 0 }),
    ];
    const proxy = getSelectionAxisAlignedBox(items)!;
    const snapshot = { items, proxy };
    const rotated = applyGroupTransformFromProxy(snapshot, {
      ...proxy,
      rotation: 90,
    });

    const startDist = Math.hypot(items[1]!.x - items[0]!.x, items[1]!.y - items[0]!.y);
    const endDist = Math.hypot(
      rotated[1]!.x - rotated[0]!.x,
      rotated[1]!.y - rotated[0]!.y,
    );
    expect(endDist).toBeCloseTo(startDist, 5);
    expect(rotated[0]?.rotation).toBe(90);
    expect(rotated[1]?.rotation).toBe(90);
  });

  it("scales stickers uniformly from the proxy center", () => {
    const items = [
      item({ instanceId: "a", x: 0, y: 0 }),
      item({ instanceId: "b", x: 100, y: 0 }),
    ];
    const proxy = getSelectionAxisAlignedBox(items)!;
    const snapshot = { items, proxy };
    const scaled = applyGroupTransformFromProxy(snapshot, {
      ...proxy,
      scaleX: 2,
      scaleY: 2,
    });

    expect(scaled[0]?.scaleX).toBe(2);
    expect(scaled[1]?.scaleX).toBe(2);
    expect(scaled[1]!.x - scaled[0]!.x).toBeCloseTo(200, 5);
  });

  it("reads proxy state from a Konva-like node", () => {
    expect(
      readProxyState(
        {
          x: () => 12,
          y: () => 24,
          rotation: () => 15,
          scaleX: () => 1.5,
          scaleY: () => 1.5,
        },
        80,
        40,
      ),
    ).toEqual({
      x: 12,
      y: 24,
      width: 80,
      height: 40,
      rotation: 15,
      scaleX: 1.5,
      scaleY: 1.5,
    });
  });

  it("falls back to scale ratio 1 when the snapshot proxy scale is zero", () => {
    const items = [item({ instanceId: "a", x: 10, y: 20, scaleX: 2, scaleY: 2 })];
    const snapshot = {
      items,
      proxy: {
        x: 0,
        y: 0,
        width: 100,
        height: 80,
        rotation: 0,
        scaleX: 0,
        scaleY: 0,
      },
    };
    const scaled = applyGroupTransformFromProxy(snapshot, {
      ...snapshot.proxy,
      scaleX: 1,
      scaleY: 1,
    });
    expect(scaled[0]?.scaleX).toBe(2);
    expect(scaled[0]?.scaleY).toBe(2);
  });
});
