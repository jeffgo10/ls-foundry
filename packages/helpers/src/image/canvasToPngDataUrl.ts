export function canvasToPngDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}
