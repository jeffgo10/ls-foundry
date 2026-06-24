import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { LabelImageSize, SurfaceGrid, TargetBounds, LabelDeformControls } from "../types";
import {
  buildLabelGeometry,
  computeLabelMeshParams,
} from "./labelGeometry";

interface CurvedLabelMeshProps {
  labelImageSrc: string;
  labelSize: LabelImageSize;
  bounds: TargetBounds;
  surfaceGrid: SurfaceGrid | null;
  imageHeight: number;
  controls: LabelDeformControls;
}

export function CurvedLabelMesh({
  labelImageSrc,
  labelSize,
  bounds,
  surfaceGrid,
  imageHeight,
  controls,
}: CurvedLabelMeshProps) {
  const texture = useTexture(labelImageSrc);

  const params = useMemo(
    () => computeLabelMeshParams(bounds, imageHeight, controls, labelSize, surfaceGrid),
    [bounds, imageHeight, controls, labelSize, surfaceGrid],
  );

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = true;
    texture.rotation = params.textureRotationRadians;
    texture.center.set(0.5, 0.5);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return () => {
      texture.dispose();
    };
  }, [texture, params.textureRotationRadians]);

  const geometry = useMemo(
    () =>
      buildLabelGeometry(bounds, params, {
        surfaceGrid,
        imageHeight,
        curvature: controls.curvature,
        labelSize,
      }),
    [bounds, params, surfaceGrid, imageHeight, controls.curvature, labelSize],
  );

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.02,
        blending: THREE.NormalBlending,
        depthWrite: false,
        depthTest: false,
        side: THREE.FrontSide,
        toneMapped: false,
      }),
    [texture],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={params.position}
      rotation={[0, 0, params.rotationZ]}
      renderOrder={2}
    />
  );
}
