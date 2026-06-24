const path = require("path");
const base = require("../../jest.config.base.cjs");

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  displayName: "@jeffgo10/three-d-label-customizer",
  rootDir: ".",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@ls-foundry/test-utils$": path.join(__dirname, "../test-utils/src/index.ts"),
    "^@ls-foundry/test-utils/(.*)$": path.join(__dirname, "../test-utils/src/$1"),
  },
  coverageThreshold: {
    "./src/scanNeonGreenBounds.ts": {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "./src/useGreenAreaScan.ts": {
      branches: 50,
      functions: 85,
      lines: 90,
      statements: 90,
    },
    "./src/scanProductImageFromElement.ts": {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "./src/ThreeDLabelCustomizer.tsx": {
      branches: 50,
      functions: 50,
      lines: 55,
      statements: 55,
    },
  },
};
