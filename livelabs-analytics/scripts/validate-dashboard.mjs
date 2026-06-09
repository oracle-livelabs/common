#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const dataDir = path.join(root, "data");
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
  const jsonFiles = fs.readdirSync(dataDir).filter((file) => file.endsWith(".json")).sort();
  const rowFiles = new Map();
  for (const file of jsonFiles) {
    const value = readJson(path.join(dataDir, file));
    const rows = rowsFromJson(value);
    if (rows) rowFiles.set(file, rows);
  }
  return { jsonFiles, rowFiles };
}

function checkInlineScripts() {
  for (const file of ["index.html", "login.html", "admin.html", "admin/index.html"]) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
    scripts.forEach((script, index) => new vm.Script(script, { filename: `${file}:script${index}` }));
    pass(`${file} inline scripts parse`, `${scripts.length} inline script(s)`);
  }
}

function checkHtmlReferences() {
  for (const file of ["index.html", "login.html", "admin.html", "admin/index.html"]) {
    const filePath = path.join(root, file);
    const fileDir = path.dirname(filePath);
    const html = fs.readFileSync(filePath, "utf8");
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const refs = [...html.matchAll(/(?:href|src)="(?!https?:|mailto:|#|data:|javascript:)([^"]+)"/g)]
      .map((match) => match[1].split("#")[0])
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

function checkAdminQaConfiguration() {
  const dashboardHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const adminHtml = fs.readFileSync(path.join(root, "admin/index.html"), "utf8");
  const combined = `${dashboardHtml}\n${adminHtml}`;

  const requiredSnippets = [
    ["dashboard QA tag default off", dashboardHtml.includes("qaExceptionTagEnabled: false")],
    ["dashboard QA exclusion default off", dashboardHtml.includes("qaExceptionExclusionEnabled: false")],
    ["admin QA tag default off", adminHtml.includes("qaExceptionTagEnabled: false")],
    ["admin QA exclusion default off", adminHtml.includes("qaExceptionExclusionEnabled: false")],
    ["criteria rules paused", combined.includes("criteriaRuleAutomationPaused = true")],
    ["admin criteria rules hidden", adminHtml.includes('id="rules" hidden')],
    ["criteria rule model", combined.includes('type: "criteria"') && combined.includes("minAgeMonths") && combined.includes("minStaleMonths")],
    ["legacy keyword migration guard", combined.includes("isLegacyKeywordExceptionRule")],
    ["row search editor", adminHtml.includes('id="row-search-query"') && adminHtml.includes('id="save-row-override"')],
    ["row QA excluded override", combined.includes("qaExcluded") && combined.includes("data-admin-override-detail")]
  ];

  for (const [name, ok] of requiredSnippets) {
    ok ? pass(name, "present") : fail(name, "missing");
  }

  if (/id:\s*"qa-stable-(19c|23ai)"/.test(combined) || /value:\s*"(19c|23ai)"/.test(combined)) {
    fail("keyword default QA rules removed", "19c/23ai still appear as default rule objects");
  } else {
    pass("keyword default QA rules removed", "only migration references may remain");
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

  topFormulaFailures
    ? fail("Top Performer formula", `${topFormulaFailures} failure(s) of ${topFormulaTotal}`)
    : pass("Top Performer formula", `${topFormulaTotal} row occurrence(s) checked`);

  replacementFormulaFailures
    ? fail("Replacement Similarity formula", `${replacementFormulaFailures} failure(s) of ${replacementFormulaTotal}`)
    : pass("Replacement Similarity formula", `${replacementFormulaTotal} row occurrence(s) checked`);

  activeGateFailures
    ? fail("Active ranked-output gate", `${activeGateFailures} failure(s) of ${activeGateTotal}`)
    : pass("Active ranked-output gate", `${activeGateTotal} row occurrence(s) checked`);

  disabledGateFailures
    ? fail("Disabled content audit-only gate", `${disabledGateFailures} failure(s) of ${disabledGateTotal}`)
    : pass("Disabled content audit-only gate", `${disabledGateTotal} disabled row(s) checked`);

  replacementIdentityFailures
    ? fail("Replacement identity exclusions", `${replacementIdentityFailures} failure(s) of ${replacementIdentityTotal}`)
    : pass("Replacement identity exclusions", `${replacementIdentityTotal} replacement row occurrence(s) checked`);
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
    "/login.html",
    "/admin.html",
    "/admin/",
    "/admin/index.html",
    "/dashboard_tables.json",
    "/dashboard_payload.json",
    "/data/governance_reference.json",
    "/assets/images/oracle-logo-white.svg",
    "/assets/fonts/OracleSans_Rg.ttf",
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
  checkInlineScripts();
  checkHtmlReferences();
  checkAdminQaConfiguration();
  checkJsonAndDataContracts();
  await checkHttpSmoke();
} catch (error) {
  fail("Unhandled validation error", error.stack || error.message);
}

printResults();
