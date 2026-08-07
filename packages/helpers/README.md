# @jeffgo10/helpers

Shared utilities for **ls-foundry** packages and canvas consumers (CrowdBadge, StickPak storefront).

Published subpaths:

- **`@jeffgo10/helpers/image`** — pure DOM/canvas image utilities
- **`@jeffgo10/helpers/gestures`** — pointer pan/pinch/rotate hook + geometry helpers
- **`@jeffgo10/helpers/browser`** — in-app WebView detection for export UX
- **`@jeffgo10/helpers/clipboard`** — `useCopyLink` React hook for copy-to-clipboard UI
- **`@jeffgo10/helpers/text`** — `useScrambleReveal` React hook for ticker-style text reveal
- **`@jeffgo10/helpers/brand`** — LiteShade Media mark + wordmark as inline SVG React components
- **`@jeffgo10/helpers/ui`** — presentational UI primitives (`SlidingText` vertical hover reveal)

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

## `@jeffgo10/helpers/brand`

```tsx
import { ScrambleRevealProvider } from "@jeffgo10/helpers/text";
import {
  LiteShadeMark,
  LiteShadeWordmark,
  LiteShadeBrand,
} from "@jeffgo10/helpers/brand";

// Consumer provides the provider once (app shell / layout) — brand does not.
<ScrambleRevealProvider>
  <LiteShadeMark size={24} color="#fff" />
  <LiteShadeWordmark color="currentColor" />
  <LiteShadeBrand color="#ffffff" size={24} />
</ScrambleRevealProvider>
```

Inline SVG converted from LiteShadeMedia `public/lsm-white.svg` / `lsm-black.svg`. Paths use `fill="currentColor"` so `color` (or CSS `color`) themes the mark without white/black asset variants. Three paths stay separate with stable hooks:

| Selector | Geometry |
|----------|----------|
| `[data-lsm-mark]` / `.lsm-mark` | Path group |
| `[data-lsm-path="outer"]` | Outer hex shell |
| `[data-lsm-path="inner-a"]` | Upper / right facet |
| `[data-lsm-path="inner-b"]` | Lower / left facet |

**Wordmark text is fixed** to `LITESHADEMEDIA` (no `label` prop). `LiteShadeWordmark` uses `useScrambleReveal` from `@jeffgo10/helpers/text` internally — real string stays in a visually-hidden node for SEO; the animated layer is `aria-hidden`. Forward scramble timing via wordmark props / `wordmarkProps` (`delayMs`, `disabled`, …). Do **not** expect `ScrambleRevealProvider` inside this package.

**Mark fluorescent blink (start only):** on mount, each of the three paths runs its own randomized CSS `@keyframes` flicker (`step-end`, unsynced duration/delay) for ~`blinkDurationMs` (default `2000`), then settles to full opacity — like a tube warming up. Same skip gates as scramble (provider / reduced-motion / bots). Disable with `blinkDisabled` or `markProps={{ blinkDisabled: true }}`.

| Prop | Components | Default | Notes |
|------|------------|---------|--------|
| `color` | Mark / Wordmark / Brand | `currentColor` | Sets CSS `color` |
| `size` | Mark / Brand | `24` | SVG width & height |
| `showMark` / `showWordmark` | Brand | `true` | Toggle parts |
| `gap` | Brand | `0.5rem` | Flex gap |
| `markProps` / `wordmarkProps` | Brand | — | Forwarded to children (blink / scramble options) |
| `as` | Wordmark | `span` | `span` \| `div` \| `p` |
| `delayMs` / `disabled` / … | Wordmark | see `./text` | `UseScrambleRevealOptions` (text is not overridable) |
| `blinkDisabled` | Mark | `false` | Skip fluorescent turn-on |
| `blinkDurationMs` | Mark | `2000` | Base flicker window before settle |
| `blinkDelayMs` | Mark | `0` | Delay before flicker starts |

**Peer dependency:** `react` ^18 or ^19. Framework-agnostic — no Next.js / `/public` assets.

## `@jeffgo10/helpers/ui`

```tsx
import {
  SlidingText,
  slidingTextGroupProps,
} from "@jeffgo10/helpers/ui";
import { useScrambleReveal } from "@jeffgo10/helpers/text";

// Self-contained (hover / focus-visible on the clip itself)
<SlidingText color="rgba(255,255,255,0.6)" activeColor="#fff">
  HOME
</SlidingText>

// Nav / CTA: put the group attr on the interactive ancestor so index siblings count
<a href="/showcase" {...slidingTextGroupProps}>
  <span aria-hidden>02/ </span>
  <SlidingText color="#fff" decorative>
    {displayText}
  </SlidingText>
</a>
```

Vertical slide reveal extracted from LiteShadeMedia `SlidingTextLink` / TopNav: two stacked copies in a `1.15em` overflow clip; rest shows the primary layer; hover/focus slides primary out and the duplicate in (`300ms`, `cubic-bezier(0.2, 0.9, 0.2, 1)`). No Tailwind — scoped CSS is injected per instance.

| Prop | Default | Notes |
|------|---------|--------|
| `children` | — | Label (compose scramble outside) |
| `color` | `currentColor` | Rest layer |
| `activeColor` | same as `color` | Hover/focus layer |
| `durationMs` | `300` | Transition duration |
| `easing` | `cubic-bezier(0.2, 0.9, 0.2, 1)` | |
| `slideDistance` | `110%` | |
| `decorative` | `false` | `aria-hidden` on clip when parent owns the name |

Triggers: root `:hover` / `:focus-visible` / `:focus-within`, **and** ancestor `[data-sliding-text-group]:hover` / `:focus-visible` via `slidingTextGroupProps`. Duplicate layer is always `aria-hidden`. No Next.js / scramble baked in.

**Peer dependency:** `react` ^18 or ^19.

## License

MIT
