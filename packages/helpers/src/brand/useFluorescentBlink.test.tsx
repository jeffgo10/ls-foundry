import { act, renderHook } from "@testing-library/react";

import { resetSkipEnvironmentCache } from "../text/skipEnvironment";
import { useFluorescentBlink } from "./useFluorescentBlink";

type MatchMediaMock = jest.MockedFunction<typeof window.matchMedia>;

function mockMatchMedia(matches: boolean): MatchMediaMock {
  const matchMedia = jest.fn().mockReturnValue({
    matches,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }) as MatchMediaMock;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: matchMedia,
  });
  return matchMedia;
}

describe("useFluorescentBlink", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetSkipEnvironmentCache();
    mockMatchMedia(false);
    jest.spyOn(Math, "random").mockReturnValue(0.4);
  });

  afterEach(() => {
    resetSkipEnvironmentCache();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("skips when disabled", () => {
    const { result } = renderHook(() =>
      useFluorescentBlink({ disabled: true }),
    );
    expect(result.current.cssText).toBeNull();
    expect(result.current.isComplete).toBe(true);
    expect(result.current.blinkAttr.outer).toBeNull();
  });

  it("skips when prefers-reduced-motion", () => {
    mockMatchMedia(true);
    resetSkipEnvironmentCache();

    const { result } = renderHook(() => useFluorescentBlink());
    expect(result.current.cssText).toBeNull();
    expect(result.current.isComplete).toBe(true);
  });

  it("injects unsynced CSS blink attrs then completes", () => {
    const { result } = renderHook(() =>
      useFluorescentBlink({ durationMs: 500, delayMs: 0 }),
    );

    expect(result.current.cssText).toEqual(expect.stringContaining("@keyframes"));
    expect(result.current.blinkAttr.outer).toEqual(expect.any(String));
    expect(result.current.blinkAttr["inner-a"]).toEqual(expect.any(String));
    expect(result.current.blinkAttr["inner-b"]).toEqual(expect.any(String));
    expect(result.current.blinkAttr.outer).not.toBe(
      result.current.blinkAttr["inner-a"],
    );
    expect(result.current.isComplete).toBe(false);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.isComplete).toBe(true);
  });
});
