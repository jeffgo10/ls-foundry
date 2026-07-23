# Panorama viewer

Standalone product docs for `@jeffgo10/panorama-viewer`.

## Overview

React wrapper around **Pannellum** for equirectangular 360° tours. First-class markers:

| Kind | Behavior |
|------|----------|
| `navigation` | Distinct pin; click → consumer handles scene change |
| `info` | Pin + in-package popover for `MarkerContent` |
| `label` | Minimal pin + billboard content on the sphere |

Platform-agnostic — no Supabase, R2, Next routes, or billing. Primary consumer: **Vantage** (real-estate tours).

## Package

| Item | Value |
|------|-------|
| npm | `@jeffgo10/panorama-viewer` |
| Version | `0.1.1` |
| Source | `packages/panorama-viewer/` |

## Browser demo

```bash
pnpm run dev --filter=@ls-foundry/docs
```

Open [http://localhost:3000/panorama](http://localhost:3000/panorama). Upload a 360 image and place hotspots in edit mode.

## Consumer setup

See [packages/panorama-viewer/README.md](../../packages/panorama-viewer/README.md) for install, styles import, and Next.js `dynamic` + `transpilePackages` notes.

## Engineering notes

Issue/fix log: [engineering-notes.md](./engineering-notes.md)

## Follow-ups (not in 0.1.0)

- Drag-to-reposition markers in edit mode
- Gyroscope / VR
- Multi-scene tour graph (stays in the consumer app)
