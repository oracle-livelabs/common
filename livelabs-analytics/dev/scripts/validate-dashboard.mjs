#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const configDir = path.join(root, "dev", "config");
const inventoryDataDir = path.join(root, "inventory", "data");
const defaultBaseUrl = "http://127.0.0.1:4175";
const baseUrl = process.env.DASHBOARD_URL || defaultBaseUrl;
const results = [];

function pass(name, detail = "") {
  results.push({ status: "PASS", name, detail });
}

function fail(name, detail = "") {
  results.push({ status: "FAIL", name, detail });
}

function warn(name, detail = "") {
  results.push({ status: "WARN", name, detail });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function rowsFromJson(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.items)) return value.items;
  return null;
}

function numberValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function loadRowFiles() {
  const jsonFiles = fs.readdirSync(inventoryDataDir).filter((file) => file.endsWith(".json")).sort();
  const rowFiles = new Map();
  for (const file of jsonFiles) {
    const value = readJson(path.join(inventoryDataDir, file));
    const rows = rowsFromJson(value);
    if (rows) rowFiles.set(file, rows);
  }
  return { jsonFiles, rowFiles };
}

function readDashboardSourceBundle() {
  const fragmentDirectory = path.join(root, "assets", "fragments");
  const fragmentFiles = fs.existsSync(fragmentDirectory)
    ? fs.readdirSync(fragmentDirectory).filter((file) => file.endsWith(".html")).sort().map((file) => path.join("assets", "fragments", file))
    : [];
  return [
    "index.html",
    "assets/css/dashboard.css",
    "assets/js/dashboard.js",
    ...fragmentFiles,
  ]
    .filter((file) => fs.existsSync(path.join(root, file)))
    .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
    .join("\n");
}

function checkDashboardScripts() {
  for (const file of ["index.html", "dashboard/index.html", "search/index.html"]) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
    const externalScripts = [...html.matchAll(/<script[^>]*\bsrc="([^"]+)"[^>]*><\/script>/gi)]
      .map((match) => match[1].split(/[?#]/)[0])
      .filter((source) => !/^(?:https?:|data:|javascript:)/i.test(source));
    inlineScripts.forEach((script, index) => new vm.Script(script, { filename: `${file}:script${index}` }));
    externalScripts.forEach((source) => {
      const baseHref = html.match(/<base\s+href="([^"]+)"/i)?.[1] || './';
      const sourcePath = path.resolve(path.dirname(path.join(root, file)), baseHref, source);
      new vm.Script(fs.readFileSync(sourcePath, "utf8"), { filename: source });
    });
    pass(`${file} scripts parse`, `${inlineScripts.length} inline and ${externalScripts.length} external script(s)`);
  }
  new vm.Script(fs.readFileSync(path.join(root, "dev/admin/inventory.js"), "utf8"), { filename: "dev/admin/inventory.js" });
  pass("Admin Inventory script parse", "protected inventory page script parses");
}

function checkInventoryPageContract() {
  const filePath = path.join(root, "dev/admin/inventory.html");
  const html = fs.readFileSync(filePath, "utf8");
  const script = fs.readFileSync(path.join(root, "dev/admin/inventory.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "dev/scripts/admin-server.py"), "utf8");
  const required = ["/admin-assets/inventory.js", 'id="inventory-jenkins-priority"', "Jenkins Error Score", 'id="count-public"', 'id="count-disabled"'];
  const missing = required.filter((marker) => !html.includes(marker));
  const scriptMarkers = ["/api/admin/inventory", "/api/admin/qa-overlay", "jenkinsState(record)", "Outside Jenkins public scan scope"];
  const missingScript = scriptMarkers.filter((marker) => !script.includes(marker));
  const authRoute = server.includes("'/admin/inventory': 'inventory.html'") && server.includes("if path == '/api/admin/inventory':") && /session = self\.session\(\)[\s\S]*?if not session:[\s\S]*?return self\.send\(401/.test(server);
  if (missing.length || missingScript.length || !authRoute) {
    fail("Admin Inventory contract", `page=${missing.join(", ") || "ok"}; script=${missingScript.join(", ") || "ok"}; authenticated route=${authRoute}`);
  } else {
    pass("Admin Inventory contract", "full inventory is behind the Admin session and includes Jenkins state and priority filtering");
  }
}

function checkInternalContactData() {
  const emailPattern = /[A-Z0-9._%+-]+@oracle\.com/i;
  const redactionLabel = "Contact withheld from public bundle";
  const sources = new Map([
    ["dashboard source bundle", readDashboardSourceBundle()],
    ["inventory/data/portfolio_inventory.json", fs.readFileSync(path.join(root, "inventory/data/portfolio_inventory.json"), "utf8")],
  ]);
  const missing = [...sources].filter(([, value]) => !emailPattern.test(value)).map(([name]) => name);
  const redacted = [...sources].filter(([, value]) => value.includes(redactionLabel)).map(([name]) => name);
  missing.length || redacted.length
    ? fail("internal contact-data boundary", `missing Oracle email or redaction marker remains in: ${[...missing, ...redacted].join(", ")}`)
    : pass("internal contact-data boundary", "internal Oracle contact emails are present in hosted dashboard assets and JSON");
}

function checkUpdateEvidenceAndNaContracts() {
  const html = readDashboardSourceBundle();
  if (/Not available/i.test(html)) {
    fail("N/A display contract", "index.html still contains a Not available sentinel");
  } else if (!html.includes("N/A")) {
    fail("N/A display contract", "index.html does not contain the compact N/A fallback");
  } else {
    pass("N/A display contract", "user-facing unavailable-value fallbacks use N/A");
  }

  const inventoryPath = path.join(root, "inventory", "data", "portfolio_inventory.json");
  const inventoryText = fs.readFileSync(inventoryPath, "utf8");
  const inventory = JSON.parse(inventoryText);
  const search = inventory;
  const detailValue = (record, label) => new Map(record.details || []).get(label) || "";
  const updateEvidenceCount = (search.records || []).filter((record) => detailValue(record, "Update Evidence")).length;
  const latestGithubCount = (search.records || []).filter((record) => detailValue(record, "Latest GitHub Update")).length;
  const metadata = search.metadata?.workshop_updates || {};
  const sourceCount = Object.values(metadata.source_counts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const machinePathLeak = /[A-Z]:\\Users\\/i.test(inventoryText);

  if (
    updateEvidenceCount !== search.records.length
    || Number(metadata.matched_records || 0) + Number(metadata.unmatched_wms_records || 0) !== search.records.length
    || sourceCount !== search.records.length
  ) {
    fail(
      "Update evidence coverage",
      `${updateEvidenceCount}/${search.records.length} details; ${metadata.matched_records || 0} metadata matches; ${sourceCount} classified sources`,
    );
  } else {
    pass("Update evidence coverage", `${updateEvidenceCount}/${search.records.length} records classified`);
  }
  if (latestGithubCount !== metadata.meaningful_git_update_records) {
    fail("Latest GitHub update coverage", `${latestGithubCount} details vs ${metadata.meaningful_git_update_records || 0} metadata rows`);
  } else {
    pass("Latest GitHub update coverage", `${latestGithubCount} evidence-backed dates; ${metadata.wms_metadata_fallback_records || 0} explicit WMS fallbacks`);
  }
  pass("Admin inventory source coverage", `${search.records.length} full-scope records remain available through the protected Admin inventory API`);
  machinePathLeak
    ? fail("Portable data metadata", "machine-local Windows path found in static JSON")
    : pass("Portable data metadata", "static JSON excludes machine-local source paths");
}

function checkCopyInteractionContracts() {
  const html = readDashboardSourceBundle();
  const requiredMarkers = [
    ".copy-value-target",
    "copyableTableFields",
    '["current item", "Workshop/Sprint Title"]',
    '["owner email", "Author Email"]',
    '["current wms id", "WMS ID"]',
    '["current livelabs id", "LiveLabs ID"]',
    "function searchDetailReportRows",
    "function exportSearchDetailCsv",
    "data-export-search-csv",
    "function decorateDashboardCopyTargets",
    "function decorateDetailCopyTargets",
    "function copyValueFromButton",
    "button[data-copy-value]",
    "event.stopPropagation()",
    "copyableValueHtml(record.title",
    "copyableValueHtml(record.wmsId",
    "copyableValueHtml(record.livelabsId",
    "copyableValueHtml(contact"
  ];
  const missing = requiredMarkers.filter((marker) => !html.includes(marker));
  missing.length
    ? fail("copy interaction contract", `missing: ${missing.join(", ")}`)
    : pass("copy interaction contract", "ranked dashboard tables and item details provide copy controls");

  const hoverFocusMarkers = [
    ".copy-value-target:hover .copy-value-button",
    ".copy-value-target:focus-within .copy-value-button",
    ".search-copy-target:hover > .copy-value-button",
    ".search-copy-target:focus-within > .copy-value-button"
  ];
  const forcedVisibilityMarkers = [
    ".search-view .copy-value-button",
    "body.dashboard-inventory-active .copy-value-button"
  ];
  const missingHoverFocus = hoverFocusMarkers.filter((marker) => !html.includes(marker));
  const forcedVisibility = forcedVisibilityMarkers.filter((marker) => html.includes(marker));
  missingHoverFocus.length || forcedVisibility.length
    ? fail("copy interaction visibility", `missing hover/focus markers: ${missingHoverFocus.join(", ") || "none"}; forced-visible markers: ${forcedVisibility.join(", ") || "none"}`)
    : pass("copy interaction visibility", "table and detail-page Copy controls appear on hover or keyboard focus");

  const dashboardTableIds = [
    "top-performers-table", "at-risk-table", "retirement-review-table"
  ];
  const targetLabels = new Set([
    "title",
    "current item",
    "author email",
    "owner email",
    "wms id",
    "current wms id",
    "livelabs id",
    "current livelabs id"
  ]);
  const uncoveredTables = [];
  const coverage = [];
  for (const tableId of dashboardTableIds) {
    const table = html.match(new RegExp(`<table[^>]*\\bid="${tableId}"[\\s\\S]*?<\\/table>`, "i"))?.[0] || "";
    const head = table.match(/<thead[\s\S]*?<\/thead>/i)?.[0] || "";
    const labels = [...head.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)]
      .map((match) => normalizeText(match[1].replace(/<[^>]*>/g, " ")))
      .filter((label) => targetLabels.has(label));
    coverage.push(`${tableId}=${labels.length}`);
    if (!table || !labels.length) uncoveredTables.push(tableId);
  }
  uncoveredTables.length
    ? fail("dashboard table copy coverage", `uncovered tables: ${uncoveredTables.join(", ")}`)
    : pass("dashboard table copy coverage", `all ${dashboardTableIds.length} dashboard table families have copyable identity columns (${coverage.join(", ")})`);

  const malformed = [];
  for (const file of ["inventory/data/portfolio_inventory.json"]) {
    const payload = readJson(path.join(root, file));
    for (const record of payload.records || []) {
      for (const entries of [record.values, record.details]) {
        for (const pair of entries || []) {
          if (!Array.isArray(pair) || typeof pair[1] !== "string") continue;
          if (!/email|contact|team|author|manager/i.test(String(pair[0]))) continue;
          if (/(^\s*,)|(,\s*$)|,\s*,/.test(pair[1])) malformed.push(`${file}:${record.livelabsId || "unknown"}:${pair[0]}`);
        }
      }
    }
  }
  malformed.length
    ? fail("contact enumeration formatting", `${malformed.length} malformed contact value(s), first: ${malformed[0]}`)
    : pass("contact enumeration formatting", "contact lists have no leading, trailing, or repeated separators");
}

function checkIdentityDataContract() {
  const files = ["inventory/data/portfolio_inventory.json"];
  const profiles = files.map((file) => {
    const payload = readJson(path.join(root, file));
    const records = payload.records || payload.items || [];
    const idCounts = new Map();
    const keyCounts = new Map();
    const wmsOnlyCounts = new Map();
    const coverage = { both: 0, livelabsOnly: 0, wmsOnly: 0, neither: 0 };
    for (const record of records) {
      const id = String(record.livelabsId ?? "").trim();
      const wmsId = String(record.wmsId ?? "").trim();
      const key = String(record.key ?? "").trim();
      if (id) idCounts.set(id, (idCounts.get(id) || 0) + 1);
      if (key) keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
      if (id && wmsId) coverage.both += 1;
      else if (id) coverage.livelabsOnly += 1;
      else if (wmsId) {
        coverage.wmsOnly += 1;
        wmsOnlyCounts.set(wmsId, (wmsOnlyCounts.get(wmsId) || 0) + 1);
      } else coverage.neither += 1;
    }
    return {
      file,
      payload,
      records,
      coverage,
      duplicateIds: [...idCounts.values()].filter((count) => count > 1).length,
      duplicateKeys: [...keyCounts.values()].filter((count) => count > 1).length,
      ambiguousWmsOnly: [...wmsOnlyCounts.values()].filter((count) => count > 1).length,
      missingKeys: records.filter((record) => !String(record.key ?? "").trim()).length
    };
  });
  const failures = profiles.flatMap(({ file, payload, records, duplicateIds, duplicateKeys, ambiguousWmsOnly, missingKeys }) => {
    const missingFlags = records.filter((record) => typeof record.titleMissing !== "boolean" || typeof record.wmsIdMissing !== "boolean" || typeof record.livelabsIdMissing !== "boolean");
    const reviewRows = records.filter((record) => record.contentReviewState === "Content to review/remove");
    const missing = records.filter((record) => record.titleMissing || record.wmsIdMissing || record.livelabsIdMissing);
    const syntheticTitles = records.filter((record) => String(record.title || "").startsWith("Missing title -"));
    const declaredReviewCount = Number(payload.metadata?.content_review_count ?? -1);
    const result = [];
    if (duplicateIds) result.push(`${file}: duplicate livelabsId groups=${duplicateIds}`);
    if (duplicateKeys) result.push(`${file}: duplicate record-key groups=${duplicateKeys}`);
    if (ambiguousWmsOnly) result.push(`${file}: ambiguous WMS-only identity groups=${ambiguousWmsOnly}`);
    if (missingKeys) result.push(`${file}: records missing deterministic keys=${missingKeys}`);
    if (missingFlags.length) result.push(`${file}: missing identity flags=${missingFlags.length}`);
    if (missing.length !== reviewRows.length) result.push(`${file}: missing rows ${missing.length} != review rows ${reviewRows.length}`);
    if (syntheticTitles.length) result.push(`${file}: synthetic missing titles=${syntheticTitles.length}`);
    if (declaredReviewCount !== reviewRows.length) result.push(`${file}: metadata review count ${declaredReviewCount} != ${reviewRows.length}`);
    return result;
  });
  if (failures.length) {
    fail("identity and review-data contract", failures.join("; "));
  } else {
    const portfolio = profiles.find(({ file }) => file.endsWith("portfolio_inventory.json"));
    const coverage = portfolio?.coverage || {};
    pass("identity and review-data contract", `unique LiveLabs IDs and record keys; both=${coverage.both || 0}, LiveLabs-only=${coverage.livelabsOnly || 0}, WMS-only=${coverage.wmsOnly || 0}, neither=${coverage.neither || 0}`);
  }
}

function checkEmbeddedDashboardOutputs() {
  const html = readDashboardSourceBundle();
  const tableIds = [
    "top-performers-table", "at-risk-table", "retirement-review-table"
  ];
  const empty = [];
  for (const id of tableIds) {
    const table = html.match(new RegExp(`<table[^>]*\\bid="${id}"[\\s\\S]*?<\\/table>`, "i"))?.[0] || "";
    const body = table.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] || "";
    if (!body || !/<tr\b/i.test(body)) empty.push(id);
  }
  empty.length ? fail("embedded dashboard outputs", `empty required tables: ${empty.join(", ")}`) : pass("embedded dashboard outputs", `${tableIds.length} governance tables contain rows`);
}

function checkReleaseManifest() {
  const filePath = path.join(configDir, "release-manifest.json");
  try {
    const manifest = readJson(filePath);
    const contactPolicy = manifest.internal_data_policy || manifest.public_data_policy;
    const required = [
      manifest.bundle_name,
      manifest.runtime,
      manifest.identity?.record_key,
      manifest.identity?.family_key,
      contactPolicy?.contact_email_values,
      manifest.delivery?.access_model,
    ];
    required.every(Boolean) ? pass("release manifest", "bundle identity, runtime, and internal contact policy present") : fail("release manifest", "required release fields missing");
  } catch (error) {
    fail("release manifest", error.message);
  }
}

function checkAccessibilityAndSecurityContracts() {
  const html = readDashboardSourceBundle();
  const requiredMarkers = [
    '<meta name="description"',
    'http-equiv="Content-Security-Policy"',
    'class="skip-link"',
    'href="#dashboard-top"',
    'role="status"',
    'aria-live="polite"',
    'id="copy-status"',
    '@media (prefers-reduced-motion: reduce)',
  ];
  const missing = requiredMarkers.filter((marker) => !html.includes(marker));
  missing.length
    ? fail("accessibility and browser-security contract", `missing: ${missing.join(", ")}`)
    : pass("accessibility and browser-security contract", "skip navigation, live status, reduced motion, description, and CSP markers present");
}

function checkBundleSize() {
  const limits = [["index.html", 8 * 1024 * 1024], ["inventory/data/portfolio_inventory.json", 20 * 1024 * 1024]];
  const oversized = limits.filter(([file, limit]) => fs.statSync(path.join(root, file)).size > limit).map(([file]) => file);
  oversized.length ? fail("bundle size budget", `oversized: ${oversized.join(", ")}`) : pass("bundle size budget", "dashboard and retained data are within static release limits");
}

function checkHtmlReferences() {
  for (const file of ["index.html", "dashboard/index.html", "search/index.html"]) {
    const filePath = path.join(root, file);
    const fileDir = path.dirname(filePath);
    const html = fs.readFileSync(filePath, "utf8");
    const baseHref = html.match(/<base\s+href="([^"]+)"/i)?.[1] || './';
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const refs = [...html.matchAll(/(?:href|src)="(?!https?:|mailto:|#|data:|javascript:)([^"]+)"/g)]
      .map((match) => match[1].split(/[?#]/)[0])
      .filter((ref) => !["/dashboard/", "/search/"].includes(ref))
      .filter((ref) => ref !== "./admin/")
      .filter(Boolean);
    const missing = [...new Set(refs)].filter((ref) => !fs.existsSync(ref.startsWith("/") ? path.resolve(root, ref.slice(1)) : path.resolve(fileDir, baseHref, ref)));
    const hasFavicon = /<link[^>]+rel="icon"/i.test(html);

    if (duplicates.length) fail(`${file} duplicate ids`, duplicates.slice(0, 5).join(", "));
    else pass(`${file} duplicate ids`, "none");

    if (missing.length) fail(`${file} local references`, `missing: ${missing.slice(0, 5).join(", ")}`);
    else pass(`${file} local references`, `${new Set(refs).size} local reference(s) found`);

    if (hasFavicon) pass(`${file} favicon link`, "present");
    else fail(`${file} favicon link`, "missing");
  }
}

function checkStylesheetReferences() {
  const stylesheets = ["assets/css/dashboard.css"];
  for (const file of stylesheets) {
    const filePath = path.join(root, file);
    const css = fs.readFileSync(filePath, "utf8");
    const refs = [...css.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)]
      .map((match) => match[2].split(/[?#]/)[0])
      .filter((ref) => !/^(?:data:|https?:|\/)/i.test(ref));
    const missing = [...new Set(refs)].filter((ref) => !fs.existsSync(path.resolve(path.dirname(filePath), ref)));
    missing.length
      ? fail(`${file} local references`, `missing: ${missing.join(", ")}`)
      : pass(`${file} local references`, `${new Set(refs).size} CSS asset reference(s) resolve`);
  }
}

function checkStaticBoundary() {
  const requiredFiles = [
    "index.html",
    "dashboard/index.html",
    "search/index.html",
    "assets/css/dashboard.css",
    "assets/js/dashboard.js",
    "assets/fonts/OracleSans_Rg.ttf",
    "assets/fonts/OracleSans_SBd.ttf",
    "assets/fonts/OracleSans_Bd.ttf",
    "assets/images/oracle-logo-white.svg",
    "assets/images/livelabs-logo-white.svg",
    "assets/images/ill-abst-000109-16x9.png",
    "assets/images/color-strip.png",
    "assets/fragments/top-performers.html",
    "assets/fragments/at-risk-content.html",
    "assets/fragments/retire-now-content.html",
    "inventory/data/public_portfolio_inventory.json",
    "inventory/data/portfolio_inventory.file.js",
    "dev/config/.nojekyll",
    "dev/config/release-manifest.json"
  ];
  const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
  missing.length ? fail("static bundle required files", `missing: ${missing.join(", ")}`) : pass("static bundle required files", `${requiredFiles.length} required paths present`);

  const forbiddenPaths = ["admin", "admin.html", "login.html", "app", "api", "database", "dataset", "server", "ops", "health", "health.html", "_local", "docs", "README.md"];
  const retainedForbidden = forbiddenPaths.filter((file) => fs.existsSync(path.join(root, file)));
  retainedForbidden.length ? fail("static-only boundary", `forbidden paths present: ${retainedForbidden.join(", ")}`) : pass("static-only boundary", "admin, backend, database, dataset, and local runtime paths absent");

  const requiredData = ["inventory/data/public_portfolio_inventory.json"];
  for (const file of requiredData) {
    try {
      const value = readJson(path.join(root, file));
      if (!Array.isArray(value.records)) fail(`${file} contract`, "records array missing");
      else if (value.metadata?.data_scope !== "public_published") fail(`${file} contract`, "public/published scope marker missing");
      else pass(`${file} contract`, "JSON parses and required array is present");
    } catch (error) {
      fail(`${file} contract`, error.message);
    }
  }

  const canonicalInventory = readJson(path.join(root, "inventory", "data", "public_portfolio_inventory.json"));
  const fileFallbackPath = path.join(root, "inventory", "data", "portfolio_inventory.file.js");
  try {
    const fallbackText = fs.readFileSync(fileFallbackPath, "utf8");
    const match = fallbackText.match(/globalThis\.__livelabsPortfolioInventoryPayload\s*=\s*([\s\S]+);\s*$/);
    if (!match) throw new Error("payload assignment is missing");
    const fallbackPayload = JSON.parse(match[1]);
    if (fallbackPayload.metadata?.generated_at !== canonicalInventory.metadata?.generated_at || fallbackPayload.records?.length !== canonicalInventory.records?.length || fallbackPayload.metadata?.data_scope !== "public_published") {
      throw new Error("generated metadata, public scope, or record count differs from the public JSON projection");
    }
    pass("file-safe Dashboard payload", `${fallbackPayload.records.length} public/published records match JSON metadata`);
  } catch (error) {
    fail("file-safe Inventory payload", error.message);
  }
}

function checkUrlContracts() {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const dashboard = fs.readFileSync(path.join(root, "assets/js/dashboard.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "dev/scripts/admin-server.py"), "utf8");
  const nav = html.match(/<nav class="nav-list"[\s\S]*?<\/nav>/i)?.[0] || "";
  const missing = ["writeSearchUrl", "function canonicalRecordIdentity", "function resolveSearchRecordIdentity", "function canonicalSearchLink", "loadFullSearchRecords()", "./inventory/data/public_portfolio_inventory.json"]
    .filter((marker) => !dashboard.includes(marker));
  const removedNav = /Replacements|Disabled\s*&amp;\s*archived|Portfolio Inventory/i.test(nav);
  if (missing.length || removedNav) fail("URL and navigation contracts", `missing=${missing.join(", ") || "none"}; removed navigation present=${removedNav}`);
  else pass("URL and navigation contracts", "text search stays on Overview and record details use public LiveLabs identities");
  const protectedInventory = server.includes("'/admin/inventory': 'inventory.html'") && server.includes("/api/admin/inventory") && server.includes("inventory/data/public_portfolio_inventory.json");
  if (!protectedInventory) fail("Inventory route contract", "Admin inventory route or public/static inventory boundary is missing");
  else pass("Inventory route contract", "full inventory is served through authenticated Admin while public routes use the projection");
}

function checkJsonAndDataContracts() {
  const { jsonFiles, rowFiles } = loadRowFiles();
  pass("JSON parse", `${jsonFiles.length} JSON file(s) parsed`);
  const projection = readJson(path.join(root, "inventory/data/public_portfolio_inventory.json"));
  if (!Array.isArray(projection.records) || projection.records.length !== Number(projection.metadata?.record_count)) {
    fail("public data projection contract", "record_count does not match the public/published records array");
  } else {
    pass("public data projection contract", `${projection.records.length} eligible records loaded for public calculations`);
  }
  if (rowFiles.has("portfolio_inventory.json")) pass("full inventory source available to Admin build", "canonical inventory remains in the protected Admin service source");
}

function checkRankingFormulaContracts() {
  const top = fs.readFileSync(path.join(root, "dev/scripts/refresh-top-performers.py"), "utf8");
  const review = fs.readFileSync(path.join(root, "dev/scripts/build-public-review-fragments.py"), "utf8");
  const dashboard = fs.readFileSync(path.join(root, "assets/js/dashboard.js"), "utf8");
  const scoreBlock = dashboard.match(/function jenkinsOverlayForId\([\s\S]*?\n    function jenkinsPrioritySummary/)?.[0] || "";
  const requirements = [
    [top, 'record.get("publishStatus") == "Published"', "Top Performer public/published gate"],
    [top, "weighted = [(0.45, percentile12m), (0.35, percentile90d)]", "Top Performer demand weights"],
    [top, "weighted.append((0.20, freshness))", "Top Performer known-freshness weight"],
    [top, "return weighted_score(weighted)", "Top Performer shared missing-input normalization"],
    [review, "components.append((0.50, 100 - view_percentile))", "review demand input weight"],
    [review, "components.append((0.35, min(100, age_months / 36 * 100)))", "review update-age input weight"],
    [review, "components.append((0.15, 100 if missing_author else 0))", "review author-coverage input weight"],
    [dashboard, "baseline * (1 - jenkinsShare) + (100 - error) * jenkinsShare", "performance score Jenkins blend"],
    [dashboard, "baseline * (1 - jenkinsShare) + error * jenkinsShare", "review score Jenkins blend"],
  ];
  const missing = requirements.filter(([source, marker]) => !source.includes(marker)).map(([, , label]) => label);
  const p1Excluded = scoreBlock.includes('occurrenceCount("P1")') || scoreBlock.includes("priorityCounts.p1");
  if (!scoreBlock.includes('occurrenceCount("P2")') || !scoreBlock.includes('occurrenceCount("P3")') || p1Excluded) missing.push("P2/P3-only Jenkins Error Score inputs");
  if (missing.length) fail("rank calculation contracts", `missing or invalid: ${missing.join(", ")}`);
  else pass("rank calculation contracts", "available Analytics inputs stay in baseline scores; P2/P3 Jenkins burden adjusts applicable rankings and P1 stays separate");
}

function requestGetStatus(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: "GET", timeout: 5000 }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", reject);
    req.end();
  });
}

function appUrl(route) {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const relative = route === "/" ? "" : route.replace(/^\/+/, "");
  return new URL(relative, base).toString();
}

async function checkHttpSmoke() {
  const paths = new Map([
    ["/", 302], ["/index.html", 302], ["/dashboard/", 200],
    ["/dashboard/?view=performance", 200], ["/dashboard/?view=errors", 200],
    ["/dashboard/?view=retirement", 200], ["/dashboard/?view=stats", 200],
    ["/inventory/", 302], ["/inventory/index.html", 302],
    ["/assets/css/dashboard.css", 200], ["/assets/js/dashboard.js", 200],
    ["/inventory/data/public_portfolio_inventory.json", 200], ["/inventory/data/portfolio_inventory.json", 404],
    ["/?q=autonomous%20database", 302], ["/?livelabs_id=4074", 302],
    ["/search/?livelabs_id=4074", 200], ["/inventory/?wms_id=11040", 302],
    ["/admin", 200], ["/admin/inventory", 200], ["/api/admin/inventory", 401], ["/api/dashboard-admin-state", 200],
    ["/assets/images/oracle-logo-white.svg", 200], ["/assets/images/livelabs-logo-white.svg", 200],
    ["/assets/images/ill-abst-000109-16x9.png", 200], ["/assets/images/color-strip.png", 200],
    ["/assets/fonts/OracleSans_Rg.ttf", 200], ["/assets/fonts/OracleSans_SBd.ttf", 200], ["/assets/fonts/OracleSans_Bd.ttf", 200],
  ]);

  for (const [route, expected] of paths) {
    const url = appUrl(route);
    try {
      const status = await requestGetStatus(url);
      if (status === expected) pass(`HTTP ${route}`, String(status));
      else fail(`HTTP ${route}`, `expected ${expected}, got ${status}`);
    } catch (error) {
      warn(`HTTP ${route}`, `skipped or unavailable at ${baseUrl}: ${error.message}`);
    }
  }

  for (const [route, expected] of [["/login.html", 303], ["/admin.html", 303], ["/admin/", 302], ["/app/", 404], ["/api/health", 404], ["/health", 404], ["/health.html", 404], ["/database/", 404], ["/dataset/", 404]]) {
    const url = appUrl(route);
    try {
      const status = await requestGetStatus(url);
      status === expected ? pass(`HTTP absent ${route}`, String(status)) : fail(`HTTP absent ${route}`, `expected ${expected}, got ${status}`);
    } catch (error) {
      warn(`HTTP absent ${route}`, `skipped or unavailable at ${baseUrl}: ${error.message}`);
    }
  }
}

function checkDataConfidenceAndInventoryNavigation() {
  const payload = readJson(path.join(root, "inventory", "data", "portfolio_inventory.json"));
  const records = payload.records || [];
  const keys = records.map((record) => String(record.key || "").trim());
  const uniqueKeys = new Set(keys.filter(Boolean));
  const routeable = records.filter((record) => {
    const livelabsId = String(record.livelabsId || "").trim();
    const wmsId = String(record.wmsId || "").trim();
    return Boolean(livelabsId || wmsId || String(record.key || "").trim());
  });
  const missingMappingStatus = records.filter((record) => !record.sourceFlags?.repository_mapping_status);
  const missingMetricStatus = records.filter((record) => !record.sourceFlags?.dashboard_metric_status);
  const unresolvedPublishType = records.filter((record) => (
    record.livelabsId
    && !record.publishType
    && record.sourceFlags?.publish_type_resolution_status !== "not_assigned_in_current_wms_workflow"
  ));
  const unavailableRepositories = records.filter((record) => record.sourceFlags?.repository_evidence_status === "live_repository_unavailable");

  if (keys.some((key) => !key) || uniqueKeys.size !== records.length || routeable.length !== records.length) {
    fail("Admin inventory identity contract", `records=${records.length}, uniqueKeys=${uniqueKeys.size}, routeable=${routeable.length}`);
  } else {
    pass("Admin inventory identity contract", `${records.length} full-scope records have unique keys and deterministic identifiers`);
  }

  const inventoryHtml = fs.readFileSync(path.join(root, "dev/admin/inventory.html"), "utf8");
  const inventoryUi = fs.readFileSync(path.join(root, "dev/admin/inventory.js"), "utf8");
  const inventoryMarkers = [
    [inventoryHtml, 'id="inventory-jenkins-priority"'],
    [inventoryHtml, "Jenkins Error Score"],
    [inventoryUi, 'fetch("/api/admin/inventory"'],
    [inventoryUi, "inventory-jenkins-priority"],
    [inventoryUi, "jenkinsSummary(record)"],
    [inventoryUi, "jenkinsScore(record)"]
  ];
  const inventoryMissing = inventoryMarkers.filter(([source, marker]) => !source.includes(marker)).map(([, marker]) => marker);
  inventoryMissing.length
    ? fail("Admin inventory filtering contract", `missing: ${inventoryMissing.join(", ")}`)
    : pass("Admin inventory filtering contract", "full inventory supports Jenkins priority and score detail");

  if (missingMappingStatus.length || missingMetricStatus.length || unresolvedPublishType.length) {
    fail(
      "Data-confidence classification contract",
      `mapping=${missingMappingStatus.length}, metrics=${missingMetricStatus.length}, publishType=${unresolvedPublishType.length}`,
    );
  } else {
    const mapped = records.filter((record) => record.livelabsId && record.sourceFlags?.github_repo_mapped).length;
    const sharedMetrics = records.filter((record) => record.livelabsId && record.sourceFlags?.dashboard_metric_scope === "shared_title_across_wms_records").length;
    const unavailableMetrics = records.filter((record) => record.livelabsId && !record.sourceFlags?.in_dashboard_windows).length;
    pass(
      "Data-confidence classification contract",
      `mapped LiveLabs IDs=${mapped}; shared-title metrics=${sharedMetrics}; metric-unavailable LiveLabs IDs=${unavailableMetrics}; unavailable live repositories=${unavailableRepositories.length}`,
    );
  }
}

function checkPublicScopeDesign() {
  const source = readJson(path.join(root, "inventory/data/portfolio_inventory.json"));
  const projection = readJson(path.join(root, "inventory/data/public_portfolio_inventory.json"));
  const visibilityPolicy = readJson(path.join(root, 'dev/config/dashboard-policy.json'));
  const eligible = source.records.filter((record) => String(record.publishType || "").toLowerCase() === "public" && String(record.publishStatus || "").toLowerCase() === "published"
    && !['test_content','internal_training'].includes(visibilityPolicy.decisions[record.livelabsId ? `livelabs:${record.livelabsId}` : record.key]?.classification));
  const publicIds = new Set(eligible.map((record) => String(record.livelabsId || "").trim()).filter(Boolean));
  const projectionKeys = new Set(projection.records.map((record) => String(record.key || "").trim()));
  const invalidRecords = projection.records.filter((record) => record.publishType !== "Public" || record.publishStatus !== "Published");
  const familyLeaks = projection.records.flatMap((record) => (record.family?.siblings || []).filter((sibling) => !publicIds.has(String(sibling.livelabsId || "").trim()) && !projectionKeys.has(String(sibling.key || "").trim())));
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const navigation = html.match(/<nav class="nav-list"[\s\S]*?<\/nav>/i)?.[0] || "";
  const javascript = fs.readFileSync(path.join(root, "assets/js/dashboard.js"), "utf8");
  const fragments = ["assets/fragments/at-risk-content.html", "assets/fragments/retire-now-content.html"].map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
  const release = fs.readFileSync(path.join(root, "dev/scripts/build-static-release.mjs"), "utf8");
  const failures = [];
  if (projection.metadata?.data_scope !== "public_published" || projection.records.length !== eligible.length) failures.push(`projection=${projection.records.length}/${eligible.length}`);
  if (invalidRecords.length) failures.push(`ineligible public rows=${invalidRecords.length}`);
  if (projection.records.some(record => !eligible.some(row => row.key === record.key))) failures.push('Excluded test/training record in public projection');
  if (familyLeaks.length) failures.push(`nonpublic related records=${familyLeaks.length}`);
  if (/Replacements|Disabled\s*&amp;\s*archived|Portfolio Inventory/i.test(navigation)) failures.push("author navigation still exposes archived or full inventory pages");
  if (!javascript.includes("loadFullSearchRecords()") || !javascript.includes("public_portfolio_inventory.json")) failures.push("search does not load the public projection");
  if (/Replacement\s+Score|replacement scores?/i.test(fragments)) failures.push("retirement/risk fragments mention replacement scoring");
  if (release.includes('{ source: "inventory/data/portfolio_inventory.json"')) failures.push("static release includes the full inventory payload");
  if (failures.length) fail("public scope and redesign", failures.join("; "));
  else pass("public scope and redesign", `${projection.records.length} public/published items (${projection.records.filter((record) => record.type === "Workshop").length} workshops, ${projection.records.filter((record) => record.type === "Sprint").length} sprints); family references are scoped; replacement score is absent`);
}

function printResults() {
  for (const result of results) {
    const suffix = result.detail ? ` - ${result.detail}` : "";
    console.log(`${result.status} ${result.name}${suffix}`);
  }
  const failures = results.filter((result) => result.status === "FAIL");
  const warnings = results.filter((result) => result.status === "WARN");
  console.log(`\nSummary: ${results.length - failures.length - warnings.length} passed, ${warnings.length} warning(s), ${failures.length} failure(s).`);
  if (failures.length) process.exitCode = 1;
}

try {
  checkDashboardScripts();
  checkInventoryPageContract();
  checkHtmlReferences();
  checkStylesheetReferences();
  checkStaticBoundary();
  checkUrlContracts();
  checkInternalContactData();
  checkUpdateEvidenceAndNaContracts();
  checkCopyInteractionContracts();
  checkIdentityDataContract();
  checkEmbeddedDashboardOutputs();
  checkReleaseManifest();
  checkAccessibilityAndSecurityContracts();
  checkBundleSize();
  checkJsonAndDataContracts();
  checkRankingFormulaContracts();
  checkDataConfidenceAndInventoryNavigation();
  checkPublicScopeDesign();
  await checkHttpSmoke();
} catch (error) {
  fail("Unhandled validation error", error.stack || error.message);
}

printResults();
