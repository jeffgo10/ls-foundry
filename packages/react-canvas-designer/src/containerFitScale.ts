/** 1px dashed border on each side of the canvas shell. */
export const CANVAS_SHELL_BORDER_PX = 2;

/** Scale canvas display to fit a container width; never scales above 1. */
export function computeContainerFitScale(
  containerWidth: number,
  canvasWidth: number,
  borderPx = CANVAS_SHELL_BORDER_PX,
): number {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return 1;
  }
  if (!Number.isFinite(canvasWidth) || canvasWidth <= 0) {
    return 1;
  }

  const availableWidth = Math.max(0, containerWidth - borderPx);
  return Math.min(1, availableWidth / canvasWidth);
}

export type ContainerFitDimensions = {
  displayScale: number;
  stageDisplayWidth: number;
  stageDisplayHeight: number;
  shellWidth: number;
  shellHeight: number;
};

export function getContainerFitDimensions(
  containerWidth: number,
  canvasWidth: number,
  canvasHeight: number,
  borderPx = CANVAS_SHELL_BORDER_PX,
): ContainerFitDimensions {
  const displayScale = computeContainerFitScale(
    containerWidth,
    canvasWidth,
    borderPx,
  );
  const stageDisplayWidth = canvasWidth * displayScale;
  const stageDisplayHeight = canvasHeight * displayScale;

  return {
    displayScale,
    stageDisplayWidth,
    stageDisplayHeight,
    shellWidth: stageDisplayWidth + borderPx,
    shellHeight: stageDisplayHeight + borderPx,
  };
}
