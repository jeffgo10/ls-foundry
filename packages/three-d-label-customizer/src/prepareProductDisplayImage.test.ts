import {
  replaceGreenRegionForDisplay,
  sampleBottleFillColor,
} from "./prepareProductDisplayImage";
import type { TargetBounds } from "./types";

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

const bounds: TargetBounds = {
  minX: 20,
  maxX: 59,
  minY: 10,
  maxY: 49,
  centerX: 39.5,
  centerY: 29.5,
  width: 40,
  height: 40,
  aspectRatio: 1,
  rotationDegrees: 0,
};

describe("prepareProductDisplayImage", () => {
  it("samples bottle color from pixels outside the green bounds", () => {
    const imageData = makeImageData(100, 80, (x, y) => {
      if (x >= 20 && x <= 59 && y >= 10 && y <= 49) {
        return [20, 220, 30, 255];
      }
      if (y < 10 || y > 49) {
        return [30, 35, 28, 255];
      }
      return [200, 160, 140, 255];
    });

    expect(sampleBottleFillColor(imageData, bounds)).toEqual([30, 35, 28]);
  });

  it("replaces only neon-green pixels with the sampled fill", () => {
    const imageData = makeImageData(100, 80, (x, y) => {
      if (x >= 20 && x <= 59 && y >= 10 && y <= 49) {
        if (x % 10 === 0) return [0, 0, 0, 255];
        return [20, 220, 30, 255];
      }
      if (y < 10 || y > 49) {
        return [30, 35, 28, 255];
      }
      return [200, 160, 140, 255];
    });

    replaceGreenRegionForDisplay(imageData, bounds);

    const i = (15 * 100 + 25) * 4;
    expect(imageData.data[i]).toBe(30);
    expect(imageData.data[i + 1]).toBe(35);
    expect(imageData.data[i + 2]).toBe(28);

    const gridI = (15 * 100 + 20) * 4;
    expect(imageData.data[gridI]).toBe(0);
    expect(imageData.data[gridI + 1]).toBe(0);
    expect(imageData.data[gridI + 2]).toBe(0);
  });

  it("does not fill non-green pixels inside the axis-aligned bounds", () => {
    const imageData = makeImageData(100, 80, (x, y) => {
      if (x >= 30 && x <= 49 && y >= 15 && y <= 44) {
        return [20, 220, 30, 255];
      }
      if (y < 10 || y > 49) {
        return [30, 35, 28, 255];
      }
      return [200, 160, 140, 255];
    });

    replaceGreenRegionForDisplay(imageData, bounds);

    const cornerInsideAabb = (12 * 100 + 22) * 4;
    expect(imageData.data[cornerInsideAabb]).toBe(200);
    expect(imageData.data[cornerInsideAabb + 1]).toBe(160);
  });
});
