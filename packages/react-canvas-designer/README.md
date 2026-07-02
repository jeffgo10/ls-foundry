# @jeffgo10/react-canvas-designer

Konva-based React canvas for **StickPak** sticker layout design: drag-and-drop PNG stickers, resize/rotate, cut-line preview, auto-arrange, printable edge margin, and layout JSON export.

Published to [GitHub Packages](https://github.com/features/packages) under **`@jeffgo10`**. Source: [github.com/jeffgo10/ls-foundry](https://github.com/jeffgo10/ls-foundry) (`packages/react-canvas-designer`).

**Pair with:** `@jeffgo10/shared-types` (layout schema) and `@jeffgo10/canvas-upscaler` (300 DPI print PNG).

## Install

```ini
# .npmrc
@jeffgo10:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

```bash
pnpm add @jeffgo10/react-canvas-designer @jeffgo10/shared-types
```

Peer dependencies (install in your app):

- `react`, `react-dom` (^18 or ^19)
- `konva` (^9)
- `react-konva` (^19)
- `react-dropzone` (^14)

## Next.js (App Router)

Konva is client-only. Use `next/dynamic` with `ssr: false` and transpile the package:

```ts
// next.config.ts
const nextConfig = {
  transpilePackages: ["@jeffgo10/react-canvas-designer"],
  serverExternalPackages: ["canvas"],
};
```

```tsx
"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import type { CanvasDesignerHandle } from "@jeffgo10/react-canvas-designer";

const CanvasDesigner = dynamic(
  () => import("@jeffgo10/react-canvas-designer").then((m) => m.CanvasDesigner),
  { ssr: false },
);

export function Designer() {
  const ref = useRef<CanvasDesignerHandle>(null);
  return (
    <CanvasDesigner
      ref={ref}
      showCutLine
      canvasMarginMm={10}
      showSelectionDimensions
      dimensionUnit="mm"
    />
  );
}
```

Prefer `onReady={(api) => …}` instead of `ref` when the parent is behind `dynamic()`.

## Basic usage

```tsx
import { CanvasDesigner } from "@jeffgo10/react-canvas-designer";

<CanvasDesigner
  onExport={(payload) => console.log(payload)}
  showCutLine
  autoArrangeGapMm={5}
  canvasMarginMm={10}
/>
```

Drop images onto the canvas (default **A4 @ 72 DPI**, 595 × 842 px). Select a sticker to move, resize, or rotate. **Delete** / **Backspace** removes the selection.

On touch devices (`touchFriendly` or coarse-pointer auto-detect): stickers select on **press-down** (not tap-up); with one sticker selected, **pinch** on the canvas to resize uniformly around the pinch center and **twist** to rotate.

## Key props

| Prop | Default | Purpose |
|------|---------|---------|
| `canvasWidth` / `canvasHeight` | `595` / `842` | Design canvas size (px) |
| `designDpi` | `72` | DPI for design canvas |
| `printDpi` | `300` | Target print DPI (stored in layout JSON) |
| `showCutLine` | `false` | Red alpha-contour preview |
| `autoArrangeGapMm` | `5` | Cut-line gap for packing (mm) |
| `autoArrangeOnAdd` | `false` | Run arrange after each drop |
| `canvasMarginMm` | `0` | Printable inset; clamp uses **alpha cut line** |
| `showCanvasMargin` | `true` when margin > 0 | Dashed printable-area guide |
| `minResizeSizeMm` | `25.4` | Minimum shorter side when resizing (mm) |
| `showSelectionDimensions` | `false` | On-canvas W × H captions |
| `touchFriendly` | auto (coarse pointer) | Larger transformer anchors + hit areas on touch devices |
| `backgroundImageUrl` | — | A4/page background inside Konva (`listening={false}`) — avoids mobile Save-image long-press on CSS backgrounds |
| `onSelectedIdChange` | — | Primary selection id (last clicked); `null` when empty |
| `onSelectedIdsChange` | — | Full selection set (Shift/Ctrl/Cmd multi-select) |

## Imperative API (`ref` / `onReady`)

| Method | Description |
|--------|-------------|
| `exportLayout()` | Full export with base64 `dataUrl` assets |
| `exportLayoutState()` | Layout + `{ assetId, mimeType }[]` for S3 persistence |
| `loadLayoutFromSources({ layout, sources })` | Restore from presigned URLs |
| `clearCanvas()` | Remove all stickers |
| `arrangeAll({ gapMm?, canvasMarginMm? })` | Pack stickers by cut-line spacing |
| `duplicateSelectedHorizontally({ gapMm? })` | Copies of the selection to the right until the printable area is full; multi-select duplicates the whole block together |
| `duplicateSelectedVertically({ gapMm? })` | Copies downward until the printable area is full; multi-select duplicates the whole block together |
| `addImagesFromUrls(sources)` | Place images from remote URLs; reuses `assetId`, mints new `instanceId` per placement |

## Layout item identity

Each sticker in layout JSON has two ids:

| Field | Purpose |
|-------|---------|
| `instanceId` | Unique per canvas placement — React keys, selection, transforms |
| `assetId` | Library / S3 reference — shared when the same image appears twice |

`addImagesFromUrls([{ url, assetId }])` always creates a new `instanceId`. Export assets are deduped by `assetId`.

## Coordinate system

- Transform order: **translate → rotate → scale** (top-left origin), matching Konva `Group` and `@jeffgo10/canvas-upscaler`.
- Layout JSON stores transforms only; intrinsic image size is resolved at export/upscale time.

See monorepo `docs/stickpak/canvas-scaling.md` for 72 → 300 DPI math.

## Exported helpers

Re-exports from `@jeffgo10/shared-types`: `CANVAS_WIDTH`, `CANVAS_HEIGHT`, `mmToCanvasPixels`, `formatCanvasDimensions`, etc.

Margin / resize utilities: `fitItemToCanvasArea`, `clampItemPosition`, `getMinResizeScale`, `DEFAULT_MIN_RESIZE_SIZE_MM`, …

Duplicate fill helpers: `buildDuplicatesToFit`, `buildGroupDuplicatesToFit`, `getAdjacentCopyPosition`.

Mobile touch helpers: `CANVAS_INTERACTION_STYLE`, `getTransformerTouchProfile`, `isCoarsePointerDevice`.

## Local demo

```bash
pnpm run dev --filter=@ls-foundry/docs
# → http://localhost:3000/stickpak
```

## License

MIT
