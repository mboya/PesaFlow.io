#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import process from "node:process";

function isMusl() {
  if (process.platform !== "linux") return false;

  try {
    if (process.report && typeof process.report.getReport === "function") {
      const report = process.report.getReport();
      const glibcVersion = report?.header?.glibcVersionRuntime;

      if (glibcVersion) return false;

      const sharedObjects = report?.sharedObjects;
      if (
        Array.isArray(sharedObjects) &&
        sharedObjects.some(
          (entry) =>
            typeof entry === "string" && entry.toLowerCase().includes("musl")
        )
      ) {
        return true;
      }
    }
  } catch {
    // Ignore and fall through to the ldd-based detection.
  }

  // Alpine and several minimal images use musl and expose this marker file.
  if (existsSync("/etc/alpine-release")) {
    return true;
  }

  try {
    const output = execSync("ldd --version 2>&1 || true", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return output.toLowerCase().includes("musl");
  } catch {
    // If detection fails, assume glibc to avoid false positives.
    return false;
  }
}

const require = createRequire(import.meta.url);
const platformArch = `${process.platform}-${process.arch}${
  isMusl() ? "-musl" : ""
}`;

const packageByPlatform = {
  "darwin-arm64": "@rollup/rollup-darwin-arm64",
  "darwin-x64": "@rollup/rollup-darwin-x64",
  "linux-x64": "@rollup/rollup-linux-x64-gnu",
  "linux-arm64": "@rollup/rollup-linux-arm64-gnu",
  "linux-x64-musl": "@rollup/rollup-linux-x64-musl",
  "linux-arm64-musl": "@rollup/rollup-linux-arm64-musl",
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
