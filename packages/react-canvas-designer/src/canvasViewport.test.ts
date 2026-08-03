import {
  clampPan,
  clampUserZoom,
  composeStageTransform,
  DEFAULT_MAX_USER_ZOOM,
  DEFAULT_MIN_USER_ZOOM,
  zoomAtPoint,
} from "./canvasViewport";

describe("clampUserZoom", () => {
  it("clamps to the default 1…4 range", () => {
    expect(clampUserZoom(0.5)).toBe(DEFAULT_MIN_USER_ZOOM);
    expect(clampUserZoom(1)).toBe(1);
    expect(clampUserZoom(2.5)).toBe(2.5);
    expect(clampUserZoom(10)).toBe(DEFAULT_MAX_USER_ZOOM);
  });

  it("falls back to min for non-finite values", () => {
    expect(clampUserZoom(Number.NaN)).toBe(DEFAULT_MIN_USER_ZOOM);
    expect(clampUserZoom(Number.POSITIVE_INFINITY)).toBe(DEFAULT_MIN_USER_ZOOM);
  });
});

describe("clampPan", () => {
  const base = {
    fitScale: 0.5,
    canvasWidth: 600,
    canvasHeight: 800,
    viewportWidth: 300,
    viewportHeight: 400,
  };

  it("forces pan to 0 at zoom 1", () => {
    expect(
      clampPan({ panX: -50, panY: -80 }, { ...base, userZoom: 1 }),
    ).toEqual({ panX: 0, panY: 0 });
  });

  it("clamps pan so content stays overlapping the viewport when zoomed in", () => {
    // content = 600 * 0.5 * 2 = 600, viewport = 300 → panX in [-300, 0]
    expect(
      clampPan({ panX: -50, panY: -100 }, { ...base, userZoom: 2 }),
    ).toEqual({ panX: -50, panY: -100 });

    expect(
      clampPan({ panX: -500, panY: 20 }, { ...base, userZoom: 2 }),
    ).toEqual({ panX: -300, panY: 0 });
  });
});

describe("zoomAtPoint", () => {
  const base = {
    fitScale: 0.5,
    canvasWidth: 600,
    canvasHeight: 800,
    viewportWidth: 300,
    viewportHeight: 400,
    pointerBuffer: { x: 150, y: 200 },
    pan: { panX: 0, panY: 0 },
  };

  it("keeps the design point under the pointer fixed when zooming in", () => {
    const result = zoomAtPoint({
      ...base,
      currentZoom: 1,
      nextZoom: 2,
    });

    expect(result.zoom).toBe(2);
    // design under pointer at zoom 1: (150/0.5, 200/0.5) = (300, 400)
    // new pan: 150 - 300*1 = -150, 200 - 400*1 = -200
    expect(result.panX).toBeCloseTo(-150);
    expect(result.panY).toBeCloseTo(-200);
  });

  it("resets pan when zooming back to 1", () => {
    const result = zoomAtPoint({
      ...base,
      currentZoom: 2,
      nextZoom: 1,
      pan: { panX: -150, panY: -200 },
    });

    expect(result).toEqual({ zoom: 1, panX: 0, panY: 0 });
  });

  it("clamps nextZoom to max", () => {
    const result = zoomAtPoint({
      ...base,
      currentZoom: 1,
      nextZoom: 99,
    });
    expect(result.zoom).toBe(DEFAULT_MAX_USER_ZOOM);
  });
});

describe("composeStageTransform", () => {
  it("multiplies fit scale by user zoom and zeros pan at zoom 1", () => {
    expect(composeStageTransform(0.5, 1, { panX: -10, panY: -20 })).toEqual({
      scaleX: 0.5,
      scaleY: 0.5,
      x: 0,
      y: 0,
    });
  });

  it("applies pan when zoomed in", () => {
    expect(composeStageTransform(0.5, 2, { panX: -40, panY: -80 })).toEqual({
      scaleX: 1,
      scaleY: 1,
      x: -40,
      y: -80,
    });
  });
});
