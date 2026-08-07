import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    brand: "src/brand/index.ts",
    browser: "src/browser/index.ts",
    clipboard: "src/clipboard/index.ts",
    gestures: "src/gestures/index.ts",
    image: "src/image/index.ts",
    text: "src/text/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ["react", "react-dom"],
});
