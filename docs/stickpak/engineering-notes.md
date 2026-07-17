# StickPak Engineering Notes

Noteworthy issues and fixes (synced to Obsidian `StickPak/noteworthy/`).

## Cutline offset — alpha border expand (SP-015)

**When:** July 2026 (`helpers` **v0.4.0**, `shared-types` **v0.2.3**, `react-canvas-designer` **v0.5.1**).

**Goal:** Offset the alpha-detected cut line outward from the graphic (Silhouette Studio–style) so cutting does not clip the artwork.

**Engine:**
- `@jeffgo10/helpers/image` — `bakeCutLineOffset(image, offsetPx)` dilates alpha (fast BFS), fills the ring **white**, composites art; **downsamples** large sources (max edge 768) then returns PNG + tight contour + `contentScale`.
- `@jeffgo10/react-canvas-designer` — offset is **per sticker** (on/off + mm). `setSelectedCutLineOffset({ enabled?, offsetMm? })` / `getSelectedCutLineOffset()` → `{ enabled, offsetMm }`. Designer prop `cutLineOffsetMm` is only the default for new stickers. Changing mm while enabled re-bakes **in place** (pad-compensated `x`/`y`). Optional `cutLineOffsetOnAdd` (default **false**) auto-bakes on drop.
- **Persistence:** layout JSON transforms are always **source-asset space** (`toPersistedCanvasItem`). Optional `cutLineOffsetMm` on the item re-bakes on `loadLayoutFromSources`. Print `exportLayout` still embeds display bitmaps + display transforms for upscale.
- Distinct from `autoArrangeGapMm` (gap **between** cut lines) and `canvasMarginMm` (page edge inset).

**Regression (v0.5.0 → v0.5.3):** load had dropped `cutLinePoints` (margin clamp used full image rect and shifted stickers) and saved baked-display transforms against library assets. Also, load fell back to designer `cutLineOffsetMm` (default 5) when the layout omitted offset, which **re-baked every sticker** — fixed so offset only applies when layout has `cutLineOffsetMm` or the user toggles it (`cutLineOffsetOnAdd` still optional for drop). Separately, `autoArrange` / `verifyOverlaps` still defaulted contour dilation to **5 mm** even when offset was off (packing/verify as if offset were on); and disabling offset could leave `cutLineOffsetMm` set, which re-baked on the next load if that field was round-tripped. Fixed in **v0.5.3**: arrange/verify default contour offset **0**; while off, amount preference is runtime-only (`cutLineOffsetPreferredMm`) and never written as layout `cutLineOffsetMm`.

**Not in layout JSON:** cut-line paths remain runtime-only; upscaler unchanged.

**Docs showcase:** `/stickpak` — with one sticker selected: per-image offset mm + checkbox.

**Storefront follow-up:** Pin `@jeffgo10/helpers@0.4.0` + `@jeffgo10/shared-types@0.2.3` + `@jeffgo10/react-canvas-designer@0.5.3`; treat `getSelectedCutLineOffset().enabled` as the on/off source of truth (not `offsetMm > 0`). Old designs that already stored `cutLineOffsetMm` will still re-bake on load by design.

**Related:** Obsidian `StickPak/noteworthy/Notes — Cutline offset (SP-015)`.

## Inspect-only canvas mode (SP-014 engine)

**When:** July 2026 (`react-canvas-designer` **v0.2.35**, unpublished — last published was **0.2.34**).

**Goal:** Wizard / preview can select a sticker and show cut lines + W×H labels without allowing layout edits.

**API:** `interactionMode?: "edit" | "inspect"` (default `"edit"`).

When `"inspect"`:
- Select + blue transformer **border** + dimension labels (when enabled)
- Resize/rotate **handles hidden** (`enabledAnchors=[]`, `resizeEnabled`/`rotateEnabled` false)
- Click / tap empty canvas clears selection
- Imperative transformer sync also clears `enabledAnchors` on mode flip so edit handles cannot linger after mount
- No drag move, pinch, marquee, or keyboard delete/undo
- Host may still call imperative edits (`setSelectedSize`, etc.); wizard UI simply does not expose them

**Related:** Obsidian `StickPak/noteworthy/canvas-engine/Notes — Inspect-only canvas mode (wizard)`; storefront SP-014 Get Started wizard.

## Canvas undo/redo (SP-010)

**When:** July 2026 (`react-canvas-designer` **v0.2.34**, `@jeffgo10/history` **v0.1.0**).

**Goal:** Undo/redo for design mutations — add, delete, move, resize, rotate, duplicate, arrange, clear canvas, and typed size changes.

**Engine:**
- `@jeffgo10/history` (**v0.1.0**) — generic undo/redo snapshot stacks (`createHistoryStacks`, `pushUndoSnapshot`, `undoStep`/`redoStep`, `commitGestureHistory`).
- `canvasHistory.ts` — StickPak adapter with `HistoryPlacedImage` clone/equality for cut-line points.
- Gesture commits on drag/transform/pinch/group-transform **end** (not every frame).
- `CanvasDesignerHandle.undo()` / `redo()` / `canUndo()` / `canRedo()`; `onHistoryChange` prop.
- Keyboard: **Ctrl/Cmd+Z**, **Ctrl/Cmd+Shift+Z** (skipped when focus is in a form field).
- `loadLayoutFromSources` resets history; delete no longer revokes blob URLs so undo can restore dropped images.

**Move fix (v0.2.34):** Drag only writes item `x`/`y` on `dragend`, then commits history in the same tick. `endHistoryGesture` compared against `itemsRef`, which still held the pre-move snapshot because React had not re-rendered yet — so moves were dropped as “no change.” Resize/rotate worked because live `transform` events updated state between frames. Fix: keep `itemsRef` in sync inside `updateItem` / `applyLiveGroupTransform` (and undo/redo) before committing the gesture.

**Docs app:** `/stickpak` — Undo/Redo toolbar buttons wired to imperative handle.

**Storefront follow-up:** Mount undo/redo buttons on the canvas toolbar; rely on built-in keyboard shortcuts.

**Code:** `packages/history/`, `canvasHistory.ts`, `CanvasDesigner.tsx`, `apps/docs/src/components/StickPakCanvasSection.tsx`

**Related:** StickPak Kanban **SP-010**

## Manual width/height input for selected sticker (SP-008)

**When:** July 2026 (`shared-types` **v0.2.2**, `react-canvas-designer` **v0.2.31**).

**Goal:** Let users set a selected sticker's size by typing exact width and/or height in mm/cm/in (same units as on-canvas dimension labels), not only by dragging transformer handles.

**Engine:**
- `unitToCanvasPixels()` in `@jeffgo10/shared-types` — inverse of `canvasPixelsToUnit`.
- `computeScaleFromUnitDimensions()` + `CanvasDesignerHandle.setSelectedSize()` — single-select only; optional `lockAspectRatio` (default true); respects `minResizeSizeMm` and canvas margin clamping; syncs Konva node + transformer.
- `onSelectionDimensionsChange` already fires current W×H for UI binding.

**Docs app:** `/stickpak` — width/height number inputs when one sticker is selected (blur or Enter to apply); aspect-ratio lock checkbox.

**Storefront follow-up:** Wire the same inputs in the designer toolbar/side panel via `setSelectedSize` + `onSelectionDimensionsChange`.

**Code:** `manualResize.ts`, `CanvasDesigner.tsx`, `packages/shared-types/src/index.ts`, `apps/docs/src/components/StickPakCanvasSection.tsx`

**Related:** [[Notes — Selection dimension labels]], [[Notes — Minimum resize size for stickers]]

## fitToContainer mobile viewport (v0.2.26–0.2.29)

**When:** July 2026 (`react-canvas-designer` **v0.2.29**).

**Problem:** Default A4 canvas (595×842 px) overflows narrow viewports — horizontal scroll on mobile. Storefront had interim CSS hacks on `.konvajs-content`. First `fitToContainer` attempt used CSS-only stage shrinking; dashed shell border, `canvasMarginMm` guide, and W×H labels misaligned on resize.

**Fix (engine):**
- **`fitToContainer` prop** (boolean, default `false`) — parent must be full width; `ResizeObserver` on container.
- **Konva-native scale** — stage `width`/`height` = display size; `scaleX`/`scaleY` = fit ratio (never above 1). Design coordinates unchanged for export/clamping.
- **Shell layout** — content-box width matches scaled stage (not stage + border twice); dashed page border tracks canvas.
- **Pointer mapping** — `stagePointerToDesign()` for marquee; pinch uses design canvas dimensions.
- **Selection labels** — `getTransform()` (layer-local) for placement; `displayScale` compensates font/offset so W×H captions stay screen-sized when container resizes.

**Docs app:** `/stickpak` — `fitToContainer` on `CanvasDesigner`; wrapper `w-full` (no `overflow-auto` scroll hack).

**Storefront follow-up:** Bump `@jeffgo10/react-canvas-designer@0.2.30`; pass `fitToContainer` on mobile layout; remove interim viewport CSS hacks.

**v0.2.30 fix:** Sticker drag bounds used Konva `dragBoundFunc`, which receives absolute stage coordinates. With `fitToContainer` stage scale &lt; 1, margin clamp ran in the wrong coordinate space and blocked dragging to the left/top printable edge. Replaced with `onDragMove` clamping via layer-local `node.x()`/`node.y()`.

**Code:** `containerFitScale.ts`, `useContainerFitScale.ts`, `stagePointer.ts`, `SelectionDimensionLabels.tsx`, `CanvasDesigner.tsx`, `apps/docs/src/components/StickPakCanvasSection.tsx`

**Related:** [[Notes — fitToContainer mobile viewport (engine)]], [[Notes — Selection dimension labels]], [[Notes — Mobile canvas fit-to-width viewport]]

## Cut-line overlap verifier (SP-007)

**When:** July 2026 (`shared-types` **v0.2.1**, `react-canvas-designer` **v0.2.23**).

**Goal:** Detect sticker images whose alpha cut-line bounds overlap or are closer than a configurable mm gap (same padded AABB model as auto-arrange).

**Engine:**
- `OverlapVerifyOptions` / `OverlapVerifyResult` in `@jeffgo10/shared-types`.
- `verifyItemOverlaps()` in `overlapVerifier.ts` — pure cut-line bounds check with optional `minGapMm`.
- `CanvasDesignerHandle.verifyOverlaps()` highlights offending stickers with a reddish semi-transparent overlay; `clearOverlapHighlights()` clears tint.
- Highlights clear when the user moves/resizes a sticker.

**Docs app:** `/stickpak` — **Check overlaps** button uses the cut-line gap control.

**Storefront follow-up:** Wire verify before checkout/save; bump `@jeffgo10/shared-types@0.2.1` + `@jeffgo10/react-canvas-designer@0.2.23`.

**Related:** StickPak Kanban **SP-007**, [[Notes — Canvas auto-arrange (arrangeAll)]]

## Mobile select-on-press + pinch zoom/rotate (SP-006)

**When:** July 2026 (`react-canvas-designer` **v0.2.16** → **v0.2.22**).

**Problem:** On mobile, stickers required tap-then-interact (transform box on `touchend` via `onTap`). Two-finger pinch could not resize/rotate the selected sticker — only transformer handles. Follow-on issues: HTTP LAN dev (`192.168.x.x`) broke `crypto.randomUUID`; pinch felt jumpy; dimension labels drifted during pinch.

**Fix (engine):**
- **Select-on-press:** Stickers select on `mousedown` / `touchstart` (not `onClick`/`onTap`).
- **Pinch zoom + rotate:** With exactly one sticker selected on coarse-pointer devices, two-finger pinch on the canvas shell scales uniformly and twists around the **pinch centroid** (`selectedStickerPinch.ts` + window `touchmove` while pinching).
- **Live gesture without flicker:** During pinch, update Konva node directly; commit to `items` once on `touchend` (avoids React-Konva reset each frame).
- **Dimension labels:** `SelectionDimensionLabels` listens for custom `pinchlive` node event + reads live scale from the node.
- **`createInstanceId()`:** Falls back when `crypto.randomUUID` is unavailable (non-secure HTTP on LAN).

**Fix (docs app `/stickpak`):**
- Client-only mount guard for `StickPakCanvasSection` (avoids `next/dynamic` SSR bailout + extension-injected form attrs on phone).
- `suppressHydrationWarning` on `<html>` / `<body>` for extension-injected attrs (`__gcr*`).

**Storefront follow-up:** Bump to `@jeffgo10/react-canvas-designer@0.2.22`; keep `touchFriendly` + `onSelectedIdChange` → viewport `lockGestures` wiring.

**Code:** `selectedStickerPinch.ts`, `createInstanceId.ts`, `SelectionDimensionLabels.tsx`, `transformerTouch.ts`, `CanvasDesigner.tsx`, `apps/docs/src/components/StickPakCanvasSection.tsx`

**Related:** [[Notes — Mobile canvas resize rotate (touch)]], [[canvas-engine/Notes — Mobile pinch zoom rotate selected sticker (SP-006)]], StickPak Kanban **SP-006**

## Duplicate library images on one sheet (`instanceId` / `assetId`)

**Symptom:** React duplicate-key warning when adding the same library image twice (or re-adding one already on the canvas in a multi-select batch).

**Cause:** `assetId` was used as both the S3/library reference and the React key / selection id.

**Fix (June 2026):** `shared-types@0.2.0`, `react-canvas-designer@0.2.6`. Layout items now carry **`instanceId`** (unique per canvas sticker — keys, selection, transforms) and **`assetId`** (shared library reference for export/upscale). `addImagesFromUrls([{ url, assetId }])` always mints a new `instanceId`; export assets are deduped by `assetId`. Legacy layouts without `instanceId` get one assigned on load.

**Storefront pins:** `@jeffgo10/shared-types@0.2.0`, `@jeffgo10/react-canvas-designer@0.2.10`.

## Shift multi-select transform box

**When:** July 2026 (`react-canvas-designer` v0.2.10).

**Feature:** Shift-click (or Ctrl/Cmd-click) to add or remove stickers from the selection. The Konva `Transformer` attaches to all selected nodes — group move, uniform resize, and rotate. Per-sticker drag is disabled while multiple are selected (use the transform box border to move the group). Delete/Backspace removes every selected sticker. Dimension captions stay single-selection only.

**API:** `onSelectedIdsChange(selectedIds: string[])` for the full set; `onSelectedIdChange` still reports the last-clicked id for viewport-pan wiring. Duplicate fill duplicates every selected sticker together as a block (v0.2.15).

**Fix (v0.2.11):** Selection uses sticker `onClick`/`onTap` (not `onMouseDown`) so Shift/Ctrl/Cmd modifiers are read reliably and draggable `mousedown` no longer races additive select. Modifier detection accepts `PointerEvent` as well as `MouseEvent`.

**Fix (v0.2.12):** Multi-select uses a proxy selection box + `groupTransform.ts` so move / rotate / scale preserve relative sticker positions (Konva multi-node `Transformer` rotates each node around its own origin).

**Fix (v0.2.13):** Wire transformer **back** `dragstart`/`dragmove`/`dragend` (border move does not fire `transform`). Freeze proxy + skip `transformer.nodes()` refresh while interacting. `constrainMultiSelectBoundBox` allows rotation and translation (old `boundBoxFunc` blocked rotate when AABB width shrank).

**Feature (v0.2.14):** Marquee (rubber-band) selection — drag on empty canvas to draw a box; stickers whose cut-line bounds intersect the box are selected. Shift/Ctrl/Cmd adds to the current selection. A click without drag still clears selection.

**Feature (v0.2.15):** `duplicateSelectedHorizontally` / `duplicateSelectedVertically` duplicate every selected sticker together as a block (preserves relative layout) until the printable area is full. `buildGroupDuplicatesToFit` in `duplicateFill.ts`.

**Code:** `packages/react-canvas-designer/src/selection.ts`, `groupTransform.ts`, `marqueeSelection.ts`, `duplicateFill.ts` (`buildGroupDuplicatesToFit`), `resizeConstraints.ts` (`constrainMultiSelectBoundBox`), `CanvasDesigner.tsx`

## Duplicate selected sticker to fill row/column

**When:** June 2026 (`react-canvas-designer` v0.2.8–0.2.9).

**Feature:** Silhouette-designer-style fill — duplicate the selected sticker to the right or downward until the next copy would extend past the printable area (`canvasMarginMm` inset). Spacing between cut-line outlines uses `autoArrangeGapMm` (same as auto-arrange; override per call via `{ gapMm }`).

**API:** `duplicateSelectedHorizontally({ gapMm? })` and `duplicateSelectedVertically({ gapMm? })` on `CanvasDesignerHandle`; each returns the number of copies added (0 when nothing is selected or no copy fits).

**Code:** `packages/react-canvas-designer/src/duplicateFill.ts`, `CanvasDesigner.tsx`

## Mobile resize/rotate on touch devices

**When:** June 2026 (`react-canvas-designer` v0.2.7).

**Problem:** On phones, Konva transformer handles are hard to grab; resize/rotate often fails. Long-press on a CSS `background-image` on `.konvajs-content` can open the browser Save image menu. Viewport pan/pinch can compete with single-finger transform gestures.

**Engine fixes (`react-canvas-designer`):**
- Auto-enlarge transformer anchors + invisible hit areas on coarse-pointer devices (`touchFriendly` prop overrides).
- `CANVAS_INTERACTION_STYLE` on the designer shell (`touch-action: none`, no touch callout / text selection).
- `backgroundImageUrl` — draw the A4 page inside Konva with `listening={false}` instead of CSS background on the canvas element.
- `onSelectedIdChange` — storefront can disable viewport pan while a sticker is selected.

**Storefront follow-up (`sticker-print-app`):** pass `backgroundImageUrl`, wire `onSelectedIdChange` into `useCanvasViewport`, remove `--canvas-bg-image` from `.konvajs-content` in `globals.css`.

**Code:** `packages/react-canvas-designer/src/transformerTouch.ts`, `CanvasDesigner.tsx`

## Canvas edge margin (`canvasMarginMm`)

**Feature:** Restrict sticker placement to a printable inset. When set to e.g. 10 mm, drag, resize, drop placement, auto-arrange, and layout restore keep the **alpha cut line** inside the margin band (transparent image padding may extend past it).

**Props:** `canvasMarginMm` (default 0), `showCanvasMargin` (default true when margin > 0), `canvasMarginColor`.

**Auto-arrange:** `arrangeAll({ canvasMarginMm })` uses `max(gap/2, margin)` as the edge inset.

**Code:** `packages/react-canvas-designer/src/canvasMargin.ts`, `CanvasDesigner.tsx`, `autoArrange.ts`

**Docs:** `packages/react-canvas-designer/README.md` (install, props, imperative API)

**When:** June 2026 (`react-canvas-designer` v0.2.2–**0.2.5**). On drop (and layout restore), images larger than the printable area are uniformly scaled down via `fitItemToCanvasArea`. Margin clamp uses alpha cut line (`cutLinePoints`), not full image rect — transparent padding may extend past the margin band. At `canvasMarginMm={0}`, cut line is still clamped to canvas edges.

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

**`onSelectionDimensionsChange` loop fix (v0.2.1):** The callback was listed in a `useEffect` dependency array. Inline handlers from parents get a new reference every render, so the effect re-fired → `setState` in parent → infinite loop during resize. Fix: store the callback in a ref inside `CanvasDesigner` so only `selectionDimensions` triggers the effect.

## Minimum resize size

**When:** June 2026 (`react-canvas-designer` v0.2.0).

**Feature:** Corner resize cannot shrink a sticker below a minimum **shorter-side** length. The longer side scales with aspect ratio (`keepRatio` on Konva `Transformer`).

**Prop:** `minResizeSizeMm` — default **25.4** (1 inch).

**Example:** 70 × 30 mm with `minResizeSizeMm={15}` → minimum **35 × 15 mm**.

**Math:** `minScale = mmToCanvasPixels(minResizeSizeMm, designDpi) / min(localWidth, localHeight)`. Enforced in `boundBoxFunc` during drag and `clampNodeScale` on transform sync (covers rotation).

**Exports:** `DEFAULT_MIN_RESIZE_SIZE_MM`, `getMinResizeScale`, `getMinResizeDimensionsPx`.

**Code:**
- `packages/react-canvas-designer/src/resizeConstraints.ts`
- `packages/react-canvas-designer/src/CanvasDesigner.tsx`

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
"@jeffgo10/react-canvas-designer": "0.2.0",
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

## Silhouette corner markers (upscaler)

**When:** June 2026 (`canvas-upscaler` v0.2.0).

**Goal:** Easier scale-and-fit when importing print PNGs into Silhouette Studio.

**Fix:** After rendering layout items, `upscaleLayoutToPng` draws **1 mm opaque white squares** at all four print corners. Size uses `mmToCanvasPixels(1, printDpi)` (12 px @ 300 DPI). Exported constant: `SILHOUETTE_CORNER_MARKER_MM`.

**Code:** `packages/canvas-upscaler/src/upscale.ts` — `drawSilhouetteCornerMarkers()`.

See [canvas-scaling.md](./canvas-scaling.md).

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

**Canvas designer (`@jeffgo10/react-canvas-designer` v0.2.6+, `@jeffgo10/shared-types` v0.2.0+, `@jeffgo10/canvas-upscaler` v0.2.0+):** Imperative APIs — `addImagesFromUrls`, `exportLayoutState`, `loadLayoutFromSources`, `clearCanvas`, `arrangeAll`, `exportLayout`. Props include `showCutLine`, `autoArrangeGapMm`, `canvasMarginMm`, `showSelectionDimensions`, `canvasWidth`/`canvasHeight`/`designDpi`/`printDpi`, `onReady` (Next.js). Delete/Backspace removes selected sticker.

**Storefront:** Install `@jeffgo10/react-canvas-designer@0.2.6`, `@jeffgo10/shared-types@0.2.0`, and `@jeffgo10/canvas-upscaler@0.2.0` from GitHub Packages, or pnpm-link from `ls-foundry` during local dev.

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

**Slash commands:** `/sync-obsidian-notes` (vault sync), `/create-github-pr` (branch → PR via `gh`; auto branch/commit from `master`; **post-merge cleanup** via `/create-github-pr cleanup`), `/extract-to-foundry` (audit/extract cross-platform shared code to `@jeffgo10/*`; repo gate on clean `master`; opens PR after package edits). See `.cursor/commands/`.

**PR #1 merged (June 2026):** Agent tooling shipped on `master` (`chore/cursor-agent-tooling-and-pr-command`).

**PR #2 merged (June 2026):** Post-merge cleanup in `/create-github-pr` (`chore/pr-post-merge-cleanup`).

**PR #3 merged (June 2026):** CI publish on `master` push — see **CI package publish** below.

**Obsidian (canonical):** [[LS Foundry/Cursor rules and slash commands]] in vault folder `LS Foundry/`. Stub cross-link: `StickPak/noteworthy/Notes — ls-foundry Cursor rules and slash commands.md`.

**MCP pre-check:** `obsidian_list_files_in_dir` with `dirpath: "StickPak"` on server `user-MCP_DOCKER` before any vault write.

## Agent version bumps

**When:** June 2026 — added to `ls-foundry-core.mdc`.

Agents **auto-bump** `packages/*/package.json` when changing a published `@jeffgo10/*` package (do not wait for the user):

| Change | Bump | Example |
|--------|------|---------|
| Bug fix, no public API change | patch | 0.2.0 → 0.2.1 |
| New prop, method, or export | minor | 0.1.3 → 0.2.0 |
| Breaking layout JSON or consumer API | major | 0.2.0 → 1.0.0 |

Also update pin table in `ls-foundry-core.mdc`, `docs/stickpak/phase-1.md`, and dependent `workspace:*` pins (`shared-types` first).

**Current example:** `minResizeSizeMm` → `react-canvas-designer` **0.1.3 → 0.2.0** (minor).

## CI package publish (GitHub Actions)

**When:** June 2026 — PR #3 merged (`chore/ci-publish-packages`).

On push to `master` when `packages/**` or `pnpm-lock.yaml` changes, workflow `.github/workflows/publish-packages.yml` runs `scripts/publish-changed.sh` to build and publish **only** changed non-private `@jeffgo10/*` packages.

| Item | Detail |
|------|--------|
| Local equivalent | `pnpm run deploy:changed` (`GIT_BEFORE` defaults to `HEAD~1`) |
| CI auth | Built-in `GITHUB_TOKEN` with `packages: write` — no manual secret |
| Local auth | Personal token in `.npmrc` with `write:packages` |
| Manual run | GitHub → Actions → **Publish packages** → Run workflow |

**Reminder:** Bump `packages/*/package.json` versions before merge — CI publishes whatever version is on `master`.

**Obsidian:** `LS Foundry/Notes — CI package publish on master.md`

## Monorepo unit tests + PR CI (Jest)

**When:** June 2026.

**Tooling:** Jest + React Testing Library at repo root; per-package `jest.config.cjs`; shared mocks in `@ls-foundry/test-utils` (Konva, Next.js dynamic, PNG fixtures).

**Commands:**

| Command | Purpose |
|---------|---------|
| `pnpm test` | All packages via Turborepo |
| `pnpm test:coverage` | Same as CI — enforces per-file thresholds |

**Coverage:** Pure modules (`shared-types`, `helpers`, `canvas-upscaler`, designer utils) target **≥ 90%** lines/functions. Integration-heavy files (`CanvasDesigner.tsx`, `GlbViewer.tsx`, docs showcase sections) use **per-file floors** in each package `jest.config.cjs` (branches often **≥ 85%** where practical).

**CI:** `.github/workflows/ci.yml` runs on **every pull request** → `pnpm test:coverage`. Installs native deps for `canvas` (upscaler) on Ubuntu.

**Agent rule:** `.cursor/rules/ls-foundry-unit-tests.mdc` — new components/hooks/exports require co-located `*.test.ts(x)`.

**Obsidian:** `LS Foundry/Notes — Unit tests and PR CI.md`, `LS Foundry/Cursor rules and slash commands.md`

## `@jeffgo10/helpers` v0.2.0 — gestures + image utils (June 2026)

**When:** June 2026. **PR:** [ls-foundry #12](https://github.com/jeffgo10/ls-foundry/pull/12).

**New subpath:** `@jeffgo10/helpers/gestures` — generic `usePointerTransformGestures<T>` with injectable `onPan` / `onPinch` / `clamp` reducers; geometry helpers; maps CSS pointer deltas to logical export coords via `logicalSize`. **Peer:** `react` ^18 | ^19.

**Extended:** `@jeffgo10/helpers/image` — `loadImage`, `downloadCanvasAsPng`, `exportCanvasToBlob` (plus existing `traceAlphaContour`, `blobUrlToDataUrl`).

**Consumer:** CrowdBadge — thin adapter for badge `PhotoPlacement`; imports image helpers in badge canvas. Domain types stay in the app, not in helpers.

**Docs:** `packages/helpers/README.md`. **Obsidian:** `LS Foundry/Notes — helpers gestures subpath.md`.

**Publish:** merge to `master` → CI `deploy:changed` bumps GitHub Packages to **0.2.0**.

## `@jeffgo10/helpers` v0.3.0 — browser, clipboard, mobile download (June 2026)

**When:** June 2026. **PRs:** [ls-foundry #14](https://github.com/jeffgo10/ls-foundry/pull/14) (feature), coverage fix on same branch.

**New subpaths:**

| Import | Exports |
|--------|---------|
| `@jeffgo10/helpers/browser` | `isRestrictedInAppBrowser` — Meta/Instagram/WeChat in-app WebViews that block downloads |
| `@jeffgo10/helpers/clipboard` | `useCopyLink` — copy-to-clipboard React hook (**peer:** `react` ^18 \| ^19) |

**Extended `@jeffgo10/helpers/image`:** `canvasToPngDataUrl`, `dataUrlToBlob`, `isMobileBrowser`; `downloadCanvasAsPng` uses blob object URLs on mobile so async export still triggers a save.

**Consumer:** CrowdBadge — removed local `detect-restricted-in-app-browser`, `use-copy-link`, and duplicate canvas export helpers; pins `@jeffgo10/helpers@^0.3.0`.

**Agent workflow:** `/extract-to-foundry` — DRY extraction slash command (PR #13); Step 0 requires clean ls-foundry `master` before package edits.

**Docs:** `packages/helpers/README.md`. **Obsidian:** `LS Foundry/Notes — helpers gestures subpath.md`, `LS Foundry/Cursor rules and slash commands.md`.

**Publish:** merge to `master` → CI `deploy:changed` publishes **0.3.0**.

## `@jeffgo10/gl-viewer` (LiteShadeMedia consumer)

**Source:** `packages/gl-viewer/` in this repo (v0.3.1).

**Primary consumer:** LiteShadeMedia portfolio site — Obsidian `LiteShadeMedia/08 gl-viewer Package.md`, `07 LiDAR AR 3D Viewer.md`. Do not put consumer integration docs under `StickPak/` or `LS Foundry/`.

