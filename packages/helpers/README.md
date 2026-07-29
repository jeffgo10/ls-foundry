# @jeffgo10/helpers

Shared utilities for **ls-foundry** packages and canvas consumers (CrowdBadge, StickPak storefront).

Published subpaths:

- **`@jeffgo10/helpers/image`** — pure DOM/canvas image utilities
- **`@jeffgo10/helpers/gestures`** — pointer pan/pinch/rotate hook + geometry helpers
- **`@jeffgo10/helpers/browser`** — in-app WebView detection for export UX
- **`@jeffgo10/helpers/clipboard`** — `useCopyLink` React hook for copy-to-clipboard UI
- **`@jeffgo10/helpers/text`** — `useScrambleReveal` React hook for ticker-style text reveal

Source: [github.com/jeffgo10/ls-foundry](https://github.com/jeffgo10/ls-foundry) (`packages/helpers`).

Used internally by `@jeffgo10/react-canvas-designer` (alpha contour, export). Consumers may import helpers directly.

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
  blobUrlToDataUrl,
  canvasToPngDataUrl,
  downloadCanvasAsPng,
  exportCanvasToBlob,
  loadImage,
  offsetClosedPolygon,
  traceAlphaContour,
  splitCutLineContours,
  normalizeCutLinePoints,
} from "@jeffgo10/helpers/image";
```

### `traceAlphaContour(image, width, height, options?)`

Traces the alpha boundary of an `HTMLImageElement` (or canvas image source) in **local image coordinates**. Returns a flat `[x0, y0, x1, y1, …]` array suitable for Konva `Line` points.

Disconnected opaque islands (e.g. a star above a crest in one PNG) each get their own closed contour, joined with `NaN` separators. Use `splitCutLineContours(points)` to get `number[][]`, or `normalizeCutLinePoints` after `JSON.parse` (`null` ↔ `NaN`).

Contours are refined with mild RDP (**1.25**) by default. **Chaikin smoothing is off** for tight (no-offset) traces so sharp art stays faithful. Offset bake (`bakeCutLineOffset`) and expand paths opt into lower RDP + Chaikin via `OFFSET_CONTOUR_*` defaults (`simplifyTolerance` / `smoothIterations` to override).

Optional `expandPx` morphologically dilates the alpha mask before tracing (legacy / verify paths). Prefer `bakeCutLineOffset` for designer placement so resize stays cheap.

### `bakeCutLineOffset(image, offsetPx, options?)`

Dilates the alpha mask with a **circular** (Euclidean) brush so convex corners become rounded fillets — not sharp Chebyshev tips — then draws the art and fills the expanded ring with a solid color. By default the fill is the **dominant edge color** sampled along the alpha boundary (`dominantEdgeColorFromAlphaData`); pass `options.fill` (CSS color) to override. Returns `{ dataUrl, width, height, cutLinePoints, pad, contentScale }`. When nearby islands merge under the pad, enclosed transparent gaps are traced as extra cut-line contours (`includeHoles`, default on). Large sources are downsampled (default max edge **768**) so drop stays responsive. Used by the designer so cutline offset is baked once (async after place) instead of re-dilating every scale frame.

> **Designer (`react-canvas-designer` ≥ 1.0.0):** `setSelectedCutLineOffset({ fill? })` / `prepareCutLineMedia(..., fill?)` forward this option. Omit/`undefined` = auto edge; CSS color = explicit fill (persisted as `cutLineOffsetFill`).

### `offsetClosedPolygon(points, offset)`

Expands (positive `offset`) or shrinks (negative) a closed flat `[x, y, …]` polygon with **bevel** corner joins. Prefer `bakeCutLineOffset` / `traceAlphaContour({ expandPx })` for cut-line padding on complex letterforms.

### `blobUrlToDataUrl(blobUrl)`

Converts a `blob:` URL from drag-and-drop into `{ mimeType, dataUrl }` for layout export.

### `loadImage(src)`

Loads an image with `crossOrigin = "anonymous"`; rejects on error.

### `downloadCanvasAsPng(canvas, filename)` / `exportCanvasToBlob(canvas)`

Client-side PNG download and blob export from an `HTMLCanvasElement`. Mobile browsers use a blob object URL so downloads work after async work.

### `canvasToPngDataUrl(canvas)`

Returns `canvas.toDataURL("image/png")` for overlays or in-app save flows.

## `@jeffgo10/helpers/browser`

```ts
import { isRestrictedInAppBrowser } from "@jeffgo10/helpers/browser";
```

Detects in-app browsers (Meta Messenger, Instagram, WeChat, etc.) that block programmatic downloads.

## `@jeffgo10/helpers/clipboard`

```ts
import { useCopyLink } from "@jeffgo10/helpers/clipboard";
```

**Peer dependency:** `react` ^18 or ^19. Consumer components should be client components.

## `@jeffgo10/helpers/gestures`

```ts
import {
  getDistance,
  getLogicalScaleFactor,
  usePointerTransformGestures,
} from "@jeffgo10/helpers/gestures";
```

Generic pointer pan + two-finger pinch (scale, rotate, centroid pan) for canvas-like elements. Maps CSS pointer deltas to logical export coordinates via `logicalSize`.

**Peer dependency:** `react` ^18 or ^19.

App code supplies domain types via injectable `onPan`, `onPinch`, and `clamp` reducers (see CrowdBadge `use-canvas-touch-gestures.ts` adapter).

## `@jeffgo10/helpers/text`

```ts
import {
  ScrambleRevealProvider,
  useScrambleReveal,
  type UseScrambleRevealOptions,
  type UseScrambleRevealResult,
} from "@jeffgo10/helpers/text";
```

Ticker-style scramble: unresolved characters cycle from a charset, then lock left-to-right into `text`. Spaces are preserved. Returns `{ displayText, isComplete }`.

Wrap the tree once so bot / reduced-motion is evaluated a single time:

```tsx
<ScrambleRevealProvider>
  <ScrambleRevealText text="LINE ONE" delayMs={0} />
  <ScrambleRevealText text="LINE TWO" delayMs={120} />
</ScrambleRevealProvider>
```

`useScrambleReveal` reads `skipAnimation` from context when present; without a provider it still hits a **page-level module cache** (`resolveSkipEnvironment`) so the UA / `matchMedia` check runs at most once per load. Pass `disabled` on the provider to force-skip the whole subtree, or per-hook via options.

| Option | Default | Notes |
|--------|---------|--------|
| `delayMs` | `0` | Defer start (staggered multi-line heroes) |
| `charset` | `A–Z` | Glyph pool for unresolved chars |
| `tickIntervalMs` | `42` | rAF tick throttle |
| `initialScrambleMs` | `480` | Full scramble before first lock |
| `charRevealMs` | `68` | Delay between successive locks |
| `disabled` | `false` | Skip animation; return `text` immediately |

**Skip scramble (final text only):** hook/`provider` `disabled`, `prefers-reduced-motion: reduce`, or a known search/social crawler UA (`isLikelySearchBot`). Initial React state is always `text`, so SSR HTML is the real copy before any client effect.

**SEO markup (recommended):** keep the real string in the document for crawlers that ignore UA heuristics — e.g. visually hide `text` and put the scramble in an `aria-hidden` layer:

```tsx
<h1>
  <span className="sr-only">{text}</span>
  <span aria-hidden="true">{displayText}</span>
</h1>
```

Provider + hook only — no presentational text component. Mark consumer components `"use client"`; this package does not.

**Peer dependency:** `react` ^18 or ^19.

## License

MIT
