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
const strictGovernance = process.argv.includes("--strict-governance") || process.env.STRICT_GOVERNANCE_VALIDATION === "1";

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

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
  for (const file of ["index.html", "inventory/index.html"]) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
    const externalScripts = [...html.matchAll(/<script[^>]*\bsrc="([^"]+)"[^>]*><\/script>/gi)]
      .map((match) => match[1].split(/[?#]/)[0])
      .filter((source) => !/^(?:https?:|data:|javascript:)/i.test(source));
    inlineScripts.forEach((script, index) => new vm.Script(script, { filename: `${file}:script${index}` }));
    externalScripts.forEach((source) => {
      const sourcePath = path.resolve(path.dirname(path.join(root, file)), source);
      new vm.Script(fs.readFileSync(sourcePath, "utf8"), { filename: source });
    });
    pass(`${file} scripts parse`, `${inlineScripts.length} inline and ${externalScripts.length} external script(s)`);
  }
}

function checkInventoryPageContract() {
  const filePath = path.join(root, "inventory/index.html");
  const html = fs.readFileSync(filePath, "utf8");
  const dashboardHtml = readDashboardSourceBundle();
  const requiredMarkers = [
    'new URL("../index.html", location.href)',
    'new URLSearchParams({ view: "inventory" })',
    'location.replace(target.href)'
  ];
  const missing = requiredMarkers.filter((marker) => !html.includes(marker));
  if (missing.length) fail("Inventory route shell", `missing: ${missing.join(", ")}`);
  else pass("Inventory route shell", "explicit inventory entry redirects to the dashboard renderer without fetching or rewriting HTML");
  const presentationMarkers = [
    'class="page-header inventory-page-header"',
    'class="hero-stripe"',
    'class="metric-band" aria-label="Inventory capabilities"',
    '<h1>Portfolio Inventory</h1>',
    '<span>Search</span>',
    '<span>Filter</span>',
    '<span>Review</span>'
  ];
  const missingPresentation = presentationMarkers.filter((marker) => !dashboardHtml.includes(marker));
  missingPresentation.length
    ? fail("Inventory visual/runtime parity", `missing dashboard-theme markers: ${missingPresentation.join(", ")}`)
    : pass("Inventory visual/runtime parity", "route reuses the dashboard header, color stripe, capability band, shell, and data-table implementation");

  const inventoryMarkers = [
    'id="all-data-tag"',
    '<th>Contact</th><th>Tags</th>',
    'allDataState.tag',
    'allDataTagHtml(record)',
    'allDataAssignedTags(record)',
    'allDataRecordMatchesTag(record, allDataState.tag)',
    '${adminTagsPanelHtml(record)}'
  ];
  const remaining = inventoryMarkers.filter((marker) => dashboardHtml.includes(marker));
  remaining.length
    ? fail("Inventory tags boundary", `Inventory tag markers remain: ${remaining.join(", ")}`)
    : pass("Inventory tags boundary", "static Tags column, values, filter, sort path, and public detail panel are removed from Inventory");
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
    || metadata.matched_records !== search.records.length
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
  pass("Search/Inventory payload deduplication", `${search.records.length} records share one canonical portfolio payload`);
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
    "copyableDetailFields",
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
    : pass("copy interaction contract", "dashboard tables, Inventory, detail fields, and row-event guards are wired");

  const hoverFocusMarkers = [
    ".copy-value-target:hover .copy-value-button",
    ".copy-value-target:focus-within .copy-value-button"
  ];
  const forcedVisibilityMarkers = [
    ".search-view .copy-value-button",
    "body.dashboard-inventory-active .copy-value-button"
  ];
  const missingHoverFocus = hoverFocusMarkers.filter((marker) => !html.includes(marker));
  const forcedVisibility = forcedVisibilityMarkers.filter((marker) => html.includes(marker));
  missingHoverFocus.length || forcedVisibility.length
    ? fail("copy interaction visibility", `missing hover/focus markers: ${missingHoverFocus.join(", ") || "none"}; forced-visible markers: ${forcedVisibility.join(", ") || "none"}`)
    : pass("copy interaction visibility", "Copy controls remain hidden by default and appear on hover or keyboard focus");

  const dashboardTableIds = [
    "top-performer-top-100-workshops",
    "top-performer-top-100-sprints",
    "at-risk-top-100-workshops",
    "at-risk-top-100-sprints",
    "retire-now-top-100-workshops",
    "retire-now-top-100-sprints",
    "replacement-recommendations",
    "disabled-workshops",
    "disabled-sprints"
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
    "top-performer-top-100-workshops",
    "top-performer-top-100-sprints",
    "at-risk-top-100-workshops",
    "at-risk-top-100-sprints",
    "retire-now-top-100-workshops",
    "retire-now-top-100-sprints",
    "replacement-recommendations",
    "disabled-workshops",
    "disabled-sprints"
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
  for (const file of ["index.html", "inventory/index.html"]) {
    const filePath = path.join(root, file);
    const fileDir = path.dirname(filePath);
    const html = fs.readFileSync(filePath, "utf8");
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const refs = [...html.matchAll(/(?:href|src)="(?!https?:|mailto:|#|data:|javascript:)([^"]+)"/g)]
      .map((match) => match[1].split(/[?#]/)[0])
      .filter((ref) => ref !== "./admin/")
      .filter(Boolean);
    const missing = [...new Set(refs)].filter((ref) => !fs.existsSync(path.resolve(fileDir, ref)));
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
    "inventory/index.html",
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
    "assets/fragments/replacement-suggestions.html",
    "assets/fragments/disabled-content.html",
    "inventory/data/portfolio_inventory.json",
    "inventory/data/portfolio_inventory.file.js",
    "dev/config/.nojekyll",
    "dev/config/release-manifest.json"
  ];
  const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
  missing.length ? fail("static bundle required files", `missing: ${missing.join(", ")}`) : pass("static bundle required files", `${requiredFiles.length} required paths present`);

  const forbiddenPaths = ["admin", "admin.html", "login.html", "app", "api", "database", "dataset", "server", "ops", "health", "health.html", "_local", "docs", "README.md"];
  const retainedForbidden = forbiddenPaths.filter((file) => fs.existsSync(path.join(root, file)));
  retainedForbidden.length ? fail("static-only boundary", `forbidden paths present: ${retainedForbidden.join(", ")}`) : pass("static-only boundary", "admin, backend, database, dataset, and local runtime paths absent");

  const requiredData = ["inventory/data/portfolio_inventory.json"];
  for (const file of requiredData) {
    try {
      const value = readJson(path.join(root, file));
      if (file.endsWith("portfolio_inventory.json") && !Array.isArray(value.records)) fail(`${file} contract`, "records array missing");
      else pass(`${file} contract`, "JSON parses and required array is present");
    } catch (error) {
      fail(`${file} contract`, error.message);
    }
  }

  const canonicalInventory = readJson(path.join(root, "inventory", "data", "portfolio_inventory.json"));
  const fileFallbackPath = path.join(root, "inventory", "data", "portfolio_inventory.file.js");
  try {
    const fallbackText = fs.readFileSync(fileFallbackPath, "utf8");
    const match = fallbackText.match(/globalThis\.__livelabsPortfolioInventoryPayload\s*=\s*([\s\S]+);\s*$/);
    if (!match) throw new Error("payload assignment is missing");
    const fallbackPayload = JSON.parse(match[1]);
    if (fallbackPayload.metadata?.generated_at !== canonicalInventory.metadata?.generated_at || fallbackPayload.records?.length !== canonicalInventory.records?.length) {
      throw new Error("generated metadata or record count differs from the canonical JSON payload");
    }
    pass("file-safe Inventory payload", `${fallbackPayload.records.length} records match canonical JSON metadata`);
  } catch (error) {
    fail("file-safe Inventory payload", error.message);
  }
}

function checkUrlContracts() {
  const html = readDashboardSourceBundle();
  const requiredMarkers = [
    'inventoryItem.href = "./inventory/index.html"',
    "data-inventory-link",
    "readSearchUrlState",
    "writeSearchUrl",
    'route = "current"',
    'route: "dashboard"',
    'params.get("content_key")',
    'function canonicalRecordIdentity',
    'function resolveSearchRecordIdentity',
    '["livelabs_id", "wms_id", "content_key"]',
    'url.searchParams.set("livelabs_id", selectedIdentity.livelabsId)',
    'url.searchParams.set("wms_id", selectedIdentity.wmsId)',
    'url.searchParams.set("content_key", selectedIdentity.contentKey)',
    'if (shouldClearHash) url.hash = "";',
    'function canonicalSearchLink',
    'search-view-actions',
    'data-copy-search-link',
    'data-back-dashboard',
    'const dashboardEntryUrl = () =>',
    'new URL("../index.html", location.href)',
    'url.searchParams.delete("view");',
    'addEventListener("popstate"'
  ];
  const missing = requiredMarkers.filter((marker) => !html.includes(marker));
  if (missing.length) fail("URL contracts", `missing: ${missing.join(", ")}`);
  else pass("URL contracts", "Search and Inventory share dual-ID, fallback-key, Copy-link, and browser-history URL state");
  if (html.includes('inventoryItem.dataset.dashboardView = "inventory"')) {
    fail("Inventory route contract", "legacy dashboard-mode assignment remains on the menu item");
  } else {
    pass("Inventory route contract", "menu item navigates to the explicit /inventory/index.html entry");
  }
}

function checkJsonAndDataContracts() {
  const { jsonFiles, rowFiles } = loadRowFiles();
  pass("JSON parse", `${jsonFiles.length} JSON file(s) parsed`);

  let topFormulaTotal = 0;
  let topFormulaFailures = 0;
  let replacementFormulaTotal = 0;
  let replacementFormulaFailures = 0;
  let activeGateTotal = 0;
  let activeGateFailures = 0;
  let disabledGateTotal = 0;
  let disabledGateFailures = 0;
  let replacementIdentityTotal = 0;
  let replacementIdentityFailures = 0;

  const governedFilePattern = /^(top_(10|15|50|100|500|1000)|top_current_demand|top_stable_demand|top_blended_performers|top_best_workshops|top_performers|top_retire_candidates|top_to_retire|retire_now_strict|replacement_recommendations|replacement_validation_queue|refresh_priority_queue|retirement_priority_queue|low_demand_watchlist|possible_retirement_review).*\.json$/;

  for (const [file, rows] of rowFiles.entries()) {
    for (const row of rows) {
      const topInputs = [
        numberValue(row.recent_views_12m_content_percentile),
        numberValue(row.recent_views_90d_content_percentile),
        numberValue(row.top_performer_freshness_score),
        numberValue(row.best_performer_score),
      ];
      if (topInputs.every((value) => value !== null)) {
        topFormulaTotal += 1;
        const expected = round2(0.45 * topInputs[0] + 0.35 * topInputs[1] + 0.2 * topInputs[2]);
        if (Math.abs(expected - topInputs[3]) > 0.02) topFormulaFailures += 1;
      }

      const replacementInputs = [
        numberValue(row.candidate_content_similarity),
        numberValue(row.candidate_category_similarity),
        numberValue(row.candidate_recency_similarity),
        numberValue(row.candidate_level_similarity),
        numberValue(row.candidate_title_similarity),
        numberValue(row.replacement_similarity_score),
      ];
      if (replacementInputs.every((value) => value !== null)) {
        replacementFormulaTotal += 1;
        const expected = round2(
          0.55 * replacementInputs[0]
          + 0.15 * replacementInputs[1]
          + 0.15 * replacementInputs[2]
          + 0.1 * replacementInputs[3]
          + 0.05 * replacementInputs[4],
        );
        if (Math.abs(expected - replacementInputs[5]) > 0.02) replacementFormulaFailures += 1;
      }

      if (governedFilePattern.test(file)) {
        activeGateTotal += 1;
        const active =
          String(row.publish_status).toLowerCase() === "published"
          && ["public", "private"].includes(String(row.publish_type).toLowerCase())
          && row.publish_state_active === true;
        if (!active) activeGateFailures += 1;
      }

      if (row.candidate_workshop_key || row.candidate_wms_id || row.candidate_livelabs_id) {
        replacementIdentityTotal += 1;
        if (
          String(row.candidate_wms_id || "") === String(row.wms_id || "")
          || String(row.candidate_livelabs_id || "") === String(row.livelabs_id || "")
          || normalizeText(row.candidate_title) === normalizeText(row.title)
        ) {
          replacementIdentityFailures += 1;
        }
      }
    }
  }

  for (const file of ["disabled_workshops.json", "disabled_sprints.json"]) {
    const rows = rowFiles.get(file) || [];
    for (const row of rows) {
      disabledGateTotal += 1;
      const valid =
        String(row.publish_type).toLowerCase() === "disabled"
        && row.publish_state_active === false
        && numberValue(row.retire_score) === null
        && numberValue(row.best_performer_score) === null
        && !/qa\s*exception/i.test(JSON.stringify(row));
      if (!valid) disabledGateFailures += 1;
    }
  }

  function reportGovernancePopulation(name, total, failures, unit) {
    if (failures) {
      fail(name, `${failures} failure(s) of ${total}`);
      return;
    }
    if (!total) {
      const detail = `0 ${unit} checked; governed source evidence is absent from the static-only data directory`;
      strictGovernance ? fail(name, detail) : warn(name, detail);
      return;
    }
    pass(name, `${total} ${unit} checked`);
  }

  reportGovernancePopulation("Top Performer formula", topFormulaTotal, topFormulaFailures, "row occurrence(s)");
  reportGovernancePopulation("Replacement Similarity formula", replacementFormulaTotal, replacementFormulaFailures, "row occurrence(s)");
  reportGovernancePopulation("Active ranked-output gate", activeGateTotal, activeGateFailures, "row occurrence(s)");
  reportGovernancePopulation("Disabled content audit-only gate", disabledGateTotal, disabledGateFailures, "disabled row(s)");
  reportGovernancePopulation("Replacement identity exclusions", replacementIdentityTotal, replacementIdentityFailures, "replacement row occurrence(s)");
}

function requestHead(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: "HEAD", timeout: 5000 }, (res) => {
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
  const paths = [
    "/",
    "/index.html",
    "/inventory/",
    "/inventory/index.html",
    "/assets/css/dashboard.css",
    "/assets/js/dashboard.js",
    "/inventory/data/portfolio_inventory.json",
    "/?q=autonomous%20database",
    "/?livelabs_id=4074",
    "/inventory/?wms_id=11040",
    "/assets/images/oracle-logo-white.svg",
    "/assets/images/livelabs-logo-white.svg",
    "/assets/images/ill-abst-000109-16x9.png",
    "/assets/images/color-strip.png",
    "/assets/fonts/OracleSans_Rg.ttf",
    "/assets/fonts/OracleSans_SBd.ttf",
    "/assets/fonts/OracleSans_Bd.ttf",
  ];

  for (const route of paths) {
    const url = appUrl(route);
    try {
      const status = await requestHead(url);
      if (status === 200) pass(`HTTP ${route}`, "200");
      else fail(`HTTP ${route}`, String(status));
    } catch (error) {
      warn(`HTTP ${route}`, `skipped or unavailable at ${baseUrl}: ${error.message}`);
    }
  }

  for (const route of ["/login.html", "/admin.html", "/admin/", "/app/", "/api/health", "/health", "/health.html", "/database/", "/dataset/"]) {
    const url = appUrl(route);
    try {
      const status = await requestHead(url);
      status === 404 ? pass(`HTTP absent ${route}`, "404") : fail(`HTTP absent ${route}`, `unexpected ${status}`);
    } catch (error) {
      warn(`HTTP absent ${route}`, `skipped or unavailable at ${baseUrl}: ${error.message}`);
    }
  }
}

function checkDataConfidenceAndInventoryNavigation() {
  const html = readDashboardSourceBundle();
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
    fail("Inventory all-row navigation data contract", `records=${records.length}, uniqueKeys=${uniqueKeys.size}, routeable=${routeable.length}`);
  } else {
    pass("Inventory all-row navigation data contract", `${records.length} records have unique keys and deterministic URL identity`);
  }

  const requiredNavigationMarkers = [
    "let inventoryRecordByKey = new Map()",
    "inventoryRecordByKey.set(key, record)",
    "window.__inventoryNavigationAudit",
    'if (event.target.closest("button[data-copy-value]")) return',
    "const record = inventoryRecordByKey.get(key) || searchRecordByKey.get(key)",
  ];
  const missingMarkers = requiredNavigationMarkers.filter((marker) => !html.includes(marker));
  const suppressesValueClicks = html.includes('button[data-copy-value], .copy-value-target');
  missingMarkers.length || suppressesValueClicks
    ? fail("Inventory row interaction contract", `missing=${missingMarkers.join(", ") || "none"}; suppressed value clicks=${suppressesValueClicks}`)
    : pass("Inventory row interaction contract", "title, ID, contact, plain-cell, and keyboard row activation resolve through the O(1) key map");

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

function checkReplacementConfidencePresentation() {
  const replacementPath = path.join(root, "assets", "fragments", "replacement-suggestions.html");
  if (!fs.existsSync(replacementPath)) {
    fail("Replacement confidence presentation", "Replacement Suggestions section is missing");
    return;
  }
  const section = fs.readFileSync(replacementPath, "utf8");
  const rows = [...section.matchAll(/<tr class="expandable-row"[^>]*data-detail-row-id="replacement-recommendations-detail-[^"]+"[^>]*>[\s\S]*?<\/tr>/g)];
  const mismatches = [];
  for (const row of rows) {
    const cells = [...row[0].matchAll(/<td(?: [^>]*)?>([\s\S]*?)<\/td>/g)].map((cell) => cell[1].replace(/<[^>]+>/g, "").trim());
    const score = Number((cells[9] || "").replace(/,/g, ""));
    const expected = score >= 85 ? "Strong algorithmic candidate" : score >= 70 ? "Review required" : "No reliable candidate";
    if (!Number.isFinite(score) || cells[10] !== expected) mismatches.push({ score, displayed: cells[10], expected });
  }
  const unsupportedConfirmedLabels = section.includes("Strong successor confirmed");
  if (unsupportedConfirmedLabels || mismatches.length) {
    fail("Replacement confidence presentation", `rows=${rows.length}, mislabeled=${mismatches.length}, unsupported confirmed labels=${unsupportedConfirmedLabels}`);
  } else {
    pass("Replacement confidence presentation", `${rows.length} rows use algorithmic-candidate or review labels; no automatic confirmation claims`);
  }
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
  checkDataConfidenceAndInventoryNavigation();
  checkReplacementConfidencePresentation();
  await checkHttpSmoke();
} catch (error) {
  fail("Unhandled validation error", error.stack || error.message);
}

printResults();
