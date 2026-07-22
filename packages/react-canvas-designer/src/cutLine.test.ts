import { CANVAS_DPI, mmToCanvasPixels } from "@jeffgo10/shared-types";
import {
  applyPreparedCutLineMedia,
  buildCutLinePoints,
  cutLineOffsetLocalPx,
  normalizeCutLineOffsetFill,
  prepareCutLineMedia,
  toPersistedCanvasItem,
  toSourceSpaceTransform,
} from "./cutLine";

jest.mock("@jeffgo10/helpers/image", () => ({
  bakeCutLineOffset: jest.fn(
    (
      image: HTMLImageElement,
      offsetPx: number,
      _options?: { fill?: string },
    ) => ({
      dataUrl: "data:image/png;base64,baked",
      width: (image.width || 20) + Math.ceil(offsetPx) * 2,
      height: (image.height || 20) + Math.ceil(offsetPx) * 2,
      cutLinePoints: [0, 0, 10, 0, 10, 10, 0, 10],
      pad: Math.ceil(offsetPx),
      contentScale: 1,
    }),
  ),
  traceAlphaContour: jest.fn(() => []),
}));

describe("normalizeCutLineOffsetFill", () => {
  it("treats empty / whitespace as auto", () => {
    expect(normalizeCutLineOffsetFill(undefined)).toBeUndefined();
    expect(normalizeCutLineOffsetFill(null)).toBeUndefined();
    expect(normalizeCutLineOffsetFill("")).toBeUndefined();
    expect(normalizeCutLineOffsetFill("  ")).toBeUndefined();
  });

  it("trims explicit CSS colors", () => {
    expect(normalizeCutLineOffsetFill(" #ffffff ")).toBe("#ffffff");
  });
});

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
    const media = prepareCutLineMedia(
      image,
      "blob:x",
      "image/png",
      0,
      CANVAS_DPI,
    );
    expect(media.cutLineOffsetBakedMm).toBe(0);
    expect(media.src).toBe("blob:x");
    expect(media.sourceSrc).toBe("blob:x");
    expect(media.contentScale).toBe(1);
    expect(media.pad).toBe(0);
  });

  it("forwards explicit fill to bakeCutLineOffset", () => {
    const { bakeCutLineOffset } = jest.requireMock(
      "@jeffgo10/helpers/image",
    ) as { bakeCutLineOffset: jest.Mock };
    bakeCutLineOffset.mockClear();
    const image = {
      naturalWidth: 20,
      naturalHeight: 20,
      width: 20,
      height: 20,
    } as HTMLImageElement;
    prepareCutLineMedia(
      image,
      "blob:x",
      "image/png",
      5,
      CANVAS_DPI,
      1,
      1,
      "#ffffff",
    );
    expect(bakeCutLineOffset).toHaveBeenCalledWith(
      image,
      expect.any(Number),
      { fill: "#ffffff" },
    );
  });

  it("omits fill options for auto edge color", () => {
    const { bakeCutLineOffset } = jest.requireMock(
      "@jeffgo10/helpers/image",
    ) as { bakeCutLineOffset: jest.Mock };
    bakeCutLineOffset.mockClear();
    const image = {
      naturalWidth: 20,
      naturalHeight: 20,
      width: 20,
      height: 20,
    } as HTMLImageElement;
    prepareCutLineMedia(image, "blob:x", "image/png", 5, CANVAS_DPI, 1, 1);
    expect(bakeCutLineOffset).toHaveBeenCalledWith(
      image,
      expect.any(Number),
      {},
    );
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
      "#ffffff",
    );
    expect(withPad.x).toBeCloseTo(90);
    expect(withPad.y).toBeCloseTo(70);
    expect(withPad.cutLineOffsetFill).toBe("#ffffff");

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
      0,
    );
    expect(restored.x).toBeCloseTo(100);
    expect(restored.y).toBeCloseTo(80);
    expect(restored.cutLineOffsetMm).toBeUndefined();
    expect(restored.cutLineOffsetBakedMm).toBe(0);
    expect(restored.cutLineOffsetFill).toBeUndefined();
  });

  it("preserves art stage position when applying pad on a rotated sticker", () => {
    const base = {
      x: 100,
      y: 80,
      scaleX: 1,
      scaleY: 1,
      rotation: 90,
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
    // Local (pad,pad)=(10,10) at 90° → stage offset (-10, 10) from group origin.
    // Art at (100,80) ⇒ group at (110, 70).
    expect(withPad.x).toBeCloseTo(110);
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
      0,
    );
    expect(restored.x).toBeCloseTo(100);
    expect(restored.y).toBeCloseTo(80);
  });
});

describe("toSourceSpaceTransform / toPersistedCanvasItem", () => {
  it("is identity when offset is not baked", () => {
    const item = {
      instanceId: "i1",
      assetId: "a1",
      x: 40,
      y: 50,
      scaleX: 0.5,
      scaleY: 0.5,
      rotation: 12,
      width: 100,
      height: 80,
      src: "blob:raw",
      mimeType: "image/png",
      cutLineOffsetBakedMm: 0,
      cutLineBakePad: 0,
      cutLineBakeContentScale: 1,
    };
    expect(toSourceSpaceTransform(item)).toEqual({
      x: 40,
      y: 50,
      scaleX: 0.5,
      scaleY: 0.5,
      rotation: 12,
    });
    expect(toPersistedCanvasItem(item)).toEqual({
      instanceId: "i1",
      assetId: "a1",
      x: 40,
      y: 50,
      scaleX: 0.5,
      scaleY: 0.5,
      rotation: 12,
    });
  });

  it("strips baked pad so persistence matches library assets", () => {
    const item = {
      instanceId: "i1",
      assetId: "a1",
      x: 90,
      y: 70,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      width: 70,
      height: 60,
      src: "data:baked",
      mimeType: "image/png",
      cutLineOffsetBakedMm: 5,
      cutLineOffsetMm: 5,
      cutLineOffsetFill: "#ffffff",
      cutLineBakePad: 10,
      cutLineBakeContentScale: 1,
    };
    expect(toSourceSpaceTransform(item)).toEqual({
      x: 100,
      y: 80,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    });
    expect(toPersistedCanvasItem(item)).toEqual({
      instanceId: "i1",
      assetId: "a1",
      x: 100,
      y: 80,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      cutLineOffsetMm: 5,
      cutLineOffsetFill: "#ffffff",
    });
  });

  it("omits cutLineOffsetFill when auto edge (undefined)", () => {
    const item = {
      instanceId: "i1",
      assetId: "a1",
      x: 90,
      y: 70,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      width: 70,
      height: 60,
      src: "data:baked",
      mimeType: "image/png",
      cutLineOffsetBakedMm: 5,
      cutLineOffsetMm: 5,
      cutLineBakePad: 10,
      cutLineBakeContentScale: 1,
    };
    expect(toPersistedCanvasItem(item).cutLineOffsetFill).toBeUndefined();
  });

  it("strips baked pad in stage space when the sticker is rotated", () => {
    const item = {
      instanceId: "i1",
      assetId: "a1",
      x: 110,
      y: 70,
      scaleX: 1,
      scaleY: 1,
      rotation: 90,
      width: 70,
      height: 60,
      src: "data:baked",
      mimeType: "image/png",
      cutLineOffsetBakedMm: 5,
      cutLineOffsetMm: 5,
      cutLineBakePad: 10,
      cutLineBakeContentScale: 1,
    };
    expect(toSourceSpaceTransform(item)).toEqual({
      x: 100,
      y: 80,
      scaleX: 1,
      scaleY: 1,
      rotation: 90,
    });
  });
});
