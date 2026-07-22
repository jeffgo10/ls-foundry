import {
  BAKE_CUTLINE_MAX_DIMENSION,
  dilateBinaryMaskFast,
  dominantEdgeColorFromAlphaData,
} from "@jeffgo10/helpers/image";
import { mmToCanvasPixels } from "@jeffgo10/shared-types";
import { createCanvas, type Image } from "canvas";

export type BakeCutLineOffsetNodeOptions = {
  /** Opaque ring fill. Omitted = dominant edge color. */
  fill?: string;
  alphaThreshold?: number;
  maxDimension?: number;
};

export type BakeCutLineOffsetNodeResult = {
  /** Baked bitmap ready for `drawImage`. */
  image: ReturnType<typeof createCanvas>;
  width: number;
  height: number;
  pad: number;
  contentScale: number;
};

type Rgb = [number, number, number];

function parseCssColor(fill: string): Rgb {
  const trimmed = fill.trim().toLowerCase();
  if (trimmed === "#fff" || trimmed === "#ffffff" || trimmed === "white") {
    return [255, 255, 255];
  }
  const hex = /^#([0-9a-f]{6})$/i.exec(trimmed);
  if (hex) {
    const value = Number.parseInt(hex[1]!, 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }
  return [255, 255, 255];
}

/**
 * Normalize an explicit cut-line pad fill. Empty / whitespace → `undefined`
 * (auto dominant edge color).
 */
export function normalizeCutLineOffsetFill(
  fill: string | undefined | null,
): string | undefined {
  if (fill == null) {
    return undefined;
  }
  const trimmed = fill.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Convert a physical cut-line offset (mm) into local image pixels so that
 * after placement `scaleX`/`scaleY` the stage-space pad equals the mm value.
 * Matches `react-canvas-designer` `cutLineOffsetLocalPx`.
 */
export function cutLineOffsetLocalPx(
  offsetMm: number,
  designDpi: number,
  scaleX = 1,
  scaleY = 1,
): number {
  if (!Number.isFinite(offsetMm) || offsetMm === 0) {
    return 0;
  }
  const scale = Math.max(Math.abs(scaleX), Math.abs(scaleY), 1e-8);
  return mmToCanvasPixels(offsetMm, designDpi) / scale;
}

/** Stage-space offset of local `(pad, pad)` after scale → rotate (Konva order). */
export function padCornerStageOffset(
  pad: number,
  scaleX: number,
  scaleY: number,
  rotationDeg: number,
): { x: number; y: number } {
  if (!(pad > 0)) {
    return { x: 0, y: 0 };
  }
  const scaledX = pad * scaleX;
  const scaledY = pad * scaleY;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: scaledX * cos - scaledY * sin,
    y: scaledX * sin + scaledY * cos,
  };
}

/**
 * Node-canvas port of helpers `bakeCutLineOffset` for print upscale.
 * Dilates alpha, draws art, fills the ring (dominant edge or explicit CSS).
 */
export function bakeCutLineOffsetNode(
  image: Image,
  offsetPx: number,
  options: BakeCutLineOffsetNodeOptions = {},
): BakeCutLineOffsetNodeResult {
  const alphaThreshold = options.alphaThreshold ?? 20;
  const maxDimension = options.maxDimension ?? BAKE_CUTLINE_MAX_DIMENSION;

  const srcW = Math.max(1, image.width);
  const srcH = Math.max(1, image.height);
  const longest = Math.max(srcW, srcH);
  const contentScale = longest > maxDimension ? maxDimension / longest : 1;
  const workW = Math.max(1, Math.round(srcW * contentScale));
  const workH = Math.max(1, Math.round(srcH * contentScale));
  const workOffsetPx = offsetPx * contentScale;

  if (!(offsetPx > 0)) {
    const canvas = createCanvas(workW, workH);
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, workW, workH);
    return {
      image: canvas,
      width: workW,
      height: workH,
      pad: 0,
      contentScale,
    };
  }

  const pad = Math.ceil(workOffsetPx);
  const width = workW + pad * 2;
  const height = workH + pad * 2;

  const srcCanvas = createCanvas(workW, workH);
  const srcContext = srcCanvas.getContext("2d");
  srcContext.drawImage(image, 0, 0, workW, workH);
  const { data } = srcContext.getImageData(0, 0, workW, workH);
  const normalizedFill = normalizeCutLineOffsetFill(options.fill);
  const [fillR, fillG, fillB] = normalizedFill
    ? parseCssColor(normalizedFill)
    : dominantEdgeColorFromAlphaData(
        data as unknown as Uint8ClampedArray,
        workW,
        workH,
        alphaThreshold,
      );

  const mask = new Uint8Array(width * height);
  for (let y = 0; y < workH; y += 1) {
    for (let x = 0; x < workW; x += 1) {
      if (data[(y * workW + x) * 4 + 3]! > alphaThreshold) {
        mask[(y + pad) * width + (x + pad)] = 1;
      }
    }
  }

  const dilated = dilateBinaryMaskFast(mask, width, height, workOffsetPx);

  const out = createCanvas(width, height);
  const outContext = out.getContext("2d");
  outContext.drawImage(image, pad, pad, workW, workH);
  const pixels = outContext.getImageData(0, 0, width, height);
  for (let i = 0; i < dilated.length; i += 1) {
    if (dilated[i] !== 1 || mask[i] === 1) continue;
    const p = i * 4;
    pixels.data[p] = fillR;
    pixels.data[p + 1] = fillG;
    pixels.data[p + 2] = fillB;
    pixels.data[p + 3] = 255;
  }
  outContext.putImageData(pixels, 0, 0);

  return {
    image: out,
    width,
    height,
    pad,
    contentScale,
  };
}
