import {
  getItemAxisAlignedBounds,
  type MarginBoundsItem,
} from "./canvasMargin";

export type MarqueeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const MARQUEE_MIN_SIZE_PX = 4;

export function normalizeMarqueeRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): MarqueeRect {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

export function rectsIntersect(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number },
): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

export function getMarqueeHitInstanceIds(
  items: readonly (MarginBoundsItem & { instanceId: string })[],
  marquee: MarqueeRect,
): string[] {
  const selectionBounds = {
    minX: marquee.x,
    minY: marquee.y,
    maxX: marquee.x + marquee.width,
    maxY: marquee.y + marquee.height,
  };

  return items
    .filter((item) => {
      const itemBounds = getItemAxisAlignedBounds(item);
      return rectsIntersect(selectionBounds, itemBounds);
    })
    .map((item) => item.instanceId);
}

export function mergeMarqueeSelection(
  currentIds: readonly string[],
  hitIds: readonly string[],
  additive: boolean,
): string[] {
  if (additive) {
    return [...new Set([...currentIds, ...hitIds])];
  }
  return [...hitIds];
}

export function isMarqueeClick(marquee: MarqueeRect): boolean {
  return (
    marquee.width < MARQUEE_MIN_SIZE_PX && marquee.height < MARQUEE_MIN_SIZE_PX
  );
}
