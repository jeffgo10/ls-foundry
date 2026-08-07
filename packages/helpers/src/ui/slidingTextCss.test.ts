import {
  buildSlidingTextCss,
  SLIDING_TEXT_DEFAULTS,
  SLIDING_TEXT_GROUP_ATTR,
} from "./slidingTextCss";

describe("buildSlidingTextCss", () => {
  it("scopes transforms for rest, hover, focus, and group ancestors", () => {
    const css = buildSlidingTextCss("abc123", {
      durationMs: 300,
      easing: "cubic-bezier(0.2, 0.9, 0.2, 1)",
      slideDistance: "110%",
    });

    expect(css).toContain('[data-lsm-sliding="abc123"]');
    expect(css).toContain("[data-lsm-sliding-primary]");
    expect(css).toContain("[data-lsm-sliding-active]");
    expect(css).toContain("translateY(0)");
    expect(css).toContain("translateY(110%)");
    expect(css).toContain("translateY(-110%)");
    expect(css).toContain("300ms");
    expect(css).toContain("cubic-bezier(0.2, 0.9, 0.2, 1)");
    expect(css).toContain(":hover");
    expect(css).toContain(":focus-visible");
    expect(css).toContain(":focus-within");
    expect(css).toContain(`[${SLIDING_TEXT_GROUP_ATTR}]:hover`);
    expect(css).toContain(`[${SLIDING_TEXT_GROUP_ATTR}]:focus-visible`);
  });

  it("falls back to default motion options when omitted", () => {
    const css = buildSlidingTextCss("defaults");
    expect(css).toContain(
      `transform ${SLIDING_TEXT_DEFAULTS.durationMs}ms ${SLIDING_TEXT_DEFAULTS.easing}`,
    );
    expect(css).toContain(`translateY(${SLIDING_TEXT_DEFAULTS.slideDistance})`);
    expect(css).toContain(`translateY(-${SLIDING_TEXT_DEFAULTS.slideDistance})`);
  });

  it("sanitizes scope ids and accepts custom motion", () => {
    const css = buildSlidingTextCss("x:y!", {
      durationMs: 120,
      slideDistance: "100%",
      easing: "linear",
    });
    expect(css).toContain('[data-lsm-sliding="xy"]');
    expect(css).toContain("120ms linear");
    expect(css).toContain("translateY(100%)");
  });
});
