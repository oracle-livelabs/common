#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = path.resolve(SCRIPT_DIR, "..");
const SUITES = [
  {
    name: "AI Lakehouse ingestion backend",
    packagePath: "ailakehouse/_deploy/ll-lakehouse/ingestion",
    script: "test:backend",
  },
  {
    name: "Finance LiveStack application",
    packagePath: "aidatabaseindustrylivestack/terraform-ready-livestack/finance/source/application",
    script: "test",
  },
];

function usage() {
  return `Run existing LiveStack Node.js unit-test suites from the LiveStack repository.

Usage:
  npm run test:unit:livestack -- --repo-root <path>

Options:
  --repo-root <path>  LiveStack repository root; defaults to QA_LIVESTACK_ROOT.
  --help              Show this help.
`;
}

const { values } = parseArgs({
  options: {
    "repo-root": { type: "string" },
    help: { type: "boolean", default: false },
  },
  strict: true,
});

if (values.help) {
  console.log(usage());
  process.exit(0);
}

const repoRootInput = values["repo-root"] || process.env.QA_LIVESTACK_ROOT;
if (!repoRootInput) {
  console.error("Set QA_LIVESTACK_ROOT or pass --repo-root with the LiveStack repository path.");
  process.exit(2);
}

const repoRoot = path.resolve(FRAMEWORK_ROOT, repoRootInput);
const missing = SUITES.flatMap(({ packagePath, script }) => {
  const packageDir = path.join(repoRoot, packagePath);
  const packageFile = path.join(packageDir, "package.json");
  if (!fs.existsSync(packageFile)) {
    return [path.join(packagePath, "package.json")];
  }

  const packageJson = JSON.parse(fs.readFileSync(packageFile, "utf8"));
  return packageJson.scripts?.[script]
    ? []
    : [path.join(packagePath, `package.json (missing script: ${script})`)];
});

if (missing.length > 0) {
  console.error(`LiveStack checkout at ${repoRoot} is missing expected test entrypoints:\n- ${missing.join("\n- ")}`);
  process.exit(2);
}

let failures = 0;
for (const suite of SUITES) {
  const cwd = path.join(repoRoot, suite.packagePath);
  console.log(`\n=== ${suite.name} (${suite.packagePath}) ===`);
  const result = spawnSync("npm", ["run", suite.script], {
    cwd,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.error(result.error.message);
    failures += 1;
  } else if (result.status !== 0) {
    console.error(`Suite exited with status ${result.status ?? "unknown"}.`);
    failures += 1;
  }
}

process.exitCode = failures === 0 ? 0 : 1;
