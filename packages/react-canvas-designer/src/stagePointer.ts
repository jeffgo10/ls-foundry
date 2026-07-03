import type Konva from "konva";

/** Map stage pointer position to design-canvas coordinates (accounts for stage scale). */
export function stagePointerToDesign(
  stage: Pick<Konva.Stage, "getPointerPosition" | "scaleX" | "scaleY">,
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
    x: pos.x / scaleX,
    y: pos.y / scaleY,
  };
}
