import { createCanvas, loadImage } from "canvas";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createEmptyLayout,
  getPrintDpi,
  mmToCanvasPixels,
} from "@jeffgo10/shared-types";
import {
  bakeCutLineOffsetNode,
  cutLineOffsetLocalPx,
  normalizeCutLineOffsetFill,
  padCornerStageOffset,
} from "./bakeCutLineOffsetNode";
import { upscaleLayoutToPng } from "./upscale";

function validPngDataUrl(width = 10, height = 10): string {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(0, 0, width, height);
  return `data:image/png;base64,${canvas.toBuffer("image/png").toString("base64")}`;
}

/** Source sticker with transparent margin + opaque red art (StickPak library asset). */
function sourceStickerDataUrl(size = 24, inset = 4): string {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(inset, inset, size - inset * 2, size - inset * 2);
  return `data:image/png;base64,${canvas.toBuffer("image/png").toString("base64")}`;
}

describe("normalizeCutLineOffsetFill / cutLineOffsetLocalPx", () => {
  it("treats empty fill as auto", () => {
    expect(normalizeCutLineOffsetFill(undefined)).toBeUndefined();
    expect(normalizeCutLineOffsetFill(null)).toBeUndefined();
    expect(normalizeCutLineOffsetFill("")).toBeUndefined();
    expect(normalizeCutLineOffsetFill("  ")).toBeUndefined();
    expect(normalizeCutLineOffsetFill("#0000ff")).toBe("#0000ff");
  });

  it("converts mm to local px by placement scale", () => {
    expect(cutLineOffsetLocalPx(0, 72)).toBe(0);
    expect(cutLineOffsetLocalPx(Number.NaN, 72)).toBe(0);
    expect(cutLineOffsetLocalPx(5, 72, 1, 1)).toBeCloseTo(
      mmToCanvasPixels(5, 72),
      5,
    );
    expect(cutLineOffsetLocalPx(5, 72, 2, 2)).toBeCloseTo(
      mmToCanvasPixels(5, 72) / 2,
      5,
    );
  });
});

describe("padCornerStageOffset / bakeCutLineOffsetNode", () => {
  it("returns zero stage offset when pad is not positive", () => {
    expect(padCornerStageOffset(0, 1, 1, 45)).toEqual({ x: 0, y: 0 });
    expect(padCornerStageOffset(-2, 1, 1, 0)).toEqual({ x: 0, y: 0 });
  });

  it("rotates pad corner into stage space", () => {
    expect(padCornerStageOffset(10, 1, 1, 0)).toEqual({ x: 10, y: 10 });
    const rotated = padCornerStageOffset(10, 1, 1, 90);
    expect(rotated.x).toBeCloseTo(-10, 5);
    expect(rotated.y).toBeCloseTo(10, 5);
  });

  it("returns passthrough canvas when offsetPx is not positive", async () => {
    const image = await loadImage(Buffer.from(validPngDataUrl().split(",")[1]!, "base64"));
    const baked = bakeCutLineOffsetNode(image, 0);
    expect(baked.pad).toBe(0);
    expect(baked.width).toBe(image.width);
    expect(baked.height).toBe(image.height);
    expect(baked.contentScale).toBe(1);
  });

  it("honors white and invalid CSS fill names as opaque white", async () => {
    const size = 24;
    const inset = 4;
    const image = await loadImage(
      Buffer.from(sourceStickerDataUrl(size, inset).split(",")[1]!, "base64"),
    );
    for (const fill of ["#fff", "#ffffff", "white", "not-a-color"] as const) {
      const baked = bakeCutLineOffsetNode(image, 3, { fill });
      expect(baked.pad).toBeGreaterThan(0);
      const ctx = baked.image.getContext("2d");
      // Sample just outside the art edge (inside the dilated ring).
      const sampleX = baked.pad + inset - 1;
      const sampleY = baked.pad + Math.floor(size / 2);
      const padPixel = ctx.getImageData(sampleX, sampleY, 1, 1).data;
      expect(padPixel[0]).toBe(255);
      expect(padPixel[1]).toBe(255);
      expect(padPixel[2]).toBe(255);
      expect(padPixel[3]).toBe(255);
    }
  });

  it("uses dominant edge color when fill is omitted", async () => {
    const size = 24;
    const inset = 4;
    const image = await loadImage(
      Buffer.from(sourceStickerDataUrl(size, inset).split(",")[1]!, "base64"),
    );
    const baked = bakeCutLineOffsetNode(image, 3);
    expect(baked.pad).toBeGreaterThan(0);
    const ctx = baked.image.getContext("2d");
    const sampleX = baked.pad + inset - 1;
    const sampleY = baked.pad + Math.floor(size / 2);
    const padPixel = ctx.getImageData(sampleX, sampleY, 1, 1).data;
    // Source art is red — dominant edge should be opaque red-ish, not transparent.
    expect(padPixel[3]).toBe(255);
    expect(padPixel[0]).toBeGreaterThan(200);
  });
});

describe("canvas-upscaler", () => {
  const dataUrl = validPngDataUrl();

  it("draws 1mm opaque white squares at each print corner for Silhouette alignment", async () => {
    const layout = createEmptyLayout();
    const buffer = await upscaleLayoutToPng({ layout, assets: [] });
    const image = await loadImage(buffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);

    const markerPx = Math.round(mmToCanvasPixels(1, getPrintDpi(layout)));
    const corners = [
      [0, 0],
      [image.width - markerPx, 0],
      [0, image.height - markerPx],
      [image.width - markerPx, image.height - markerPx],
    ] as const;

    for (const [x, y] of corners) {
      const { data } = ctx.getImageData(x, y, markerPx, markerPx);
      for (let i = 0; i < data.length; i += 4) {
        expect(data[i]).toBe(255);
        expect(data[i + 1]).toBe(255);
        expect(data[i + 2]).toBe(255);
        expect(data[i + 3]).toBe(255);
      }
    }

    const center = ctx.getImageData(
      Math.floor(image.width / 2),
      Math.floor(image.height / 2),
      1,
      1,
    );
    expect(center.data[3]).toBe(0);
  });

  it("preserves opaque cut-line offset pad fill from already-baked display PNGs", async () => {
    // `exportLayout()` embeds baked display bitmaps and omits cutLineOffsetMm.
    const pad = 4;
    const art = 8;
    const size = art + pad * 2;
    const baked = createCanvas(size, size);
    const bakedCtx = baked.getContext("2d");
    bakedCtx.fillStyle = "#0000ff";
    bakedCtx.fillRect(0, 0, size, size);
    bakedCtx.fillStyle = "#ff0000";
    bakedCtx.fillRect(pad, pad, art, art);
    const bakedDataUrl = `data:image/png;base64,${baked
      .toBuffer("image/png")
      .toString("base64")}`;

    const layout = createEmptyLayout({
      canvasWidth: 40,
      canvasHeight: 40,
      designDpi: 72,
      printDpi: 72,
    });
    const originX = 10;
    const originY = 10;
    layout.items = [
      {
        instanceId: "i1",
        assetId: "baked-offset",
        x: originX,
        y: originY,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
    ];

    const buffer = await upscaleLayoutToPng({
      layout,
      assets: [{ assetId: "baked-offset", dataUrl: bakedDataUrl }],
    });

    const image = await loadImage(buffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);

    const padPixel = ctx.getImageData(originX + 1, originY + 1, 1, 1).data;
    expect(padPixel[0]).toBe(0);
    expect(padPixel[1]).toBe(0);
    expect(padPixel[2]).toBe(255);
    expect(padPixel[3]).toBe(255);
  });

  it("bakes cutLineOffset from source assets with custom fill (exportLayoutState path)", async () => {
    // StickPak admin print: raw S3 source + cutLineOffsetMm / cutLineOffsetFill.
    const sourceSize = 24;
    const layout = createEmptyLayout({
      canvasWidth: 80,
      canvasHeight: 80,
      designDpi: 72,
      printDpi: 72,
    });
    const artX = 20;
    const artY = 20;
    const scaleX = 1;
    const scaleY = 1;
    const offsetMm = 2;
    layout.items = [
      {
        instanceId: "i1",
        assetId: "source-1",
        x: artX,
        y: artY,
        scaleX,
        scaleY,
        rotation: 0,
        cutLineOffsetMm: offsetMm,
        cutLineOffsetFill: "#0000ff",
      },
    ];

    const buffer = await upscaleLayoutToPng({
      layout,
      assets: [{ assetId: "source-1", dataUrl: sourceStickerDataUrl(sourceSize) }],
    });

    const offsetLocalPx = cutLineOffsetLocalPx(offsetMm, 72, scaleX, scaleY);
    const pad = Math.ceil(offsetLocalPx);
    const displayScaleX = scaleX;
    const displayScaleY = scaleY;
    const padOffset = padCornerStageOffset(pad, displayScaleX, displayScaleY, 0);
    const groupX = artX - padOffset.x;
    const groupY = artY - padOffset.y;

    const image = await loadImage(buffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);

    // Sample inside the baked pad ring (left of the art, inside dilated alpha).
    const padSampleX = Math.round(groupX + pad - 1);
    const padSampleY = Math.round(groupY + pad + sourceSize / 2);
    const padPixel = ctx.getImageData(padSampleX, padSampleY, 1, 1).data;
    expect(padPixel[0]).toBe(0);
    expect(padPixel[1]).toBe(0);
    expect(padPixel[2]).toBe(255);
    expect(padPixel[3]).toBe(255);

    // Art center should still be red.
    const artPixel = ctx.getImageData(
      Math.round(artX + sourceSize / 2),
      Math.round(artY + sourceSize / 2),
      1,
      1,
    ).data;
    expect(artPixel[0]).toBe(255);
    expect(artPixel[1]).toBe(0);
    expect(artPixel[2]).toBe(0);
    expect(artPixel[3]).toBe(255);
  });

  it("leaves items without cutLineOffsetMm unchanged", async () => {
    const layout = createEmptyLayout({
      canvasWidth: 40,
      canvasHeight: 40,
      designDpi: 72,
      printDpi: 72,
    });
    layout.items = [
      {
        instanceId: "i1",
        assetId: "a1",
        x: 10,
        y: 10,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
    ];

    const buffer = await upscaleLayoutToPng({
      layout,
      assets: [{ assetId: "a1", dataUrl: sourceStickerDataUrl(16, 2) }],
    });

    const image = await loadImage(buffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);

    // Outside the 16×16 source bounds should stay transparent (no invented pad).
    const outside = ctx.getImageData(9, 9, 1, 1).data;
    expect(outside[3]).toBe(0);
  });

  it("upscales a single-item layout to print dimensions", async () => {
    const layout = createEmptyLayout();
    layout.items = [
      {
        instanceId: "i1",
        assetId: "a1",
        x: 10,
        y: 20,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
    ];

    const buffer = await upscaleLayoutToPng({
      layout,
      assets: [{ assetId: "a1", dataUrl }],
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("loads assets from filesystem path", async () => {
    const dir = mkdtempSync(join(tmpdir(), "upscaler-"));
    const filePath = join(dir, "tile.png");
    writeFileSync(filePath, createCanvas(8, 8).toBuffer("image/png"));

    const layout = createEmptyLayout();
    layout.items = [
      {
        instanceId: "i1",
        assetId: "a1",
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
    ];

    const buffer = await upscaleLayoutToPng({
      layout,
      assets: [{ assetId: "a1", path: filePath }],
    });

    expect(buffer.length).toBeGreaterThan(0);
  });

  it("upscales from layout export payload", async () => {
    const layout = createEmptyLayout();
    layout.items = [
      {
        instanceId: "i1",
        assetId: "a1",
        x: 0,
        y: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        rotation: 45,
      },
    ];

    const { upscaleLayoutExportToPng } = await import("./upscale");
    const buffer = await upscaleLayoutExportToPng({
      layout,
      assets: [{ assetId: "a1", mimeType: "image/png", dataUrl }],
    });

    expect(buffer.length).toBeGreaterThan(0);
  });

  it("throws when asset is missing", async () => {
    const layout = createEmptyLayout();
    layout.items = [
      {
        instanceId: "i1",
        assetId: "missing",
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
    ];

    await expect(
      upscaleLayoutToPng({ layout, assets: [] }),
    ).rejects.toThrow(/Missing asset source/);
  });

  it("throws on invalid data URL", async () => {
    const layout = createEmptyLayout();
    layout.items = [
      {
        instanceId: "i1",
        assetId: "a1",
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
    ];

    await expect(
      upscaleLayoutToPng({
        layout,
        assets: [{ assetId: "a1", dataUrl: "not-a-data-url" }],
      }),
    ).rejects.toThrow(/Invalid data URL/);
  });

  it("throws when asset has no path or dataUrl", async () => {
    const layout = createEmptyLayout();
    layout.items = [
      {
        instanceId: "i1",
        assetId: "a1",
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
    ];

    await expect(
      upscaleLayoutToPng({
        layout,
        assets: [{ assetId: "a1" }],
      }),
    ).rejects.toThrow(/must include path or dataUrl/);
  });
});
