import { canvasToPngDataUrl } from "./canvasToPngDataUrl";

describe("canvasToPngDataUrl", () => {
  it("returns a PNG data URL from the canvas", () => {
    const canvas = document.createElement("canvas");
    jest.spyOn(canvas, "toDataURL").mockReturnValue("data:image/png;base64,abc");

    expect(canvasToPngDataUrl(canvas)).toBe("data:image/png;base64,abc");
    expect(canvas.toDataURL).toHaveBeenCalledWith("image/png");
  });
});
