/** @type {import('jest').Config} */
const path = require("path");

module.exports = {
  preset: "ts-jest",
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  setupFilesAfterEnv: [path.join(__dirname, "jest.setup.ts")],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/index.ts",
    "!src/**/types.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
};
