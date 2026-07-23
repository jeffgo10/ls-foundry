import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import webpack from "webpack";

const require = createRequire(import.meta.url);
const konvaBrowser = require.resolve("konva/lib/index.js");
const packageSrc = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../packages",
);

const nextConfig: NextConfig = {
  transpilePackages: [
    "@jeffgo10/gl-viewer",
    "@jeffgo10/helpers",
    "@jeffgo10/history",
    "@jeffgo10/panorama-viewer",
    "@jeffgo10/react-canvas-designer",
    "@jeffgo10/shared-types",
    "@jeffgo10/three-d-label-customizer",
  ],
  serverExternalPackages: ["canvas"],
  webpack: (config) => {
    // Compile workspace package source during `next dev` (avoid stale dist bundles).
    config.resolve.alias = {
      ...config.resolve.alias,
      "@jeffgo10/react-canvas-designer": path.join(
        packageSrc,
        "react-canvas-designer/src/index.ts",
      ),
      // Subpath exports (`@jeffgo10/helpers/image`, etc.) — keep ahead of the
      // package root alias so Next does not resolve them via stale `dist/`.
      "@jeffgo10/helpers/image": path.join(
        packageSrc,
        "helpers/src/image/index.ts",
      ),
      "@jeffgo10/helpers/gestures": path.join(
        packageSrc,
        "helpers/src/gestures/index.ts",
      ),
      "@jeffgo10/helpers/browser": path.join(
        packageSrc,
        "helpers/src/browser/index.ts",
      ),
      "@jeffgo10/helpers/clipboard": path.join(
        packageSrc,
        "helpers/src/clipboard/index.ts",
      ),
      "@jeffgo10/history": path.join(packageSrc, "history/src/index.ts"),
      "@jeffgo10/three-d-label-customizer": path.join(
        packageSrc,
        "three-d-label-customizer/src/index.ts",
      ),
      // Subpath before root; `$` so styles.css is not resolved as src/index.ts/styles.css.
      "@jeffgo10/panorama-viewer/styles.css": path.join(
        packageSrc,
        "panorama-viewer/src/styles.dev.css",
      ),
      "@jeffgo10/panorama-viewer$": path.join(
        packageSrc,
        "panorama-viewer/src/index.ts",
      ),
    };

    // Konva defaults to its Node entry when node-canvas is installed in the monorepo.
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /konva[\\/]lib[\\/]index-node\.js$/,
        konvaBrowser,
      ),
      new webpack.IgnorePlugin({ resourceRegExp: /^canvas$/ }),
    );
    return config;
  },
};

export default nextConfig;
