import {
  buildLiteShadeBrandHref,
  LSM_BRAND_HOME_URL,
} from "./brandHref";

describe("buildLiteShadeBrandHref", () => {
  it("returns the href unchanged when referral is omitted", () => {
    expect(buildLiteShadeBrandHref(LSM_BRAND_HOME_URL)).toBe(LSM_BRAND_HOME_URL);
    expect(buildLiteShadeBrandHref("/about")).toBe("/about");
  });

  it("appends ref on absolute URLs", () => {
    expect(buildLiteShadeBrandHref(LSM_BRAND_HOME_URL, "stickpak")).toBe(
      "https://liteshademedia.com/?ref=stickpak",
    );
  });

  it("overwrites an existing ref param", () => {
    expect(
      buildLiteShadeBrandHref("https://liteshademedia.com/?ref=old", "new"),
    ).toBe("https://liteshademedia.com/?ref=new");
  });

  it("appends ref on relative paths (with or without existing query)", () => {
    expect(buildLiteShadeBrandHref("/home", "nav")).toBe("/home?ref=nav");
    expect(buildLiteShadeBrandHref("/home?x=1", "nav")).toBe("/home?x=1&ref=nav");
  });

  it("encodes referral values", () => {
    expect(buildLiteShadeBrandHref("/x", "a b")).toBe("/x?ref=a%20b");
  });
});
