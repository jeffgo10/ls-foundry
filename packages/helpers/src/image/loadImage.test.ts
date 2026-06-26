import { loadImage } from "./loadImage";

describe("loadImage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("resolves when the image loads", async () => {
    const image = new Image();
    jest.spyOn(globalThis, "Image").mockImplementation(() => image);

    const promise = loadImage("https://example.com/photo.png");
    image.onload?.(new Event("load"));

    await expect(promise).resolves.toBe(image);
    expect(image.crossOrigin).toBe("anonymous");
    expect(image.src).toContain("photo.png");
  });

  it("rejects when the image fails to load", async () => {
    const image = new Image();
    jest.spyOn(globalThis, "Image").mockImplementation(() => image);

    const promise = loadImage("https://example.com/missing.png");
    image.onerror?.(new Event("error"));

    await expect(promise).rejects.toThrow("Failed to load image");
  });
});
