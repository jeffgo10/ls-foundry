const path = require("path");
const base = require("../../jest.config.base.cjs");

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  displayName: "@jeffgo10/panorama-viewer",
  rootDir: ".",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@ls-foundry/test-utils$": path.join(
      __dirname,
      "../test-utils/src/index.ts",
    ),
    "^@ls-foundry/test-utils/(.*)$": path.join(
      __dirname,
      "../test-utils/src/$1",
    ),
    "^pannellum/build/pannellum\\.js$": path.join(
      __dirname,
      "src/__mocks__/pannellum.js",
    ),
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/index.ts",
    "!src/**/types.ts",
    "!src/**/*.d.ts",
    "!src/__mocks__/**",
  ],
  coverageThreshold: {
    "./src/markers.ts": {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "./src/pointer.ts": {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "./src/PanoramaViewer.tsx": {
      branches: 40,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
