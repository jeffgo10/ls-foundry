import { dataUrlToBlob } from "./dataUrlToBlob";

describe("dataUrlToBlob", () => {
  it("converts a PNG data URL to a blob", () => {
    const blob = dataUrlToBlob("data:image/png;base64,YWJj");

    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
  });
});
