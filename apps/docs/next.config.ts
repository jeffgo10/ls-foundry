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
      "@jeffgo10/three-d-label-customizer": path.join(
        packageSrc,
        "three-d-label-customizer/src/index.ts",
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
