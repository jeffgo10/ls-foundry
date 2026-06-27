import { downloadCanvasAsPng } from "./downloadCanvasAsPng";

describe("downloadCanvasAsPng", () => {
  it("creates a download link from canvas data URL", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;

    const link = document.createElement("a");
    const click = jest.fn();
    link.click = click;
    const createElementSpy = jest
      .spyOn(document, "createElement")
      .mockReturnValue(link);
    jest.spyOn(canvas, "toDataURL").mockReturnValue("data:image/png;base64,abc");

    downloadCanvasAsPng(canvas, "badge.png");

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(link.download).toBe("badge.png");
    expect(link.href).toBe("data:image/png;base64,abc");
    expect(click).toHaveBeenCalled();
  });
});
