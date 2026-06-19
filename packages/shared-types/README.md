# @jeffgo10/shared-types

TypeScript types and helpers for **StickPak** canvas layout JSON, DPI constants, and physical dimension conversion.

Published to [GitHub Packages](https://github.com/features/packages) under **`@jeffgo10`**. Source: [github.com/jeffgo10/ls-foundry](https://github.com/jeffgo10/ls-foundry) (`packages/shared-types`).

Used by `@jeffgo10/react-canvas-designer` and `@jeffgo10/canvas-upscaler`. Bump this package first when changing layout schema or DPI APIs.

## Install

```ini
@jeffgo10:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

```bash
pnpm add @jeffgo10/shared-types
```

## Constants

| Constant | Value | Meaning |
|----------|-------|---------|
| `CANVAS_DPI` | `72` | Default design-time DPI |
| `CANVAS_WIDTH` / `CANVAS_HEIGHT` | `595` / `842` | A4 portrait @ 72 DPI |
| `PRINT_DPI` | `300` | Default print DPI |
| `PRINT_WIDTH` / `PRINT_HEIGHT` | `2481` / `3507` | A4 portrait @ 300 DPI |
| `DPI_SCALE` | `300/72` | Design → print pixel ratio |

## Layout JSON

```ts
import type { CanvasLayout, CanvasLayoutExport } from "@jeffgo10/shared-types";

const layout: CanvasLayout = {
  version: 1,
  canvasWidth: 595,
  canvasHeight: 842,
  designDpi: 72,
  printDpi: 300,
  items: [
    {
      assetId: "sticker-1",
      x: 120,
      y: 200,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    },
  ],
};
```

`CanvasLayoutExport` = `{ layout, assets: { assetId, mimeType, dataUrl }[] }` from the browser designer.

## Helpers

```ts
import {
  createEmptyLayout,
  getDesignDpi,
  getPrintDpi,
  getLayoutDpiScale,
  getPrintDimensions,
  mmToCanvasPixels,
  canvasPixelsToUnit,
  formatCanvasDimensions,
  isCanvasLayout,
} from "@jeffgo10/shared-types";

const empty = createEmptyLayout({ canvasWidth: 800, canvasHeight: 600 });
const { width, height } = getPrintDimensions(layout); // print px from layout
const mm = canvasPixelsToUnit(100, "mm", 72);
```

| Function | Purpose |
|----------|---------|
| `createEmptyLayout(options?)` | New `version: 1` layout with defaults |
| `getPrintDimensions(layout)` | Output width/height in print pixels |
| `getLayoutDpiScale(layout)` | `printDpi / designDpi` |
| `mmToCanvasPixels(mm, dpi?)` | mm → design pixels |
| `canvasPixelsToUnit(px, unit, dpi?)` | px → mm, cm, or in |
| `formatCanvasDimensions(w, h, unit, dpi?)` | `"W × H unit"` label |
| `isCanvasLayout(value)` | Runtime type guard |

## Custom canvas size

`canvasWidth`, `canvasHeight`, `designDpi`, and `printDpi` on `CanvasLayout` override A4 defaults. The upscaler derives print size as:

`printPx = designPx × (printDpi / designDpi)`

See `docs/stickpak/canvas-scaling.md` in the monorepo.

## License

MIT
