import {
  CANVAS_SHELL_BORDER_PX,
  computeContainerFitScale,
  getContainerFitDimensions,
  getFullSizeContainerDimensions,
} from "./containerFitScale";

describe("computeContainerFitScale", () => {
  it("returns 1 when the container is wider than the canvas", () => {
    expect(computeContainerFitScale(800, 595)).toBe(1);
  });

  it("returns 1 when the container matches the canvas including border", () => {
    expect(computeContainerFitScale(595 + CANVAS_SHELL_BORDER_PX, 595)).toBe(1);
  });

  it("scales down to fit a narrower container", () => {
    expect(computeContainerFitScale(300, 595)).toBeCloseTo(298 / 595);
  });

  it("never scales above 1", () => {
    expect(computeContainerFitScale(2000, 595)).toBe(1);
  });

  it("returns 0 for unknown container width so callers can avoid a full-size flash", () => {
    expect(computeContainerFitScale(0, 595)).toBe(0);
    expect(computeContainerFitScale(Number.NaN, 595)).toBe(0);
  });

  it("returns 1 for invalid canvas width", () => {
    expect(computeContainerFitScale(300, 0)).toBe(1);
  });
});

describe("getFullSizeContainerDimensions", () => {
  it("returns design size at scale 1", () => {
    const fit = getFullSizeContainerDimensions(595, 842);
    expect(fit.displayScale).toBe(1);
    expect(fit.stageDisplayWidth).toBe(595);
    expect(fit.stageDisplayHeight).toBe(842);
    expect(fit.shellWidth).toBe(595 + CANVAS_SHELL_BORDER_PX);
    expect(fit.shellHeight).toBe(842 + CANVAS_SHELL_BORDER_PX);
  });
});

describe("getContainerFitDimensions", () => {
  it("derives shell and stage sizes from the fit scale", () => {
    const fit = getContainerFitDimensions(300, 595, 842);
    expect(fit.displayScale).toBeCloseTo(298 / 595);
    expect(fit.stageDisplayWidth).toBeCloseTo(595 * fit.displayScale);
    expect(fit.stageDisplayHeight).toBeCloseTo(842 * fit.displayScale);
    expect(fit.shellWidth).toBeCloseTo(fit.stageDisplayWidth + CANVAS_SHELL_BORDER_PX);
    expect(fit.shellHeight).toBeCloseTo(fit.stageDisplayHeight + CANVAS_SHELL_BORDER_PX);
  });

  it("returns zero stage size when container width is unknown", () => {
    const fit = getContainerFitDimensions(0, 595, 842);
    expect(fit.displayScale).toBe(0);
    expect(fit.stageDisplayWidth).toBe(0);
    expect(fit.stageDisplayHeight).toBe(0);
  });
});
