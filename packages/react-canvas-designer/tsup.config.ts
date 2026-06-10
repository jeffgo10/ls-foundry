import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    "react",
    "react-dom",
    "react-konva",
    "konva",
    "react-dropzone",
    "@jeffgo10/helpers",
    "@jeffgo10/shared-types",
  ],
});
