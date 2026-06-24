export interface TargetBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  aspectRatio: number;
  /** Auto-detected tilt of the green label area (degrees, Three.js Z rotation). */
  rotationDegrees: number;
}

/** Guide grid detected on the neon-green patch (black lines over green). */
export interface SurfaceGrid {
  cols: number;
  rows: number;
  /** Intersection points [row][col] in canvas pixels, top-to-bottom. */
  points: { x: number; y: number }[][];
  /** `detected` from painted lines; `estimated` from bounds + cylindrical bow. */
  source?: "detected" | "estimated";
}

export interface ThreeDLabelCustomizerProps {
  /** URL or Base64 of the product image with the green surface area */
  canvasImageSrc: string;
  /** URL or Base64 of the graphic to be wrapped onto the green area */
  labelImageSrc: string;
  /** Toggle geometric wireframe overlay on the curved label mesh */
  showWireframe?: boolean;
}

export interface LabelDeformControls {
  curvature: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

export interface LabelImageSize {
  width: number;
  height: number;
}
