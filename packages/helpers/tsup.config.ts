import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    brand: "src/brand/index.ts",
    browser: "src/browser/index.ts",
    clipboard: "src/clipboard/index.ts",
    gestures: "src/gestures/index.ts",
    image: "src/image/index.ts",
    text: "src/text/index.ts",
    ui: "src/ui/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // Keep brand → text as a runtime import so ScrambleRevealProvider context is shared.
  external: ["react", "react-dom", "@jeffgo10/helpers/text"],
});
