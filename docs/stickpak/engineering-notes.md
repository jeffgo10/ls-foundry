# StickPak Engineering Notes

Noteworthy issues and fixes (synced to Obsidian `StickPak/noteworthy/`).

## Canvas auto-arrange (`arrangeAll`)

**Feature:** Pack stickers so alpha-contour cut lines stay ≥5 mm apart (configurable via `autoArrangeGapMm`).

**API:** `designerRef.current.arrangeAll({ gapMm })` — deselects active sticker, then packs all.

**Props:** `autoArrangeGapMm`, `autoArrangeOnAdd`, `onAutoArrange`.

**Code:** `packages/react-canvas-designer/src/autoArrange.ts`

**Test UI:** `/stickpak` → **Arrange all** button.

## Selection dimension labels

**Feature:** When a sticker is selected, show physical **width** and **height** as small on-canvas captions on the Konva Transformer box (bottom edge = width, right edge = height). Updates live during resize/rotate.

**Props:** `showSelectionDimensions`, `dimensionUnit` (`mm`|`cm`|`in`), `dimensionDpi` (default 72), `dimensionDecimalPlaces`, `dimensionLabelColor`, `formatSelectionDimensions`, `onSelectionDimensionsChange`.

**Math:** Scaled sticker pixels (`width × |scaleX|`, `height × |scaleY|`) → physical unit via DPI. Helpers in `@jeffgo10/shared-types`: `canvasPixelsToUnit`, `formatCanvasDimensions`, `mmToCanvasPixels`.

**Code:**
- `packages/react-canvas-designer/src/selectionDimensions.ts`
- `packages/react-canvas-designer/src/SelectionDimensionLabels.tsx`

**Rotation fix:** Early version used `getClientRect()` (axis-aligned bbox) — labels drifted when rotated. Fix: position from oriented corners via `node.getAbsoluteTransform().point()` on bottom/right edge midpoints.

**Test UI:** `/stickpak` → **Show selected sticker size** + unit dropdown.

## Customizable canvas and print size

**When:** June 2026 (`shared-types` v0.1.2, `react-canvas-designer` v0.1.3, `canvas-upscaler` v0.1.1).

**Defaults:** A4 @ 72 DPI design (595 × 842) → 300 DPI print (2481 × 3507).

**Designer props:** `canvasWidth`, `canvasHeight`, `designDpi`, `printDpi`. Exported layout JSON stores all four. `loadLayoutFromSources()` restores dimensions from saved layout.

**Upscaler:** `getPrintDimensions(layout)` — `round(canvas × printDpi / designDpi)`. No longer hardcoded A4 output.

**Helpers:** `getLayoutDpiScale()`, `createEmptyLayout({ canvasWidth, canvasHeight, designDpi, printDpi })` in `@jeffgo10/shared-types`.

## Canvas designer shell layout

**Fix:** Dashed-border / white wrapper was larger than the Konva stage (extra padding + instruction text inside the frame).

**Now:** Shell is exactly `canvasWidth × canvasHeight`; empty-state drop hint is an overlay only. No instruction paragraph above the canvas after stickers are placed.

## Delete selected sticker (keyboard)

**When:** June 2026 (`react-canvas-designer` v0.1.3+).

Select a sticker, press **Delete** or **Backspace**. Skipped when typing in form fields. Revokes blob URLs for dropped files.

**Code:** `packages/react-canvas-designer/src/CanvasDesigner.tsx` — `deleteSelectedItem`, window `keydown` listener.

## Package version mismatch (react-canvas-designer vs shared-types)

**Symptom:** TypeScript/build errors importing `DimensionUnit`, `canvasPixelsToUnit`, `formatCanvasDimensions`, or `mmToCanvasPixels` from `@jeffgo10/shared-types` when using `react-canvas-designer@0.1.1` from GitHub Packages.

**Cause:** `react-canvas-designer@0.1.1` was published with a dependency pin on `shared-types@0.1.0`, but dimension/auto-arrange APIs live in `shared-types@0.1.1`. The published `0.1.0` tarball did not export those symbols.

**Fix (June 2026):** Published `shared-types@0.1.1` and `react-canvas-designer@0.1.2`. **Current recommended pins** (custom canvas + delete keyboard):

```json
"@jeffgo10/shared-types": "0.1.2",
"@jeffgo10/react-canvas-designer": "0.1.3",
"@jeffgo10/canvas-upscaler": "0.1.1"
```

Avoid `react-canvas-designer@0.1.1` from the registry.

## S3-backed persistence (`exportLayoutState`)

**When:** June 2026 — consumed by `sticker-print-app` saved designs + checkout.

**API (no embedded image bytes):**

| Method | Purpose |
|--------|---------|
| `exportLayoutState()` | `{ layout, assets: [{ assetId, mimeType }] }` |
| `loadLayoutFromSources({ layout, sources })` | Restore from presigned S3 GET URLs |
| `clearCanvas()` | Remove all stickers |

**Contrast:** `exportLayout()` still embeds `dataUrl` per asset (upscaler CLI, `/stickpak` export).

**Consumer:** `sticker-print-app` pairs `exportLayoutState()` with client asset registry + DynamoDB `PersistedDesignPayload` (`layout` + `{ assetId, s3Key, mimeType }[]`).

**Code:** `packages/react-canvas-designer/src/CanvasDesigner.tsx`

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

## Phase 2 — LocalStack / SAM (sticker-print-app)

See `sticker-print-app/README.md` and Obsidian **Phase 2 — sticker-print-app**.

**Quick dev (one terminal):** `pnpm dev` — auto-boot + API + storefront. `pnpm dev:boot` / `pnpm dev:refresh` for infra-only.

### LocalStack CDK bootstrap — SSM not enabled

**Symptom:** `Service 'ssm' is not enabled` during `cdklocal bootstrap`.

**Fix:** Add `ssm` to LocalStack `SERVICES` in `docker-compose.yml`, restart LocalStack.

### cdklocal — S3 endpoint env

**Symptom:** `AWS_ENDPOINT_URL_S3 must be specified` when `AWS_ENDPOINT_URL` is set.

**Fix:** Export `AWS_ENDPOINT_URL_S3=http://s3.localhost.localstack.cloud:4566` (see `scripts/deploy-localstack.sh`).

### SAM CLI — Docker API version

**Symptom:** `Running AWS SAM projects locally requires Docker` despite Docker working.

**Cause:** SAM CLI ≤1.131 uses Docker API 1.35; Docker Desktop 29+ requires ≥1.40.

**Fix:** `brew upgrade aws-sam-cli` (≥1.161 verified). Fallback: `./scripts/start-api-local.sh`.

### Storefront — Vite → Next.js

Migrated for marketing/articles SSR. Konva via `dynamic(..., { ssr: false })` + same webpack fix as docs app.

### Terminal 3 — API options (watch mode)

- **Option A (recommended):** `pnpm --filter @stickpak/api run dev:watch` + `pnpm api:sam`
- **Option B (fallback):** `./scripts/start-api-local.sh` (restart manually after handler edits)

### Presigned URLs — browser cannot reach `localstack`

**Symptom:** S3 upload fails with **Failed to fetch**; presigned URL host is `localstack:4566`.

**Cause:** SAM Lambdas use Docker-internal `AWS_ENDPOINT_URL=http://localstack:4566`. The AWS SDK signs URLs with that host unless overridden.

**Fix:** `packages/api/src/clients/s3.ts` — `createPresignS3Client()` signs with `PUBLIC_AWS_ENDPOINT_URL` (default `http://localhost:4566`). Set in `sam/template.yaml` and `scripts/start-api-local.sh`. Lambda → S3 traffic still uses `createS3Client()` with the internal endpoint.

### Storefront upload — canvas from S3 URL (not blob)

**Flow:** File picker → presign → PUT to S3 → `addImagesFromUrls([{ url: readUrl, assetId }])` on `CanvasDesigner`.

**API:** `presign-upload` returns `uploadUrl` (PUT) and `readUrl` (presigned GET, 15 min).

**Canvas designer (`@jeffgo10/react-canvas-designer` v0.1.3+, `@jeffgo10/shared-types` v0.1.2+, `@jeffgo10/canvas-upscaler` v0.1.1+):** Imperative APIs — `addImagesFromUrls`, `exportLayoutState`, `loadLayoutFromSources`, `clearCanvas`, `arrangeAll`, `exportLayout`. Props include `showCutLine`, `autoArrangeGapMm`, `showSelectionDimensions`, `canvasWidth`/`canvasHeight`/`designDpi`/`printDpi`, `onReady` (Next.js). Delete/Backspace removes selected sticker.

**Storefront:** Install `@jeffgo10/react-canvas-designer@0.1.3`, `@jeffgo10/shared-types@0.1.2`, and `@jeffgo10/canvas-upscaler@0.1.1` from GitHub Packages, or pnpm-link from `ls-foundry` during local dev.

**CORS:** Source bucket allows GET/PUT from browser origins (CDK `cors` on source bucket). Redeploy LocalStack infra if canvas image fails to load after upload.

### Phase 3 — auth, designs, library, checkout

See Obsidian **Phase 3 — sticker-print-app** and `sticker-print-app/docs/phase-3.md`.

**Local auth:** `cognito-local` on **9229**; `pnpm cognito:setup` writes `.env.local` + `sam/env.local.json`. Storefront uses Cognito SDK when `NEXT_PUBLIC_COGNITO_ENDPOINT` is set (not Amplify for `local_*` pools). Refresh tokens + `ensureFreshIdToken()`; API JWT verify in `packages/api/src/auth/jwt.ts`.

**Saved designs:** `GET/POST /designs`, `GET/PUT /designs/:id` — layout JSON + S3 keys in DynamoDB. Storefront **My designs**: load → edit → **Update design** or **Save as new**.

**Sticker library:** `GET/POST /assets` — reusable uploads per user; **Add to canvas** on any design.

**Checkout:** `exportLayoutState()` + asset registry → `POST /orders` with `design` payload. Delivery zones in `@stickpak/shared`.

**Storefront API proxy:** `apps/storefront/src/app/api/[...path]/route.ts` (same-origin `/api` → `:3000`).

**Obsidian noteworthy:** cognito-local and Amplify, storefront S3 URL canvas, presigned URL localstack hostname, CanvasDesigner S3 persistence API.

## Agent dev tooling (Cursor + Obsidian sync)

**When:** June 2026.

**Cursor rules** (`.cursor/rules/`):

| Rule | Purpose |
|------|---------|
| `ls-foundry-core.mdc` | Monorepo layout, `@jeffgo10/*` scopes, package versions, coding conventions |
| `ls-foundry-obsidian-sync.mdc` | Dual-write to Obsidian, vault folder map, MCP pre-check |

**Slash commands:** `/sync-obsidian-notes` (vault sync), `/create-github-pr` (branch → PR via `gh`; auto-creates feature branch from `master`, auto-commits uncommitted work). See `.cursor/commands/`.

**Obsidian (canonical):** [[LS Foundry/Cursor rules and slash commands]] in vault folder `LS Foundry/`. Stub cross-link: `StickPak/noteworthy/Notes — ls-foundry Cursor rules and slash commands.md`.

**MCP pre-check:** `obsidian_list_files_in_dir` with `dirpath: "StickPak"` on server `user-MCP_DOCKER` before any vault write.

## `@jeffgo10/gl-viewer` (LiteShadeMedia consumer)

**Source:** `packages/gl-viewer/` in this repo (v0.3.1).

**Primary consumer:** LiteShadeMedia portfolio site — Obsidian `LiteShadeMedia/08 gl-viewer Package.md`, `07 LiDAR AR 3D Viewer.md`. Do not put consumer integration docs under `StickPak/` or `LS Foundry/`.

