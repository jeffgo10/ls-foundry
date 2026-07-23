/** Pixel movement above this counts as a drag (pan), not a marker placement click. */
export const SPHERE_CLICK_DRAG_THRESHOLD_PX = 5;

export function exceedsDragThreshold(
  start: { x: number; y: number },
  end: { x: number; y: number },
  thresholdPx: number = SPHERE_CLICK_DRAG_THRESHOLD_PX,
): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return dx * dx + dy * dy > thresholdPx * thresholdPx;
}
