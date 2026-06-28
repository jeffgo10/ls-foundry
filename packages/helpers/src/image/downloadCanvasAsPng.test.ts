import { downloadCanvasAsPng } from "./downloadCanvasAsPng";

describe("downloadCanvasAsPng", () => {
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
    jest.restoreAllMocks();
  });

  it("creates a download link from canvas data URL on desktop", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      configurable: true,
    });

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
    expect(link.rel).toBe("noopener");
    expect(link.href).toBe("data:image/png;base64,abc");
    expect(click).toHaveBeenCalled();
  });

  it("uses a blob object URL on mobile browsers", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 14; Pixel 7) Mobile",
      configurable: true,
    });

    const canvas = document.createElement("canvas");
    jest.spyOn(canvas, "toDataURL").mockReturnValue("data:image/png;base64,YWJj");

    const link = document.createElement("a");
    link.click = jest.fn();
    jest.spyOn(document, "createElement").mockReturnValue(link);
    const appendChild = jest.spyOn(document.body, "appendChild").mockImplementation(() => link);
    const remove = jest.spyOn(link, "remove").mockImplementation(() => {});
    const createObjectURL = jest.fn().mockReturnValue("blob:mock");
    const revokeObjectURL = jest.fn();
    Object.defineProperty(global.URL, "createObjectURL", { value: createObjectURL });
    Object.defineProperty(global.URL, "revokeObjectURL", { value: revokeObjectURL });

    downloadCanvasAsPng(canvas, "badge.png");

    expect(createObjectURL).toHaveBeenCalled();
    expect(link.href).toBe("blob:mock");
    expect(appendChild).toHaveBeenCalledWith(link);
    expect(link.click).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });
});
