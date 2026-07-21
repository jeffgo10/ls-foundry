import { render, renderHook, screen } from "@testing-library/react";
import { useContainerFitScale } from "./useContainerFitScale";
import { CANVAS_SHELL_BORDER_PX } from "./containerFitScale";

function mockClientWidth(node: HTMLElement, width: number) {
  Object.defineProperty(node, "clientWidth", {
    configurable: true,
    value: width,
  });
}

describe("useContainerFitScale", () => {
  const previousResizeObserver = global.ResizeObserver;

  beforeEach(() => {
    class MockResizeObserver {
      observe = (target: Element) => {
        // Ensure width is readable when the layout effect measures.
        if (!(target as HTMLElement).clientWidth) {
          mockClientWidth(target as HTMLElement, 390);
        }
      };
      disconnect = jest.fn();
      unobserve = jest.fn();
    }
    global.ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    global.ResizeObserver = previousResizeObserver;
  });

  it("stays unready at scale 0 until a container node is available", () => {
    const { result } = renderHook(() =>
      useContainerFitScale(true, 595, 842),
    );

    expect(result.current.isReady).toBe(false);
    expect(result.current.fit.displayScale).toBe(0);
    expect(result.current.fit.stageDisplayWidth).toBe(0);
  });

  it("measures in useLayoutEffect once the container mounts", () => {
    function Harness() {
      const { containerRef, fit, isReady } = useContainerFitScale(
        true,
        595,
        842,
      );
      return (
        <div
          ref={(element) => {
            if (element) {
              mockClientWidth(element, 390);
            }
            containerRef(element);
          }}
          data-testid="fit-wrap"
          data-ready={String(isReady)}
          data-scale={String(fit.displayScale)}
        />
      );
    }

    render(<Harness />);

    const wrap = screen.getByTestId("fit-wrap");
    expect(wrap.getAttribute("data-ready")).toBe("true");
    expect(Number(wrap.getAttribute("data-scale"))).toBeCloseTo(
      (390 - CANVAS_SHELL_BORDER_PX) / 595,
    );
  });

  it("is immediately ready at full size when fit is disabled", () => {
    const { result } = renderHook(() =>
      useContainerFitScale(false, 595, 842),
    );

    expect(result.current.isReady).toBe(true);
    expect(result.current.fit.displayScale).toBe(1);
    expect(result.current.fit.stageDisplayWidth).toBe(595);
  });
});
