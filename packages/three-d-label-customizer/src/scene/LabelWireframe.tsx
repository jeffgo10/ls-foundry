import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { LabelImageSize, SurfaceGrid, TargetBounds, LabelDeformControls } from "../types";
import {
  buildLabelGeometry,
  computeLabelMeshParams,
} from "./labelGeometry";

interface LabelWireframeProps {
  labelSize: LabelImageSize;
  bounds: TargetBounds;
  surfaceGrid: SurfaceGrid | null;
  imageHeight: number;
  controls: LabelDeformControls;
}

export function LabelWireframe({
  labelSize,
  bounds,
  surfaceGrid,
  imageHeight,
  controls,
}: LabelWireframeProps) {
  const params = useMemo(
    () => computeLabelMeshParams(bounds, imageHeight, controls, labelSize, surfaceGrid),
    [bounds, imageHeight, controls, labelSize, surfaceGrid],
  );

  const wireGeometry = useMemo(() => {
    const labelGeometry = buildLabelGeometry(bounds, params, {
      surfaceGrid,
      imageHeight,
      curvature: controls.curvature,
      labelSize,
    });
    const edges = new THREE.EdgesGeometry(labelGeometry, 15);
    labelGeometry.dispose();
    return edges;
  }, [bounds, params, surfaceGrid, imageHeight, controls.curvature, labelSize]);

  const lineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    [],
  );

  useEffect(
    () => () => {
      wireGeometry.dispose();
      lineMaterial.dispose();
    },
    [wireGeometry, lineMaterial],
  );

  return (
    <lineSegments
      geometry={wireGeometry}
      material={lineMaterial}
      position={params.position}
      rotation={[0, 0, params.rotationZ]}
    />
  );
}
