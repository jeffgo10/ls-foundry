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
  displayName: "@jeffgo10/history",
  rootDir: ".",
  testEnvironment: "node",
  coverageThreshold: {
    "./src/history.ts": threshold90,
  },
};
