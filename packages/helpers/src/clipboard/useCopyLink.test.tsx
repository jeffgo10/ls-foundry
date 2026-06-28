import { act, renderHook } from "@testing-library/react";

import { useCopyLink } from "./useCopyLink";

describe("useCopyLink", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("copies text and sets copied flag", async () => {
    const { result } = renderHook(() => useCopyLink("https://example.com/b/slug"));

    await act(async () => {
      const ok = await result.current.copy();
      expect(ok).toBe(true);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://example.com/b/slug");
    expect(result.current.copied).toBe(true);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.copied).toBe(false);
  });

  it("returns false when clipboard write fails", async () => {
    jest.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("denied"));

    const { result } = renderHook(() => useCopyLink("https://example.com"));

    await act(async () => {
      const ok = await result.current.copy();
      expect(ok).toBe(false);
    });

    expect(result.current.copied).toBe(false);
  });
});
