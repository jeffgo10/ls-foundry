import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    image: "src/image/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
