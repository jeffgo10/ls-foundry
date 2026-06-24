import { LABEL_TEXTURE_UPRIGHT_RADIANS } from "./labelSceneCoords";
import { resolveLabelOrientation } from "./resolveLabelOrientation";

describe("resolveLabelOrientation", () => {
  it("keeps green surface dimensions on the mesh", () => {
    const result = resolveLabelOrientation(120, 60, 800, 400);
    expect(result.meshWidth).toBe(120);
    expect(result.meshHeight).toBe(60);
    expect(result.textureRotationRadians).toBe(LABEL_TEXTURE_UPRIGHT_RADIANS);
  });

  it("quarter-turns texture for a portrait label on a landscape patch", () => {
    const result = resolveLabelOrientation(120, 60, 400, 800);
    expect(result.meshWidth).toBe(120);
    expect(result.meshHeight).toBe(60);
    expect(result.textureRotationRadians).toBeCloseTo(
      LABEL_TEXTURE_UPRIGHT_RADIANS + Math.PI / 2,
    );
  });

  it("quarter-turns texture for a landscape label on a portrait patch", () => {
    const result = resolveLabelOrientation(60, 120, 800, 400);
    expect(result.meshWidth).toBe(60);
    expect(result.meshHeight).toBe(120);
    expect(result.textureRotationRadians).toBeCloseTo(
      LABEL_TEXTURE_UPRIGHT_RADIANS + Math.PI / 2,
    );
  });
});
