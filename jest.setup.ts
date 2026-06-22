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
