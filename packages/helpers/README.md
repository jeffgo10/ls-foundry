# @jeffgo10/helpers

Shared utilities for **ls-foundry** packages and canvas consumers (CrowdBadge, StickPak storefront).

Published subpaths:

- **`@jeffgo10/helpers/image`** — pure DOM/canvas image utilities
- **`@jeffgo10/helpers/gestures`** — pointer pan/pinch/rotate hook + geometry helpers

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
  downloadCanvasAsPng,
  exportCanvasToBlob,
  loadImage,
  traceAlphaContour,
} from "@jeffgo10/helpers/image";
```

### `traceAlphaContour(image, width, height, options?)`

Traces the alpha boundary of an `HTMLImageElement` (or canvas image source) in **local image coordinates**. Returns a flat `[x0, y0, x1, y1, …]` array suitable for Konva `Line` points.

Used for cut-line preview, auto-arrange packing, and canvas margin clamping in the designer.

### `blobUrlToDataUrl(blobUrl)`

Converts a `blob:` URL from drag-and-drop into `{ mimeType, dataUrl }` for layout export.

### `loadImage(src)`

Loads an image with `crossOrigin = "anonymous"`; rejects on error.

### `downloadCanvasAsPng(canvas, filename)` / `exportCanvasToBlob(canvas)`

Client-side PNG download and blob export from an `HTMLCanvasElement`.

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
