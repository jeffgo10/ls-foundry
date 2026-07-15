import {
  bakeCutLineOffset,
  traceAlphaContour,
  type TraceAlphaContourOptions,
} from "@jeffgo10/helpers/image";
import { mmToCanvasPixels } from "@jeffgo10/shared-types";

/**
 * Convert a physical cut-line offset (mm) into local image pixels so that
 * after `scaleX`/`scaleY` the stage-space pad equals the mm value.
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

export type PreparedCutLineMedia = {
  src: string;
  mimeType: string;
  width: number;
  height: number;
  cutLinePoints: number[];
  /** Pre-bake library / blob URL for re-baking when offset mm changes. */
  sourceSrc: string;
  /** Millimeters that were baked into `src` (0 = no white pad). */
  cutLineOffsetBakedMm: number;
  /**
   * Bake working-size scale vs natural image (`1` = full res).
   * Divide placement scale by this after bake so art stays the same size.
   */
  contentScale: number;
  /** White pad on each side in bake-resolution pixels (`0` when off). */
  pad: number;
};

export type CutLineMediaPlacementFields = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  width: number;
  height: number;
  src: string;
  mimeType: string;
  cutLinePoints?: number[];
  sourceSrc?: string;
  cutLineOffsetMm?: number;
  cutLineOffsetBakedMm?: number;
  cutLineBakeContentScale?: number;
  cutLineBakePad?: number;
};

/**
 * Prepare display media for a sticker: when `cutLineOffsetMm > 0`, bake a white
 * morphological pad into the PNG once and tight-trace the red cut line.
 * `scaleX`/`scaleY` should be the **placement** scale so the pad is ~`cutLineOffsetMm`
 * in stage space (large PNGs need a thicker local-pixel pad after downscaling).
 */
export function prepareCutLineMedia(
  image: HTMLImageElement,
  sourceSrc: string,
  mimeType: string,
  cutLineOffsetMm: number,
  designDpi: number,
  scaleX = 1,
  scaleY = 1,
): PreparedCutLineMedia {
  const offsetLocalPx = cutLineOffsetLocalPx(
    cutLineOffsetMm,
    designDpi,
    scaleX,
    scaleY,
  );

  if (!(offsetLocalPx > 0)) {
    const cutLinePoints = traceAlphaContour(
      image,
      image.width,
      image.height,
    );
    return {
      src: sourceSrc,
      mimeType,
      width: image.width,
      height: image.height,
      cutLinePoints,
      sourceSrc,
      cutLineOffsetBakedMm: 0,
      contentScale: 1,
      pad: 0,
    };
  }

  const baked = bakeCutLineOffset(image, offsetLocalPx);
  return {
    src: baked.dataUrl || sourceSrc,
    mimeType: "image/png",
    width: baked.width,
    height: baked.height,
    cutLinePoints: baked.cutLinePoints,
    sourceSrc,
    cutLineOffsetBakedMm: cutLineOffsetMm,
    contentScale: baked.contentScale || 1,
    pad: baked.pad || 0,
  };
}

/**
 * Swap baked/raw cut-line media while keeping the art's stage position stable.
 * Compensates for white-pad growth by shifting `x`/`y` with the pad delta.
 */
export function applyPreparedCutLineMedia<T extends CutLineMediaPlacementFields>(
  item: T,
  media: PreparedCutLineMedia,
  artScaleX: number,
  artScaleY: number,
  configuredOffsetMm: number,
): T {
  const contentScale = Math.max(media.contentScale || 1, 1e-8);
  const scaleX = artScaleX / contentScale;
  const scaleY = artScaleY / contentScale;
  const previousPad = item.cutLineBakePad ?? 0;
  const artLeft = item.x + previousPad * item.scaleX;
  const artTop = item.y + previousPad * item.scaleY;
  const nextPad = media.pad || 0;

  return {
    ...item,
    src: media.src,
    mimeType: media.mimeType,
    width: media.width,
    height: media.height,
    scaleX,
    scaleY,
    x: artLeft - nextPad * scaleX,
    y: artTop - nextPad * scaleY,
    cutLinePoints: media.cutLinePoints,
    sourceSrc: media.sourceSrc,
    cutLineOffsetMm: configuredOffsetMm,
    cutLineOffsetBakedMm: media.cutLineOffsetBakedMm,
    cutLineBakeContentScale: contentScale,
    cutLineBakePad: nextPad,
  };
}

/**
 * Tight-trace only. Prefer {@link prepareCutLineMedia} for placement so offset
 * is baked into the bitmap; this remains for callers that already have baked
 * art or need a one-off expand (legacy).
 */
export function buildCutLinePoints(
  image: HTMLImageElement,
  imageWidth: number,
  imageHeight: number,
  offsetLocalPx = 0,
  options?: TraceAlphaContourOptions,
): number[] {
  if (!(offsetLocalPx > 0)) {
    return traceAlphaContour(image, imageWidth, imageHeight, options);
  }

  return traceAlphaContour(image, imageWidth, imageHeight, {
    ...options,
    expandPx: offsetLocalPx,
  });
}

/** Yield to the browser so drop/paint stay responsive before heavy bake work. */
export function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        setTimeout(resolve, 0);
      });
      return;
    }
    setTimeout(resolve, 0);
  });
}
