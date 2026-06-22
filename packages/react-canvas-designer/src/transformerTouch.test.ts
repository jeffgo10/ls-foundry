import {
  applyTransformerAnchorHitArea,
  CANVAS_INTERACTION_STYLE,
  getTransformerTouchProfile,
  isCoarsePointerDevice,
} from "./transformerTouch";

describe("transformerTouch", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    // @ts-expect-error test cleanup
    delete window.ontouchstart;
  });

  it("exports canvas interaction styles that block touch callout", () => {
    expect(CANVAS_INTERACTION_STYLE.WebkitTouchCallout).toBe("none");
    expect(CANVAS_INTERACTION_STYLE.touchAction).toBe("none");
    expect(CANVAS_INTERACTION_STYLE.userSelect).toBe("none");
  });

  it("detects coarse pointer via ontouchstart", () => {
    Object.defineProperty(window, "ontouchstart", {
      configurable: true,
      value: () => {},
    });
    expect(isCoarsePointerDevice()).toBe(true);
  });

  it("detects coarse pointer via matchMedia", () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    expect(isCoarsePointerDevice()).toBe(true);
  });

  it("returns false on fine-pointer desktops", () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    expect(isCoarsePointerDevice()).toBe(false);
  });

  it("returns false when matchMedia is unavailable", () => {
    // @ts-expect-error test override
    window.matchMedia = undefined;
    expect(isCoarsePointerDevice()).toBe(false);
  });

  it("returns null touch profile on fine-pointer desktops", () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    expect(getTransformerTouchProfile(false)).toBeNull();
    expect(getTransformerTouchProfile()).toBeNull();
  });

  it("auto-detects touch profile on coarse-pointer devices", () => {
    Object.defineProperty(window, "ontouchstart", {
      configurable: true,
      value: () => {},
    });
    expect(getTransformerTouchProfile()).toEqual({
      anchorSize: 14,
      rotateAnchorOffset: 36,
      borderStrokeWidth: 2,
      anchorHitStrokeWidth: 28,
    });
  });

  it("returns enlarged anchors when touchFriendly is true", () => {
    const profile = getTransformerTouchProfile(true);
    expect(profile).toEqual({
      anchorSize: 14,
      rotateAnchorOffset: 36,
      borderStrokeWidth: 2,
      anchorHitStrokeWidth: 28,
    });
  });

  it("applies enlarged hit area to transformer anchors", () => {
    const anchor = { hitStrokeWidth: jest.fn() };
    applyTransformerAnchorHitArea(anchor as never, 28);
    expect(anchor.hitStrokeWidth).toHaveBeenCalledWith(28);
  });
});
