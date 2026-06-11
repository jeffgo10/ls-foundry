# StickPak Engineering Notes

Noteworthy issues and fixes (synced to Obsidian `StickPak/noteworthy/`).

## Canvas auto-arrange (`arrangeAll`)

**Feature:** Pack stickers so alpha-contour cut lines stay ≥5 mm apart (configurable via `autoArrangeGapMm`).

**API:** `designerRef.current.arrangeAll({ gapMm })` — deselects active sticker, then packs all.

**Props:** `autoArrangeGapMm`, `autoArrangeOnAdd`, `onAutoArrange`.

**Code:** `packages/react-canvas-designer/src/autoArrange.ts`

**Test UI:** `/stickpak` → **Arrange all** button.

## GitHub Packages npm scope

**Symptom:** `403 Forbidden — owner not found` when publishing `@ls-foundry/*`.

**Cause:** GitHub Packages requires the npm scope to match the GitHub user/org (`jeffgo10`). `@ls-foundry` has no matching owner.

**Fix:** Renamed publishable packages to `@jeffgo10/*` (same as `gl-viewer`). Internal monorepo packages (`@ls-foundry/tsconfig`, `@ls-foundry/docs`) stay private.

`.npmrc`: `@jeffgo10:registry=https://npm.pkg.github.com` + token with `write:packages`.

## Upscaler Konva transform mismatch

**Symptom:** Print PNG misaligned vs browser canvas, especially rotated stickers.

**Cause:** Upscaler rotated around image center; Konva `Group` uses top-left origin (`translate → rotate → scale`).

**Fix:** `packages/canvas-upscaler/src/upscale.ts` — match Konva transform order; transparent PNG output.

See [canvas-scaling.md](./canvas-scaling.md).

## Konva + node-canvas in Next.js

**Symptom:** Webpack tries to bundle `canvas.node` when loading `/stickpak`.

**Fix:** `apps/docs/next.config.ts` — force Konva browser build, ignore `canvas` on client.

## Upscaler JSON CLI paths

**Symptom:** `ENOENT` for `--` or JSON at monorepo root not found.

**Fix:** `scripts/upscale-from-json.ts` filters stray `--`, resolves paths via `INIT_CWD`.

```bash
# From monorepo root
pnpm --filter @jeffgo10/canvas-upscaler run test:json ./stickpak-export.json
```
