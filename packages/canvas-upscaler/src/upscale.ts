import {
  getDesignDpi,
  getLayoutDpiScale,
  getPrintDimensions,
  getPrintDpi,
  mmToCanvasPixels,
  type CanvasItem,
  type CanvasLayout,
  type CanvasLayoutExport,
} from "@jeffgo10/shared-types";
import { createCanvas, loadImage, type CanvasRenderingContext2D } from "canvas";
import {
  bakeCutLineOffsetNode,
  cutLineOffsetLocalPx,
  normalizeCutLineOffsetFill,
  padCornerStageOffset,
} from "./bakeCutLineOffsetNode";

export type AssetSource = {
  assetId: string;
  path?: string;
  dataUrl?: string;
};

export type UpscaleOptions = {
  layout: CanvasLayout;
  assets: AssetSource[];
};

/** Physical size of each Silhouette alignment square at print corners. */
export const SILHOUETTE_CORNER_MARKER_MM = 1;

function drawSilhouetteCornerMarkers(
  context: CanvasRenderingContext2D,
  printWidth: number,
  printHeight: number,
  markerPx: number,
) {
  context.save();
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, markerPx, markerPx);
  context.fillRect(printWidth - markerPx, 0, markerPx, markerPx);
  context.fillRect(0, printHeight - markerPx, markerPx, markerPx);
  context.fillRect(
    printWidth - markerPx,
    printHeight - markerPx,
    markerPx,
    markerPx,
  );
  context.restore();
}

type DrawableImage = Awaited<ReturnType<typeof loadImage>> | ReturnType<
  typeof createCanvas
>;

/**
 * Mirror Konva Group transform order (translate → rotate → scale) at print DPI.
 * Target = source × (printDpi / designDpi).
 */
function drawItem(
  context: CanvasRenderingContext2D,
  image: DrawableImage,
  item: Pick<CanvasItem, "x" | "y" | "scaleX" | "scaleY" | "rotation">,
  scale: number,
  imageWidth: number,
  imageHeight: number,
) {
  const baseWidth = imageWidth * scale;
  const baseHeight = imageHeight * scale;

  context.save();
  context.translate(item.x * scale, item.y * scale);
  context.rotate((item.rotation * Math.PI) / 180);
  context.scale(item.scaleX, item.scaleY);
  context.drawImage(image, 0, 0, baseWidth, baseHeight);
  context.restore();
}

/**
 * When layout has `cutLineOffsetMm` (StickPak `exportLayoutState` + S3 sources),
 * bake the pad to match canvas preview. Source-space transforms are compensated
 * with the same pad/contentScale math as react-canvas-designer.
 */
function prepareItemForDraw(
  image: Awaited<ReturnType<typeof loadImage>>,
  item: CanvasItem,
  designDpi: number,
): {
  image: DrawableImage;
  width: number;
  height: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
} {
  const offsetMm = item.cutLineOffsetMm ?? 0;
  if (!(offsetMm > 0)) {
    return {
      image,
      width: image.width,
      height: image.height,
      x: item.x,
      y: item.y,
      scaleX: item.scaleX,
      scaleY: item.scaleY,
      rotation: item.rotation,
    };
  }

  const offsetLocalPx = cutLineOffsetLocalPx(
    offsetMm,
    designDpi,
    item.scaleX,
    item.scaleY,
  );
  const fill = normalizeCutLineOffsetFill(item.cutLineOffsetFill);
  const baked = bakeCutLineOffsetNode(image, offsetLocalPx, {
    fill,
  });
  const contentScale = Math.max(baked.contentScale || 1, 1e-8);
  const scaleX = item.scaleX / contentScale;
  const scaleY = item.scaleY / contentScale;
  const padOffset = padCornerStageOffset(
    baked.pad,
    scaleX,
    scaleY,
    item.rotation,
  );

  return {
    image: baked.image,
    width: baked.width,
    height: baked.height,
    // Source-space (x,y) is the art origin; shift group origin by pad corner.
    x: item.x - padOffset.x,
    y: item.y - padOffset.y,
    scaleX,
    scaleY,
    rotation: item.rotation,
  };
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
  const designDpi = getDesignDpi(layout);
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
    const prepared = prepareItemForDraw(image, item, designDpi);
    drawItem(
      context,
      prepared.image,
      prepared,
      scale,
      prepared.width,
      prepared.height,
    );
  }

  const markerPx = Math.round(
    mmToCanvasPixels(SILHOUETTE_CORNER_MARKER_MM, getPrintDpi(layout)),
  );
  drawSilhouetteCornerMarkers(context, printWidth, printHeight, markerPx);

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
