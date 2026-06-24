import { createDisplayProductImageSrc } from "./prepareProductDisplayImage";
import {
  createFallbackBounds,
  scanNeonGreenBounds,
} from "./scanNeonGreenBounds";
import { resolveSurfaceGrid } from "./resolveSurfaceGrid";
import { synthesizeSurfaceGrid } from "./synthesizeSurfaceGrid";
import type { SurfaceGrid, TargetBounds } from "./types";

export const SCAN_WARNING_MESSAGE =
  "No neon-green surface detected — label placed at image center. Adjust the product image or use offset controls.";

export interface ProductImageScanResult {
  targetBounds: TargetBounds;
  surfaceGrid: SurfaceGrid | null;
  imageWidth: number;
  imageHeight: number;
  displayCanvasSrc: string;
  scanWarning: string | null;
}

/** Scan a loaded HTMLImageElement for neon-green bounds (testable without Image loader). */
export function scanProductImageFromElement(
  image: HTMLImageElement,
): ProductImageScanResult {
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;

  const canvas = document.createElement("canvas");
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    const targetBounds = createFallbackBounds(imageWidth, imageHeight);
    return {
      targetBounds,
      surfaceGrid: null,
      imageWidth,
      imageHeight,
      displayCanvasSrc: image.src,
      scanWarning: SCAN_WARNING_MESSAGE,
    };
  }

  ctx.drawImage(image, 0, 0, imageWidth, imageHeight);
  const imageData = ctx.getImageData(0, 0, imageWidth, imageHeight);
  const bounds = scanNeonGreenBounds(imageData);

  if (bounds) {
    const surfaceGrid = resolveSurfaceGrid(imageData, bounds);
    return {
      targetBounds: bounds,
      surfaceGrid,
      imageWidth,
      imageHeight,
      displayCanvasSrc: createDisplayProductImageSrc(image, bounds),
      scanWarning: null,
    };
  }

  const targetBounds = createFallbackBounds(imageWidth, imageHeight);
  return {
    targetBounds,
    surfaceGrid: synthesizeSurfaceGrid(targetBounds),
    imageWidth,
    imageHeight,
    displayCanvasSrc: createDisplayProductImageSrc(image, targetBounds),
    scanWarning: SCAN_WARNING_MESSAGE,
  };
}
