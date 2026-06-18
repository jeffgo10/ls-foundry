import {
  getLayoutDpiScale,
  getPrintDimensions,
  type CanvasLayout,
  type CanvasLayoutExport,
} from "@jeffgo10/shared-types";
import { createCanvas, loadImage, type CanvasRenderingContext2D } from "canvas";

export type AssetSource = {
  assetId: string;
  path?: string;
  dataUrl?: string;
};

export type UpscaleOptions = {
  layout: CanvasLayout;
  assets: AssetSource[];
};

/**
 * Mirror Konva Group transform order (translate → rotate → scale) at print DPI.
 * Target = source × (printDpi / designDpi).
 */
function drawItem(
  context: CanvasRenderingContext2D,
  image: Awaited<ReturnType<typeof loadImage>>,
  item: CanvasLayout["items"][number],
  scale: number,
) {
  const baseWidth = image.width * scale;
  const baseHeight = image.height * scale;

  context.save();
  context.translate(item.x * scale, item.y * scale);
  context.rotate((item.rotation * Math.PI) / 180);
  context.scale(item.scaleX, item.scaleY);
  context.drawImage(image, 0, 0, baseWidth, baseHeight);
  context.restore();
}

async function loadAssetSource(source: AssetSource) {
  if (source.path) {
    return loadImage(source.path);
  }

  if (source.dataUrl) {
    const commaIndex = source.dataUrl.indexOf(",");
    if (commaIndex === -1) {
      throw new Error(`Invalid data URL for assetId: ${source.assetId}`);
    }

    const base64 = source.dataUrl.slice(commaIndex + 1);
    return loadImage(Buffer.from(base64, "base64"));
  }

  throw new Error(
    `Asset source for assetId "${source.assetId}" must include path or dataUrl`,
  );
}

export async function upscaleLayoutToPng({
  layout,
  assets,
}: UpscaleOptions): Promise<Buffer> {
  const scale = getLayoutDpiScale(layout);
  const { width: printWidth, height: printHeight } = getPrintDimensions(layout);
  const canvas = createCanvas(printWidth, printHeight);
  const context = canvas.getContext("2d");

  const assetMap = new Map(assets.map((asset) => [asset.assetId, asset]));

  for (const item of layout.items) {
    const source = assetMap.get(item.assetId);
    if (!source) {
      throw new Error(`Missing asset source for assetId: ${item.assetId}`);
    }

    const image = await loadAssetSource(source);
    drawItem(context, image, item, scale);
  }

  return canvas.toBuffer("image/png");
}

export async function upscaleLayoutExportToPng(
  payload: CanvasLayoutExport,
): Promise<Buffer> {
  return upscaleLayoutToPng({
    layout: payload.layout,
    assets: payload.assets.map(({ assetId, dataUrl }) => ({
      assetId,
      dataUrl,
    })),
  });
}
