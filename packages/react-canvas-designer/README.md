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

### Responsive / mobile width

The design canvas stays at 595 × 842 px internally (export/upscale unchanged). To fit a narrow viewport, wrap the designer in a full-width container and pass `fitToContainer`:

```tsx
<div style={{ width: "100%" }}>
  <CanvasDesigner fitToContainer showCutLine canvasMarginMm={10} />
</div>
```

The stage uses Konva’s native `scaleX`/`scaleY` (not CSS-only canvas shrinking), so the printable margin guide, stickers, and clamping all stay aligned in design coordinates. Pointer, marquee, and pinch coordinates are mapped into that same space. Fit is measured in `useLayoutEffect` before the first paint (unknown width does not default to full size), and `onReady` waits until that measure completes.

### Inspect / wizard preview

For a read-mostly preview (e.g. Get Started sheet builder), pass `interactionMode="inspect"`:

```tsx
<CanvasDesigner
  interactionMode="inspect"
  showCutLine
  showSelectionDimensions
  canvasMarginMm={10.5}
/>
```

Select a sticker to see the blue border and dimension labels; transform handles stay hidden. Click empty canvas to clear selection.

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
| `cutLineOffsetMm` | `5` | Default pad amount (mm) when enabling offset; not applied until toggled on |
| `cutLineOffsetOnAdd` | `false` | Bake offset pad on newly added images automatically |
| `autoArrangeGapMm` | `5` | Cut-line gap for packing (mm) |
| `autoArrangeOnAdd` | `false` | Run arrange after each drop |
| `canvasMarginMm` | `0` | Printable inset; clamp uses **alpha cut line** |
| `showCanvasMargin` | `true` when margin > 0 | Dashed printable-area guide |
| `minResizeSizeMm` | `25.4` | Minimum shorter side when resizing (mm) |
| `showSelectionDimensions` | `false` | On-canvas W × H captions |
| `touchFriendly` | auto (coarse pointer) | Larger transformer anchors + hit areas on touch devices |
| `fitToContainer` | `false` | Scale canvas down to fit parent width (never above 1); parent should be full width |
| `interactionMode` | `"edit"` | `"inspect"` = select + blue border + W×H labels only (no handles, move, pinch, marquee, or keyboard delete/undo). Empty-canvas click clears selection. |
| `backgroundImageUrl` | — | A4/page background inside Konva (`listening={false}`) — avoids mobile Save-image long-press on CSS backgrounds |
| `onSelectedIdChange` | — | Primary selection id (last clicked); `null` when empty |
| `onSelectedIdsChange` | — | Full selection set (Shift/Ctrl/Cmd multi-select) |
| `historyLimit` | `50` | Maximum undo snapshots kept in memory |
| `onHistoryChange` | — | `{ canUndo, canRedo }` when stack availability changes |

## Imperative API (`ref` / `onReady`)

| Method | Description |
|--------|-------------|
| `exportLayout()` | Print export: display bitmaps (baked pad when on) + matching display transforms |
| `exportLayoutState()` | Source-space transforms + asset ids for S3; includes `cutLineOffsetMm` when offset is on |
| `loadLayoutFromSources({ layout, sources })` | Restore from library URLs; re-bakes offset when layout item has `cutLineOffsetMm` |
| `clearCanvas()` | Remove all stickers |
| `arrangeAll({ gapMm?, canvasMarginMm?, cutLineOffsetMm? })` | Pack stickers by cut-line spacing (`cutLineOffsetMm` defaults to 0 — does not invent a pad) |
| `verifyOverlaps({ minGapMm?, designDpi? })` | Detect alpha cut-line overlap / minimum gap violations; highlights offenders along the cut line |
| `clearOverlapHighlights()` | Remove overlap violation tint from the canvas |
| `duplicateSelectedHorizontally({ gapMm? })` | Copies of the selection to the right until the printable area is full; multi-select duplicates the whole block together |
| `duplicateSelectedVertically({ gapMm? })` | Copies downward until the printable area is full; multi-select duplicates the whole block together |
| `addImagesFromUrls(sources)` | Place images from remote URLs; reuses `assetId`, mints new `instanceId` per placement |
| `setSelectedSize({ width?, height?, unit?, lockAspectRatio? })` | Resize the single selected sticker from typed dimensions |
| `setSelectedCutLineOffset({ enabled?, offsetMm? })` | Bake/remove/re-bake offset pad on the single selected sticker (per-image amount; keeps position). Pad fill is **dominant edge color** from helpers; optional CSS `fill` is helpers-only until this API grows a `fill?` arg |
| `getSelectedCutLineOffset()` | `{ enabled, offsetMm }` when one sticker selected; `null` otherwise |
| `undo()` / `redo()` | Step backward/forward through design mutations; returns `false` when unavailable |
| `canUndo()` / `canRedo()` | Whether undo/redo is available |

Keyboard shortcuts (when focus is not in a form field): **Ctrl/Cmd+Z** undo, **Ctrl/Cmd+Shift+Z** redo. History covers add/delete/move/resize/rotate/duplicate/arrange/clear and typed size changes. Drag and transform gestures commit one snapshot per interaction. Stack logic lives in `@jeffgo10/history`; canvas-specific cloning in `canvasHistory.ts`.

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
