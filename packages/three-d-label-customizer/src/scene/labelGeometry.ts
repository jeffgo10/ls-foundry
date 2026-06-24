import * as THREE from "three";
import { applyGridCurvature } from "../applyGridCurvature";
import { buildGridWarpGeometry } from "../buildGridWarpGeometry";
import { canvasRotationToThreeZ, canvasToThreeY, LABEL_TEXTURE_UPRIGHT_RADIANS } from "../labelSceneCoords";
import { resolveLabelOrientation } from "../resolveLabelOrientation";
import type {
  LabelImageSize,
  LabelDeformControls,
  SurfaceGrid,
  TargetBounds,
} from "../types";

export { canvasRotationToThreeZ, canvasToThreeY } from "../labelSceneCoords";

export type LabelMeshMode = "plane" | "cylinder" | "grid";

export interface LabelMeshParams {
  mode: LabelMeshMode;
  radius: number;
  thetaLength: number;
  thetaStart: number;
  position: [number, number, number];
  rotationZ: number;
  meshWidth: number;
  meshHeight: number;
  textureRotationRadians: number;
}

export function computeLabelMeshParams(
  bounds: TargetBounds,
  imageHeight: number,
  controls: LabelDeformControls,
  labelSize?: LabelImageSize,
  surfaceGrid?: SurfaceGrid | null,
): LabelMeshParams {
  const t = THREE.MathUtils.clamp(controls.curvature / 100, 0, 1);
  const centerX = bounds.centerX + controls.offsetX;
  const centerY = bounds.centerY + controls.offsetY;
  const threeY = canvasToThreeY(centerY, imageHeight);

  const orientation = resolveLabelOrientation(
    bounds.width,
    bounds.height,
    labelSize?.width ?? bounds.width,
    labelSize?.height ?? bounds.height,
  );

  const rotationZ =
    canvasRotationToThreeZ(bounds.rotationDegrees) +
    (controls.rotation * Math.PI) / 180;

  const radius = THREE.MathUtils.lerp(
    Math.max(orientation.meshWidth * 25, 500),
    Math.max(orientation.meshWidth / Math.PI, 1),
    t,
  );
  const thetaLength = Math.min(orientation.meshWidth / radius, Math.PI * 1.4);
  const thetaStart = Math.PI / 2 - thetaLength / 2;

  if (surfaceGrid && surfaceGrid.cols >= 2 && surfaceGrid.rows >= 2) {
    return {
      mode: "grid",
      radius,
      thetaLength,
      thetaStart,
      position: [centerX, threeY, 1],
      // Grid intersections encode tilt; fine-tune rotation only.
      rotationZ: (controls.rotation * Math.PI) / 180,
      meshWidth: orientation.meshWidth,
      meshHeight: orientation.meshHeight,
      // UV mapping handles label orientation — texture.rotation would mirror.
      textureRotationRadians: LABEL_TEXTURE_UPRIGHT_RADIANS,
    };
  }

  // Low curvature: flat plane over the scanned bounds.
  if (t < 0.15) {
    return {
      mode: "plane",
      radius,
      thetaLength,
      thetaStart,
      position: [centerX, threeY, 1],
      rotationZ,
      meshWidth: orientation.meshWidth,
      meshHeight: orientation.meshHeight,
      textureRotationRadians: orientation.textureRotationRadians,
    };
  }

  // Cylinder axis at (centerX, threeY). The +Z-facing arc sits at local z = +radius,
  // so offset mesh by (1 - radius) so that face is at z = 1 in front of the background.
  return {
    mode: "cylinder",
    radius,
    thetaLength,
    thetaStart,
    position: [centerX, threeY, 1 - radius],
    rotationZ,
    meshWidth: orientation.meshWidth,
    meshHeight: orientation.meshHeight,
    textureRotationRadians: orientation.textureRotationRadians,
  };
}

/** @deprecated Use computeLabelMeshParams */
export const computeCylinderLabelParams = computeLabelMeshParams;

export function buildLabelGeometry(
  bounds: TargetBounds,
  params: LabelMeshParams,
  options?: {
    surfaceGrid?: SurfaceGrid | null;
    imageHeight?: number;
    curvature?: number;
    labelSize?: LabelImageSize;
  },
): THREE.BufferGeometry {
  if (params.mode === "grid" && options?.surfaceGrid && options.imageHeight) {
    const geometry = buildGridWarpGeometry(options.surfaceGrid, params, {
      centerX: params.position[0],
      centerY: options.imageHeight - params.position[1],
      imageHeight: options.imageHeight,
      rotationZ: 0,
      bounds,
      labelSize: options.labelSize,
      z: 0,
    });
    applyGridCurvature(
      geometry,
      options.surfaceGrid,
      params.meshWidth,
      THREE.MathUtils.clamp((options.curvature ?? 0) / 100, 0, 1),
      bounds,
      options.labelSize,
    );
    return geometry;
  }

  if (params.mode === "plane") {
    return new THREE.PlaneGeometry(params.meshWidth, params.meshHeight);
  }

  const radialSegments = Math.max(16, Math.ceil(params.meshWidth / 8));
  return new THREE.CylinderGeometry(
    params.radius,
    params.radius,
    params.meshHeight,
    radialSegments,
    1,
    true,
    params.thetaStart,
    params.thetaLength,
  );
}

/** @deprecated Use buildLabelGeometry */
export function buildCylinderGeometry(
  bounds: TargetBounds,
  params: LabelMeshParams,
): THREE.CylinderGeometry {
  const geometry = buildLabelGeometry(bounds, params);
  return geometry as THREE.CylinderGeometry;
}
