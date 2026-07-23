# @jeffgo10/panorama-viewer

React **360° equirectangular** panorama viewer built on [Pannellum](https://pannellum.org/), with first-class **navigation / info / label** hotspots and package-owned content UI.

Published to [GitHub Packages](https://github.com/features/packages) under **`@jeffgo10`**. Source: [github.com/jeffgo10/ls-foundry](https://github.com/jeffgo10/ls-foundry) (`packages/panorama-viewer`).

## Install

```ini
# .npmrc
@jeffgo10:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

```bash
pnpm add @jeffgo10/panorama-viewer
```

Peer dependencies: `react`, `react-dom` (^18 or ^19).

Import styles once (includes Pannellum CSS + hotspot styles):

```ts
import "@jeffgo10/panorama-viewer/styles.css";
```

## Next.js (App Router)

Client-only (WebGL). Use a `"use client"` module and/or `next/dynamic` with `ssr: false`, and transpile the package:

```ts
// next.config.ts
const nextConfig = {
  transpilePackages: ["@jeffgo10/panorama-viewer"],
};
```

```tsx
"use client";

import dynamic from "next/dynamic";
import "@jeffgo10/panorama-viewer/styles.css";

const PanoramaViewer = dynamic(
  () => import("@jeffgo10/panorama-viewer").then((m) => m.PanoramaViewer),
  { ssr: false },
);
```

## Usage

```tsx
import { PanoramaViewer, type PanoramaMarker } from "@jeffgo10/panorama-viewer";
import "@jeffgo10/panorama-viewer/styles.css";

const markers: PanoramaMarker[] = [
  { id: "nav-1", yaw: 40, pitch: 0, kind: "navigation", title: "Kitchen" },
  {
    id: "info-1",
    yaw: -20,
    pitch: -8,
    kind: "info",
    content: { type: "text", body: "Original hardwood floors." },
  },
  {
    id: "label-1",
    yaw: 90,
    pitch: 5,
    kind: "label",
    content: {
      type: "image",
      src: "/living.jpg",
      caption: "Living room",
    },
  },
];

<PanoramaViewer
  imageUrl="/scenes/living.jpg"
  markers={markers}
  mode="view"
  onMarkerClick={(m) => {
    if (m.kind === "navigation") {
      // consumer changes scene using m.data
    }
  }}
/>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `imageUrl` | `string` | Equirectangular panorama URL |
| `className` | `string?` | Wrapper class |
| `initialYaw` / `initialPitch` / `initialHfov` | `number?` | Initial camera (degrees) |
| `markers` | `PanoramaMarker[]?` | Hotspots |
| `mode` | `"view" \| "edit"` | Edit enables sphere click |
| `onSphereClick` | `(pos) => void` | Edit: yaw/pitch of click |
| `onMarkerClick` | `(marker) => void` | Marker click |

### Marker kinds

| Kind | Pin | Click / content |
|------|-----|-----------------|
| `navigation` | Arrow-style pin | `onMarkerClick` only (consumer handles scene change) |
| `info` | Info pin | Opens in-package popover for `content` |
| `label` | Minimal / none | Billboard content on the sphere |

### `MarkerContent`

- `{ type: "text"; body }`
- `{ type: "image"; src; alt?; caption? }`
- `{ type: "html"; html }` — **trust boundary**: sanitize untrusted HTML before passing
- `{ type: "rich"; title?; body?; imageUrl?; blocks? }`

Opaque `data` on markers is never interpreted by the package (e.g. `targetSceneId`).

### Ref

```ts
type PanoramaViewerHandle = {
  getView: () => { yaw: number; pitch: number; hfov: number } | null;
  lookAt: (yaw: number, pitch: number, hfov?: number) => void;
  destroy: () => void;
};
```

## Edit mode

```tsx
<PanoramaViewer
  mode="edit"
  imageUrl={url}
  markers={markers}
  onSphereClick={({ yaw, pitch }) => {
    setMarkers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), yaw, pitch, kind: "info", content: { type: "text", body: "New" } },
    ]);
  }}
/>
```

Drag-to-reposition markers is a follow-up (not in 0.1.0).

## Demo

```bash
pnpm run dev --filter=@ls-foundry/docs
```

Open [http://localhost:3000/panorama](http://localhost:3000/panorama) — upload a 360 image and place hotspots.

## Vantage migration

Replace the local CDN wrapper at `src/components/viewer/panorama-viewer.tsx` with this package after publish. Map DB hotspots (`position_yaw` / `position_pitch` / `content`) onto `PanoramaMarker` / `MarkerContent`; put `target_scene_id` in `data`.
