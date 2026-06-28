import { isRestrictedInAppBrowser } from "./isRestrictedInAppBrowser";

describe("isRestrictedInAppBrowser", () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
  });

  it("returns false when navigator is undefined", () => {
    Object.defineProperty(global, "navigator", {
      value: undefined,
      configurable: true,
    });

    expect(isRestrictedInAppBrowser()).toBe(false);
  });

  it("detects Meta in-app browsers", () => {
    Object.defineProperty(global, "navigator", {
      value: { userAgent: "FBAN/MessengerForiOS" },
      configurable: true,
    });

    expect(isRestrictedInAppBrowser()).toBe(true);
  });

  it("returns false for standard mobile Safari", () => {
    Object.defineProperty(global, "navigator", {
      value: {
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      },
      configurable: true,
    });

    expect(isRestrictedInAppBrowser()).toBe(false);
  });
});
