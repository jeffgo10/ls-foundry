# @jeffgo10/canvas-upscaler

Node.js library that renders a **StickPak** layout JSON to a **300 DPI** (or custom `printDpi`) PNG. Uses the same transform order as the Konva designer: **translate → rotate → scale**.

Published to [GitHub Packages](https://github.com/features/packages) under **`@jeffgo10`**. Source: [github.com/jeffgo10/ls-foundry](https://github.com/jeffgo10/ls-foundry) (`packages/canvas-upscaler`).

**Requires:** Node.js with native [`canvas`](https://www.npmjs.com/package/canvas) bindings (not for browser bundles).

## Install

```ini
@jeffgo10:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

```bash
pnpm add @jeffgo10/canvas-upscaler @jeffgo10/shared-types
```

## API

```ts
import {
  upscaleLayoutExportToPng,
  upscaleLayoutToPng,
  type AssetSource,
} from "@jeffgo10/canvas-upscaler";
import type { CanvasLayoutExport } from "@jeffgo10/shared-types";
import { writeFileSync } from "node:fs";

// From designer export JSON
const exported: CanvasLayoutExport = JSON.parse(readFileSync("export.json", "utf8"));
const png = await upscaleLayoutExportToPng(exported);
writeFileSync("print.png", png);

// Or separate layout + asset sources
const assets: AssetSource[] = [
  { assetId: "sticker-1", path: "./sticker.png" },
  // or: { assetId: "sticker-1", dataUrl: "data:image/png;base64,..." }
];
const png2 = await upscaleLayoutToPng({ layout: exported.layout, assets });
```

| Export | Description |
|--------|-------------|
| `upscaleLayoutExportToPng(export)` | Convenience wrapper over `layout` + `assets` with `dataUrl` |
| `upscaleLayoutToPng({ layout, assets })` | Core renderer → `Buffer` (PNG) |

Output dimensions come from `getPrintDimensions(layout)` in `@jeffgo10/shared-types` (default A4: **2481 × 3507** px @ 300 DPI).

Each export also includes **1 mm opaque white squares** at all four corners (sized at `printDpi`) for Silhouette Studio scale-and-fit alignment.

## CLI (monorepo dev)

From the repo root, after exporting JSON from `/stickpak`:

```bash
pnpm --filter @jeffgo10/canvas-upscaler run test:json ./stickpak-export.json
pnpm --filter @jeffgo10/canvas-upscaler run test:json ./stickpak-export.json ./my-print.png
```

Smoke test with a single image:

```bash
pnpm --filter @jeffgo10/canvas-upscaler run test:export -- /path/to/image.png
```

## Transform parity

Each item is drawn at `designPosition × (printDpi / designDpi)` with the same order as Konva `Group`. Keep designer and upscaler on compatible `@jeffgo10/shared-types` versions.

See `docs/stickpak/canvas-scaling.md` in the monorepo.

## License

MIT
