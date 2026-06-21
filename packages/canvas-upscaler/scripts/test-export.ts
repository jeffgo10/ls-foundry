import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createEmptyLayout } from "@jeffgo10/shared-types";
import { upscaleLayoutToPng } from "../src/upscale";

const assetPath = process.argv[2];

if (!assetPath) {
  console.error("Usage: pnpm run test:export -- <path-to-image>");
  process.exit(1);
}

const layout = createEmptyLayout();
layout.items.push({
  instanceId: "sample-instance",
  assetId: "sample",
  x: 120,
  y: 200,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
});

const png = await upscaleLayoutToPng({
  layout,
  assets: [{ assetId: "sample", path: resolve(assetPath) }],
});

const outputPath = resolve(process.cwd(), "stickpak-test-export.png");
writeFileSync(outputPath, png);
console.log(`Wrote ${outputPath}`);
