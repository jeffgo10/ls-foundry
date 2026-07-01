import { render, screen, waitFor, act } from "@testing-library/react";
import { createRef } from "react";
import { installMockImageLoader } from "@ls-foundry/test-utils";
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

  it("calls onReady with imperative handle", async () => {
    const onReady = jest.fn();
    render(<CanvasDesigner onReady={onReady} />);
    await waitFor(() => expect(onReady).toHaveBeenCalled());
    const handle = onReady.mock.calls[0]![0] as CanvasDesignerHandle;
    expect(handle.exportLayoutState).toBeDefined();
    expect(handle.clearCanvas).toBeDefined();
    expect(handle.arrangeAll).toBeDefined();
  });

  it("exposes exportLayoutState via ref", async () => {
    const ref = createRef<CanvasDesignerHandle>();
    render(<CanvasDesigner ref={ref} />);
    await waitFor(() => expect(ref.current).toBeTruthy());
    const state = ref.current!.exportLayoutState();
    expect(state.layout.version).toBe(1);
    expect(state.assets).toEqual([]);
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
    const buildDuplicatesToFit = jest
      .spyOn(duplicateFillModule, "buildDuplicatesToFit")
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
    buildDuplicatesToFit.mockRestore();
  });
});
