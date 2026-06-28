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
    "^@ls-foundry/test-utils$": path.join(__dirname, "../test-utils/src/index.ts"),
    "^@ls-foundry/test-utils/(.*)$": path.join(__dirname, "../test-utils/src/$1"),
  },
  coverageThreshold: {
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
