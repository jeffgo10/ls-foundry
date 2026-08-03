import type Konva from "konva";

/** Map stage pointer position to design-canvas coordinates (accounts for stage scale + pan). */
export function stagePointerToDesign(
  stage: Pick<Konva.Stage, "getPointerPosition" | "scaleX" | "scaleY" | "x" | "y">,
): { x: number; y: number } | null {
  const pos = stage.getPointerPosition();
  if (!pos) {
    return null;
  }

  const scaleX = stage.scaleX();
  const scaleY = stage.scaleY();
  if (scaleX === 0 || scaleY === 0) {
    return pos;
  }

  return {
    x: (pos.x - stage.x()) / scaleX,
    y: (pos.y - stage.y()) / scaleY,
  };
}
