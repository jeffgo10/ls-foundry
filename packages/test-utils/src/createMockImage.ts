/**
 * Build an HTMLImageElement backed by an offscreen canvas (jsdom).
 * Optional alphaFn returns 0–255 alpha per pixel for contour tests.
 */
export async function createLoadedMockImage(
  width: number,
  height: number,
  alphaFn?: (x: number, y: number) => number,
): Promise<HTMLImageElement> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2d context unavailable");
  }

  const imageData = ctx.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const alpha = alphaFn ? alphaFn(x, y) : 255;
      imageData.data[i] = 200;
      imageData.data[i + 1] = 50;
      imageData.data[i + 2] = 50;
      imageData.data[i + 3] = alpha;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load mock image"));
    image.src = canvas.toDataURL("image/png");
  });
}

/** @deprecated Use createLoadedMockImage — sync images fail jsdom drawImage checks. */
export function createMockImage(
  width: number,
  height: number,
  alphaFn?: (x: number, y: number) => number,
): HTMLImageElement {
  void width;
  void height;
  void alphaFn;
  throw new Error("Use createLoadedMockImage in tests");
}

/** Synchronous mock Image constructor for auto-arrange / designer tests. */
export function installMockImageLoader(
  width = 100,
  height = 100,
): { restore: () => void } {
  const Original = window.Image;

  class MockImage {
    width = width;
    height = height;
    naturalWidth = width;
    naturalHeight = height;
    crossOrigin = "";
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    private _src = "";

    get src() {
      return this._src;
    }

    set src(value: string) {
      this._src = value;
      queueMicrotask(() => this.onload?.());
    }
  }

  // @ts-expect-error test shim
  window.Image = MockImage;

  return {
    restore: () => {
      window.Image = Original;
    },
  };
}
