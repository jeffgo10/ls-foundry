import { scanGreenSurfaceGrid } from "./scanGreenSurfaceGrid";
import { scanNeonGreenBounds } from "./scanNeonGreenBounds";

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

function drawAxisAlignedGreenGrid(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cellCols: number,
  cellRows: number,
): (x: number, y: number) => [number, number, number, number] {
  const width = x1 - x0 + 1;
  const height = y1 - y0 + 1;

  return (x, y) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) {
      return [40, 40, 40, 255];
    }

    const localX = x - x0;
    const localY = y - y0;
    const colStep = width / cellCols;
    const rowStep = height / cellRows;
    const distV =
      Math.abs(localX / colStep - Math.round(localX / colStep)) * colStep;
    const distH =
      Math.abs(localY / rowStep - Math.round(localY / rowStep)) * rowStep;

    if (distV < 1.5 || distH < 1.5) {
      return [0, 0, 0, 255];
    }

    return [20, 220, 30, 255];
  };
}

describe("scanGreenSurfaceGrid", () => {
  it("detects a 4×5 guide grid on an axis-aligned green patch", () => {
    const imageData = makeImageData(160, 120, drawAxisAlignedGreenGrid(40, 20, 119, 79, 4, 5));
    const bounds = scanNeonGreenBounds(imageData);
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThan(50);

    const grid = scanGreenSurfaceGrid(imageData, bounds!);
    expect(grid).not.toBeNull();
    expect(grid!.cols).toBeGreaterThanOrEqual(4);
    expect(grid!.rows).toBeGreaterThanOrEqual(4);
    expect(grid!.points[0]).toHaveLength(grid!.cols);
    expect(grid!.points[0]![0]!.x).toBeLessThan(grid!.points[0]![grid!.cols - 1]!.x);
    expect(grid!.points[0]![0]!.y).toBeLessThan(grid!.points[grid!.rows - 1]![0]!.y);
  });

  it("returns null when the green patch has no dark guide lines", () => {
    const imageData = makeImageData(100, 80, (x, y) => {
      if (x >= 20 && x <= 59 && y >= 10 && y <= 49) {
        return [20, 220, 30, 255];
      }
      return [10, 10, 10, 255];
    });
    const bounds = scanNeonGreenBounds(imageData);
    expect(scanGreenSurfaceGrid(imageData, bounds!)).toBeNull();
  });

  it("detects guide lines on a tilted green patch", () => {
    const width = 240;
    const height = 240;
    const points: { x: number; y: number }[] = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const dx = x - 120;
        const dy = y - 120;
        const u = dx * Math.cos(0.55) + dy * Math.sin(0.55);
        const v = -dx * Math.sin(0.55) + dy * Math.cos(0.55);
        if (Math.abs(u) <= 60 && Math.abs(v) <= 30) {
          const onGrid =
            Math.abs(u / 15 - Math.round(u / 15)) < 0.12 ||
            Math.abs(v / 7.5 - Math.round(v / 7.5)) < 0.12;
          points.push({ x, y });
          if (onGrid) continue;
        }
      }
    }

    const imageData = makeImageData(width, height, (x, y) => {
      const dx = x - 120;
      const dy = y - 120;
      const u = dx * Math.cos(0.55) + dy * Math.sin(0.55);
      const v = -dx * Math.sin(0.55) + dy * Math.cos(0.55);
      if (Math.abs(u) <= 60 && Math.abs(v) <= 30) {
        const onGrid =
          Math.abs(u / 15 - Math.round(u / 15)) < 0.12 ||
          Math.abs(v / 7.5 - Math.round(v / 7.5)) < 0.12;
        if (onGrid) return [0, 0, 0, 255];
        return [20, 220, 30, 255];
      }
      return [30, 30, 30, 255];
    });

    const bounds = scanNeonGreenBounds(imageData);
    expect(bounds).not.toBeNull();
    const grid = scanGreenSurfaceGrid(imageData, bounds!);
    expect(grid).not.toBeNull();
    expect(grid!.cols).toBeGreaterThanOrEqual(3);
    expect(grid!.rows).toBeGreaterThanOrEqual(3);
  });
});
