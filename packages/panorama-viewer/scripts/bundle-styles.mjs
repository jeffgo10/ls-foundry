import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");

mkdirSync(distDir, { recursive: true });

const pannellumCssPath = require.resolve("pannellum/build/pannellum.css");
const pannellumCss = readFileSync(pannellumCssPath, "utf8");
const packageCss = readFileSync(join(root, "src/styles.css"), "utf8");

writeFileSync(
  join(distDir, "styles.css"),
  `${pannellumCss}\n\n/* @jeffgo10/panorama-viewer */\n${packageCss}\n`,
);
