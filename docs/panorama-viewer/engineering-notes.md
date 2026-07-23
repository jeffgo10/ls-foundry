# Panorama viewer — engineering notes

Running log for `@jeffgo10/panorama-viewer` (first publish **v0.1.0**).

Standalone ls-foundry package — not StickPak, not LiteShadeMedia / gl-viewer. Demo: `pnpm run dev --filter=@ls-foundry/docs` → `/panorama`.

## Package

| Item | Value |
|------|-------|
| npm | `@jeffgo10/panorama-viewer` |
| Version | `0.1.1` |
| Source | `packages/panorama-viewer/` |
| Engine | Pannellum `^2.5.7` (npm assets, not CDN) |

## Architecture (v0.1.0)

1. **`PanoramaViewer`** — client-only React component; loads `pannellum/build/pannellum.js`, destroys on unmount, remounts when `imageUrl` or marker geometry changes.
2. **`markersToHotSpots`** — pure mapper from `PanoramaMarker[]` to Pannellum `hotSpots` with `createTooltipFunc` for package-owned content DOM.
3. **Styles** — `dist/styles.css` bundles Pannellum CSS + pin/content classes; consumers import `@jeffgo10/panorama-viewer/styles.css`.
4. **Edit mode** — sphere click → `mouseEventToCoords` → `onSphereClick({ yaw, pitch })`.

## Issues and fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Viewer flashes then collapses to 0 height | Pannellum `.pnlm-container { height: 100% }` with no sized parent | Outer shell with default `min(70vh, 520px)`; inner canvas absolute fill; docs use fixed-height wrapper + `fitParent` |
| (initial) | Vantage CDN scaffold | Publish reusable package with bundled pannellum assets |

## HTML content trust boundary

`MarkerContent` type `html` is rendered via `innerHTML`. Consumers must sanitize untrusted HTML before passing it.
