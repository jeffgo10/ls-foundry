# @jeffgo10/helpers

Shared utilities for **ls-foundry** packages and canvas consumers (CrowdBadge, StickPak storefront).

Published subpaths:

- **`@jeffgo10/helpers/image`** — pure DOM/canvas image utilities
- **`@jeffgo10/helpers/gestures`** — pointer pan/pinch/rotate hook + geometry helpers
- **`@jeffgo10/helpers/browser`** — in-app WebView detection for export UX
- **`@jeffgo10/helpers/clipboard`** — `useCopyLink` React hook for copy-to-clipboard UI

Source: [github.com/jeffgo10/ls-foundry](https://github.com/jeffgo10/ls-foundry) (`packages/helpers`).

Used internally by `@jeffgo10/react-canvas-designer` (alpha contour, export). Consumers may import helpers directly.

## Install

```ini
@jeffgo10:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

```bash
pnpm add @jeffgo10/helpers
```

## `@jeffgo10/helpers/image`

```ts
import {
  blobUrlToDataUrl,
  canvasToPngDataUrl,
  downloadCanvasAsPng,
  exportCanvasToBlob,
  loadImage,
  offsetClosedPolygon,
  traceAlphaContour,
} from "@jeffgo10/helpers/image";
```

### `traceAlphaContour(image, width, height, options?)`

Traces the alpha boundary of an `HTMLImageElement` (or canvas image source) in **local image coordinates**. Returns a flat `[x0, y0, x1, y1, …]` array suitable for Konva `Line` points.

Optional `expandPx` morphologically dilates the alpha mask before tracing (legacy / verify paths). Prefer `bakeCutLineOffset` for designer placement so resize stays cheap.

### `bakeCutLineOffset(image, offsetPx, options?)`

Dilates the alpha mask (fast BFS), draws the art, then fills the expanded ring with a solid color. By default the fill is the **dominant edge color** sampled along the alpha boundary (`dominantEdgeColorFromAlphaData`); pass `options.fill` (CSS color) to override. Returns `{ dataUrl, width, height, cutLinePoints, pad, contentScale }`. Large sources are downsampled (default max edge **768**) so drop stays responsive. Used by the designer so cutline offset is baked once (async after place) instead of re-dilating every scale frame.

> **Designer (`react-canvas-designer` ≥ 0.5.6):** `setSelectedCutLineOffset({ fill? })` / `prepareCutLineMedia(..., fill?)` forward this option. Omit/`undefined` = auto edge; CSS color = explicit fill (persisted as `cutLineOffsetFill`).

### `offsetClosedPolygon(points, offset)`

Expands (positive `offset`) or shrinks (negative) a closed flat `[x, y, …]` polygon with **bevel** corner joins. Prefer `bakeCutLineOffset` / `traceAlphaContour({ expandPx })` for cut-line padding on complex letterforms.

### `blobUrlToDataUrl(blobUrl)`

Converts a `blob:` URL from drag-and-drop into `{ mimeType, dataUrl }` for layout export.

### `loadImage(src)`

Loads an image with `crossOrigin = "anonymous"`; rejects on error.

### `downloadCanvasAsPng(canvas, filename)` / `exportCanvasToBlob(canvas)`

Client-side PNG download and blob export from an `HTMLCanvasElement`. Mobile browsers use a blob object URL so downloads work after async work.

### `canvasToPngDataUrl(canvas)`

Returns `canvas.toDataURL("image/png")` for overlays or in-app save flows.

## `@jeffgo10/helpers/browser`

```ts
import { isRestrictedInAppBrowser } from "@jeffgo10/helpers/browser";
```

Detects in-app browsers (Meta Messenger, Instagram, WeChat, etc.) that block programmatic downloads.

## `@jeffgo10/helpers/clipboard`

```ts
import { useCopyLink } from "@jeffgo10/helpers/clipboard";
```

**Peer dependency:** `react` ^18 or ^19. Consumer components should be client components.

## `@jeffgo10/helpers/gestures`

```ts
import {
  getDistance,
  getLogicalScaleFactor,
  usePointerTransformGestures,
} from "@jeffgo10/helpers/gestures";
```

Generic pointer pan + two-finger pinch (scale, rotate, centroid pan) for canvas-like elements. Maps CSS pointer deltas to logical export coordinates via `logicalSize`.

**Peer dependency:** `react` ^18 or ^19.

App code supplies domain types via injectable `onPan`, `onPinch`, and `clamp` reducers (see CrowdBadge `use-canvas-touch-gestures.ts` adapter).

## License

MIT
