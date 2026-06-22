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
  displayName: "@jeffgo10/react-canvas-designer",
  rootDir: ".",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^react-konva$": path.join(__dirname, "../test-utils/src/mockKonva.tsx"),
    "^@ls-foundry/test-utils$": path.join(__dirname, "../test-utils/src/index.ts"),
    "^@ls-foundry/test-utils/(.*)$": path.join(__dirname, "../test-utils/src/$1"),
  },
  coverageThreshold: {
    "./src/canvasMargin.ts": threshold90,
    "./src/autoArrange.ts": { ...threshold90, branches: 79 },
    "./src/resizeConstraints.ts": { ...threshold90, branches: 75 },
    "./src/selectionDimensions.ts": threshold90,
    "./src/transformerTouch.ts": threshold90,
    "./src/SelectionDimensionLabels.tsx": {
      branches: 55,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "./src/CanvasDesigner.tsx": {
      branches: 50,
      functions: 50,
      lines: 55,
      statements: 55,
    },
  },
};
