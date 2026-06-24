# @jeffgo10/three-d-label-customizer

React Three Fiber component that scans a neon-green surface region in a product photo and warps a label texture onto a grid-driven curved mesh.

Source: [github.com/jeffgo10/ls-foundry](https://github.com/jeffgo10/ls-foundry) (`packages/three-d-label-customizer`)

## Install

```bash
# .npmrc
@jeffgo10:registry=https://npm.pkg.github.com

pnpm add @jeffgo10/three-d-label-customizer
```

## Peer dependencies

- `react`, `react-dom`
- `three` (`>=0.170.0 <1.0.0`)
- `@react-three/fiber` (`^9`)
- `@react-three/drei` (`^10`)

## Next.js

```tsx
import dynamic from "next/dynamic";

const ThreeDLabelCustomizer = dynamic(
  () =>
    import("@jeffgo10/three-d-label-customizer").then(
      (m) => m.ThreeDLabelCustomizer,
    ),
  { ssr: false },
);
```

Add to `next.config.ts`:

```ts
transpilePackages: ["@jeffgo10/three-d-label-customizer"],
```

For local monorepo dev, alias the package to `src/index.ts` so changes are not blocked on a stale `dist/` build (see `apps/docs/next.config.ts` in this repo).

## Usage

```tsx
<ThreeDLabelCustomizer
  canvasImageSrc="/product-with-green-area.png"
  labelImageSrc="/label-graphic.png"
  showWireframe={false}
/>
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `canvasImageSrc` | `string` | URL or Base64 of the product image containing a neon-green label region |
| `labelImageSrc` | `string` | URL or Base64 of the graphic to wrap onto the green area |
| `showWireframe` | `boolean` | When `true`, renders an edge grid over the curved label mesh |

## Behavior

1. **Green scan** — Neon-green pixels are clustered; PCA yields oriented bounds (`rotationDegrees`, width/height). A warning banner appears if no green is found (label centered as fallback).
2. **Display background** — Green pixels are replaced with a sampled bottle tone for the background plane; the label mesh renders on top.
3. **Surface grid** — Painted dark guide lines on the green patch are detected when present; otherwise a bowed grid is synthesized from bounds.
4. **Grid-warped mesh** — Label geometry follows grid intersections; curvature slider bows strips along the wrap axis.
5. **UV mapping** — Texture coordinates use PCA-local patch space so label art rotates with the mesh (portrait art: U = wrap, V = height).
6. **Controls** — Sliders for curvature, X/Y offset, and rotation fine-tune. Version badge (`v0.1.0`) confirms loaded build in dev.

## Demo

```bash
pnpm run dev --filter=@ls-foundry/docs
# → http://localhost:3000/3d-label
```

## Engineering notes

See [docs/three-d-label-customizer/engineering-notes.md](../../docs/three-d-label-customizer/engineering-notes.md) for issue/fix history.

## License

MIT
