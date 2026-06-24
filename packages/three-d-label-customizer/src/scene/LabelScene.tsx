import { Suspense } from "react";
import type { LabelImageSize, SurfaceGrid, TargetBounds, LabelDeformControls } from "../types";
import { BackgroundPlane } from "./BackgroundPlane";
import { CurvedLabelMesh } from "./CurvedLabelMesh";
import { LabelWireframe } from "./LabelWireframe";
import { PixelOrthographicCamera } from "./PixelOrthographicCamera";

interface LabelSceneProps {
  displayCanvasSrc: string;
  labelImageSrc: string;
  labelSize: LabelImageSize;
  imageWidth: number;
  imageHeight: number;
  targetBounds: TargetBounds;
  surfaceGrid: SurfaceGrid | null;
  controls: LabelDeformControls;
  showWireframe: boolean;
}

export function LabelScene({
  displayCanvasSrc,
  labelImageSrc,
  labelSize,
  imageWidth,
  imageHeight,
  targetBounds,
  surfaceGrid,
  controls,
  showWireframe,
}: LabelSceneProps) {
  return (
    <>
      <PixelOrthographicCamera
        imageWidth={imageWidth}
        imageHeight={imageHeight}
      />
      <Suspense fallback={null}>
        <BackgroundPlane
          displayCanvasSrc={displayCanvasSrc}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
        />
        <CurvedLabelMesh
          labelImageSrc={labelImageSrc}
          labelSize={labelSize}
          bounds={targetBounds}
          surfaceGrid={surfaceGrid}
          imageHeight={imageHeight}
          controls={controls}
        />
        {showWireframe ? (
          <LabelWireframe
            labelSize={labelSize}
            bounds={targetBounds}
            surfaceGrid={surfaceGrid}
            imageHeight={imageHeight}
            controls={controls}
          />
        ) : null}
      </Suspense>
    </>
  );
}
