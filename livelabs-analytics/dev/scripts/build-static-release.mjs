#!/usr/bin/env node

import crypto from "node:crypto";
import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const outputFlag = args.indexOf("--output");
const replaceExisting = args.includes("--replace");
const stateFlag = args.indexOf('--dashboard-state');
if (stateFlag >= 0 && !args[stateFlag + 1]) throw new Error('--dashboard-state requires a reviewed public export.');
const stateInput = stateFlag >= 0 ? path.resolve(root, args[stateFlag + 1]) : null;
const includeFileFallback = args.includes("--include-file-fallback");

if (args.includes("--help") || args.includes("-h")) {
  console.log("Usage: node dev/scripts/build-static-release.mjs --output <directory> [--replace] [--include-file-fallback] [--dashboard-state <public-export.json>]");
  console.log("Builds in a sibling staging directory, verifies the manifest, then atomically promotes the result.");
  console.log("Existing output is preserved unless --replace is explicit; replacement keeps a dated previous directory.");
  process.exit(0);
}
if (outputFlag >= 0 && !args[outputFlag + 1]) throw new Error("--output requires a directory.");

const output = path.resolve(root, outputFlag >= 0 ? args[outputFlag + 1] : "dev/releases/local");
if (output === root) throw new Error("Release output must be a separate directory.");
if (fs.existsSync(output) && !replaceExisting) {
  throw new Error(`Release output already exists: ${output}. Use a new immutable path or pass --replace for a recoverable local replacement.`);
}

// Packaging must never regenerate reviewed source pages, data or fragments.
childProcess.execFileSync("python", [path.join(root, "dev/scripts/build-author-reports.py"), "--check"], {cwd: root, stdio: "inherit"});
childProcess.execFileSync("python", [path.join(root, "dev/scripts/build-page-entrypoints.py"), "--check"], { cwd: root, stdio: "inherit" });
childProcess.execFileSync(process.execPath, [path.join(root, "dev/scripts/build-public-inventory.mjs"), "--check"], { cwd: root, stdio: "inherit" });
const publicInventory = path.join(root, "inventory", "data", "public_portfolio_inventory.json");
const sourcePayload = JSON.parse(fs.readFileSync(path.join(root, "inventory/data/portfolio_inventory.json"), "utf8"));
const publicPayload = JSON.parse(fs.readFileSync(publicInventory, "utf8"));
const eligibility = JSON.parse(childProcess.execFileSync('python', [path.join(root, 'dev/scripts/dashboard_policy.py')], {encoding:'utf8'}));
const expectedKeys = eligibility.keys.sort();
const observedKeys = publicPayload.records.map(r => r.key).sort();
if (JSON.stringify(expectedKeys) !== JSON.stringify(observedKeys) || sourcePayload.metadata.snapshot_date !== publicPayload.metadata.snapshot_date) {
  throw new Error("Public projection does not match the source cohort and date; refresh and review data before packaging.");
}

const releaseInputs = [
  { source: "index.html", target: "index.html" },
  { source: "dashboard/index.html", target: "dashboard/index.html" },
  { source: "search/index.html", target: "search/index.html" },
  { source: "dev/config/.nojekyll", target: ".nojekyll" },
  { source: "dev/config/release-manifest.json", target: "release-manifest.json" },
  { source: "assets", target: "assets" },
  { source: "inventory/data/public_portfolio_inventory.json", target: "inventory/data/public_portfolio_inventory.json" },
  ...(includeFileFallback ? [{ source: "inventory/data/portfolio_inventory.file.js", target: "inventory/data/portfolio_inventory.file.js" }] : []),
];
const staging = `${output}.staging-${process.pid}-${Date.now()}`;

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function walkFiles(directory, base = directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(filePath, base));
    else files.push(path.relative(base, filePath).replaceAll(path.sep, "/"));
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function releaseFileEntries(directory) {
  return walkFiles(directory)
    .filter((relativePath) => relativePath !== "release-manifest.json")
    .map((relativePath) => {
      const filePath = path.join(directory, relativePath);
      return { relativePath, filePath };
    })
    .map(({ relativePath, filePath }) => ({
      path: relativePath,
      bytes: fs.statSync(filePath).size,
      sha256: sha256(filePath),
    }));
}

function verifyManifest(directory) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, "release-manifest.json"), "utf8"));
  const actual = releaseFileEntries(directory);
  const declared = manifest.release_files || [];
  if (actual.length !== declared.length) throw new Error(`Manifest file-count mismatch: ${declared.length} declared, ${actual.length} actual.`);
  for (let index = 0; index < actual.length; index += 1) {
    const expected = declared[index];
    const observed = actual[index];
    if (expected.path !== observed.path || expected.bytes !== observed.bytes || expected.sha256 !== observed.sha256) {
      throw new Error(`Manifest mismatch for ${observed.path || expected.path}.`);
    }
  }
  return manifest;
}

let previousOutput = null;
try {
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.mkdirSync(staging, { recursive: false });
  for (const { source: sourceRelativePath, target: targetRelativePath } of releaseInputs) {
    const source = path.join(root, sourceRelativePath);
    const target = path.join(staging, targetRelativePath);
    if (!fs.existsSync(source)) throw new Error(`Missing release input: ${sourceRelativePath}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(source, target, { recursive: true, filter: file => path.resolve(file) !== path.join(root, 'assets/data/dashboard-state.json') });
  }

  let stateEvidence = null;
  if (stateInput) {
    const state = JSON.parse(fs.readFileSync(stateInput, 'utf8'));
    const evidence = state.releaseEvidence;
    const overlay = state.qaReportMerge?.overlay;
    const publicIds = new Set(publicPayload.records.map(r => String(r.livelabsId)));
    if (!evidence || evidence.inventorySha256 !== sha256(publicInventory) || evidence.snapshotDate !== publicPayload.metadata.snapshot_date
      || evidence.scoreValidityVersion !== 2 || !overlay || !Object.keys(overlay).length
      || Object.entries(overlay).some(([id, item]) => !publicIds.has(id) || item.scoreValidityVersion !== 2
        || (item.scoreState !== 'scored' && item.jenkinsErrorScore !== null))) {
      throw new Error('Jenkins export is stale, outside the public cohort, or lacks current score validity. Re-export from the reviewed local service.');
    }
    fs.copyFileSync(stateInput, path.join(staging, 'assets/data/dashboard-state.json'));
    stateEvidence = evidence;
  }

  const manifestPath = path.join(staging, "release-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const inventoryData = JSON.parse(fs.readFileSync(path.join(staging, "inventory/data/public_portfolio_inventory.json"), "utf8"));
  manifest.data_snapshot = {
    ...(manifest.data_snapshot || {}),
    portfolio_inventory_generated_at: inventoryData.metadata?.generated_at || null,
    canonical_portfolio_payload: "inventory/data/public_portfolio_inventory.json",
    source_snapshot_date: inventoryData.metadata?.snapshot_date || null,
    ...Object.fromEntries(Object.entries(inventoryData.metadata?.data_freshness || {}).filter(([key]) => key.endsWith("snapshot_date"))),
  };
  const records = inventoryData.records || [];
  manifest.data_quality = {
    ...(manifest.data_quality || {}),
    record_count: records.length,
    source_record_count: inventoryData.metadata?.source_record_count || null,
    data_scope: inventoryData.metadata?.data_scope || "public_published",
    update_evidence_classified_records: records.filter(record => record.sourceFlags?.github_update_evidence_source).length,
    latest_github_update_records: records.filter(record => record.sourceFlags?.github_update_evidence_available).length,
    wms_metadata_fallback_records: records.filter(record => !record.sourceFlags?.github_update_evidence_available).length,
  };
  manifest.admin_service = { runtime: "separate authenticated service", entry_point: "/admin", dashboard_management_page: "/admin/dashboard-management", inventory_page: "/admin/inventory", full_inventory_in_static_bundle: false, included_in_static_bundle: false };
  manifest.file_url_fallback_included = includeFileFallback;
  manifest.jenkins_delivery = stateEvidence ? {mode: 'reviewed static projection', static_overlay_included: true, evidence: stateEvidence} : { mode: "live API required", static_overlay_included: false, note: "The saved Jenkins overlay is not part of this static package. Export a reviewed cohort-scoped snapshot or route the API through an authenticated service before promotion." };
  manifest.canonical_page = "dashboard/index.html";
  manifest.packaging_mutates_source = false;
  manifest.release_files = releaseFileEntries(staging);
  for (const file of manifest.release_files.filter(file => /\.(html|js|json|css)$/i.test(file.path))) {
    const text = fs.readFileSync(path.join(staging, file.path), "utf8");
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|https?:\/\/[^\s"<>]*objectstorage[^\s"<>]*\/p\/[A-Za-z0-9_-]{12,}\/|\bghp_[A-Za-z0-9]{30,}/i.test(text)) {
      throw new Error(`Access-bearing material found in ${file.path}; release was not promoted.`);
    }
  }
  const contentIdentity = crypto.createHash("sha256").update(JSON.stringify(manifest.release_files)).digest("hex").slice(0, 16);
  const version = String(manifest.bundle_version || "unversioned").replace(/[^a-z0-9._-]+/gi, "-");
  manifest.release_id = `${version}-${contentIdentity}`;
  manifest.release_built_at = new Date().toISOString();
  manifest.release_layout = {
    immutable_prefix: `releases/${manifest.release_id}/`,
    promotion_method: "change the approved gateway or stable route target; do not overwrite this prefix",
    rollback_method: "point the approved gateway or stable route at the previously validated release prefix",
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const verifiedManifest = verifyManifest(staging);

  if (fs.existsSync(output)) {
    const suffix = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    previousOutput = `${output}.previous-${suffix}`;
    fs.renameSync(output, previousOutput);
  }
  try {
    fs.renameSync(staging, output);
  } catch (error) {
    if (previousOutput && !fs.existsSync(output) && fs.existsSync(previousOutput)) fs.renameSync(previousOutput, output);
    throw error;
  }

  const totalBytes = verifiedManifest.release_files.reduce((total, file) => total + file.bytes, 0);
  console.log(`Static release written atomically to ${output}`);
  console.log(`Release ID: ${verifiedManifest.release_id}`);
  console.log(`${verifiedManifest.release_files.length} files, ${totalBytes} bytes`);
  if (previousOutput) console.log(`Previous output preserved at ${previousOutput}`);
} catch (error) {
  if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
  throw error;
}
