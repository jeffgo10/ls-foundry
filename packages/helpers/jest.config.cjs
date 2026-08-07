const path = require("path");
const base = require("../../jest.config.base.cjs");

const threshold90 = {
  branches: 85,
  functions: 90,
  lines: 90,
  statements: 90,
};

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  displayName: "@jeffgo10/helpers",
  rootDir: ".",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@jeffgo10/helpers/text$": "<rootDir>/src/text/index.ts",
    "^@jeffgo10/helpers/brand$": "<rootDir>/src/brand/index.ts",
    "^@ls-foundry/test-utils$": path.join(__dirname, "../test-utils/src/index.ts"),
    "^@ls-foundry/test-utils/(.*)$": path.join(__dirname, "../test-utils/src/$1"),
  },
  coverageThreshold: {
    "./src/brand/LiteShadeMark.tsx": threshold90,
    "./src/brand/LiteShadeWordmark.tsx": threshold90,
    "./src/brand/LiteShadeBrand.tsx": threshold90,
    "./src/brand/paths.ts": threshold90,
    "./src/brand/fluorescentBlink.ts": {
      ...threshold90,
      // RNG opacity / Math.min settle branches are partially probabilistic.
      branches: 80,
    },
    "./src/brand/useFluorescentBlink.ts": {
      ...threshold90,
      branches: 80,
    },
    "./src/gestures/geometry.ts": threshold90,
    "./src/gestures/usePointerTransformGestures.ts": {
      ...threshold90,
      branches: 80,
    },
    "./src/browser/isRestrictedInAppBrowser.ts": threshold90,
    "./src/clipboard/useCopyLink.ts": {
      ...threshold90,
      branches: 85,
    },
    "./src/text/useScrambleReveal.ts": {
      ...threshold90,
      branches: 85,
    },
    "./src/text/skipEnvironment.ts": {
      ...threshold90,
      // `typeof window/navigator` SSR branches are not exercisable under jsdom.
      branches: 70,
    },
    "./src/text/ScrambleRevealProvider.ts": {
      ...threshold90,
      branches: 85,
    },
    "./src/image/blobUrlToDataUrl.ts": threshold90,
    "./src/image/canvasToPngDataUrl.ts": threshold90,
    "./src/image/dataUrlToBlob.ts": threshold90,
    "./src/image/downloadCanvasAsPng.ts": threshold90,
    "./src/image/exportCanvasToBlob.ts": threshold90,
    "./src/image/isMobileBrowser.ts": threshold90,
    "./src/image/loadImage.ts": threshold90,
    "./src/image/traceAlphaContour.ts": {
      ...threshold90,
      branches: 82,
    },
  },
};
