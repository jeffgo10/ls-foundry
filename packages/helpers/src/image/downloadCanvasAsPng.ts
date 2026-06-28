import { canvasToPngDataUrl } from "./canvasToPngDataUrl";
import { dataUrlToBlob } from "./dataUrlToBlob";
import { isMobileBrowser } from "./isMobileBrowser";

/**
 * Triggers a PNG download from a canvas. On mobile browsers, uses a blob
 * object URL and a DOM link — a bare data-URL click often fails after async work.
 */
export function downloadCanvasAsPng(
  canvas: HTMLCanvasElement,
  filename: string,
): void {
  const dataUrl = canvasToPngDataUrl(canvas);
  const link = document.createElement("a");
  link.download = filename;
  link.rel = "noopener";

  if (isMobileBrowser()) {
    const objectUrl = URL.createObjectURL(dataUrlToBlob(dataUrl));
    link.href = objectUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    return;
  }

  link.href = dataUrl;
  link.click();
}
