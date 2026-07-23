import "@testing-library/jest-dom";

class ResizeObserverMock {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  callback(0);
  return 1;
};

global.cancelAnimationFrame = jest.fn();

if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () =>
    `00000000-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`;
}

if (!global.fetch) {
  global.fetch = jest.fn();
}

/** jsdom omits PointerEvent; React pointer handlers need it in jsdom tests only. */
if (
  typeof globalThis.PointerEvent === "undefined" &&
  typeof globalThis.MouseEvent !== "undefined"
) {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? "mouse";
    }
  }

  globalThis.PointerEvent =
    PointerEventPolyfill as unknown as typeof PointerEvent;
}
