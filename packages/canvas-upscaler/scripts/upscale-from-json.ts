import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PRINT_HEIGHT,
  PRINT_WIDTH,
  isCanvasLayout,
  type CanvasLayoutExport,
} from "@ls-foundry/shared-types";
import { upscaleLayoutExportToPng } from "../src/upscale";

/** Directory where `pnpm` was invoked (repo root when run from there). */
const invocationDir = process.env.INIT_CWD ?? process.cwd();

const [jsonPath, outputArg] = process.argv
  .slice(2)
  .filter((arg) => arg !== "--");

if (!jsonPath) {
  console.error(
    "Usage: pnpm --filter @ls-foundry/canvas-upscaler run test:json ./stickpak-export.json [output.png]",
  );
  console.error(
    "Tip: save export JSON at the monorepo root and run the command from the repo root.",
  );
  process.exit(1);
}

const resolvedJsonPath = resolve(invocationDir, jsonPath);
const outputPath = resolve(
  invocationDir,
  outputArg ?? "stickpak-print.png",
);

const raw = JSON.parse(readFileSync(resolvedJsonPath, "utf8")) as CanvasLayoutExport;

if (!raw?.layout || !isCanvasLayout(raw.layout) || !Array.isArray(raw.assets)) {
  console.error(
    "Invalid export JSON. Expected { layout: CanvasLayout, assets: [{ assetId, mimeType, dataUrl }] }",
  );
  process.exit(1);
}

for (const asset of raw.assets) {
  if (
    typeof asset?.assetId !== "string" ||
    typeof asset?.dataUrl !== "string"
  ) {
    console.error("Each asset must include assetId and dataUrl.");
    process.exit(1);
  }
}

const png = await upscaleLayoutExportToPng(raw);
writeFileSync(outputPath, png);
console.log(`Wrote ${outputPath} (${PRINT_WIDTH}x${PRINT_HEIGHT} @ 300 DPI)`);
