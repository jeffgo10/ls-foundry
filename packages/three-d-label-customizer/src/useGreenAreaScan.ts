import { useEffect, useState } from "react";
import {
  SCAN_WARNING_MESSAGE,
  scanProductImageFromElement,
} from "./scanProductImageFromElement";
import type { SurfaceGrid, TargetBounds } from "./types";

export { SCAN_WARNING_MESSAGE };

export interface GreenAreaScanResult {
  targetBounds: TargetBounds | null;
  surfaceGrid: SurfaceGrid | null;
  imageWidth: number;
  imageHeight: number;
  displayCanvasSrc: string | null;
  scanWarning: string | null;
  isScanning: boolean;
}

export function useGreenAreaScan(canvasImageSrc: string): GreenAreaScanResult {
  const [targetBounds, setTargetBounds] = useState<TargetBounds | null>(null);
  const [surfaceGrid, setSurfaceGrid] = useState<SurfaceGrid | null>(null);
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);
  const [displayCanvasSrc, setDisplayCanvasSrc] = useState<string | null>(null);
  const [scanWarning, setScanWarning] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!canvasImageSrc) {
      setTargetBounds(null);
      setSurfaceGrid(null);
      setImageWidth(0);
      setImageHeight(0);
      setDisplayCanvasSrc(null);
      setScanWarning(null);
      setIsScanning(false);
      return;
    }

    let cancelled = false;
    setIsScanning(true);
    setScanWarning(null);

    const image = new Image();
    image.crossOrigin = "anonymous";

    const finish = () => {
      if (!cancelled) setIsScanning(false);
    };

    image.onload = () => {
      if (cancelled) return;

      const result = scanProductImageFromElement(image);
      setImageWidth(result.imageWidth);
      setImageHeight(result.imageHeight);
      setTargetBounds(result.targetBounds);
      setSurfaceGrid(result.surfaceGrid);
      setDisplayCanvasSrc(result.displayCanvasSrc);
      setScanWarning(result.scanWarning);
      finish();
    };

    image.onerror = () => {
      if (cancelled) return;
      setTargetBounds(null);
      setSurfaceGrid(null);
      setImageWidth(0);
      setImageHeight(0);
      setDisplayCanvasSrc(null);
      setScanWarning("Failed to load product image.");
      finish();
    };

    image.src = canvasImageSrc;

    return () => {
      cancelled = true;
    };
  }, [canvasImageSrc]);

  return {
    targetBounds,
    surfaceGrid,
    imageWidth,
    imageHeight,
    displayCanvasSrc,
    scanWarning,
    isScanning,
  };
}
