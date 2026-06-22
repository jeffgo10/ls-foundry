const path = require("path");
const base = require("../../jest.config.base.cjs");

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  displayName: "@jeffgo10/gl-viewer",
  rootDir: ".",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@ls-foundry/test-utils$": path.join(__dirname, "../test-utils/src/index.ts"),
    "^@ls-foundry/test-utils/(.*)$": path.join(__dirname, "../test-utils/src/$1"),
  },
  coverageThreshold: {
    "./src/GlbViewer.tsx": {
      branches: 12,
      functions: 50,
      lines: 58,
      statements: 57,
    },
  },
};
