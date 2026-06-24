import { renderHook, waitFor } from "@testing-library/react";
import { useImageDimensions } from "./useImageDimensions";

describe("useImageDimensions", () => {
  it("clears dimensions when src is empty", () => {
    const { result } = renderHook(() => useImageDimensions(""));
    expect(result.current).toEqual({ width: 0, height: 0 });
  });

  it("reads natural dimensions after image load", async () => {
    const OriginalImage = global.Image;

    class MockImage {
      crossOrigin = "";
      naturalWidth = 400;
      naturalHeight = 800;
      width = 400;
      height = 800;
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

    const { result } = renderHook(() => useImageDimensions("/label.png"));

    await waitFor(() => expect(result.current.width).toBe(400));
    expect(result.current.height).toBe(800);

    global.Image = OriginalImage;
  });
});
