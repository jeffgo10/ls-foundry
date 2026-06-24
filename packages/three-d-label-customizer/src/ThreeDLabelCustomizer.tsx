"use client";

import { Canvas } from "@react-three/fiber";
import { AlertTriangle, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LabelScene } from "./scene/LabelScene";
import { PACKAGE_VERSION } from "./labelSceneCoords";
import type { LabelDeformControls, ThreeDLabelCustomizerProps } from "./types";
import { useGreenAreaScan } from "./useGreenAreaScan";
import { useImageDimensions } from "./useImageDimensions";

const DEFAULT_CONTROLS: LabelDeformControls = {
  curvature: 35,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
};

function ControlSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="tdlc-control">
      <span className="tdlc-control__label">{label}</span>
      <input
        type="range"
        className="tdlc-control__slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="tdlc-control__value">{value}</span>
    </label>
  );
}

export function ThreeDLabelCustomizer({
  canvasImageSrc,
  labelImageSrc,
  showWireframe = false,
}: ThreeDLabelCustomizerProps) {
  const {
    targetBounds,
    surfaceGrid,
    imageWidth,
    imageHeight,
    displayCanvasSrc,
    scanWarning,
    isScanning,
  } = useGreenAreaScan(canvasImageSrc);
  const labelSize = useImageDimensions(labelImageSrc);
  const [controls, setControls] = useState<LabelDeformControls>(DEFAULT_CONTROLS);

  useEffect(() => {
    setControls(DEFAULT_CONTROLS);
  }, [canvasImageSrc, labelImageSrc]);

  const aspectRatio = useMemo(() => {
    if (imageWidth <= 0 || imageHeight <= 0) return "16 / 9";
    return `${imageWidth} / ${imageHeight}`;
  }, [imageWidth, imageHeight]);

  const updateControl = <K extends keyof LabelDeformControls>(
    key: K,
    value: LabelDeformControls[K],
  ) => {
    setControls((prev) => ({ ...prev, [key]: value }));
  };

  const ready =
    Boolean(canvasImageSrc && labelImageSrc && targetBounds && displayCanvasSrc) &&
    imageWidth > 0 &&
    imageHeight > 0 &&
    labelSize.width > 0 &&
    labelSize.height > 0;

  return (
    <div className="tdlc-root" style={{ aspectRatio }}>
      {scanWarning ? (
        <div className="tdlc-warning" role="status">
          <AlertTriangle size={14} aria-hidden />
          <span>{scanWarning}</span>
        </div>
      ) : null}

      <div className="tdlc-controls">
        <div className="tdlc-controls__title">
          <SlidersHorizontal size={14} aria-hidden />
          <span>Label warp</span>
          <span className="tdlc-controls__version" title="Package build">
            v{PACKAGE_VERSION}
          </span>
        </div>
        <ControlSlider
          label="Curvature"
          min={0}
          max={100}
          step={1}
          value={controls.curvature}
          onChange={(value) => updateControl("curvature", value)}
        />
        <ControlSlider
          label="Offset X"
          min={-200}
          max={200}
          step={1}
          value={controls.offsetX}
          onChange={(value) => updateControl("offsetX", value)}
        />
        <ControlSlider
          label="Offset Y"
          min={-200}
          max={200}
          step={1}
          value={controls.offsetY}
          onChange={(value) => updateControl("offsetY", value)}
        />
        <ControlSlider
          label="Rotation fine-tune"
          min={-30}
          max={30}
          step={0.5}
          value={controls.rotation}
          onChange={(value) => updateControl("rotation", value)}
        />
      </div>

      <div className="tdlc-canvas-wrap">
        {isScanning ? (
          <div className="tdlc-loading">Scanning green surface…</div>
        ) : null}
        {!ready && !isScanning ? (
          <div className="tdlc-loading">Load product and label images</div>
        ) : null}
        {ready && targetBounds ? (
          <Canvas
            className="tdlc-canvas"
            gl={{ alpha: true, antialias: true }}
            style={{ width: "100%", height: "100%" }}
          >
            <LabelScene
              displayCanvasSrc={displayCanvasSrc}
              labelImageSrc={labelImageSrc}
              labelSize={labelSize}
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              targetBounds={targetBounds}
              surfaceGrid={surfaceGrid}
              controls={controls}
              showWireframe={showWireframe}
            />
          </Canvas>
        ) : null}
      </div>

      <style>{`
        .tdlc-root {
          position: relative;
          width: 100%;
          max-width: 100%;
          background: #070708;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          overflow: hidden;
        }
        .tdlc-canvas-wrap {
          position: absolute;
          inset: 0;
        }
        .tdlc-canvas {
          display: block;
        }
        .tdlc-loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.4);
        }
        .tdlc-warning {
          position: absolute;
          top: 0.75rem;
          left: 0.75rem;
          right: 0.75rem;
          z-index: 3;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          background: rgba(180, 120, 0, 0.2);
          border: 1px solid rgba(255, 200, 80, 0.35);
          color: rgba(255, 220, 160, 0.95);
          font-size: 0.75rem;
          line-height: 1.4;
        }
        .tdlc-controls {
          position: absolute;
          right: 0.75rem;
          bottom: 0.75rem;
          z-index: 2;
          width: min(220px, calc(100% - 1.5rem));
          padding: 0.65rem 0.75rem;
          border-radius: 0.5rem;
          background: rgba(7, 7, 8, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(6px);
        }
        .tdlc-controls__title {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          margin-bottom: 0.5rem;
          font-size: 0.65rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.55);
        }
        .tdlc-controls__version {
          margin-left: auto;
          font-size: 0.55rem;
          letter-spacing: 0.05em;
          color: rgba(74, 222, 128, 0.75);
        }
        .tdlc-control {
          display: grid;
          grid-template-columns: 1fr auto;
          grid-template-rows: auto auto;
          gap: 0.15rem 0.5rem;
          margin-bottom: 0.4rem;
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.7);
        }
        .tdlc-control:last-child {
          margin-bottom: 0;
        }
        .tdlc-control__label {
          grid-column: 1;
        }
        .tdlc-control__value {
          grid-column: 2;
          text-align: right;
          color: rgba(255, 255, 255, 0.45);
          font-variant-numeric: tabular-nums;
        }
        .tdlc-control__slider {
          grid-column: 1 / -1;
          width: 100%;
          accent-color: #4ade80;
        }
      `}</style>
    </div>
  );
}
