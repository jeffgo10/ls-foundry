import { createRequire } from "node:module";
import type { NextConfig } from "next";
import webpack from "webpack";

const require = createRequire(import.meta.url);
const konvaBrowser = require.resolve("konva/lib/index.js");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@jeffgo10/gl-viewer",
    "@jeffgo10/helpers",
    "@jeffgo10/react-canvas-designer",
    "@jeffgo10/shared-types",
  ],
  serverExternalPackages: ["canvas"],
  webpack: (config) => {
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
