import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    browser: "src/browser/index.ts",
    clipboard: "src/clipboard/index.ts",
    gestures: "src/gestures/index.ts",
    image: "src/image/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
