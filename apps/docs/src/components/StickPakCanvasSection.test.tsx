import { forwardRef, useEffect, useImperativeHandle } from "react";
import type { CanvasDesignerHandle } from "@jeffgo10/react-canvas-designer";

const duplicateSelectedHorizontally = jest.fn(() => 2);
const duplicateSelectedVertically = jest.fn(() => 1);
const arrangeAll = jest.fn(async () => true);
const exportLayout = jest.fn(async () => ({
  layout: { version: 1, items: [{ instanceId: "sticker-1" }] },
  assets: [],
}));

let mockSelectedIds: string[] = ["sticker-1"];

jest.mock("next/dynamic", () => () =>
  forwardRef<CanvasDesignerHandle, { onSelectedIdsChange?: (ids: string[]) => void }>(
    function MockCanvasDesigner({ onSelectedIdsChange }, ref) {
      useImperativeHandle(ref, () => ({
        exportLayout,
        exportLayoutState: jest.fn(),
        loadLayoutFromSources: jest.fn(),
        clearCanvas: jest.fn(),
        arrangeAll,
        autoArrange: arrangeAll,
        addImagesFromUrls: jest.fn(),
        duplicateSelectedHorizontally,
        duplicateSelectedVertically,
      }));

      useEffect(() => {
        onSelectedIdsChange?.(mockSelectedIds);
      }, [onSelectedIdsChange]);

      return <div data-testid="canvas-designer">CanvasDesigner</div>;
    },
  ),
);

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StickPakCanvasSection from "./StickPakCanvasSection";

describe("StickPakCanvasSection", () => {
  beforeEach(() => {
    mockSelectedIds = ["sticker-1"];
    duplicateSelectedHorizontally.mockReset().mockReturnValue(2);
    duplicateSelectedVertically.mockReset().mockReturnValue(1);
    arrangeAll.mockReset().mockResolvedValue(true);
    exportLayout.mockReset().mockResolvedValue({
      layout: { version: 1, items: [{ instanceId: "sticker-1" }] },
      assets: [],
    });
  });

  it("renders section controls and canvas designer", () => {
    render(<StickPakCanvasSection />);
    expect(screen.getByTestId("canvas-designer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Export$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Duplicate horizontally/i }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: /Duplicate vertically/i })).toBeEnabled();
  });

  it("calls duplicate APIs with the cut-line gap when buttons are clicked", async () => {
    const user = userEvent.setup();
    render(<StickPakCanvasSection />);

    await user.click(screen.getByRole("button", { name: /Duplicate horizontally/i }));
    expect(duplicateSelectedHorizontally).toHaveBeenCalledWith({ gapMm: 5 });
    expect(
      screen.getByText(/Added 2 horizontal copies with 5 mm cut-line gap/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Duplicate vertically/i }));
    expect(duplicateSelectedVertically).toHaveBeenCalledWith({ gapMm: 5 });
    expect(
      screen.getByText(/Added 1 vertical copy with 5 mm cut-line gap/i),
    ).toBeInTheDocument();
  });

  it("disables duplicate buttons when nothing is selected", () => {
    mockSelectedIds = [];
    render(<StickPakCanvasSection />);

    expect(
      screen.getByRole("button", { name: /Duplicate horizontally/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Duplicate vertically/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(/Click a sticker to select it/i),
    ).toBeInTheDocument();
  });

  it("shows a no-fit duplicate message when zero copies are added", async () => {
    duplicateSelectedHorizontally.mockReturnValueOnce(0);
    const user = userEvent.setup();
    render(<StickPakCanvasSection />);

    await user.click(screen.getByRole("button", { name: /Duplicate horizontally/i }));
    expect(
      screen.getByText(/No horizontal copies fit inside the printable area/i),
    ).toBeInTheDocument();
  });

  it("exports layout json and shows arrange feedback", async () => {
    const user = userEvent.setup();
    arrangeAll.mockResolvedValueOnce(false);
    render(<StickPakCanvasSection />);

    await user.click(screen.getByRole("button", { name: /^Export$/i }));
    await screen.findByDisplayValue(/"sticker-1"/);
    expect(exportLayout).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Arrange all/i }));
    expect(arrangeAll).toHaveBeenCalledWith({ gapMm: 5 });
    expect(
      await screen.findByText(/Some stickers could not fit on the page/i),
    ).toBeInTheDocument();
  });

  it("passes updated cut-line gap to duplicate calls", async () => {
    const user = userEvent.setup();
    render(<StickPakCanvasSection />);

    fireEvent.change(screen.getByLabelText(/Cut-line gap/i), {
      target: { value: "8" },
    });

    await user.click(screen.getByRole("button", { name: /Duplicate horizontally/i }));
    expect(duplicateSelectedHorizontally).toHaveBeenCalledWith({ gapMm: 8 });
  });
});
