# ThreeDLabelCustomizer — engineering notes

Running log of issues and fixes for `@jeffgo10/three-d-label-customizer` (first publish **v0.1.0**).

Standalone ls-foundry package — not StickPak, not LiteShadeMedia. Demo: `pnpm run dev --filter=@ls-foundry/docs` → `/3d-label`.

## Package

| Item | Value |
|------|-------|
| npm | `@jeffgo10/three-d-label-customizer` |
| Version | `0.1.0` (first publish; internal dev iterated to 0.2.8 before reset) |
| Source | `packages/three-d-label-customizer/` |

## Architecture (v0.1.0)

1. **Green scan** — `scanNeonGreenBounds` + PCA orientation (`computeGreenClusterOrientation`).
2. **Display image** — `createDisplayProductImageSrc` replaces neon-green pixels with sampled bottle tone (not the axis-aligned bounds box).
3. **Surface grid** — painted dark lines on green (`scanGreenSurfaceGrid`) or synthesized bowed grid (`synthesizeSurfaceGrid`).
4. **R3F scene** — 1:1 pixel orthographic camera; background uses `displayCanvasSrc`; label mesh from grid-warped `BufferGeometry`.
5. **UV mapping** — `mapGridPointToTextureUv` in PCA-local space: texture U = wrap (local V), V = height (local U); `u = 1 - uNorm` for correct reading direction.
6. **Curvature** — `applyGridCurvature` bows strips along texture wrap axis; stronger blend for detected grids.

## Issues and fixes

### Scene / camera

| Symptom | Cause | Fix |
|---------|-------|-----|
| Preview shows ¼ image in lower-left | Ortho frustum wrong for 1:1 pixel mapping | `PixelOrthographicCamera` frustum fix |
| `C.getState is not a function` on image load | Invalid `useThree` usage in camera | Refactored `PixelOrthographicCamera` layout effect |

### Green region / background

| Symptom | Cause | Fix |
|---------|-------|-----|
| No label; whole patch turned olive | Green fill painted axis-aligned bounds rectangle | Replace **only** `isNeonGreenPixel` pixels; pass original image to label scene |
| Neon green sliver at patch edge | `ThreeDLabelCustomizer` passed `canvasImageSrc` to background instead of processed `displayCanvasSrc` from `useGreenAreaScan` | Wire `displayCanvasSrc` to `LabelScene` |

### Orientation / texture alignment

| Symptom | Cause | Fix |
|---------|-------|-----|
| Label straight while green patch tilted | No PCA rotation on mesh | `rotationDegrees` from green cluster PCA |
| Label on wrong side (90° off) | Aspect ratio label vs patch not matched | `resolveLabelOrientation` quarter-turn |
| Upside-down / inverted regressions | Conflicting `texture.flipY`, `texture.rotation`, mesh `rotationZ` | Centralized in `labelSceneCoords.ts`; `labelOrientationRegression.test.ts` |
| Texture upright on screen but mesh tilted (v0.2.7) | UV mapped from canvas AABB (screen axes) | Map UV from PCA-local coords (`canvasToLocal`) |
| Text mirrored horizontally (v0.2.8) | Wrap axis (`localV` → U) reversed | `u = 1 - uNorm` in `mapGridPointToTextureUv` |

### Grid warping

| Symptom | Cause | Fix |
|---------|-------|-----|
| Label flat, ignores painted grid | No grid geometry path | Grid scan → `buildGridWarpGeometry` → `applyGridCurvature`; `mode: "grid"` |
| Warp along wrong axis | Index-based UV + bow direction mismatch | Coordinate-based UV; `shouldBowAlongGridRows` pairs with UV axes |
| Weak cylindrical bow on detected grids | Damped `detectedScale` / `blend` | Increased to ~0.7 / `t * 0.85` |
| Patch edges not fully covered | Grid vertices inset from bounds | `bleedGridPoint` (~2% outward) in `buildGridWarpGeometry` |

### Dev / docs app

| Symptom | Cause | Fix |
|---------|-------|-----|
| Code changes not visible in `/3d-label` | Next resolved package `dist/` (missing or stale) | `webpack.resolve.alias` to `packages/three-d-label-customizer/src/index.ts` in `apps/docs/next.config.ts` |
| Confirm loaded build | — | `PACKAGE_VERSION` badge in controls panel |

## Key files

- `packages/three-d-label-customizer/src/ThreeDLabelCustomizer.tsx`
- `packages/three-d-label-customizer/src/labelSceneCoords.ts` — coords + UV
- `packages/three-d-label-customizer/src/buildGridWarpGeometry.ts`
- `packages/three-d-label-customizer/src/applyGridCurvature.ts`
- `packages/three-d-label-customizer/src/scanGreenSurfaceGrid.ts`
- `packages/three-d-label-customizer/src/prepareProductDisplayImage.ts`
- `apps/docs/next.config.ts` — dev alias + `transpilePackages`

## Tests

Co-located Jest suites including `gridTextureUv.test.ts`, `labelOrientationRegression.test.ts`, `applyGridCurvature.test.ts`, `scanGreenSurfaceGrid.test.ts`.

```bash
pnpm test --filter=@jeffgo10/three-d-label-customizer
```

## Related

- Package README: `packages/three-d-label-customizer/README.md`
- Obsidian: `LS Foundry/Notes — three-d-label-customizer.md`
