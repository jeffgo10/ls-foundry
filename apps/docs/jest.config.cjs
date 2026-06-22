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
  displayName: "@ls-foundry/docs",
  rootDir: ".",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": path.join(__dirname, "src/$1"),
    "^next/link$": path.join(__dirname, "../../packages/test-utils/src/mockNextLink.tsx"),
    "^next/dynamic$": path.join(__dirname, "../../packages/test-utils/src/mockNextDynamic.tsx"),
    "^react-konva$": path.join(__dirname, "../../packages/test-utils/src/mockKonva.tsx"),
    "^@ls-foundry/test-utils$": path.join(__dirname, "../../packages/test-utils/src/index.ts"),
    "^@ls-foundry/test-utils/(.*)$": path.join(__dirname, "../../packages/test-utils/src/$1"),
  },
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/app/layout.tsx", "!src/app/stickpak/**"],
  coverageThreshold: {
    "./src/app/page.tsx": threshold90,
    "./src/components/LidarSprayViewerSection.tsx": {
      branches: 100,
      functions: 20,
      lines: 66,
      statements: 50,
    },
    "./src/components/StickPakCanvasSection.tsx": {
      branches: 28,
      functions: 7,
      lines: 45,
      statements: 40,
    },
  },
};
