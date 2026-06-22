import {
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

  it("returns null touch profile on fine-pointer desktops", () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    expect(getTransformerTouchProfile(false)).toBeNull();
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
});
