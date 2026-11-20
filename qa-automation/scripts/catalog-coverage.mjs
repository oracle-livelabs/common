#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_INDEX = path.join(ROOT, "tests", "data", "generated", "livelabs_catalog_index.json");
const TARGET_MANIFEST = path.join(ROOT, "tests", "data", "livestack-coverage-targets.json");

const { values } = parseArgs({
  options: {
    type: { type: "string", default: "all" },
    "expected-count": { type: "string" },
    "require-nonzero": { type: "boolean", default: false },
    "all-livestacks": { type: "boolean", default: false },
  },
  strict: true,
});

if (!["all", "workshop", "livestack"].includes(values.type)) {
  console.error(`Unsupported --type: ${values.type}. Use all, workshop, or livestack.`);
  process.exit(2);
}

const indexPathInput = process.env.QA_CATALOG_INDEX_FILE?.trim();
const indexPath = indexPathInput
  ? path.isAbsolute(indexPathInput) ? indexPathInput : path.resolve(ROOT, indexPathInput)
  : DEFAULT_INDEX;

if (!fs.existsSync(indexPath)) {
  console.error(`Coverage status: INCOMPLETE - catalog index is missing: ${indexPath}`);
  console.error('Generate it with "npm run catalog:index" before running generated suites.');
  process.exit(2);
}

let index;
try {
  index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
} catch (error) {
  console.error(`Coverage status: INCOMPLETE - cannot parse catalog index: ${error.message}`);
  process.exit(2);
}
if (!Array.isArray(index.items)) {
  console.error("Coverage status: INCOMPLETE - catalog index has no items array.");
  process.exit(2);
}

const indexed = {
  workshop: index.items.filter((item) => item?.type === "workshop").length,
  livestack: index.items.filter((item) => item?.type === "livestack").length,
};
let items = values.type === "all" ? index.items : index.items.filter((item) => item?.type === values.type);
const ids = (process.env.QA_CATALOG_INDEX_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
if (ids.length) items = items.filter((item) => ids.includes(item.id) || ids.includes(item.slug));
const shardRaw = process.env.QA_CATALOG_INDEX_SHARD?.trim();
if (shardRaw) {
  const match = shardRaw.match(/^(\d+)\/(\d+)$/);
  const current = Number(match?.[1]);
  const total = Number(match?.[2]);
  if (!match || total < 1 || current < 1 || current > total) {
    console.error(`Coverage status: INCOMPLETE - invalid QA_CATALOG_INDEX_SHARD: ${shardRaw}`);
    process.exit(2);
  }
  items = items.filter((_, position) => position % total === current - 1);
}
const limit = Number.parseInt(process.env.QA_CATALOG_INDEX_LIMIT ?? "0", 10);
if (Number.isFinite(limit) && limit > 0) items = items.slice(0, limit);

let expectedCount = values["expected-count"] === undefined ? undefined : Number(values["expected-count"]);
let requiredIds;
if (values["all-livestacks"]) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(TARGET_MANIFEST, "utf8"));
  } catch {
    console.error(`Coverage status: INCOMPLETE - cannot read target manifest: ${TARGET_MANIFEST}`);
    process.exit(2);
  }
  expectedCount = Number(manifest.expected_count);
  requiredIds = Array.isArray(manifest.target_ids) ? manifest.target_ids : [];
  if (requiredIds.length !== expectedCount) {
    console.error(`Coverage status: INCOMPLETE - target manifest has ${requiredIds.length}/${expectedCount} LiveStack IDs; reconcile the LDA-1850 12-versus-13 inventory before claiming all-13 coverage.`);
    process.exit(2);
  }
  if (process.env.QA_CATALOG_INDEX_IDS?.trim() || process.env.QA_CATALOG_INDEX_SHARD?.trim() || Number(process.env.QA_CATALOG_INDEX_LIMIT || 0) > 0) {
    console.error("Coverage status: INCOMPLETE - all-13 scope cannot run with catalog ID, shard, or limit filters enabled.");
    process.exit(2);
  }
  if (indexed.livestack !== expectedCount) {
    console.error(`Coverage status: INCOMPLETE - the full index has ${indexed.livestack}/${expectedCount} LiveStacks; expected the reconciled all-13 catalog scope.`);
    process.exit(2);
  }
  items = index.items.filter((item) => item?.type === "livestack" && requiredIds.includes(item.id));
  const foundIds = new Set(items.map((item) => item.id));
  const missingIds = requiredIds.filter((id) => !foundIds.has(id));
  if (missingIds.length) {
    console.error(`Coverage status: INCOMPLETE - catalog index contains ${foundIds.size}/${expectedCount} required LiveStacks; missing IDs: ${missingIds.join(", ")}`);
    process.exit(2);
  }
}

const selected = items.length;
console.log(`Catalog coverage: indexed ${index.items.length} total (${indexed.workshop} workshops, ${indexed.livestack} LiveStacks); selected ${selected} ${values.type} target(s) for this run.`);
if (expectedCount !== undefined && (!Number.isInteger(expectedCount) || expectedCount < 0)) {
  console.error("Coverage status: INCOMPLETE - --expected-count must be a non-negative integer.");
  process.exit(2);
}
if ((values["require-nonzero"] && selected === 0) || (expectedCount !== undefined && selected !== expectedCount)) {
  console.error(`Coverage status: INCOMPLETE - selected ${selected} target(s), expected ${expectedCount ?? "at least 1"}.`);
  process.exit(2);
}
console.log(expectedCount === undefined ? "Coverage status: COMPLETE for the selected catalog-index scope (no claim about unindexed targets)." : `Coverage status: COMPLETE for the declared ${expectedCount}-target scope.`);
