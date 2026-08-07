import { render, screen } from "@testing-library/react";

import { SlidingText } from "./SlidingText";
import {
  SLIDING_TEXT_DEFAULTS,
  SLIDING_TEXT_GROUP_ATTR,
  slidingTextGroupProps,
} from "./slidingTextCss";

describe("SlidingText", () => {
  it("renders dual layers with clip geometry and injected CSS", () => {
    const { container } = render(<SlidingText>HOME</SlidingText>);
    const root = container.querySelector("[data-lsm-sliding]");
    expect(root).not.toBeNull();
    expect(root).toHaveStyle({
      display: "inline-block",
      height: SLIDING_TEXT_DEFAULTS.clipHeight,
      overflow: "hidden",
      lineHeight: SLIDING_TEXT_DEFAULTS.clipHeight,
    });

    const primary = container.querySelector("[data-lsm-sliding-primary]");
    const active = container.querySelector("[data-lsm-sliding-active]");
    expect(primary?.textContent).toBe("HOME");
    expect(active?.textContent).toBe("HOME");
    expect(active?.getAttribute("aria-hidden")).toBe("true");

    const style = container.querySelector("style");
    expect(style?.textContent).toContain("data-lsm-sliding-primary");
    expect(style?.textContent).toContain(":hover");
    expect(style?.textContent).toContain(`[${SLIDING_TEXT_GROUP_ATTR}]`);
  });

  it("applies color and activeColor independently", () => {
    const { container } = render(
      <SlidingText color="rgba(255,255,255,0.6)" activeColor="#ffffff">
        SHOWCASE
      </SlidingText>,
    );
    expect(
      container.querySelector("[data-lsm-sliding-primary]"),
    ).toHaveStyle({ color: "rgba(255, 255, 255, 0.6)" });
    expect(
      container.querySelector("[data-lsm-sliding-active]"),
    ).toHaveStyle({ color: "rgb(255, 255, 255)" });
  });

  it("defaults activeColor to color", () => {
    const { container } = render(
      <SlidingText color="#fff">CONTACT</SlidingText>,
    );
    expect(
      container.querySelector("[data-lsm-sliding-primary]"),
    ).toHaveStyle({ color: "rgb(255, 255, 255)" });
    expect(
      container.querySelector("[data-lsm-sliding-active]"),
    ).toHaveStyle({ color: "rgb(255, 255, 255)" });
  });

  it("marks the clip decorative when requested", () => {
    const { container } = render(
      <SlidingText decorative>SCRAMBLE</SlidingText>,
    );
    expect(container.querySelector("[data-lsm-sliding]")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("exports group props for interactive ancestors", () => {
    const { container } = render(
      <a href="/x" {...slidingTextGroupProps}>
        <SlidingText>GO</SlidingText>
      </a>,
    );
    expect(screen.getByRole("link").getAttribute(SLIDING_TEXT_GROUP_ATTR)).toBe(
      "",
    );
    expect(
      container.querySelector("[data-lsm-sliding-primary]")?.textContent,
    ).toBe("GO");
  });
});
