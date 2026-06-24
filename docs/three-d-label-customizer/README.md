# 3D Label Customizer

Standalone product docs for `@jeffgo10/three-d-label-customizer`.

## Overview

The **ThreeDLabelCustomizer** component targets product mockup workflows where a neon-green chroma region marks where a label should be applied. It:

1. Scans the product image for neon-green pixels
2. Aligns an orthographic Three.js scene 1:1 with image pixels
3. Warps a label texture onto a **grid-driven** curved mesh over the detected bounds (painted guide grid or synthesized bowed grid)
4. Optionally draws a wireframe overlay that follows the same deformation

Standalone ls-foundry package (separate from StickPak canvas/upscaler and from LiteShadeMedia).

## Package

| Item | Value |
|------|-------|
| npm | `@jeffgo10/three-d-label-customizer` |
| Version | `0.1.0` |
| Source | `packages/three-d-label-customizer/` |

## Browser demo

```bash
pnpm run dev --filter=@ls-foundry/docs
```

Open [http://localhost:3000/3d-label](http://localhost:3000/3d-label). Upload a product image (with neon-green label area) and a label graphic.

## Consumer setup

See [packages/three-d-label-customizer/README.md](../../packages/three-d-label-customizer/README.md) for install, peer dependencies, and Next.js `dynamic` + `transpilePackages` notes.

## Engineering notes

Issue/fix log: [engineering-notes.md](./engineering-notes.md)

## Green detection tuning

Threshold constants live in `src/scanNeonGreenBounds.ts` (`MIN_GREEN`, `GREEN_DELTA`, etc.). Adjust after testing with real product photos.
