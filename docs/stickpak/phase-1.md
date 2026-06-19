# StickPak Phase 1 — Core Engine

Phase 1 lives entirely inside the `ls-foundry` monorepo. It delivers the reusable sticker layout engine: types, a browser canvas designer, and a Node upscaler.

## Packages

| Package | Path | Purpose |
|---------|------|---------|
| `@jeffgo10/shared-types` | `packages/shared-types` | Canvas layout JSON schema and DPI constants |
| `@jeffgo10/react-canvas-designer` | `packages/react-canvas-designer` | Konva sticker layout designer (default A4, customizable size) |
| `@jeffgo10/canvas-upscaler` | `packages/canvas-upscaler` | Map 72 DPI layout JSON to a 300 DPI print PNG |

## Status

**Phase 1 complete** (June 2026). Browser designer, JSON export with assets, and 300 DPI upscaler verified.

## Published versions (GitHub Packages)

| Package | Version | Notes |
|---------|---------|-------|
| `@jeffgo10/shared-types` | **0.1.2** | Custom canvas + print DPI in layout JSON |
| `@jeffgo10/react-canvas-designer` | **0.2.0** | `minResizeSizeMm`; customizable canvas + selection dimensions |
| `@jeffgo10/helpers` | 0.1.0 | |
| `@jeffgo10/canvas-upscaler` | **0.1.1** | Output size from layout dimensions |

Install both designer packages together:

```json
"@jeffgo10/shared-types": "0.1.2",
"@jeffgo10/react-canvas-designer": "0.2.0",
"@jeffgo10/canvas-upscaler": "0.1.1"
```

See [engineering-notes.md](./engineering-notes.md#package-version-mismatch-react-canvas-designer-vs-shared-types).

## Checklist

- [x] **1.1** pnpm workspaces + Turborepo (repo root)
- [x] **1.2** `@jeffgo10/shared-types` (v0.1.2) — layout schema, A4 defaults, physical dimension helpers, customizable `canvasWidth`/`canvasHeight` + `designDpi`/`printDpi`
- [x] **1.3** `@jeffgo10/react-canvas-designer` (v0.2.0) — dropzone, transform handles, cut-line preview, export, auto-arrange, selection dimensions, remote URLs, S3 persistence, customizable canvas size, Delete/Backspace to remove selection, minimum resize size (`minResizeSizeMm`)
- [x] **1.4** `@jeffgo10/canvas-upscaler` (v0.1.1) — JSON CLI; print output size from layout dimensions + DPI
- [x] **1.5** `@jeffgo10/helpers/image` — contour tracing, blob URL → data URL
- [x] **1.6** Docs test page — `apps/docs` `/stickpak`

## Canvas coordinate system

See [canvas-scaling.md](./canvas-scaling.md) for the full Konva → upscaler transform spec (from Obsidian).

- **Design canvas:** default 72 DPI, A4 portrait (595 × 842 px); overridable via `canvasWidth`, `canvasHeight`, `designDpi` props.
- **Print output:** default 300 DPI, A4 portrait (2481 × 3507 px); upscaler derives size from layout (`canvas × printDpi / designDpi`).
- **Scale factor:** `300 / 72` applied to position and size when upscaling.
- **Transform order:** translate → rotate → scale (top-left origin, matching Konva `Group`).

## Layout JSON shape

```json
{
  "version": 1,
  "canvasWidth": 595,
  "canvasHeight": 842,
  "designDpi": 72,
  "printDpi": 300,
  "items": [
    {
      "assetId": "sticker-1",
      "x": 120,
      "y": 200,
      "scaleX": 1,
      "scaleY": 1,
      "rotation": 0
    }
  ]
}
```

## Local development

### Browser (canvas designer)

```bash
pnpm install
pnpm run dev --filter=@ls-foundry/docs
```

Open [http://localhost:3000/stickpak](http://localhost:3000/stickpak). Drop images onto the A4 canvas, drag them, use **Arrange all** to pack stickers with cut-line spacing, then click **Export**.

### Canvas size and print DPI

Defaults match **A4 portrait** (595 × 842 px @ 72 DPI design → 2481 × 3507 px @ 300 DPI print). Override on `CanvasDesigner`:

| Prop | Default | Purpose |
|------|---------|---------|
| `canvasWidth` | `595` | Design canvas width (px) |
| `canvasHeight` | `842` | Design canvas height (px) |
| `designDpi` | `72` | DPI for design canvas pixels |
| `printDpi` | `300` | Target print DPI (stored in layout JSON for upscaler) |

```tsx
<CanvasDesigner
  canvasWidth={800}
  canvasHeight={600}
  designDpi={72}
  printDpi={300}
/>
```

Exported layout JSON includes `canvasWidth`, `canvasHeight`, `designDpi`, and `printDpi`. The upscaler derives output size as `canvas × (printDpi / designDpi)`. `loadLayoutFromSources()` restores canvas dimensions from the saved layout.

Helpers in `@jeffgo10/shared-types`: `getPrintDimensions()`, `getLayoutDpiScale()`, `createEmptyLayout({ canvasWidth, canvasHeight, designDpi, printDpi })`.

### Auto-arrange

Optional props on `CanvasDesigner`: `autoArrangeGapMm` (default 5 mm), `autoArrangeOnAdd`. Imperative API via ref:

```typescript
await designerRef.current?.arrangeAll({ gapMm: 5 });
```

Deselects the active sticker, then packs all items so cut-line outlines do not overlap. See [engineering-notes.md](./engineering-notes.md).

### Selection dimension labels

When a sticker is selected, show its physical width and height as on-canvas captions aligned to the Konva Transformer box (width on the bottom edge, height on the right edge). Labels stay aligned when the sticker is rotated.

Optional props on `CanvasDesigner`:

| Prop | Default | Purpose |
|------|---------|---------|
| `showSelectionDimensions` | `false` | Enable on-canvas captions |
| `dimensionUnit` | `"mm"` | `"mm"` \| `"cm"` \| `"in"` |
| `dimensionDpi` | `72` | DPI for physical conversion |
| `dimensionDecimalPlaces` | `1` | Label rounding |
| `dimensionLabelColor` | `#2563eb` | Caption color |
| `formatSelectionDimensions` | — | Custom combined label formatter |
| `onSelectionDimensionsChange` | — | Callback with `{ width, height, label, ... }` |

```tsx
<CanvasDesigner
  ref={designerRef}
  showSelectionDimensions
  dimensionUnit="mm"
  dimensionDpi={72}
/>
```

Physical size helpers live in `@jeffgo10/shared-types` (`canvasPixelsToUnit`, `formatCanvasDimensions`, `mmToCanvasPixels`). See [engineering-notes.md](./engineering-notes.md).

On `/stickpak`: toggle **Show selected sticker size**, pick unit (mm/cm/in), **Arrange all** as needed. Select a sticker and press **Delete** or **Backspace** to remove it.

### Minimum resize size

Corner resize keeps aspect ratio and cannot shrink the **shorter side** below a minimum (default **1 inch / 25.4 mm**). The longer side scales proportionally.

| Prop | Default | Purpose |
|------|---------|---------|
| `minResizeSizeMm` | `25.4` | Minimum shorter-side length in millimeters |

```tsx
<CanvasDesigner minResizeSizeMm={15} />
```

**Example:** A 70 × 30 mm sticker with `minResizeSizeMm={15}` can shrink only to **35 × 15 mm**.

Helpers exported from `@jeffgo10/react-canvas-designer`: `DEFAULT_MIN_RESIZE_SIZE_MM`, `getMinResizeScale`, `getMinResizeDimensionsPx`. See [engineering-notes.md](./engineering-notes.md).

### Delete selected sticker

Select a sticker (Konva Transformer visible), then press **Delete** or **Backspace**. Ignored when focus is in an `input`, `textarea`, `select`, or contenteditable element. Revokes `blob:` URLs from drag-and-drop. See [engineering-notes.md](./engineering-notes.md).

### Package builds

```bash
pnpm run build --filter=@jeffgo10/shared-types
pnpm run build --filter=@jeffgo10/react-canvas-designer
pnpm run build --filter=@jeffgo10/canvas-upscaler
```

### Upscaler (300 DPI print PNG)

Requires native `canvas` bindings (installed automatically on macOS/Linux).

**From designer export JSON** (recommended):

1. On [http://localhost:3000/stickpak](http://localhost:3000/stickpak), arrange stickers and click **Export**.
2. Copy the textarea JSON into a file, e.g. `stickpak-export.json`.
3. Run:

From the **monorepo root** (where `stickpak-export.json` lives):

```bash
pnpm --filter @jeffgo10/canvas-upscaler run test:json ./stickpak-export.json
```

Optional output path:

```bash
pnpm --filter @jeffgo10/canvas-upscaler run test:json ./stickpak-export.json ./my-print.png
```

Writes `stickpak-print.png` next to the JSON when no output path is given. Output dimensions follow the layout (default 2481 × 3507 @ 300 DPI for A4).

**Quick smoke test** with a single image file:

```bash
pnpm --filter @jeffgo10/canvas-upscaler run test:export -- /path/to/image.png
```

### S3-backed persistence (sticker-print-app)

For cloud save/checkout without base64 blobs in DynamoDB:

| Method | Purpose |
|--------|---------|
| `exportLayoutState()` | Layout + `{ assetId, mimeType }[]` |
| `loadLayoutFromSources({ layout, sources })` | Restore from presigned URLs |
| `clearCanvas()` | Blank canvas |

Pair with S3 keys client-side → `@stickpak/shared` `PersistedDesignPayload`. See `sticker-print-app/docs/phase-3.md`.

`exportLayout()` remains for embedded `dataUrl` assets (upscaler / `/stickpak` demo).

## Next phase

Phase 2 moves to a separate `sticker-print-app` repo for AWS CDK, storefront, and admin dashboard. That app consumes these packages as dependencies.
