import { bakeCutLineOffset, dilateBinaryMaskFast } from "./bakeCutLineOffset";

describe("dilateBinaryMaskFast", () => {
  it("expands a single seed by Chebyshev radius", () => {
    const mask = new Uint8Array(7 * 7);
    mask[3 * 7 + 3] = 1;
    const dilated = dilateBinaryMaskFast(mask, 7, 7, 2);
    expect(dilated[3 * 7 + 3]).toBe(1);
    expect(dilated[3 * 7 + 5]).toBe(1);
    expect(dilated[1 * 7 + 3]).toBe(1);
    expect(dilated[1 * 7 + 1]).toBe(1); // Chebyshev includes diagonals
  });
});

describe("bakeCutLineOffset", () => {
  it("returns expanded dimensions, contentScale, and a PNG data URL", () => {
    const srcW = 8;
    const srcH = 8;
    const alpha = new Uint8ClampedArray(srcW * srcH * 4);
    for (let y = 2; y <= 5; y += 1) {
      for (let x = 2; x <= 5; x += 1) {
        const i = (y * srcW + x) * 4;
        alpha[i + 3] = 255;
      }
    }

    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(
      this: HTMLCanvasElement,
      type: string,
    ) {
      if (type !== "2d") {
        return originalGetContext.call(this, type as "2d");
      }
      const self = this;
      return {
        drawImage: jest.fn(),
        createImageData: (w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4),
          width: w,
          height: h,
        }),
        putImageData: jest.fn(),
        getImageData: jest.fn(() => {
          if (self.width === srcW && self.height === srcH) {
            return { data: alpha, width: srcW, height: srcH };
          }
          return {
            data: new Uint8ClampedArray(self.width * self.height * 4),
            width: self.width,
            height: self.height,
          };
        }),
      } as unknown as CanvasRenderingContext2D;
    };

    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,test";

    const image = {
      naturalWidth: srcW,
      naturalHeight: srcH,
      width: srcW,
      height: srcH,
    } as HTMLImageElement;

    const baked = bakeCutLineOffset(image, 2);

    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;

    expect(baked.width).toBe(srcW + 4);
    expect(baked.height).toBe(srcH + 4);
    expect(baked.pad).toBe(2);
    expect(baked.contentScale).toBe(1);
    expect(baked.dataUrl).toBe("data:image/png;base64,test");
    expect(baked.cutLinePoints.length).toBeGreaterThanOrEqual(8);
  });

  it("downsamples large sources and reports contentScale < 1", () => {
    const srcW = 2000;
    const srcH = 1000;
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(
      this: HTMLCanvasElement,
      type: string,
    ) {
      if (type !== "2d") {
        return originalGetContext.call(this, type as "2d");
      }
      return {
        drawImage: jest.fn(),
        createImageData: (w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4),
          width: w,
          height: h,
        }),
        putImageData: jest.fn(),
        getImageData: jest.fn(() => ({
          data: new Uint8ClampedArray(this.width * this.height * 4),
          width: this.width,
          height: this.height,
        })),
      } as unknown as CanvasRenderingContext2D;
    };
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,big";

    const image = {
      naturalWidth: srcW,
      naturalHeight: srcH,
      width: srcW,
      height: srcH,
    } as HTMLImageElement;

    const baked = bakeCutLineOffset(image, 50, { maxDimension: 768 });

    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;

    expect(baked.contentScale).toBeCloseTo(768 / 2000, 5);
    expect(baked.width).toBeLessThan(srcW);
    expect(baked.height).toBeLessThan(srcH);
  });
});
