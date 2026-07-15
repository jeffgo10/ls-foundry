import { CANVAS_DPI, mmToCanvasPixels } from "@jeffgo10/shared-types";
import {
  applyPreparedCutLineMedia,
  buildCutLinePoints,
  cutLineOffsetLocalPx,
  prepareCutLineMedia,
} from "./cutLine";

describe("cutLineOffsetLocalPx", () => {
  it("returns 0 when offset is 0", () => {
    expect(cutLineOffsetLocalPx(0, CANVAS_DPI)).toBe(0);
  });

  it("converts mm to canvas pixels at unit scale", () => {
    expect(cutLineOffsetLocalPx(5, CANVAS_DPI, 1, 1)).toBeCloseTo(
      mmToCanvasPixels(5, CANVAS_DPI),
      5,
    );
  });

  it("divides by scale so stage-space offset stays constant", () => {
    const atUnit = cutLineOffsetLocalPx(5, CANVAS_DPI, 1, 1);
    const atDouble = cutLineOffsetLocalPx(5, CANVAS_DPI, 2, 2);
    expect(atDouble).toBeCloseTo(atUnit / 2, 5);
  });

  it("thickens local pad when placement scale is less than 1", () => {
    const atUnit = cutLineOffsetLocalPx(5, CANVAS_DPI, 1, 1);
    const atTenth = cutLineOffsetLocalPx(5, CANVAS_DPI, 0.1, 0.1);
    expect(atTenth).toBeCloseTo(atUnit / 0.1, 5);
    expect(atTenth).toBeGreaterThan(atUnit);
  });
});

describe("buildCutLinePoints", () => {
  it("returns empty when the tracer yields no contour", () => {
    const image = {
      naturalWidth: 10,
      naturalHeight: 10,
    } as HTMLImageElement;
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = () => null;
    expect(buildCutLinePoints(image, 10, 10, 5)).toEqual([]);
    HTMLCanvasElement.prototype.getContext = original;
  });
});

describe("prepareCutLineMedia", () => {
  it("keeps source src when offset mm is 0", () => {
    const image = {
      naturalWidth: 20,
      naturalHeight: 20,
      width: 20,
      height: 20,
    } as HTMLImageElement;
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = () => null;
    const media = prepareCutLineMedia(
      image,
      "blob:x",
      "image/png",
      0,
      CANVAS_DPI,
    );
    HTMLCanvasElement.prototype.getContext = original;
    expect(media.cutLineOffsetBakedMm).toBe(0);
    expect(media.src).toBe("blob:x");
    expect(media.sourceSrc).toBe("blob:x");
    expect(media.contentScale).toBe(1);
    expect(media.pad).toBe(0);
  });
});

describe("applyPreparedCutLineMedia", () => {
  it("preserves art top-left when applying and removing pad", () => {
    const base = {
      x: 100,
      y: 80,
      scaleX: 1,
      scaleY: 1,
      width: 50,
      height: 40,
      src: "blob:raw",
      mimeType: "image/png",
      cutLineBakePad: 0,
      cutLineBakeContentScale: 1,
      cutLineOffsetBakedMm: 0,
      cutLineOffsetMm: 5,
    };
    const withPad = applyPreparedCutLineMedia(
      base,
      {
        src: "data:baked",
        mimeType: "image/png",
        width: 70,
        height: 60,
        cutLinePoints: [0, 0, 10, 0, 10, 10, 0, 10],
        sourceSrc: "blob:raw",
        cutLineOffsetBakedMm: 5,
        contentScale: 1,
        pad: 10,
      },
      1,
      1,
      5,
    );
    expect(withPad.x).toBeCloseTo(90);
    expect(withPad.y).toBeCloseTo(70);

    const restored = applyPreparedCutLineMedia(
      withPad,
      {
        src: "blob:raw",
        mimeType: "image/png",
        width: 50,
        height: 40,
        cutLinePoints: [],
        sourceSrc: "blob:raw",
        cutLineOffsetBakedMm: 0,
        contentScale: 1,
        pad: 0,
      },
      1,
      1,
      5,
    );
    expect(restored.x).toBeCloseTo(100);
    expect(restored.y).toBeCloseTo(80);
  });
});
