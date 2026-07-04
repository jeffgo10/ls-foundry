import { render, screen, waitFor, act } from "@testing-library/react";
import { createRef } from "react";
import { installMockImageLoader } from "@ls-foundry/test-utils";
import { getMockGroupApi } from "@ls-foundry/test-utils/mockKonva";
import { CanvasDesigner, type CanvasDesignerHandle } from "./CanvasDesigner";
import * as duplicateFillModule from "./duplicateFill";

jest.mock("react-dropzone", () => ({
  useDropzone: () => ({
    getRootProps: () => ({ "data-testid": "dropzone" }),
    getInputProps: () => ({ "data-testid": "dropzone-input" }),
    isDragActive: false,
  }),
}));

jest.mock("@jeffgo10/helpers/image", () => ({
  blobUrlToDataUrl: jest.fn(async () => ({
    mimeType: "image/png",
    dataUrl: "data:image/png;base64,abc",
  })),
  traceAlphaContour: jest.fn(() => []),
}));

describe("CanvasDesigner", () => {
  let restoreImage: () => void;

  beforeEach(() => {
    ({ restore: restoreImage } = installMockImageLoader(100, 80));
  });

  afterEach(() => {
    restoreImage();
  });

  it("renders empty canvas prompt", () => {
    render(<CanvasDesigner />);
    expect(screen.getByText(/Drop sticker images here/)).toBeInTheDocument();
  });

  it("applies fitToContainer sizing on the canvas shell", async () => {
    const observe = jest.fn();
    const disconnect = jest.fn();
    class MockResizeObserver {
      callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
        observe();
      }

      observe = (target: Element) => {
        Object.defineProperty(target, "clientWidth", {
          configurable: true,
          value: 300,
        });
        this.callback([], this as unknown as ResizeObserver);
      };

      disconnect = disconnect;
    }

    const previous = global.ResizeObserver;
    global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    render(
      <div style={{ width: 300 }}>
        <CanvasDesigner fitToContainer />
      </div>,
    );

    await waitFor(() => {
      const shell = document.querySelector("[data-canvas-designer]") as HTMLElement;
      expect(Number.parseFloat(shell.style.width)).toBeCloseTo(298, 0);
    });

    global.ResizeObserver = previous;
  });

  it("calls onReady with imperative handle", async () => {
    const onReady = jest.fn();
    render(<CanvasDesigner onReady={onReady} />);
    await waitFor(() => expect(onReady).toHaveBeenCalled());
    const handle = onReady.mock.calls[0]![0] as CanvasDesignerHandle;
    expect(handle.exportLayoutState).toBeDefined();
    expect(handle.clearCanvas).toBeDefined();
    expect(handle.arrangeAll).toBeDefined();
    expect(handle.verifyOverlaps).toBeDefined();
    expect(handle.clearOverlapHighlights).toBeDefined();
    expect(handle.setSelectedSize).toBeDefined();
    expect(handle.undo).toBeDefined();
    expect(handle.redo).toBeDefined();
    expect(handle.canUndo).toBeDefined();
    expect(handle.canRedo).toBeDefined();
  });

  it("exposes exportLayoutState via ref", async () => {
    const ref = createRef<CanvasDesignerHandle>();
    render(<CanvasDesigner ref={ref} />);
    await waitFor(() => expect(ref.current).toBeTruthy());
    const state = ref.current!.exportLayoutState();
    expect(state.layout.version).toBe(1);
    expect(state.assets).toEqual([]);
  });

  it("undoes and redoes sticker placement", async () => {
    const onHistoryChange = jest.fn();
    const ref = createRef<CanvasDesignerHandle>();
    render(
      <CanvasDesigner ref={ref} onHistoryChange={onHistoryChange} />,
    );
    await waitFor(() => expect(ref.current).toBeTruthy());
    expect(ref.current!.canUndo()).toBe(false);

    act(() => {
      ref.current!.addImagesFromUrls([{ url: "blob:test", mimeType: "image/png" }]);
    });

    await waitFor(() => expect(ref.current!.canUndo()).toBe(true));

    act(() => {
      expect(ref.current!.undo()).toBe(true);
    });

    await waitFor(() =>
      expect(screen.getByText(/Drop sticker images here/)).toBeInTheDocument(),
    );
    expect(ref.current!.canRedo()).toBe(true);

    act(() => {
      expect(ref.current!.redo()).toBe(true);
    });

    await waitFor(() =>
      expect(screen.queryByText(/Drop sticker images here/)).not.toBeInTheDocument(),
    );
    expect(onHistoryChange).toHaveBeenCalled();
  });

  it("undoes and redoes sticker move in the same tick as dragend", async () => {
    const ref = createRef<CanvasDesignerHandle>();
    render(<CanvasDesigner ref={ref} canvasMarginMm={0} />);
    await waitFor(() => expect(ref.current).toBeTruthy());

    act(() => {
      ref.current!.addImagesFromUrls([{ url: "blob:test", mimeType: "image/png" }]);
    });

    await waitFor(() =>
      expect(ref.current!.exportLayoutState().layout.items).toHaveLength(1),
    );

    const before = ref.current!.exportLayoutState().layout.items[0]!;
    const groupEl = document.querySelector('[data-konva="Group"]');
    expect(groupEl).toBeTruthy();
    const node = getMockGroupApi(groupEl!);
    expect(node).toBeTruthy();

    act(() => {
      node!.fire("dragstart");
      node!.x(before.x + 40);
      node!.y(before.y + 30);
      node!.fire("dragend");
    });

    const moved = ref.current!.exportLayoutState().layout.items[0]!;
    expect(moved.x).toBe(before.x + 40);
    expect(moved.y).toBe(before.y + 30);

    act(() => {
      expect(ref.current!.undo()).toBe(true);
    });

    const restored = ref.current!.exportLayoutState().layout.items[0]!;
    expect(restored.x).toBe(before.x);
    expect(restored.y).toBe(before.y);

    act(() => {
      expect(ref.current!.redo()).toBe(true);
    });

    const redone = ref.current!.exportLayoutState().layout.items[0]!;
    expect(redone.x).toBe(before.x + 40);
    expect(redone.y).toBe(before.y + 30);
  });

  it("adds images and clears canvas", async () => {
    const ref = createRef<CanvasDesignerHandle>();
    render(<CanvasDesigner ref={ref} />);
    await waitFor(() => expect(ref.current).toBeTruthy());

    act(() => {
      ref.current!.addImagesFromUrls([{ url: "blob:test", mimeType: "image/png" }]);
    });

    await waitFor(() =>
      expect(screen.queryByText(/Drop sticker images here/)).not.toBeInTheDocument(),
    );

    act(() => {
      ref.current!.clearCanvas();
    });

    await waitFor(() =>
      expect(screen.getByText(/Drop sticker images here/)).toBeInTheDocument(),
    );
  });

  it("calls onSelectedIdChange when selection changes", async () => {
    const onSelectedIdChange = jest.fn();
    const ref = createRef<CanvasDesignerHandle>();
    render(
      <CanvasDesigner ref={ref} onSelectedIdChange={onSelectedIdChange} />,
    );
    await waitFor(() => expect(ref.current).toBeTruthy());
    expect(onSelectedIdChange).toHaveBeenCalledWith(null);

    act(() => {
      ref.current!.addImagesFromUrls([{ url: "blob:test", mimeType: "image/png" }]);
    });

    await waitFor(() =>
      expect(onSelectedIdChange).toHaveBeenLastCalledWith(expect.any(String)),
    );
  });

  it("calls onSelectedIdsChange with the full selection set", async () => {
    const onSelectedIdsChange = jest.fn();
    const ref = createRef<CanvasDesignerHandle>();
    render(
      <CanvasDesigner ref={ref} onSelectedIdsChange={onSelectedIdsChange} />,
    );
    await waitFor(() => expect(ref.current).toBeTruthy());
    expect(onSelectedIdsChange).toHaveBeenCalledWith([]);

    act(() => {
      ref.current!.addImagesFromUrls([{ url: "blob:test", mimeType: "image/png" }]);
    });

    await waitFor(() =>
      expect(onSelectedIdsChange).toHaveBeenLastCalledWith([expect.any(String)]),
    );
  });

  it("renders Konva background image when backgroundImageUrl is set", async () => {
    render(<CanvasDesigner backgroundImageUrl="https://example.com/a4.png" />);
    await waitFor(() =>
      expect(document.querySelector('[data-konva="Image"]')).toBeInTheDocument(),
    );
  });

  it("shows margin guide when canvasMarginMm > 0", () => {
    render(<CanvasDesigner canvasMarginMm={10} />);
    expect(document.querySelector('[data-konva="Rect"]')).toBeInTheDocument();
  });

  it("arrangeAll resolves true for empty canvas", async () => {
    const ref = createRef<CanvasDesignerHandle>();
    render(<CanvasDesigner ref={ref} />);
    await waitFor(() => expect(ref.current).toBeTruthy());
    await expect(ref.current!.arrangeAll()).resolves.toBe(true);
  });

  it("verifyOverlaps reports valid for empty canvas", async () => {
    const ref = createRef<CanvasDesignerHandle>();
    render(<CanvasDesigner ref={ref} />);
    await waitFor(() => expect(ref.current).toBeTruthy());
    await expect(ref.current!.verifyOverlaps()).resolves.toEqual({
      valid: true,
      overlappingIds: [],
      pairs: [],
    });
  });

  it("setSelectedSize returns false without a single selection", async () => {
    const ref = createRef<CanvasDesignerHandle>();
    render(<CanvasDesigner ref={ref} />);
    await waitFor(() => expect(ref.current).toBeTruthy());
    expect(ref.current!.setSelectedSize({ unit: "mm", width: 50 })).toBe(false);
  });

  it("setSelectedSize updates scale for the selected sticker", async () => {
    const ref = createRef<CanvasDesignerHandle>();
    render(
      <CanvasDesigner ref={ref} dimensionUnit="mm" canvasMarginMm={0} />,
    );
    await waitFor(() => expect(ref.current).toBeTruthy());

    act(() => {
      ref.current!.addImagesFromUrls([{ url: "blob:test", mimeType: "image/png" }]);
    });

    await waitFor(() =>
      expect(ref.current!.exportLayoutState().layout.items).toHaveLength(1),
    );

    const initialScale =
      ref.current!.exportLayoutState().layout.items[0]!.scaleX;

    act(() => {
      expect(
        ref.current!.setSelectedSize({
          unit: "mm",
          width: 50.8,
          lockAspectRatio: true,
        }),
      ).toBe(true);
    });

    const nextScale = ref.current!.exportLayoutState().layout.items[0]!.scaleX;
    expect(nextScale).toBeGreaterThan(initialScale);
  });

  it("exportLayout returns payload when items exist", async () => {
    const ref = createRef<CanvasDesignerHandle>();
    const onExport = jest.fn();
    render(<CanvasDesigner ref={ref} onExport={onExport} />);
    await waitFor(() => expect(ref.current).toBeTruthy());

    act(() => {
      ref.current!.addImagesFromUrls([{ url: "blob:test", mimeType: "image/png" }]);
    });

    await waitFor(() =>
      expect(screen.queryByText(/Drop sticker images here/)).not.toBeInTheDocument(),
    );

    const payload = await ref.current!.exportLayout();
    expect(payload.layout.items).toHaveLength(1);
    expect(onExport).toHaveBeenCalled();
  });

  it("duplicates the selected sticker horizontally until the printable edge", async () => {
    const ref = createRef<CanvasDesignerHandle>();
    render(<CanvasDesigner ref={ref} canvasMarginMm={0} />);
    await waitFor(() => expect(ref.current).toBeTruthy());

    act(() => {
      ref.current!.addImagesFromUrls([{ url: "blob:test", mimeType: "image/png" }]);
    });

    await waitFor(() =>
      expect(ref.current!.exportLayoutState().layout.items).toHaveLength(1),
    );

    let addedCount = 0;
    act(() => {
      addedCount = ref.current!.duplicateSelectedHorizontally();
    });
    expect(addedCount).toBeGreaterThan(0);
    expect(ref.current!.exportLayoutState().layout.items.length).toBe(
      1 + addedCount,
    );
  });

  it("returns 0 when duplicating with no selection", async () => {
    const ref = createRef<CanvasDesignerHandle>();
    render(<CanvasDesigner ref={ref} />);
    await waitFor(() => expect(ref.current).toBeTruthy());

    expect(ref.current!.duplicateSelectedHorizontally()).toBe(0);
    expect(ref.current!.duplicateSelectedVertically()).toBe(0);
  });

  it("duplicates the selected sticker vertically with an explicit gap", async () => {
    const ref = createRef<CanvasDesignerHandle>();
    render(
      <CanvasDesigner ref={ref} canvasMarginMm={0} autoArrangeGapMm={5} />,
    );
    await waitFor(() => expect(ref.current).toBeTruthy());

    act(() => {
      ref.current!.addImagesFromUrls([{ url: "blob:test", mimeType: "image/png" }]);
    });

    await waitFor(() =>
      expect(ref.current!.exportLayoutState().layout.items).toHaveLength(1),
    );

    let addedCount = 0;
    act(() => {
      addedCount = ref.current!.duplicateSelectedVertically({ gapMm: 5 });
    });
    expect(addedCount).toBeGreaterThan(0);
    expect(ref.current!.exportLayoutState().layout.items.length).toBe(
      1 + addedCount,
    );
  });

  it("returns 0 when duplicate fill adds no copies", async () => {
    const buildGroupDuplicatesToFit = jest
      .spyOn(duplicateFillModule, "buildGroupDuplicatesToFit")
      .mockReturnValue({ copies: [], addedCount: 0 });

    const ref = createRef<CanvasDesignerHandle>();
    render(<CanvasDesigner ref={ref} canvasMarginMm={0} />);
    await waitFor(() => expect(ref.current).toBeTruthy());

    act(() => {
      ref.current!.addImagesFromUrls([{ url: "blob:test", mimeType: "image/png" }]);
    });

    await waitFor(() =>
      expect(ref.current!.exportLayoutState().layout.items).toHaveLength(1),
    );

    expect(ref.current!.duplicateSelectedHorizontally()).toBe(0);
    buildGroupDuplicatesToFit.mockRestore();
  });

  it("pinch-zooms the selected sticker when touchFriendly", async () => {
    const ref = createRef<CanvasDesignerHandle>();
    render(<CanvasDesigner ref={ref} touchFriendly canvasMarginMm={0} />);
    await waitFor(() => expect(ref.current).toBeTruthy());

    act(() => {
      ref.current!.addImagesFromUrls([{ url: "blob:test", mimeType: "image/png" }]);
    });

    await waitFor(() =>
      expect(ref.current!.exportLayoutState().layout.items).toHaveLength(1),
    );
    await waitFor(() =>
      expect(document.querySelector('[data-konva="Group"]')).toBeInTheDocument(),
    );

    const shell = document.querySelector('[data-canvas-designer=""]');
    expect(shell).toBeTruthy();

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      writable: true,
      value: jest.fn(() => shell),
    });

    const makeTouchList = (
      touches: Array<{ clientX: number; clientY: number }>,
    ): TouchList => {
      const list = touches.map((touch, index) => ({
        ...touch,
        identifier: index,
        target: shell,
      }));
      return list as unknown as TouchList;
    };

    const dispatchTouch = (
      type: string,
      touches: Array<{ clientX: number; clientY: number }>,
      target: EventTarget = shell!,
    ) => {
      const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
      const touchList = makeTouchList(touches);
      Object.defineProperty(event, "touches", { value: touchList });
      Object.defineProperty(event, "changedTouches", { value: touchList });
      target.dispatchEvent(event);
    };

    const initialScale =
      ref.current!.exportLayoutState().layout.items[0]!.scaleX;

    act(() => {
      dispatchTouch("touchstart", [
        { clientX: 50, clientY: 50 },
        { clientX: 150, clientY: 50 },
      ]);
    });

    act(() => {
      dispatchTouch(
        "touchmove",
        [
          { clientX: 25, clientY: 50 },
          { clientX: 175, clientY: 50 },
        ],
        window,
      );
    });

    act(() => {
      dispatchTouch("touchend", [], window);
    });

    const nextScale = ref.current!.exportLayoutState().layout.items[0]!.scaleX;
    expect(nextScale).toBeGreaterThan(initialScale);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (document as any).elementFromPoint;
  });
});
