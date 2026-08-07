import { render, screen } from "@testing-library/react";

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
  it("renders three separate paths with animation hooks", () => {
    const { container } = render(<LiteShadeMark />);
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
      <LiteShadeMark size={32} color="#ffffff" />,
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("32");
    expect(svg?.getAttribute("height")).toBe("32");
    expect(svg).toHaveStyle({ color: "#ffffff" });
  });

  it("exposes an accessible title by default", () => {
    render(<LiteShadeMark />);
    expect(screen.getByRole("img", { name: "LiteShadeMedia" })).toBeTruthy();
    expect(screen.getByTitle("LiteShadeMedia")).toBeTruthy();
  });

  it("omits title when decorative (aria-hidden)", () => {
    const { container } = render(
      <LiteShadeMark aria-hidden title={undefined} />,
    );
    expect(container.querySelector("title")).toBeNull();
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });
});

describe("LiteShadeWordmark", () => {
  it("renders the default brand label", () => {
    render(<LiteShadeWordmark />);
    expect(screen.getByText(LSM_BRAND_LABEL)).toBeTruthy();
  });

  it("supports custom label, color, and as", () => {
    const { container } = render(
      <LiteShadeWordmark as="p" label="CUSTOM" color="#abc" />,
    );
    const el = container.querySelector("[data-lsm-wordmark]");
    expect(el?.tagName).toBe("P");
    expect(el?.textContent).toBe("CUSTOM");
    expect(el).toHaveStyle({ color: "#abc", letterSpacing: "0.25em" });
  });
});

describe("LiteShadeBrand", () => {
  it("composes mark + wordmark with TopNav-like layout", () => {
    const { container } = render(<LiteShadeBrand color="#fff" size={24} />);
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
    expect(screen.getByText(LSM_BRAND_LABEL)).toBeTruthy();
    expect(
      container.querySelector("svg")?.getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("can hide mark or wordmark", () => {
    const { container, rerender } = render(
      <LiteShadeBrand showMark={false} />,
    );
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getByText(LSM_BRAND_LABEL)).toBeTruthy();

    rerender(<LiteShadeBrand showWordmark={false} />);
    expect(container.querySelectorAll("path")).toHaveLength(3);
    expect(container.querySelector("[data-lsm-wordmark]")).toBeNull();
    expect(screen.getByRole("img", { name: "LiteShadeMedia" })).toBeTruthy();
  });
});
