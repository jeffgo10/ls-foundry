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
