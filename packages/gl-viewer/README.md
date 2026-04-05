# @jeffgo10/gl-viewer

Headless React component for viewing **GLB** / **glTF** assets with [three.js](https://threejs.org/): **orbit** controls, **first-person walk** (pointer lock + WASD), and **WebXR immersive AR** with hit-test placement. Built for dense point clouds and meshes (e.g. LiDAR exports).

Published to [GitHub Packages](https://github.com/features/packages) under the scope **`@jeffgo10`**. Source: [github.com/jeffgo10/ls-foundry](https://github.com/jeffgo10/ls-foundry) (`packages/gl-viewer`).

## Install

Configure the registry for this scope, then install (token needs at least `read:packages`):

```ini
# e.g. project .npmrc or ~/.npmrc
@jeffgo10:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

```bash
pnpm add @jeffgo10/gl-viewer
# or: npm install @jeffgo10/gl-viewer
```

Peer dependencies (install in your app):

- `react`, `react-dom` (^18 or ^19)
- `three` (>= 0.170 &lt; 1)

## Next.js (App Router)

The viewer uses client-only APIs (WebGL, XR, pointer lock). Import it from a **`"use client"`** module and/or **`next/dynamic`** with `ssr: false`.

Enable transpilation of the package:

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@jeffgo10/gl-viewer"],
};

export default nextConfig;
```

Example with dynamic import:

```tsx
"use client";

import dynamic from "next/dynamic";

const GlbViewer = dynamic(
  () => import("@jeffgo10/gl-viewer").then((m) => m.GlbViewer),
  { ssr: false }
);

export function ModelSection() {
  return <GlbViewer src="/models/scene.glb" />;
}
```

Put files under `public/` when using root-relative URLs (e.g. `/models/scene.glb`).

## Usage

### Props

| Prop | Type | Description |
|------|------|-------------|
| `src` | `string` | URL to the GLB (e.g. `/model.glb` or absolute URL). |
| `viewMode` | `"orbit"` \| `"space"` \| `"walk"` | Interaction mode. Default `"orbit"`. |
| `className` | `string` | Tailwind or CSS classes on the wrapper (border, radius, etc.). |
| `style` | `CSSProperties` | Merged over default sizing; override `height` / `minHeight` as needed. |
| `fitParent` | `boolean` | If `true`, uses `h-full min-h-0` and **no** default block height; parent must define height. Default `false`. |
| `onLoad` | `() => void` | Model loaded successfully. |
| `onError` | `(message: string) => void` | Load failed. |
| `onLoadingChange` | `(loading: boolean) => void` | Load lifecycle. |
| `onArError` | `(message: string) => void` | `enterAr()` failed. |
| `onArSessionChange` | `(presenting: boolean) => void` | AR session started or ended. |

Default block size when `fitParent` is false: **`height` / `minHeight`: `min(70vh, 560px)`** (inline styles so layout stays predictable).

### Ref (AR)

Use a ref when you want your own UI for entering or leaving AR (no built-in buttons):

```tsx
import { useRef } from "react";
import {
  GlbViewer,
  type GlbViewerHandle,
} from "@jeffgo10/gl-viewer";

export function ArDemo() {
  const viewer = useRef<GlbViewerHandle>(null);

  return (
    <>
      <button type="button" onClick={() => viewer.current?.enterAr()}>
        Enter AR
      </button>
      <button type="button" onClick={() => viewer.current?.exitAr()}>
        Exit AR
      </button>
      <GlbViewer ref={viewer} src="/model.glb" viewMode="space" />
    </>
  );
}
```

Use **`viewMode="space"`** for the non-AR desktop preview; call **`enterAr()`** to start immersive AR on supported devices (typically mobile Chrome over HTTPS).

### Walk mode

With **`viewMode="walk"`**, the user **clicks the canvas** to request pointer lock, then uses **WASD**, **Space** / **Shift** for vertical movement, and the mouse to look. There is no in-component copy; add hints in your app if you need them.

### Exports

```ts
import {
  GlbViewer,
  type GlbViewerHandle,
  type GlbViewerProps,
  type GlbViewerViewMode,
} from "@jeffgo10/gl-viewer";
```

`GlbViewer` is the same component as the default export from the package entry.

## Developing in the monorepo

From the repository root:

```bash
pnpm install
pnpm exec turbo run build --filter=@jeffgo10/gl-viewer
```

Watch mode:

```bash
pnpm --filter @jeffgo10/gl-viewer run dev
```

## Publishing (maintainers)

From [ls-foundry](https://github.com/jeffgo10/ls-foundry) root, with auth to `npm.pkg.github.com` and an incremented `version` in this `package.json`:

```bash
pnpm run deploy
```

`prepublishOnly` runs the build automatically. See the root [README](../../README.md) for `deploy:dry-run` and `deploy:nogit`.

## License

MIT
