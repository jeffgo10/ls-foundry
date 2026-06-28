import { dataUrlToBlob } from "./dataUrlToBlob";

describe("dataUrlToBlob", () => {
  it("converts a PNG data URL to a blob", () => {
    const blob = dataUrlToBlob("data:image/png;base64,YWJj");

    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("falls back to image/png when the header has no mime match", () => {
    const blob = dataUrlToBlob("data:invalid-format,YWJj");

    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
  });
});
