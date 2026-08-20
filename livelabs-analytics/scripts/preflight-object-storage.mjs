#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function valueFor(flag, fallback = "") {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] || "" : fallback;
}

if (args.includes("--help") || args.includes("-h")) {
  console.log("Usage: node scripts/preflight-object-storage.mjs [--release <dir>] [--access-model internal-authenticated|redacted-public] [--recovery-manifest <file>] [--browser-evidence <file>] [--strict] [--report <file>]");
  process.exit(0);
}

const releaseRoot = path.resolve(projectRoot, valueFor("--release", "release"));
const strict = args.includes("--strict");
const recoveryManifestPath = valueFor("--recovery-manifest");
const browserEvidencePath = valueFor("--browser-evidence");
const reportPath = valueFor("--report");
const results = [];

function record(status, name, detail) {
  results.push({ status, name, detail });
}
const pass = (name, detail = "") => record("PASS", name, detail);
const warn = (name, detail = "") => record("WARN", name, detail);
const fail = (name, detail = "") => record("FAIL", name, detail);
const blockIfStrict = (name, detail) => strict ? fail(name, detail) : warn(name, detail);
const sha256 = (filePath) => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function walk(directory, base = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(filePath, base) : [path.relative(base, filePath).replaceAll(path.sep, "/")];
  }).sort((left, right) => left.localeCompare(right));
}

function verifyReleaseManifest(manifest) {
  const actualPaths = walk(releaseRoot).filter((file) => file !== "release-manifest.json");
  const declared = manifest.release_files || [];
  const declaredPaths = declared.map((file) => file.path);
  const missing = declaredPaths.filter((file) => !actualPaths.includes(file));
  const extra = actualPaths.filter((file) => !declaredPaths.includes(file));
  const mismatches = declared.filter((file) => {
    const filePath = path.join(releaseRoot, file.path);
    return !fs.existsSync(filePath) || fs.statSync(filePath).size !== file.bytes || sha256(filePath) !== file.sha256;
  }).map((file) => file.path);
  missing.length || extra.length || mismatches.length
    ? fail("release manifest integrity", `missing=${missing.length}, extra=${extra.length}, hash_or_size_mismatch=${mismatches.length}`)
    : pass("release manifest integrity", `${declared.length} declared files match exactly`);
}

function verifyRecoveryManifest(filePath) {
  if (!filePath) {
    blockIfStrict("source recovery evidence", "--recovery-manifest is required for promotion");
    return;
  }
  const absolutePath = path.resolve(projectRoot, filePath);
  try {
    const manifest = readJson(absolutePath);
    const base = path.dirname(absolutePath);
    const failures = (manifest.files || []).filter((file) => {
      const recovered = path.join(base, file.path);
      return !fs.existsSync(recovered) || fs.statSync(recovered).size !== file.bytes || sha256(recovered) !== file.sha256;
    });
    if (manifest.file_count !== manifest.files?.length || manifest.file_count !== 99 || failures.length || manifest.all_files_exact_from_git_head !== true) {
      fail("source recovery evidence", `declared=${manifest.file_count}, entries=${manifest.files?.length || 0}, mismatches=${failures.length}`);
    } else {
      pass("source recovery evidence", `${manifest.file_count} deleted tracked files have exact Git-HEAD recovery copies`);
    }
  } catch (error) {
    fail("source recovery evidence", error.message);
  }
}

function verifyBrowserEvidence(filePath) {
  if (!filePath) {
    blockIfStrict("browser regression evidence", "--browser-evidence is required for promotion");
    return;
  }
  try {
    const evidence = readJson(path.resolve(projectRoot, filePath));
    evidence.status === "passed" && Number(evidence.failedTests || 0) === 0
      ? pass("browser regression evidence", `${evidence.passedTests || "all"} tests passed`)
      : fail("browser regression evidence", `status=${evidence.status || "missing"}, failed=${evidence.failedTests ?? "unknown"}`);
  } catch (error) {
    fail("browser regression evidence", error.message);
  }
}

if (!fs.existsSync(releaseRoot)) throw new Error(`Release directory does not exist: ${releaseRoot}`);
const manifestPath = path.join(releaseRoot, "release-manifest.json");
if (!fs.existsSync(manifestPath)) throw new Error(`Release manifest does not exist: ${manifestPath}`);

const manifest = readJson(manifestPath);
verifyReleaseManifest(manifest);

const forbidden = ["admin", "admin.html", "login.html", "app", "api", "database", "dataset", "server", "ops", "health", "health.html", "_local", "docs", "README.md"];
const retainedForbidden = forbidden.filter((item) => fs.existsSync(path.join(releaseRoot, item)));
retainedForbidden.length
  ? fail("static-only boundary", `forbidden paths: ${retainedForbidden.join(", ")}`)
  : pass("static-only boundary", "backend, admin, database, documentation, and local-runtime paths are absent");

const inventoryPayload = readJson(path.join(releaseRoot, "data/portfolio_inventory.json"));
const generatedDates = [
  manifest.data_snapshot?.portfolio_inventory_generated_at,
  inventoryPayload.metadata?.generated_at,
];
new Set(generatedDates.filter(Boolean)).size === 1 && generatedDates.every(Boolean)
  ? pass("canonical portfolio snapshot consistency", generatedDates[0])
  : fail("canonical portfolio snapshot consistency", generatedDates.join(" | "));

const snapshotDates = [manifest.data_snapshot?.source_snapshot_date, inventoryPayload.metadata?.snapshot_date];
new Set(snapshotDates.filter(Boolean)).size === 1 && snapshotDates.every(Boolean)
  ? pass("source snapshot-date consistency", snapshotDates[0])
  : fail("source snapshot-date consistency", snapshotDates.join(" | "));

const html = fs.readFileSync(path.join(releaseRoot, "index.html"), "utf8");
const stylesheetPath = path.join(releaseRoot, "assets/css/dashboard.css");
const stylesheet = fs.readFileSync(stylesheetPath, "utf8");
const dashboardSourceBundle = [
  html,
  stylesheet,
  "assets/js/dashboard.js",
]
  .map((value, index) => index < 2 ? value : fs.readFileSync(path.join(releaseRoot, value), "utf8"))
  .join("\n");
const stylesheetRefs = [...stylesheet.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)]
  .map((match) => match[2].split(/[?#]/)[0])
  .filter((ref) => !/^(?:data:|https?:|\/)/i.test(ref));
const missingStylesheetRefs = [...new Set(stylesheetRefs)]
  .filter((ref) => !fs.existsSync(path.resolve(path.dirname(stylesheetPath), ref)));
missingStylesheetRefs.length
  ? fail("stylesheet asset resolution", `missing: ${missingStylesheetRefs.join(", ")}`)
  : pass("stylesheet asset resolution", `${new Set(stylesheetRefs).size} font and image reference(s) resolve`);
const requiredUiMarkers = [
  '<section class="metric-band" aria-label="Dashboard summary">',
  "<span>Governance</span>",
  "<span>Demand</span>",
  "<span>Retirement</span>",
  'class="skip-link"',
  'role="status"',
  'aria-live="polite"',
  '@media (prefers-reduced-motion: reduce)',
  'http-equiv="Content-Security-Policy"',
];
const missingUiMarkers = requiredUiMarkers.filter((marker) => !dashboardSourceBundle.includes(marker));
missingUiMarkers.length ? fail("approved UI and accessibility contract", `missing: ${missingUiMarkers.join(", ")}`) : pass("approved UI and accessibility contract", "required component and accessibility markers present");

const snapshotLabels = [...html.matchAll(/Data snapshot:[^<]*/g)].map((match) => match[0].trim());
snapshotLabels.length === 1 ? pass("single visible snapshot label", snapshotLabels[0]) : fail("single visible snapshot label", `${snapshotLabels.length} labels found`);

const tableIds = [
  "top-performer-top-100-workshops",
  "top-performer-top-100-sprints",
  "at-risk-top-100-workshops",
  "at-risk-top-100-sprints",
  "retire-now-top-100-workshops",
  "retire-now-top-100-sprints",
  "replacement-recommendations",
  "disabled-workshops",
  "disabled-sprints",
];
const emptyTables = tableIds.filter((id) => {
  const table = html.match(new RegExp(`<table[^>]*\\bid="${id}"[\\s\\S]*?<\\/table>`, "i"))?.[0] || "";
  return !/data-filter-row="true"/i.test(table);
});
emptyTables.length ? fail("governance table population", `empty: ${emptyTables.join(", ")}`) : pass("governance table population", `${tableIds.length} required table families contain rows`);

const duplicateCutHeadings = [...html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)]
  .map((match) => match[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim())
  .filter((heading) => /\bTop (10|50|100)\b/i.test(heading));
duplicateCutHeadings.length
  ? fail("single paginated-table architecture", `separate cut headings found: ${duplicateCutHeadings.join(" | ")}`)
  : pass("single paginated-table architecture", "no separate Top 10, Top 50, or Top 100 panels found");

const hasOracleContacts = /[A-Z0-9._%+-]+@oracle\.com/i.test(html)
  || /[A-Z0-9._%+-]+@oracle\.com/i.test(JSON.stringify(inventoryPayload));
const accessModel = valueFor("--access-model", manifest.delivery?.access_model || "");
if (hasOracleContacts && accessModel !== "internal-authenticated") {
  fail("contact-data access model", `Oracle contact data requires internal-authenticated delivery, received ${accessModel || "none"}`);
} else if (!hasOracleContacts && accessModel === "redacted-public") {
  pass("contact-data access model", "redacted-public bundle contains no Oracle contact email");
} else {
  pass("contact-data access model", accessModel);
}

for (const [gate, value] of Object.entries(manifest.promotion_gates || {})) {
  if (gate.endsWith("_verified") && value !== true) blockIfStrict(`promotion gate: ${gate}`, "not verified in release manifest");
}

verifyRecoveryManifest(recoveryManifestPath);
verifyBrowserEvidence(browserEvidencePath);

const failures = results.filter((result) => result.status === "FAIL");
const warnings = results.filter((result) => result.status === "WARN");
const report = {
  format: "livelabs-analytics-object-storage-preflight-v1",
  generated_at: new Date().toISOString(),
  release_root: releaseRoot,
  release_id: manifest.release_id || null,
  strict,
  access_model: accessModel,
  status: failures.length ? "failed" : warnings.length ? "passed_with_warnings" : "passed",
  summary: { passed: results.length - warnings.length - failures.length, warnings: warnings.length, failures: failures.length },
  required_object_metadata: {
    html: { content_type: "text/html; charset=utf-8", cache_control: "no-cache, must-revalidate" },
    json: { content_type: "application/json; charset=utf-8", cache_control: "no-cache, must-revalidate" },
    versioned_assets: { cache_control: "public, max-age=31536000, immutable" },
  },
  results,
};

for (const result of results) console.log(`${result.status} ${result.name}${result.detail ? ` - ${result.detail}` : ""}`);
console.log(`\nSummary: ${report.summary.passed} passed, ${report.summary.warnings} warning(s), ${report.summary.failures} failure(s).`);
if (reportPath) {
  const absoluteReportPath = path.resolve(projectRoot, reportPath);
  fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true });
  fs.writeFileSync(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Report: ${absoluteReportPath}`);
}
if (failures.length) process.exitCode = 1;
