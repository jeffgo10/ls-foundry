/** Minimum user zoom multiplier relative to the fit/full baseline (1 = fitted). */
export const DEFAULT_MIN_USER_ZOOM = 1;

/** Maximum user zoom multiplier relative to the fit/full baseline. */
export const DEFAULT_MAX_USER_ZOOM = 4;

export type ViewportPan = {
  panX: number;
  panY: number;
};

export type CanvasViewportState = ViewportPan & {
  /** Multiplier on fit/full baseline scale. `1` = fitted or full-size view. */
  zoom: number;
};

export type StageTransform = {
  scaleX: number;
  scaleY: number;
  x: number;
  y: number;
};

export function clampUserZoom(
  zoom: number,
  minZoom = DEFAULT_MIN_USER_ZOOM,
  maxZoom = DEFAULT_MAX_USER_ZOOM,
): number {
  if (!Number.isFinite(zoom)) {
    return minZoom;
  }
  return Math.min(maxZoom, Math.max(minZoom, zoom));
}

/**
 * Clamp pan so the design canvas stays overlapping the viewport shell.
 * At zoom ≤ 1, pan is forced to 0 (nothing to pan).
 */
export function clampPan(
  pan: ViewportPan,
  options: {
    userZoom: number;
    fitScale: number;
    canvasWidth: number;
    canvasHeight: number;
    viewportWidth: number;
    viewportHeight: number;
  },
): ViewportPan {
  const { userZoom, fitScale, canvasWidth, canvasHeight, viewportWidth, viewportHeight } =
    options;

  if (userZoom <= 1 || fitScale <= 0) {
    return { panX: 0, panY: 0 };
  }

  const effectiveScale = fitScale * userZoom;
  const contentWidth = canvasWidth * effectiveScale;
  const contentHeight = canvasHeight * effectiveScale;

  // Content larger than viewport: pan in [viewportSize - contentSize, 0].
  const clampedX =
    contentWidth <= viewportWidth
      ? 0
      : Math.min(0, Math.max(viewportWidth - contentWidth, pan.panX));
  const clampedY =
    contentHeight <= viewportHeight
      ? 0
      : Math.min(0, Math.max(viewportHeight - contentHeight, pan.panY));

  return { panX: clampedX, panY: clampedY };
}

/**
 * Zoom toward a buffer-space point (relative to the Stage container top-left)
 * so the design point under the cursor stays fixed.
 */
export function zoomAtPoint(
  options: {
    currentZoom: number;
    nextZoom: number;
    pan: ViewportPan;
    fitScale: number;
    /** Pointer position in Stage buffer / container pixels. */
    pointerBuffer: { x: number; y: number };
    canvasWidth: number;
    canvasHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    minZoom?: number;
    maxZoom?: number;
  },
): CanvasViewportState {
  const {
    currentZoom,
    fitScale,
    pointerBuffer,
    canvasWidth,
    canvasHeight,
    viewportWidth,
    viewportHeight,
    minZoom = DEFAULT_MIN_USER_ZOOM,
    maxZoom = DEFAULT_MAX_USER_ZOOM,
  } = options;

  const zoom = clampUserZoom(options.nextZoom, minZoom, maxZoom);
  const safeFit = fitScale > 0 ? fitScale : 1;
  const oldScale = safeFit * clampUserZoom(currentZoom, minZoom, maxZoom);
  const newScale = safeFit * zoom;

  if (oldScale <= 0 || newScale <= 0 || zoom === clampUserZoom(currentZoom, minZoom, maxZoom)) {
    if (zoom <= 1) {
      return { zoom, panX: 0, panY: 0 };
    }
    const pan = clampPan(options.pan, {
      userZoom: zoom,
      fitScale: safeFit,
      canvasWidth,
      canvasHeight,
      viewportWidth,
      viewportHeight,
    });
    return { zoom, ...pan };
  }

  // Design point under pointer before zoom.
  const designX = (pointerBuffer.x - options.pan.panX) / oldScale;
  const designY = (pointerBuffer.y - options.pan.panY) / oldScale;

  // New pan keeps that design point under the same buffer pixel.
  const nextPan: ViewportPan = {
    panX: pointerBuffer.x - designX * newScale,
    panY: pointerBuffer.y - designY * newScale,
  };

  if (zoom <= 1) {
    return { zoom, panX: 0, panY: 0 };
  }

  const pan = clampPan(nextPan, {
    userZoom: zoom,
    fitScale: safeFit,
    canvasWidth,
    canvasHeight,
    viewportWidth,
    viewportHeight,
  });

  return { zoom, ...pan };
}

export function composeStageTransform(
  fitScale: number,
  userZoom: number,
  pan: ViewportPan,
): StageTransform {
  const safeFit = fitScale > 0 ? fitScale : 1;
  const zoom = clampUserZoom(userZoom);
  const scale = safeFit * zoom;
  if (zoom <= 1) {
    return { scaleX: scale, scaleY: scale, x: 0, y: 0 };
  }
  return {
    scaleX: scale,
    scaleY: scale,
    x: pan.panX,
    y: pan.panY,
  };
}
