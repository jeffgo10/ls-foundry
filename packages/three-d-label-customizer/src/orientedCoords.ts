/** Canvas pixel ↔ PCA-oriented local (u along width, v along height). */
export function canvasToLocal(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  axisAngleRad: number,
): { u: number; v: number } {
  const dx = x - centerX;
  const dy = y - centerY;
  const cos = Math.cos(axisAngleRad);
  const sin = Math.sin(axisAngleRad);
  return {
    u: dx * cos + dy * sin,
    v: -dx * sin + dy * cos,
  };
}

export function localToCanvas(
  u: number,
  v: number,
  centerX: number,
  centerY: number,
  axisAngleRad: number,
): { x: number; y: number } {
  const cos = Math.cos(axisAngleRad);
  const sin = Math.sin(axisAngleRad);
  return {
    x: centerX + u * cos - v * sin,
    y: centerY + u * sin + v * cos,
  };
}
