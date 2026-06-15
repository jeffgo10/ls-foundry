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

**Canvas designer (`@jeffgo10/react-canvas-designer` v0.1.1):** New imperative API `addImagesFromUrls(sources: ImageSourceFromUrl[])` loads remote URLs with `crossOrigin: "anonymous"`. Shared `placeImageSource()` also used by drag-and-drop (local blob URLs).

**Storefront:** `@jeffgo10/react-canvas-designer` is pnpm-linked from `ls-foundry` until 0.1.1 is published to GitHub Packages. Rebuild designer + `pnpm install` in `sticker-print-app` after edits.

**CORS:** Source bucket allows GET/PUT from browser origins (CDK `cors` on source bucket). Redeploy LocalStack infra if canvas image fails to load after upload.

### Phase 3 — cognito-local + Amplify

See Obsidian **Phase 3 — sticker-print-app** and `sticker-print-app/docs/phase-3.md`.

**Local auth:** `docker compose` service `cognito-local` on port **9229**. Run `pnpm cognito:setup` to create pool/client/groups and write `.env.local` files (+ `sam/env.local.json`).

**Amplify / local auth:** When `NEXT_PUBLIC_COGNITO_ENDPOINT` is set, storefront uses `@aws-sdk/client-cognito-identity-provider` directly (Amplify builds `cognito-idp.local.amazonaws.com` for `local_*` pool IDs). Production (no endpoint var) uses `aws-amplify/auth`.

**JWT in SAM:** Token `iss` uses `http://localhost:9229/<poolId>`; Lambdas fetch JWKS from `host.docker.internal:9229`. Prefer `./scripts/start-api-local.sh` if `POST /orders` returns 401 under SAM.

**Delivery zones:** Seeded on `./scripts/deploy-localstack.sh` (`pnpm seed:delivery-zones`). Pricing in `@stickpak/shared`.

**Checkout:** Sign in → design canvas → pick zone → **Save draft order** (`exportLayout` + bearer token). Payment is Phase 4.

**Obsidian noteworthy:** cognito-local and Amplify, storefront S3 URL canvas, presigned URL localstack hostname.

