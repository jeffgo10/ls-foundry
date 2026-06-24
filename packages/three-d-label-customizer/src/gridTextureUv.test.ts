import { localToCanvas } from "./orientedCoords";
import {
  colsRunAlongTextureHorizontal,
  labelNeedsTextureUvSwap,
  mapGridPointToTextureUv,
} from "./labelSceneCoords";
import type { TargetBounds } from "./types";

const axisBounds: TargetBounds = {
  minX: 10,
  maxX: 89,
  minY: 10,
  maxY: 49,
  centerX: 49.5,
  centerY: 29.5,
  width: 80,
  height: 40,
  aspectRatio: 2,
  rotationDegrees: 0,
};

const portraitBounds: TargetBounds = {
  ...axisBounds,
  rotationDegrees: 90,
};

const tiltedBottleBounds: TargetBounds = {
  ...axisBounds,
  rotationDegrees: 32,
};

const portraitLabel = { width: 400, height: 800 };

function orientedCorner(
  bounds: TargetBounds,
  lu: number,
  lv: number,
): { x: number; y: number } {
  const axisAngleRad = (bounds.rotationDegrees * Math.PI) / 180;
  return localToCanvas(
    lu,
    lv,
    bounds.centerX,
    bounds.centerY,
    axisAngleRad,
  );
}

describe("grid texture UV mapping", () => {
  it("maps axis-aligned oriented corners without mirroring", () => {
    const topLeft = orientedCorner(axisBounds, -axisBounds.width / 2, -axisBounds.height / 2);
    const bottomRight = orientedCorner(axisBounds, axisBounds.width / 2, axisBounds.height / 2);
    expect(
      mapGridPointToTextureUv(topLeft.x, topLeft.y, axisBounds, portraitLabel),
    ).toEqual([1, 1]);
    expect(
      mapGridPointToTextureUv(bottomRight.x, bottomRight.y, axisBounds, {
        width: 800,
        height: 400,
      }),
    ).toEqual([0, 0]);
  });

  it("maps portrait (90°) oriented corners to upright texture coords", () => {
    const topLeft = orientedCorner(
      portraitBounds,
      -portraitBounds.width / 2,
      -portraitBounds.height / 2,
    );
    const bottomRight = orientedCorner(
      portraitBounds,
      portraitBounds.width / 2,
      portraitBounds.height / 2,
    );
    expect(
      mapGridPointToTextureUv(topLeft.x, topLeft.y, portraitBounds, portraitLabel),
    ).toEqual([1, 1]);
    expect(
      mapGridPointToTextureUv(bottomRight.x, bottomRight.y, portraitBounds, portraitLabel),
    ).toEqual([0, 0]);
  });

  it("maps tilted (~32°) oriented corners with the patch", () => {
    const topLeft = orientedCorner(
      tiltedBottleBounds,
      -tiltedBottleBounds.width / 2,
      -tiltedBottleBounds.height / 2,
    );
    const bottomRight = orientedCorner(
      tiltedBottleBounds,
      tiltedBottleBounds.width / 2,
      tiltedBottleBounds.height / 2,
    );
    const topUv = mapGridPointToTextureUv(
      topLeft.x,
      topLeft.y,
      tiltedBottleBounds,
      portraitLabel,
    );
    expect(topUv[0]).toBeCloseTo(1, 5);
    expect(topUv[1]).toBeCloseTo(1, 5);
    const bottomUv = mapGridPointToTextureUv(
      bottomRight.x,
      bottomRight.y,
      tiltedBottleBounds,
      portraitLabel,
    );
    expect(bottomUv[0]).toBeCloseTo(0, 5);
    expect(bottomUv[1]).toBeCloseTo(0, 5);
  });

  it("rotates texture with the patch — U constant along the long axis on a tilt", () => {
    const halfW = tiltedBottleBounds.width / 2;
    const low = orientedCorner(tiltedBottleBounds, -halfW, 0);
    const high = orientedCorner(tiltedBottleBounds, halfW, 0);
    const [lowU] = mapGridPointToTextureUv(
      low.x,
      low.y,
      tiltedBottleBounds,
      portraitLabel,
    );
    const [highU] = mapGridPointToTextureUv(
      high.x,
      high.y,
      tiltedBottleBounds,
      portraitLabel,
    );
    const [, lowV] = mapGridPointToTextureUv(
      low.x,
      low.y,
      tiltedBottleBounds,
      portraitLabel,
    );
    const [, highV] = mapGridPointToTextureUv(
      high.x,
      high.y,
      tiltedBottleBounds,
      portraitLabel,
    );
    expect(lowU).toBeCloseTo(highU, 5);
    expect(lowV).not.toBeCloseTo(highV, 2);
  });

  it("does not swap UV for portrait art on a portrait bottle patch", () => {
    expect(labelNeedsTextureUvSwap(portraitBounds, portraitLabel)).toBe(false);
    expect(labelNeedsTextureUvSwap(tiltedBottleBounds, portraitLabel)).toBe(
      false,
    );
  });

  it("swaps UV for landscape art on a portrait bottle patch", () => {
    expect(
      labelNeedsTextureUvSwap(portraitBounds, { width: 800, height: 400 }),
    ).toBe(true);
  });

  it("increases texture V along the patch long axis on a tilted bottle", () => {
    const halfW = tiltedBottleBounds.width / 2;
    const low = orientedCorner(tiltedBottleBounds, -halfW, 0);
    const high = orientedCorner(tiltedBottleBounds, halfW, 0);
    const [, lowV] = mapGridPointToTextureUv(
      low.x,
      low.y,
      tiltedBottleBounds,
      portraitLabel,
    );
    const [, highV] = mapGridPointToTextureUv(
      high.x,
      high.y,
      tiltedBottleBounds,
      portraitLabel,
    );
    expect(lowV).toBeGreaterThan(highV);
  });

  it("reads texture left-to-right along the wrap axis (no horizontal mirror)", () => {
    const halfH = tiltedBottleBounds.height / 2;
    const wrapLow = orientedCorner(tiltedBottleBounds, 0, -halfH);
    const wrapHigh = orientedCorner(tiltedBottleBounds, 0, halfH);
    const [lowU] = mapGridPointToTextureUv(
      wrapLow.x,
      wrapLow.y,
      tiltedBottleBounds,
      portraitLabel,
    );
    const [highU] = mapGridPointToTextureUv(
      wrapHigh.x,
      wrapHigh.y,
      tiltedBottleBounds,
      portraitLabel,
    );
    expect(lowU).toBeGreaterThan(highU);
  });

  it("bows along columns for portrait labels in applyGridCurvature pairing", () => {
    expect(colsRunAlongTextureHorizontal(85)).toBe(false);
    expect(colsRunAlongTextureHorizontal(-85)).toBe(false);
    expect(colsRunAlongTextureHorizontal(10)).toBe(true);
  });
});
