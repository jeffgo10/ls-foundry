import { isMobileBrowser } from "./isMobileBrowser";

describe("isMobileBrowser", () => {
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
  });

  it("returns true for mobile user agents", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      configurable: true,
    });

    expect(isMobileBrowser()).toBe(true);
  });

  it("returns false for desktop user agents", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      configurable: true,
    });

    expect(isMobileBrowser()).toBe(false);
  });
});
