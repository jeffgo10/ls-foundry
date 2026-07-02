import { traceAlphaContour } from "@jeffgo10/helpers/image";
import {
  CANVAS_DPI,
  mmToCanvasPixels,
  type OverlapVerifyOptions,
  type OverlapVerifyResult,
} from "@jeffgo10/shared-types";
import { cutLinesViolateGap } from "./cutLineGeometry";
import type { MarginBoundsItem } from "./canvasMargin";

export type OverlapVerifyItem = MarginBoundsItem & {
  instanceId: string;
  /** Image source for tracing alpha cut lines when `cutLinePoints` are not cached yet. */
  src?: string;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Failed to load image for overlap verification"));
    image.src = src;
  });
}

async function resolveCutLinePoints(
  item: OverlapVerifyItem,
): Promise<number[] | null> {
  if (item.cutLinePoints && item.cutLinePoints.length >= 4) {
    return item.cutLinePoints;
  }
  if (!item.src) {
    return null;
  }

  try {
    const image = await loadImage(item.src);
    const points = traceAlphaContour(image, item.width, item.height);
    return points.length >= 4 ? points : null;
  } catch {
    return null;
  }
}

/**
 * Detect stickers whose alpha cut-line outlines overlap or are closer than
 * `minGapMm` (edge-to-edge). Uses traced PNG transparency contours only —
 * never the full image file rectangle.
 */
export async function verifyItemOverlaps(
  items: OverlapVerifyItem[],
  options: OverlapVerifyOptions = {},
): Promise<OverlapVerifyResult> {
  if (items.length < 2) {
    return { valid: true, overlappingIds: [], pairs: [] };
  }

  const minGapMm = options.minGapMm ?? 0;
  const designDpi = options.designDpi ?? CANVAS_DPI;
  const gapPx = mmToCanvasPixels(minGapMm, designDpi);

  const resolved = await Promise.all(
    items.map(async (item) => ({
      instanceId: item.instanceId,
      item,
      cutLinePoints: await resolveCutLinePoints(item),
    })),
  );

  const placed = resolved.filter(
    (
      entry,
    ): entry is typeof entry & { cutLinePoints: number[] } =>
      entry.cutLinePoints !== null,
  );

  if (placed.length < 2) {
    return { valid: true, overlappingIds: [], pairs: [] };
  }

  const pairs: Array<{ a: string; b: string }> = [];
  const overlappingIds = new Set<string>();

  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      const left = placed[i]!;
      const right = placed[j]!;
      if (
        cutLinesViolateGap(
          left.item,
          left.cutLinePoints,
          right.item,
          right.cutLinePoints,
          gapPx,
        )
      ) {
        pairs.push({ a: left.instanceId, b: right.instanceId });
        overlappingIds.add(left.instanceId);
        overlappingIds.add(right.instanceId);
      }
    }
  }

  return {
    valid: pairs.length === 0,
    overlappingIds: [...overlappingIds],
    pairs,
  };
}
