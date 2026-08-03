import {
  ROTATION_SNAPS_45,
  getRotationSnapToleranceForShift,
  getRotationSnapsForShift,
  rotateItemAroundCenter,
} from "./rotationControls";

describe("rotationControls", () => {
  describe("getRotationSnapsForShift", () => {
    it("returns empty snaps when Shift is not held", () => {
      expect(getRotationSnapsForShift(false)).toEqual([]);
    });

    it("returns 45° increments when Shift is held", () => {
      expect(getRotationSnapsForShift(true)).toEqual([...ROTATION_SNAPS_45]);
    });
  });

  describe("getRotationSnapToleranceForShift", () => {
    it("uses a half-step tolerance while Shift is held (avoids skipping 0°)", () => {
      expect(getRotationSnapToleranceForShift(true)).toBe(22.5);
      expect(getRotationSnapToleranceForShift(false)).toBe(5);
    });
  });

  /**
   * Mirrors Konva Transformer's getSnap: last matching angle within tolerance wins.
   * Documents why ROTATION_SNAP_TOLERANCE_SHIFT must stay ≤ 22.5°.
   */
  function konvaStyleSnap(
    snaps: readonly number[],
    rotationDeg: number,
    toleranceDeg: number,
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const newRotationRad = toRad(rotationDeg);
    let snapped = newRotationRad;
    const tol = toRad(toleranceDeg);
    for (const snapDeg of snaps) {
      const angle = toRad(snapDeg);
      const absDiff = Math.abs(angle - newRotationRad) % (Math.PI * 2);
      const dif = Math.min(absDiff, Math.PI * 2 - absDiff);
      if (dif < tol) {
        snapped = angle;
      }
    }
    return (snapped * 180) / Math.PI;
  }

  describe("Konva-style snap near 0°", () => {
    it("reaches 0° with half-step tolerance from either drag side", () => {
      expect(konvaStyleSnap(ROTATION_SNAPS_45, 10, 22.5)).toBeCloseTo(0);
      expect(konvaStyleSnap(ROTATION_SNAPS_45, -10, 22.5)).toBeCloseTo(0);
    });

    it("skips 0° with a full-step tolerance (the former bug)", () => {
      // Last match within 45° wins → 45° or 315°, not 0°.
      expect(konvaStyleSnap(ROTATION_SNAPS_45, 10, 45)).toBeCloseTo(45);
      expect(konvaStyleSnap(ROTATION_SNAPS_45, -10, 45)).toBeCloseTo(315);
    });
  });

  describe("rotateItemAroundCenter", () => {
    it("returns the same item for a zero delta", () => {
      const item = {
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        scaleX: 1,
        scaleY: 1,
        rotation: 15,
      };
      expect(rotateItemAroundCenter(item, 0)).toBe(item);
    });

    it("keeps the visual center fixed for a 90° CW rotation", () => {
      const item = {
        x: 100,
        y: 50,
        width: 100,
        height: 50,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      };
      // Visual center stays at (150, 75); top-left → (175, 25) after 90° CW.
      const rotated = rotateItemAroundCenter(item, 90);
      expect(rotated.rotation).toBe(90);
      expect(rotated.x).toBeCloseTo(175);
      expect(rotated.y).toBeCloseTo(25);
    });

    it("keeps the visual center fixed for a 90° CCW rotation", () => {
      const item = {
        x: 100,
        y: 50,
        width: 100,
        height: 50,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      };
      const rotated = rotateItemAroundCenter(item, -90);
      expect(rotated.rotation).toBe(-90);
      // Visual center stays at (150, 75); top-left → (125, 125) after 90° CCW.
      expect(rotated.x).toBeCloseTo(125);
      expect(rotated.y).toBeCloseTo(125);
    });

    it("round-trips ±90° back to the original pose", () => {
      const item = {
        x: 40,
        y: 80,
        width: 80,
        height: 40,
        scaleX: 1.5,
        scaleY: 1.5,
        rotation: 12,
      };
      const cw = rotateItemAroundCenter(item, 90);
      const back = rotateItemAroundCenter(cw, -90);
      expect(back.rotation).toBeCloseTo(item.rotation);
      expect(back.x).toBeCloseTo(item.x);
      expect(back.y).toBeCloseTo(item.y);
    });
  });
});
