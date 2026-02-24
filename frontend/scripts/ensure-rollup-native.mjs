#!/usr/bin/env node

import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const platformArch = `${process.platform}-${process.arch}`;

const packageByPlatform = {
  "darwin-arm64": "@rollup/rollup-darwin-arm64",
  "darwin-x64": "@rollup/rollup-darwin-x64",
  "linux-x64": "@rollup/rollup-linux-x64-gnu",
  "linux-arm64": "@rollup/rollup-linux-arm64-gnu",
  "win32-x64": "@rollup/rollup-win32-x64-msvc",
};

const nativeRollupPackage = packageByPlatform[platformArch];

if (!nativeRollupPackage) {
  process.exit(0);
}

try {
  require.resolve(nativeRollupPackage);
  process.exit(0);
} catch {
  // Continue and self-heal below.
}

let rollupVersion = "";
try {
  // eslint-disable-next-line global-require
  rollupVersion = require("rollup/package.json").version || "";
} catch {
  rollupVersion = "";
}

const installTarget = rollupVersion
  ? `${nativeRollupPackage}@${rollupVersion}`
  : nativeRollupPackage;

console.warn(
  `[setup] Missing optional Rollup native package for ${platformArch}. Installing ${installTarget}...`
);

execSync(
  `npm install --no-save --include=optional --no-audit --prefer-offline ${installTarget}`,
  { stdio: "inherit" }
);
