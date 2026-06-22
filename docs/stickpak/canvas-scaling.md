# Detailed Canvas Scaling for Upscale Export

Synced from Obsidian (`StickPak/Detailed Canvas Scaling for upscale export`).

## Frontend (72 DPI design canvas)

- Konva Stage at A4 portrait: **595 × 842** px @ 72 DPI.
- Each sticker is a `Group` with `x`, `y`, `scaleX`, `scaleY`, `rotation`.
- Child `Image` uses the asset's natural pixel `width` / `height` at local `(0, 0)`.
- Export JSON captures `x`, `y`, `scaleX`, `scaleY`, `rotation` per item plus attached image assets.

## Backend (300 DPI print canvas)

- Output canvas: **2481 × 3507** px @ 300 DPI (transparent PNG with **1 mm opaque white squares** at each corner for Silhouette alignment).
- Scale factor: `300 / 72` (≈ 4.1667).
- **Silhouette corner markers:** 1 mm opaque white squares at all four corners (`mmToCanvasPixels(1, printDpi)`); constant `SILHOUETTE_CORNER_MARKER_MM` in `@jeffgo10/canvas-upscaler`.
- For every layout coordinate:

$$\text{Target} = \text{Source} \times \frac{300}{72}$$

## Transform parity (Konva → node-canvas)

Konva applies **translate → rotate → scale** around the group origin (top-left). The upscaler uses the same order:

```text
translate(x × DPI_SCALE, y × DPI_SCALE)
rotate(rotation)
scale(scaleX, scaleY)
drawImage(asset, 0, 0, assetWidth × DPI_SCALE, assetHeight × DPI_SCALE)
```

Rotating around the image center (instead of top-left) will misalign any item with `rotation ≠ 0`.

## Test

```bash
pnpm --filter @jeffgo10/canvas-upscaler run test:json ./stickpak-export.json
```
