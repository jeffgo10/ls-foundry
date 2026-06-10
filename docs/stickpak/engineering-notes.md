# StickPak Engineering Notes

Noteworthy issues and fixes (synced to Obsidian `StickPak/noteworthy/`).

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
