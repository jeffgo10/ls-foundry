import { createCanvas, loadImage } from "canvas";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createEmptyLayout,
  getPrintDpi,
  mmToCanvasPixels,
} from "@jeffgo10/shared-types";
import { upscaleLayoutToPng } from "./upscale";

function validPngDataUrl(width = 10, height = 10): string {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(0, 0, width, height);
  return `data:image/png;base64,${canvas.toBuffer("image/png").toString("base64")}`;
}

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

  it("preserves opaque cut-line offset pad fill from baked display PNGs", async () => {
    // Simulate designer `exportLayout` when offset is on: pad already baked into
    // the display bitmap (custom fill #0000ff, art #ff0000). Upscaler must not
    // invent transparent/white pads — it only composites the pixels it receives.
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
    // Place away from Silhouette corner markers so pad pixels are not overwritten.
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
        // Print payload may still carry these; upscaler ignores them (pixels win).
        cutLineOffsetMm: 5,
        cutLineOffsetFill: "#0000ff",
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

    const artPixel = ctx.getImageData(
      originX + pad + 2,
      originY + pad + 2,
      1,
      1,
    ).data;
    expect(artPixel[0]).toBe(255);
    expect(artPixel[1]).toBe(0);
    expect(artPixel[2]).toBe(0);
    expect(artPixel[3]).toBe(255);
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
