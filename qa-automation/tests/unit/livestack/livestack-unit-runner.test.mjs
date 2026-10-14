import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const FRAMEWORK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const RUNNER = path.join(FRAMEWORK_ROOT, "scripts", "livestack-unit.mjs");

function runRunner(args, repoRoot) {
  const env = { ...process.env };
  delete env.QA_LIVESTACK_ROOT;

  if (repoRoot) {
    env.QA_LIVESTACK_ROOT = repoRoot;
  }

  return spawnSync(process.execPath, [RUNNER, ...args], {
    cwd: FRAMEWORK_ROOT,
    env,
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
