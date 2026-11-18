import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { expectedTermsForText, parseCatalogShard, selectCatalogIndexItems } from "../../support/catalogIndexCore.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const CHECKER = path.join(ROOT, "scripts", "catalog-coverage.mjs");

function runChecker(indexPath, args = [], envOverrides = {}) {
  return spawnSync(process.execPath, [CHECKER, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, QA_CATALOG_INDEX_FILE: indexPath, ...envOverrides },
  });
}

test("coverage check reports indexed totals and selected denominator", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-catalog-coverage-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const indexPath = path.join(dir, "index.json");
  fs.writeFileSync(indexPath, JSON.stringify({ items: [
    { type: "workshop", id: "w-1" },
    { type: "livestack", id: "l-1" },
    { type: "livestack", id: "l-2" },
  ] }));

  const result = runChecker(indexPath, ["--type", "livestack", "--expected-count", "2"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /indexed 3 total \(1 workshops, 2 LiveStacks\); selected 2 livestack target/);
  assert.match(result.stdout, /Coverage status: COMPLETE/);
});

test("coverage check marks zero-target and expected-count mismatches incomplete", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-catalog-coverage-empty-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const indexPath = path.join(dir, "index.json");
  fs.writeFileSync(indexPath, JSON.stringify({ items: [{ type: "workshop", id: "w-1" }] }));

  const zero = runChecker(indexPath, ["--type", "livestack", "--require-nonzero"]);
  assert.equal(zero.status, 2);
  assert.match(zero.stderr, /INCOMPLETE.*selected 0 target/);

  const mismatch = runChecker(indexPath, ["--type", "workshop", "--expected-count", "13"]);
  assert.equal(mismatch.status, 2);
  assert.match(mismatch.stderr, /selected 1 target\(s\), expected 13/);
});

test("all-13 scope cannot pass until its 13 catalog IDs are reconciled", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-catalog-coverage-all-13-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const indexPath = path.join(dir, "index.json");
  fs.writeFileSync(indexPath, JSON.stringify({ items: Array.from({ length: 13 }, (_, i) => ({ type: "livestack", id: `l-${i + 1}` })) }));

  const result = runChecker(indexPath, ["--all-livestacks"]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /0\/13 LiveStack IDs/);
  assert.match(result.stderr, /12-versus-13 inventory/);
});

test("catalog selection normalizes IDs, types, shards, and limits", () => {
  const items = [
    { id: "w-1", slug: "first-workshop", type: "workshop" },
    { id: "l-1", slug: "first-stack", type: "livestack" },
    { id: "w-2", slug: "second-workshop", type: "workshop" },
    { id: "l-2", slug: "second-stack", type: "livestack" },
  ];

  assert.deepEqual(parseCatalogShard("2/2"), { current: 2, total: 2 });
  assert.deepEqual(
    selectCatalogIndexItems(items, { type: "livestack", shard: parseCatalogShard("2/2") }),
    [items[1], items[3]],
  );
  assert.deepEqual(
    selectCatalogIndexItems(items, { ids: ["second-stack"], limit: 1 }),
    [items[3]],
  );
  assert.throws(() => parseCatalogShard("3/2"), /out of range/);
  assert.throws(() => parseCatalogShard("two of four"), /current\/total/);
});

test("catalog title terms remove stop words and duplicates", () => {
  assert.deepEqual(expectedTermsForText("Build an Oracle LiveStack demo with Vector Search, vector search!"), ["Vector", "Search"]);
});
