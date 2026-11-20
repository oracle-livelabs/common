import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const FRAMEWORK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const RUNNER = path.join(FRAMEWORK_ROOT, "scripts", "livestack-unit.mjs");

function runRunner(args, repoRoot, extraEnv = {}) {
  const env = { ...process.env };
  delete env.QA_LIVESTACK_ROOT;

  if (repoRoot) {
    env.QA_LIVESTACK_ROOT = repoRoot;
  }

  return spawnSync(process.execPath, [RUNNER, ...args], {
    cwd: FRAMEWORK_ROOT,
    env: { ...env, ...extraEnv },
    encoding: "utf8",
  });
}

test("runner help explains how to provide the LiveStack checkout", () => {
  const result = runRunner(["--help"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /QA_LIVESTACK_ROOT/);
  assert.match(result.stdout, /--repo-root/);
});

test("runner rejects an incomplete checkout before starting package suites", (t) => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "qa-livestack-runner-"));
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

  const packagePaths = [
    "ailakehouse/_deploy/ll-lakehouse/ingestion",
    "aidatabaseindustrylivestack/terraform-ready-livestack/finance/source/application",
  ];
  for (const packagePath of packagePaths) {
    const packageDir = path.join(repoRoot, packagePath);
    fs.mkdirSync(packageDir, { recursive: true });
    fs.writeFileSync(path.join(packageDir, "package.json"), JSON.stringify({ scripts: {} }));
  }

  const result = runRunner([], repoRoot);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /missing expected test entrypoints/);
  assert.match(result.stderr, /test:backend/);
  assert.match(result.stderr, /missing script: test/);
  assert.doesNotMatch(result.stdout, /=== AI Lakehouse ingestion backend/);
});

test("runner rejects a nonexistent repository path with an actionable message", () => {
  const missingPath = path.join(os.tmpdir(), `qa-livestack-missing-${Date.now()}`);
  const result = runRunner(["--repo-root", missingPath]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Invalid LiveStack repository path/);
  assert.match(result.stderr, /existing directory/);
});

test("runner reports each package result and fails when child suites fail", (t) => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "qa-livestack-failure-"));
  const npmBin = fs.mkdtempSync(path.join(os.tmpdir(), "qa-livestack-npm-"));
  t.after(() => {
    fs.rmSync(repoRoot, { recursive: true, force: true });
    fs.rmSync(npmBin, { recursive: true, force: true });
  });

  for (const packagePath of [
    "ailakehouse/_deploy/ll-lakehouse/ingestion",
    "aidatabaseindustrylivestack/terraform-ready-livestack/finance/source/application",
  ]) {
    const packageDir = path.join(repoRoot, packagePath);
    fs.mkdirSync(packageDir, { recursive: true });
    fs.writeFileSync(path.join(packageDir, "package.json"), JSON.stringify({ scripts: { test: "node -e 0", "test:backend": "node -e 0" } }));
  }

  const isWindows = process.platform === "win32";
  const shim = path.join(npmBin, isWindows ? "npm.cmd" : "npm");
  fs.writeFileSync(shim, isWindows ? "@echo off\r\nexit /b 7\r\n" : "#!/bin/sh\nexit 7\n");
  if (!isWindows) fs.chmodSync(shim, 0o755);
  const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  const result = runRunner([], repoRoot, { [pathKey]: `${npmBin}${path.delimiter}${process.env[pathKey] ?? ""}` });

  assert.equal(result.status, 1);
  assert.match(result.stdout, /FAIL: AI Lakehouse ingestion backend/);
  assert.match(result.stdout, /FAIL: Finance LiveStack application/);
  assert.match(result.stdout, /Summary: 0\/2 package suites passed/);
});
