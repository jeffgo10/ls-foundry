jest.mock("./scanProductImageFromElement", () => ({
  SCAN_WARNING_MESSAGE:
    "No neon-green surface detected — label placed at image center.",
  scanProductImageFromElement: jest.fn(),
}));

import { renderHook, waitFor } from "@testing-library/react";
import { scanProductImageFromElement } from "./scanProductImageFromElement";
import { useGreenAreaScan } from "./useGreenAreaScan";

const mockScan = scanProductImageFromElement as jest.MockedFunction<
  typeof scanProductImageFromElement
>;

describe("useGreenAreaScan", () => {
  beforeEach(() => {
    mockScan.mockReset();
  });

  it("clears state when src is empty", () => {
    const { result } = renderHook(() => useGreenAreaScan(""));
    expect(result.current.targetBounds).toBeNull();
    expect(result.current.isScanning).toBe(false);
  });

  it("loads image and applies scan results", async () => {
    const OriginalImage = global.Image;

    class MockImage {
      crossOrigin = "";
      naturalWidth = 100;
      naturalHeight = 80;
      width = 100;
      height = 80;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = "";

      set src(value: string) {
        this._src = value;
        queueMicrotask(() => this.onload?.());
      }

      get src() {
        return this._src;
      }
    }

    // @ts-expect-error test mock
    global.Image = MockImage;

    mockScan.mockReturnValue({
      imageWidth: 100,
      imageHeight: 80,
      displayCanvasSrc: "data:image/png;base64,mock",
      targetBounds: {
        minX: 20,
        minY: 10,
        maxX: 59,
        maxY: 49,
        centerX: 40,
        centerY: 30,
        width: 40,
        height: 40,
        aspectRatio: 1,
        rotationDegrees: 0,
      },
      scanWarning: null,
      surfaceGrid: null,
    });

    const { result } = renderHook(() => useGreenAreaScan("/product.png"));

    await waitFor(() => expect(result.current.isScanning).toBe(false));

    expect(result.current.imageWidth).toBe(100);
    expect(result.current.targetBounds?.width).toBe(40);
    expect(result.current.scanWarning).toBeNull();

    global.Image = OriginalImage;
  });

  it("reports load errors", async () => {
    const OriginalImage = global.Image;

    class MockImage {
      crossOrigin = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = "";

      set src(value: string) {
        this._src = value;
        queueMicrotask(() => this.onerror?.());
      }

      get src() {
        return this._src;
      }
    }

    // @ts-expect-error test mock
    global.Image = MockImage;

    const { result } = renderHook(() => useGreenAreaScan("/fail.png"));

    await waitFor(() => expect(result.current.isScanning).toBe(false));

    expect(result.current.targetBounds).toBeNull();
    expect(result.current.scanWarning).toBe("Failed to load product image.");

    global.Image = OriginalImage;
  });
});
