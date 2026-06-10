# StickPak Phase 1 — Core Engine

Phase 1 lives entirely inside the `ls-foundry` monorepo. It delivers the reusable sticker layout engine: types, a browser canvas designer, and a Node upscaler.

## Packages

| Package | Path | Purpose |
|---------|------|---------|
| `@ls-foundry/shared-types` | `packages/shared-types` | Canvas layout JSON schema and DPI constants |
| `@ls-foundry/react-canvas-designer` | `packages/react-canvas-designer` | 72 DPI A4 Konva canvas with drag-and-drop images |
| `@ls-foundry/canvas-upscaler` | `packages/canvas-upscaler` | Map 72 DPI layout JSON to a 300 DPI print PNG |

## Status

**Phase 1 complete** (June 2026). Browser designer, JSON export with assets, and 300 DPI upscaler verified.

## Checklist

- [x] **1.1** pnpm workspaces + Turborepo (repo root)
- [x] **1.2** `@ls-foundry/shared-types` — `CanvasLayout`, `CanvasItem`, `CanvasLayoutExport`, A4 dimensions
- [x] **1.3** `@ls-foundry/react-canvas-designer` — dropzone, transform handles, cut-line preview, export with assets
- [x] **1.4** `@ls-foundry/canvas-upscaler` — JSON CLI + visual parity with Konva canvas
- [x] **1.5** `@ls-foundry/helpers/image` — contour tracing, blob URL → data URL
- [x] **1.6** Docs test page — `apps/docs` `/stickpak`

## Canvas coordinate system

See [canvas-scaling.md](./canvas-scaling.md) for the full Konva → upscaler transform spec (from Obsidian).

- **Design canvas:** 72 DPI, A4 portrait (595 × 842 px).
- **Print output:** 300 DPI, A4 portrait (2481 × 3507 px), transparent PNG.
- **Scale factor:** `300 / 72` applied to position and size when upscaling.
- **Transform order:** translate → rotate → scale (top-left origin, matching Konva `Group`).

## Layout JSON shape

```json
{
  "version": 1,
  "canvasWidth": 595,
  "canvasHeight": 842,
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

Open [http://localhost:3000/stickpak](http://localhost:3000/stickpak). Drop images onto the A4 canvas, drag them, then click **Export layout JSON**.

### Package builds

```bash
pnpm run build --filter=@ls-foundry/shared-types
pnpm run build --filter=@ls-foundry/react-canvas-designer
pnpm run build --filter=@ls-foundry/canvas-upscaler
```

### Upscaler (300 DPI print PNG)

Requires native `canvas` bindings (installed automatically on macOS/Linux).

**From designer export JSON** (recommended):

1. On [http://localhost:3000/stickpak](http://localhost:3000/stickpak), arrange stickers and click **Export**.
2. Copy the textarea JSON into a file, e.g. `stickpak-export.json`.
3. Run:

From the **monorepo root** (where `stickpak-export.json` lives):

```bash
pnpm --filter @ls-foundry/canvas-upscaler run test:json ./stickpak-export.json
```

Optional output path:

```bash
pnpm --filter @ls-foundry/canvas-upscaler run test:json ./stickpak-export.json ./my-print.png
```

Writes `stickpak-print.png` (2481 × 3507 px @ 300 DPI) next to the JSON when no output path is given.

**Quick smoke test** with a single image file:

```bash
pnpm --filter @ls-foundry/canvas-upscaler run test:export -- /path/to/image.png
```

## Next phase

Phase 2 moves to a separate `sticker-print-app` repo for AWS CDK, storefront, and admin dashboard. That app consumes these packages as dependencies.
