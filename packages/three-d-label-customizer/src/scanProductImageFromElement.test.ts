import {
  scanProductImageFromElement,
  SCAN_WARNING_MESSAGE,
} from "./scanProductImageFromElement";

function makeImageData(
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number, number],
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");

  const imageData = ctx.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const [r, g, b, a] = fill(x, y);
      imageData.data[i] = r;
      imageData.data[i + 1] = g;
      imageData.data[i + 2] = b;
      imageData.data[i + 3] = a;
    }
  }
  return imageData;
}

function mockCanvasImageData(imageData: ImageData, ctxUnavailable = false) {
  const originalCreateElement = document.createElement.bind(document);
  jest.spyOn(document, "createElement").mockImplementation((tag) => {
    if (tag === "canvas") {
      return {
        width: imageData.width,
        height: imageData.height,
        getContext: () =>
          ctxUnavailable
            ? null
            : {
                drawImage: jest.fn(),
                getImageData: () => imageData,
                putImageData: jest.fn(),
              },
        toDataURL: () => "data:image/png;base64,mock",
      } as unknown as HTMLCanvasElement;
    }
    return originalCreateElement(tag);
  });
}

describe("scanProductImageFromElement", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("detects green bounds from image pixels", () => {
    const imageData = makeImageData(100, 80, (x, y) => {
      if (x >= 20 && x <= 59 && y >= 10 && y <= 49) {
        return [20, 220, 30, 255];
      }
      return [10, 10, 10, 255];
    });
    mockCanvasImageData(imageData);

    const image = {
      naturalWidth: 100,
      naturalHeight: 80,
      width: 100,
      height: 80,
    } as HTMLImageElement;

    const result = scanProductImageFromElement(image);
    expect(result.imageWidth).toBe(100);
    expect(result.targetBounds.width).toBeCloseTo(40, 0);
    expect(result.scanWarning).toBeNull();
    expect(result.displayCanvasSrc).toMatch(/^data:image\/png/);
  });

  it("falls back when no green cluster is found", () => {
    const imageData = makeImageData(200, 100, () => [10, 10, 10, 255]);
    mockCanvasImageData(imageData);

    const image = {
      naturalWidth: 200,
      naturalHeight: 100,
      width: 200,
      height: 100,
    } as HTMLImageElement;

    const result = scanProductImageFromElement(image);
    expect(result.targetBounds.centerX).toBe(100);
    expect(result.scanWarning).toBe(SCAN_WARNING_MESSAGE);
  });

  it("uses width and height when natural dimensions are missing", () => {
    const imageData = makeImageData(80, 60, (x, y) => {
      if (x >= 10 && x <= 49 && y >= 10 && y <= 49) {
        return [20, 220, 30, 255];
      }
      return [10, 10, 10, 255];
    });
    mockCanvasImageData(imageData);

    const image = {
      naturalWidth: 0,
      naturalHeight: 0,
      width: 80,
      height: 60,
    } as HTMLImageElement;

    const result = scanProductImageFromElement(image);
    expect(result.imageWidth).toBe(80);
    expect(result.targetBounds.width).toBeCloseTo(40, 0);
  });

  it("falls back when canvas context is unavailable", () => {
    const imageData = makeImageData(1, 1, () => [0, 0, 0, 255]);
    mockCanvasImageData(imageData, true);

    const image = {
      naturalWidth: 50,
      naturalHeight: 50,
      width: 50,
      height: 50,
      src: "blob:original",
    } as HTMLImageElement;

    const result = scanProductImageFromElement(image);
    expect(result.scanWarning).toBe(SCAN_WARNING_MESSAGE);
    expect(result.targetBounds.width).toBe(15);
    expect(result.displayCanvasSrc).toBe("blob:original");
  });
});
