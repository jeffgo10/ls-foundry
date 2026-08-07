import { act, render, screen } from "@testing-library/react";

import { resetSkipEnvironmentCache } from "../text/skipEnvironment";
import { LiteShadeBrand } from "./LiteShadeBrand";
import { LiteShadeMark } from "./LiteShadeMark";
import { LiteShadeWordmark } from "./LiteShadeWordmark";
import {
  LSM_BRAND_LABEL,
  LSM_PATH_INNER_A,
  LSM_PATH_INNER_B,
  LSM_PATH_OUTER,
  LSM_VIEW_BOX,
} from "./paths";

describe("LiteShadeMark", () => {
  beforeEach(() => {
    resetSkipEnvironmentCache();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }),
    });
  });

  afterEach(() => {
    resetSkipEnvironmentCache();
    jest.restoreAllMocks();
  });

  it("renders three separate paths with animation hooks", () => {
    const { container } = render(<LiteShadeMark blinkDisabled />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("viewBox")).toBe(LSM_VIEW_BOX);
    expect(svg?.getAttribute("width")).toBe("24");
    expect(svg?.getAttribute("height")).toBe("24");

    const group = container.querySelector("[data-lsm-mark]");
    expect(group).not.toBeNull();
    expect(group?.classList.contains("lsm-mark")).toBe(true);

    const paths = container.querySelectorAll("path[data-lsm-path]");
    expect(paths).toHaveLength(3);
    expect(paths[0]?.getAttribute("data-lsm-path")).toBe("outer");
    expect(paths[1]?.getAttribute("data-lsm-path")).toBe("inner-a");
    expect(paths[2]?.getAttribute("data-lsm-path")).toBe("inner-b");
    expect(paths[0]?.getAttribute("d")).toBe(LSM_PATH_OUTER);
    expect(paths[1]?.getAttribute("d")).toBe(LSM_PATH_INNER_A);
    expect(paths[2]?.getAttribute("d")).toBe(LSM_PATH_INNER_B);
    expect(group?.getAttribute("fill")).toBe("currentColor");
  });

  it("applies color via style and size via width/height", () => {
    const { container } = render(
      <LiteShadeMark size={32} color="#ffffff" blinkDisabled />,
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("32");
    expect(svg?.getAttribute("height")).toBe("32");
    expect(svg).toHaveStyle({ color: "#ffffff" });
  });

  it("exposes an accessible title by default", () => {
    render(<LiteShadeMark blinkDisabled />);
    expect(screen.getByRole("img", { name: "LiteShadeMedia" })).toBeTruthy();
    expect(screen.getByTitle("LiteShadeMedia")).toBeTruthy();
  });

  it("omits title when decorative (aria-hidden)", () => {
    const { container } = render(
      <LiteShadeMark aria-hidden title={undefined} blinkDisabled />,
    );
    expect(container.querySelector("title")).toBeNull();
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("runs unsynced fluorescent blink CSS on mount", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.35);
    const { container } = render(
      <LiteShadeMark blinkDurationMs={800} blinkDelayMs={0} />,
    );

    expect(container.querySelector("style")?.textContent).toEqual(
      expect.stringContaining("@keyframes"),
    );

    const outer = container.querySelector('[data-lsm-path="outer"]');
    const innerA = container.querySelector('[data-lsm-path="inner-a"]');
    const innerB = container.querySelector('[data-lsm-path="inner-b"]');
    expect(outer?.getAttribute("data-lsm-blink")).toBeTruthy();
    expect(innerA?.getAttribute("data-lsm-blink")).toBeTruthy();
    expect(innerB?.getAttribute("data-lsm-blink")).toBeTruthy();
    expect(outer?.getAttribute("data-lsm-blink")).not.toBe(
      innerA?.getAttribute("data-lsm-blink"),
    );
  });

  it("skips fluorescent blink when blinkDisabled", () => {
    const { container } = render(<LiteShadeMark blinkDisabled />);
    expect(container.querySelector("style")).toBeNull();
    expect(
      container.querySelector("[data-lsm-blink]"),
    ).toBeNull();
  });
});

describe("LiteShadeWordmark", () => {
  beforeEach(() => {
    resetSkipEnvironmentCache();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }),
    });
  });

  afterEach(() => {
    resetSkipEnvironmentCache();
    jest.restoreAllMocks();
  });

  it("always renders the fixed LITESHADEMEDIA label (SEO layer)", () => {
    const { container } = render(<LiteShadeWordmark disabled />);
    expect(screen.getAllByText(LSM_BRAND_LABEL).length).toBeGreaterThanOrEqual(1);
    expect(
      container.querySelector("[aria-hidden='true']")?.textContent,
    ).toBe(LSM_BRAND_LABEL);
  });

  it("ignores a custom label if passed at runtime", () => {
    const { container } = render(
      // @ts-expect-error — label is intentionally not part of the public API
      <LiteShadeWordmark label="CUSTOM" disabled />,
    );
    expect(container.querySelector("[data-lsm-wordmark]")?.getAttribute("label")).toBeNull();
    expect(screen.queryByText("CUSTOM")).toBeNull();
    expect(
      container.querySelector("[aria-hidden='true']")?.textContent,
    ).toBe(LSM_BRAND_LABEL);
  });

  it("supports color, as, and scramble disabled", () => {
    const { container } = render(
      <LiteShadeWordmark as="p" color="#abc" disabled />,
    );
    const el = container.querySelector("[data-lsm-wordmark]");
    expect(el?.tagName).toBe("P");
    expect(el).toHaveStyle({ color: "#abc", letterSpacing: "0.25em" });
    expect(el?.querySelector("[aria-hidden='true']")?.textContent).toBe(
      LSM_BRAND_LABEL,
    );
  });

  it("scrambles then reveals via useScrambleReveal", () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    let nowMs = 0;
    jest.spyOn(performance, "now").mockImplementation(() => nowMs);
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    jest.spyOn(Math, "random").mockReturnValue(0);

    const { container } = render(
      <LiteShadeWordmark
        tickIntervalMs={1}
        initialScrambleMs={10}
        charRevealMs={5}
      />,
    );

    const flush = (atMs: number) => {
      nowMs = atMs;
      const pending = [...rafCallbacks];
      rafCallbacks.length = 0;
      act(() => {
        for (const cb of pending) cb(atMs);
      });
    };

    flush(0);
    const animated = container.querySelector("[aria-hidden='true']");
    expect(animated?.textContent).not.toBe(LSM_BRAND_LABEL);

    for (let t = 1; t <= 500; t += 5) {
      flush(t);
      if (rafCallbacks.length === 0) break;
    }

    expect(animated?.textContent).toBe(LSM_BRAND_LABEL);
  });
});

describe("LiteShadeBrand", () => {
  it("composes mark + fixed wordmark with TopNav-like layout", () => {
    const { container } = render(
      <LiteShadeBrand color="#fff" size={24} wordmarkProps={{ disabled: true }} />,
    );
    const root = container.querySelector("[data-lsm-brand]");
    expect(root).toHaveStyle({
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      color: "#fff",
      fontSize: "0.875rem",
      letterSpacing: "0.25em",
    });
    expect(container.querySelectorAll("path[data-lsm-path]")).toHaveLength(3);
    expect(
      container.querySelector("[data-lsm-wordmark] [aria-hidden='true']")
        ?.textContent,
    ).toBe(LSM_BRAND_LABEL);
    expect(
      container.querySelector("svg")?.getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("can hide mark or wordmark", () => {
    const { container, rerender } = render(
      <LiteShadeBrand showMark={false} wordmarkProps={{ disabled: true }} />,
    );
    expect(container.querySelector("svg")).toBeNull();
    expect(
      container.querySelector("[data-lsm-wordmark] [aria-hidden='true']")
        ?.textContent,
    ).toBe(LSM_BRAND_LABEL);

    rerender(<LiteShadeBrand showWordmark={false} />);
    expect(container.querySelectorAll("path")).toHaveLength(3);
    expect(container.querySelector("[data-lsm-wordmark]")).toBeNull();
    expect(screen.getByRole("img", { name: "LiteShadeMedia" })).toBeTruthy();
  });
});
