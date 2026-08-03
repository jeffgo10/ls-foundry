import { stagePointerToDesign } from "./stagePointer";

describe("stagePointerToDesign", () => {
  it("returns design coordinates when the stage is scaled down", () => {
    const stage = {
      getPointerPosition: () => ({ x: 50, y: 100 }),
      scaleX: () => 0.5,
      scaleY: () => 0.5,
      x: () => 0,
      y: () => 0,
    };

    expect(stagePointerToDesign(stage)).toEqual({ x: 100, y: 200 });
  });

  it("subtracts stage pan before dividing by scale", () => {
    const stage = {
      getPointerPosition: () => ({ x: 50, y: 100 }),
      scaleX: () => 0.5,
      scaleY: () => 0.5,
      x: () => -20,
      y: () => -40,
    };

    expect(stagePointerToDesign(stage)).toEqual({ x: 140, y: 280 });
  });

  it("returns null when the pointer position is missing", () => {
    const stage = {
      getPointerPosition: () => null,
      scaleX: () => 1,
      scaleY: () => 1,
      x: () => 0,
      y: () => 0,
    };

    expect(stagePointerToDesign(stage)).toBeNull();
  });
});
