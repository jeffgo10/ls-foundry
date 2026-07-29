import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import { ScrambleRevealProvider } from "./ScrambleRevealProvider";
import {
  isLikelySearchBot,
  resetSkipEnvironmentCache,
  resolveSkipEnvironment,
} from "./skipEnvironment";
import { useScrambleReveal } from "./useScrambleReveal";

type MatchMediaMock = jest.MockedFunction<typeof window.matchMedia>;

describe("isLikelySearchBot", () => {
  it("detects Googlebot and Bingbot", () => {
    expect(isLikelySearchBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isLikelySearchBot("Mozilla/5.0 (compatible; bingbot/2.0)")).toBe(true);
  });

  it("returns false for normal browsers", () => {
    expect(
      isLikelySearchBot(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0",
      ),
    ).toBe(false);
  });
});

describe("resolveSkipEnvironment", () => {
  let matchMedia: MatchMediaMock;

  beforeEach(() => {
    resetSkipEnvironmentCache();
    matchMedia = jest.fn().mockReturnValue({
      matches: false,
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
  });

  afterEach(() => {
    resetSkipEnvironmentCache();
    jest.restoreAllMocks();
  });

  it("caches the result so matchMedia runs once", () => {
    expect(resolveSkipEnvironment()).toBe(false);
    expect(resolveSkipEnvironment()).toBe(false);
    expect(matchMedia).toHaveBeenCalledTimes(1);
  });

  it("returns true when prefers-reduced-motion matches", () => {
    matchMedia.mockReturnValue({
      ...matchMedia(),
      matches: true,
    });
    resetSkipEnvironmentCache();
    expect(resolveSkipEnvironment()).toBe(true);
  });

  it("returns true for search-bot user agents without relying on matchMedia matches", () => {
    const originalUa = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => "Mozilla/5.0 (compatible; Googlebot/2.1)",
    });
    resetSkipEnvironmentCache();

    expect(resolveSkipEnvironment()).toBe(true);

    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => originalUa,
    });
  });
});

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

describe("useScrambleReveal", () => {
  let rafCallbacks: FrameRequestCallback[];
  let nextRafId: number;
  let nowMs: number;

  beforeEach(() => {
    resetSkipEnvironmentCache();
    rafCallbacks = [];
    nextRafId = 1;
    nowMs = 0;

    jest.spyOn(performance, "now").mockImplementation(() => nowMs);
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return nextRafId++;
    });
    jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    jest.spyOn(Math, "random").mockReturnValue(0);

    mockMatchMedia(false);
  });

  afterEach(() => {
    resetSkipEnvironmentCache();
    jest.restoreAllMocks();
  });

  function flushFrames(atMs: number) {
    nowMs = atMs;
    const pending = [...rafCallbacks];
    rafCallbacks = [];
    act(() => {
      for (const cb of pending) {
        cb(atMs);
      }
    });
  }

  function drainUntilIdle(endMs: number, stepMs = 42) {
    for (let t = 0; t <= endMs; t += stepMs) {
      flushFrames(t);
      if (rafCallbacks.length === 0) break;
    }
  }

  function providerWrapper(disabled?: boolean) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <ScrambleRevealProvider disabled={disabled}>{children}</ScrambleRevealProvider>
      );
    };
  }

  it("returns text immediately when disabled", () => {
    const { result } = renderHook(() =>
      useScrambleReveal("HELLO", { disabled: true }),
    );

    expect(result.current.displayText).toBe("HELLO");
    expect(result.current.isComplete).toBe(true);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("returns text immediately when prefers-reduced-motion", () => {
    mockMatchMedia(true);
    resetSkipEnvironmentCache();

    const { result } = renderHook(() => useScrambleReveal("WORLD"));

    expect(result.current.displayText).toBe("WORLD");
    expect(result.current.isComplete).toBe(true);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("returns text immediately for search-bot user agents", () => {
    const originalUa = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () =>
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    });
    resetSkipEnvironmentCache();

    const { result } = renderHook(() => useScrambleReveal("SEO COPY"));

    expect(result.current.displayText).toBe("SEO COPY");
    expect(result.current.isComplete).toBe(true);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();

    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => originalUa,
    });
  });

  it("uses provider disabled to skip without starting rAF", () => {
    const { result } = renderHook(() => useScrambleReveal("CC"), {
      wrapper: providerWrapper(true),
    });

    expect(result.current.displayText).toBe("CC");
    expect(result.current.isComplete).toBe(true);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("shares one provider skip across hooks in the same tree", () => {
    mockMatchMedia(true);
    resetSkipEnvironmentCache();

    const { result } = renderHook(
      () => ({
        first: useScrambleReveal("ONE"),
        second: useScrambleReveal("TWO"),
      }),
      { wrapper: providerWrapper() },
    );

    expect(result.current.first.displayText).toBe("ONE");
    expect(result.current.second.displayText).toBe("TWO");
    expect(result.current.first.isComplete).toBe(true);
    expect(result.current.second.isComplete).toBe(true);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("preserves spaces while scrambling unresolved characters", () => {
    const { result } = renderHook(() =>
      useScrambleReveal("A B", {
        charset: "X",
        tickIntervalMs: 1,
        initialScrambleMs: 100,
        charRevealMs: 50,
      }),
    );

    flushFrames(0);
    expect(result.current.displayText).toBe("X X");
    expect(result.current.displayText[1]).toBe(" ");
    expect(result.current.isComplete).toBe(false);
  });

  it("defers scramble start until delayMs elapses", () => {
    const { result } = renderHook(() =>
      useScrambleReveal("HI", {
        delayMs: 200,
        charset: "X",
        tickIntervalMs: 1,
        initialScrambleMs: 50,
        charRevealMs: 50,
      }),
    );

    flushFrames(0);
    expect(result.current.isComplete).toBe(false);

    flushFrames(100);
    expect(result.current.isComplete).toBe(false);

    drainUntilIdle(200 + 50 + 50 * 2 + 10, 10);
    expect(result.current.displayText).toBe("HI");
    expect(result.current.isComplete).toBe(true);
  });

  it("eventually settles to the full text", () => {
    const { result } = renderHook(() =>
      useScrambleReveal("AB", {
        charset: "Z",
        tickIntervalMs: 1,
        initialScrambleMs: 40,
        charRevealMs: 20,
      }),
    );

    drainUntilIdle(40 + 20 * 2 + 20, 5);

    expect(result.current.displayText).toBe("AB");
    expect(result.current.isComplete).toBe(true);
  });

  it("cancels the animation frame on unmount", () => {
    const { unmount } = renderHook(() =>
      useScrambleReveal("GO", {
        charset: "Z",
        tickIntervalMs: 1,
        initialScrambleMs: 1000,
        charRevealMs: 100,
      }),
    );

    flushFrames(0);
    expect(window.requestAnimationFrame).toHaveBeenCalled();

    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});
