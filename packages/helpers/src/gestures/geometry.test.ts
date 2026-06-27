import {
  getAngle,
  getCentroid,
  getDistance,
  getLogicalScaleFactor,
} from "./geometry";

describe("geometry", () => {
  it("computes distance between two points", () => {
    expect(getDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("computes angle between two points", () => {
    expect(getAngle({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0);
    expect(getAngle({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(Math.PI / 2);
  });

  it("computes centroid between two points", () => {
    expect(getCentroid({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({
      x: 5,
      y: 10,
    });
  });

  it("returns 1 when element is null", () => {
    expect(getLogicalScaleFactor(null, 1024)).toBe(1);
  });

  it("maps CSS width to logical scale factor", () => {
    const element = document.createElement("canvas");
    jest.spyOn(element, "getBoundingClientRect").mockReturnValue({
      width: 512,
      height: 512,
      top: 0,
      left: 0,
      right: 512,
      bottom: 512,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    expect(getLogicalScaleFactor(element, 1024)).toBe(2);
  });

  it("returns 1 when element width is zero", () => {
    const element = document.createElement("canvas");
    jest.spyOn(element, "getBoundingClientRect").mockReturnValue({
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    expect(getLogicalScaleFactor(element, 1024)).toBe(1);
  });
});
