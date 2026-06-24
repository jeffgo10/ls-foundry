import {
  createFallbackBounds,
  scanNeonGreenBounds,
  MIN_GREEN,
  GREEN_DELTA,
} from "./scanNeonGreenBounds";
import * as orientation from "./computeGreenClusterOrientation";

function makeImageData(
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number, number],
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");

  const imageData = ctx.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const [r, g, b, a] = fill(x, y);
      imageData.data[i] = r;
      imageData.data[i + 1] = g;
      imageData.data[i + 2] = b;
      imageData.data[i + 3] = a;
    }
  }
  return imageData;
}

describe("scanNeonGreenBounds", () => {
  it("returns bounds for a neon-green rectangle", () => {
    const imageData = makeImageData(100, 80, (x, y) => {
      if (x >= 20 && x <= 59 && y >= 10 && y <= 49) {
        return [20, 220, 30, 255];
      }
      return [10, 10, 10, 255];
    });

    const bounds = scanNeonGreenBounds(imageData);
    expect(bounds).not.toBeNull();
    expect(bounds!.minX).toBe(20);
    expect(bounds!.maxX).toBe(59);
    expect(bounds!.minY).toBe(10);
    expect(bounds!.maxY).toBe(49);
    expect(bounds!.width).toBeCloseTo(40, 0);
    expect(bounds!.height).toBeCloseTo(40, 0);
    expect(bounds!.centerX).toBeCloseTo(39.5, 0);
    expect(bounds!.centerY).toBeCloseTo(29.5, 0);
    expect(bounds!.aspectRatio).toBeCloseTo(1, 1);
    expect(bounds!.rotationDegrees).toBeCloseTo(0, 0);
  });

  it("detects rotation for a tilted neon-green rectangle", () => {
    const cx = 120;
    const cy = 120;
    const angleRad = (28 * Math.PI) / 180;
    const halfW = 55;
    const halfH = 28;

    const imageData = makeImageData(240, 240, (x, y) => {
      const dx = x - cx;
      const dy = y - cy;
      const cos = Math.cos(-angleRad);
      const sin = Math.sin(-angleRad);
      const lx = dx * cos - dy * sin;
      const ly = dx * sin + dy * cos;
      if (Math.abs(lx) <= halfW && Math.abs(ly) <= halfH) {
        return [20, 220, 30, 255];
      }
      return [10, 10, 10, 255];
    });

    const bounds = scanNeonGreenBounds(imageData, { minClusterAreaRatio: 0.01 });
    expect(bounds).not.toBeNull();
    expect(bounds!.rotationDegrees).toBeCloseTo(28, 0);
    expect(bounds!.width).toBeGreaterThan(bounds!.height);
  });

  it("returns null when green cluster is too small", () => {
    const imageData = makeImageData(100, 100, (x, y) => {
      if (x === 50 && y === 50) return [10, 255, 10, 255];
      return [0, 0, 0, 255];
    });

    expect(scanNeonGreenBounds(imageData)).toBeNull();
  });

  it("returns null for empty image data", () => {
    const empty = {
      width: 0,
      height: 0,
      data: new Uint8ClampedArray(0),
    } as ImageData;
    expect(scanNeonGreenBounds(empty)).toBeNull();
  });

  it("rejects pixels that fail green dominance checks", () => {
    const imageData = makeImageData(50, 50, () => [200, 200, 200, 255]);
    expect(scanNeonGreenBounds(imageData)).toBeNull();
  });

  it("rejects low green channel values", () => {
    const imageData = makeImageData(10, 10, () => [0, 50, 0, 255]);
    expect(scanNeonGreenBounds(imageData, { minClusterAreaRatio: 0.5 })).toBeNull();
  });

  it("rejects when green does not dominate red", () => {
    const imageData = makeImageData(10, 10, () => [200, 150, 0, 255]);
    expect(scanNeonGreenBounds(imageData, { minClusterAreaRatio: 0.5 })).toBeNull();
  });

  it("falls back to axis-aligned bounds when orientation cannot be computed", () => {
    const spy = jest
      .spyOn(orientation, "computeGreenClusterOrientation")
      .mockReturnValue(null);

    const imageData = makeImageData(100, 80, (x, y) => {
      if (x >= 20 && x <= 59 && y >= 10 && y <= 49) {
        return [20, 220, 30, 255];
      }
      return [10, 10, 10, 255];
    });

    const bounds = scanNeonGreenBounds(imageData);
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBe(40);
    expect(bounds!.height).toBe(40);
    expect(bounds!.rotationDegrees).toBe(0);

    spy.mockRestore();
  });

  it("respects custom threshold options", () => {
    const imageData = makeImageData(20, 20, () => [90, 110, 90, 255]);
    expect(
      scanNeonGreenBounds(imageData, {
        minGreen: MIN_GREEN,
        greenDelta: GREEN_DELTA,
      }),
    ).toBeNull();
    expect(
      scanNeonGreenBounds(imageData, {
        minGreen: 100,
        greenDelta: 20,
        greenRatioThreshold: 1.2,
        minClusterAreaRatio: 0.5,
      }),
    ).not.toBeNull();
  });
});

describe("createFallbackBounds", () => {
  it("centers a 30% region in the image", () => {
    const bounds = createFallbackBounds(200, 100);
    expect(bounds.centerX).toBe(100);
    expect(bounds.centerY).toBe(50);
    expect(bounds.width).toBe(60);
    expect(bounds.height).toBe(30);
  });
});
