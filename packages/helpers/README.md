# @jeffgo10/helpers

Shared utilities for **ls-foundry** packages. Published subpath: **`@jeffgo10/helpers/image`**.

Source: [github.com/jeffgo10/ls-foundry](https://github.com/jeffgo10/ls-foundry) (`packages/helpers`).

Used internally by `@jeffgo10/react-canvas-designer` (alpha contour, export). Consumers may import the image helpers directly.

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
  traceAlphaContour,
  blobUrlToDataUrl,
} from "@jeffgo10/helpers/image";
```

### `traceAlphaContour(image, width, height, options?)`

Traces the alpha boundary of an `HTMLImageElement` (or canvas image source) in **local image coordinates**. Returns a flat `[x0, y0, x1, y1, …]` array suitable for Konva `Line` points.

Used for cut-line preview, auto-arrange packing, and canvas margin clamping in the designer.

### `blobUrlToDataUrl(blobUrl)`

Converts a `blob:` URL from drag-and-drop into `{ mimeType, dataUrl }` for layout export.

## License

MIT
