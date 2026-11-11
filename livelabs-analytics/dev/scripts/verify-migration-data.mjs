#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
function valueFor(flag, fallback) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] || fallback : fallback;
}
const payloadPath = path.resolve(projectRoot, valueFor("--payload", "inventory/data/portfolio_inventory.json"));
const htmlPath = path.resolve(projectRoot, valueFor("--html", "index.html"));
const outputDir = path.resolve(valueFor("--output-dir", path.join(projectRoot, "dev", "migration-audit")));
const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
const records = payload.records || [];
const html = fs.readFileSync(htmlPath, "utf8");
const replacementFragment = fs.readFileSync(path.join(projectRoot, "assets", "fragments", "replacement-suggestions.html"), "utf8");
const dashboardTableSource = [
  html,
  ...fs.readdirSync(path.join(projectRoot, "assets", "fragments"))
    .filter((file) => file.endsWith(".html"))
    .sort()
    .map((file) => fs.readFileSync(path.join(projectRoot, "assets", "fragments", file), "utf8")),
].join("\n");

function detailValue(record, label) {
  for (const pair of record.details || []) {
    if (Array.isArray(pair) && String(pair[0]).toLowerCase() === label.toLowerCase()) return pair[1];
  }
  return null;
}

function classifyMapping(record) {
  const status = String(record.sourceFlags?.repository_mapping_status || "unclassified");
  if (status.startsWith("mapped_")) return "mapped";
  if (status === "catalog_url_only") return "unresolved_catalog_url_only";
  if (status === "external_or_legacy_url_unmapped") return "unresolved_external_or_legacy_url";
  if (status === "no_repository_url") return "unresolved_no_repository_url";
  return "requiring_owner_review";
}

function classifyMetric(record) {
  const status = String(record.sourceFlags?.dashboard_metric_status || "unclassified");
  if (status.startsWith("available_")) return "available";
  if (status === "not_in_dashboard_snapshot") return "unavailable_not_in_snapshot";
  if (status === "dashboard_title_ambiguous_no_usable_metric") return "ambiguous_title";
  return "requiring_owner_review";
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&mdash;/g, "—").trim();
}

function tableRows(tableId) {
  const marker = `data-filter-table="${tableId}"`;
  const start = dashboardTableSource.indexOf(marker);
  if (start < 0) return [];
  const end = dashboardTableSource.indexOf("</div>", start);
  const section = dashboardTableSource.slice(start, end < 0 ? dashboardTableSource.length : end);
  return [...section.matchAll(/<tr class="expandable-row"[^>]*data-detail-row-id="[^"]+"[^>]*>[\s\S]*?<\/tr>/g)].map((match) => {
    const cells = [...match[0].matchAll(/<td(?: [^>]*)?>([\s\S]*?)<\/td>/g)].map((cell) => stripTags(cell[1]));
    return { title: cells[1] || "", wmsId: cells[3] || cells[2] || "", livelabsId: cells[4] || cells[3] || "" };
  });
}

function replacementRows() {
  const marker = 'data-filter-table="replacement-recommendations"';
  const start = replacementFragment.indexOf(marker);
  const section = replacementFragment.slice(start < 0 ? 0 : start);
  return [...section.matchAll(/<tr class="expandable-row"[^>]*data-detail-row-id="replacement-recommendations-detail-[^"]+"[^>]*>[\s\S]*?<\/tr>/g)].map((match) => {
    const cells = [...match[0].matchAll(/<td(?: [^>]*)?>([\s\S]*?)<\/td>/g)].map((cell) => stripTags(cell[1]));
    const score = Number((cells[9] || "").replace(/,/g, ""));
    const status = score >= 85 ? "strong_algorithmic_candidate" : score >= 70 ? "review_required" : "no_reliable_candidate";
    return {
      rank: cells[0] || "",
      currentTitle: cells[1] || "",
      currentWmsId: cells[2] || "",
      currentLivelabsId: cells[3] || "",
      candidateTitle: cells[6] || "",
      candidateWmsId: cells[7] || "",
      candidateLivelabsId: cells[8] || "",
      score,
      displayedMatch: cells[10] || "",
      expectedStatus: status,
    };
  });
}

const unmapped = records.filter((record) => record.livelabsId && classifyMapping(record) !== "mapped").map((record) => ({
  livelabsId: record.livelabsId,
  wmsId: record.wmsId,
  title: record.title,
  classification: classifyMapping(record),
  repositoryMappingStatus: record.sourceFlags?.repository_mapping_status || null,
  repositoryMappingEvidence: detailValue(record, "Repository Mapping Evidence"),
  productionUrl: detailValue(record, "Production URL"),
  updateEvidence: detailValue(record, "Update Evidence"),
}));
const metricExceptions = records.filter((record) => record.livelabsId && classifyMetric(record) !== "available").map((record) => ({
  livelabsId: record.livelabsId,
  wmsId: record.wmsId,
  title: record.title,
  classification: classifyMetric(record),
  dashboardMetricStatus: record.sourceFlags?.dashboard_metric_status || null,
  dashboardMetricScope: record.sourceFlags?.dashboard_metric_scope || null,
  dashboardMetricResolution: detailValue(record, "Dashboard Metric Resolution"),
}));
const replacements = replacementRows();
const replacementFailures = replacements.flatMap((row) => {
  const failures = [];
  if (!Number.isFinite(row.score)) failures.push("missing_score");
  if (!row.currentWmsId && !row.currentLivelabsId) failures.push("missing_current_identity");
  if (!row.candidateWmsId && !row.candidateLivelabsId) failures.push("missing_candidate_identity");
  if (row.currentWmsId && row.currentWmsId === row.candidateWmsId) failures.push("same_wms_family");
  if (row.currentLivelabsId && row.currentLivelabsId === row.candidateLivelabsId) failures.push("same_livelabs_id");
  if (!row.candidateTitle || /^N\/A$/i.test(row.candidateTitle)) failures.push("missing_candidate_title");
  if (row.displayedMatch !== (row.expectedStatus === "strong_algorithmic_candidate" ? "Strong algorithmic candidate" : row.expectedStatus === "review_required" ? "Review required" : "No reliable candidate")) failures.push("confidence_label_mismatch");
  return failures.length ? [{ rank: row.rank, failures }] : [];
});
const atRiskKeys = new Set([...tableRows("at-risk-top-100-workshops"), ...tableRows("at-risk-top-100-sprints")].map((row) => `${row.livelabsId || "wms:${row.wmsId}"}:${row.title.toLowerCase()}`));
const retireNowKeys = new Set([...tableRows("retire-now-top-100-workshops"), ...tableRows("retire-now-top-100-sprints")].map((row) => `${row.livelabsId || "wms:${row.wmsId}"}:${row.title.toLowerCase()}`));
const overlap = [...atRiskKeys].filter((key) => retireNowKeys.has(key));
const replacementVerification = {
  generatedAt: new Date().toISOString(),
  source: path.relative(projectRoot, htmlPath).replaceAll(path.sep, "/"),
  recommendationRows: replacements.length,
  statusCounts: replacements.reduce((counts, row) => { counts[row.expectedStatus] = (counts[row.expectedStatus] || 0) + 1; return counts; }, {}),
  checks: {
    allRowsHaveIdentity: replacements.every((row) => row.currentWmsId || row.currentLivelabsId),
    allCandidatesHaveIdentity: replacements.every((row) => row.candidateWmsId || row.candidateLivelabsId),
    noSameWmsFamily: !replacements.some((row) => row.currentWmsId && row.currentWmsId === row.candidateWmsId),
    noSameLivelabsId: !replacements.some((row) => row.currentLivelabsId && row.currentLivelabsId === row.candidateLivelabsId),
    confidenceLabelsCorrect: !replacementFailures.some((failure) => failure.failures.includes("confidence_label_mismatch")),
    atRiskRetireNowDisjoint: overlap.length === 0,
    singularVisibleRankedTables: ["at-risk-top-100-workshops", "at-risk-top-100-sprints", "retire-now-top-100-workshops", "retire-now-top-100-sprints"].every((id) => (dashboardTableSource.match(new RegExp(`data-filter-table="${id}"`, "g")) || []).length === 1),
  },
  failures: replacementFailures,
  overlap,
  rows: replacements,
};

const report = {
  generatedAt: new Date().toISOString(),
  payload: path.relative(projectRoot, payloadPath).replaceAll(path.sep, "/"),
  recordCount: records.length,
  unmappedLiveLabsIdCount: unmapped.length,
  metricExceptionCount: metricExceptions.length,
  unmapped,
  metricExceptions,
  replacementVerification,
};
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "unmapped-livelabs-id-exceptions.json"), `${JSON.stringify({ generatedAt: report.generatedAt, count: unmapped.length, records: unmapped }, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "dashboard-metric-exceptions.json"), `${JSON.stringify({ generatedAt: report.generatedAt, count: metricExceptions.length, records: metricExceptions }, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "replacement-verification.json"), `${JSON.stringify(replacementVerification, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "migration-data-verification.json"), `${JSON.stringify(report, null, 2)}\n`);
const summary = [
  `# LiveLabs Analytics migration data verification`,
  `Generated: ${report.generatedAt}`,
  ``,
  `- Records: ${records.length}`,
  `- Unmapped LiveLabs-ID records: ${unmapped.length}`,
  `- Dashboard metric exceptions: ${metricExceptions.length}`,
  `- Replacement rows inspected: ${replacements.length}`,
  `- Replacement verification failures: ${replacementFailures.length}`,
  `- At-Risk/Retire-Now overlap: ${overlap.length}`,
  ``,
  `## Mapping classifications`,
  ...Object.entries(unmapped.reduce((counts, row) => { counts[row.classification] = (counts[row.classification] || 0) + 1; return counts; }, {})).map(([key, value]) => `- ${key}: ${value}`),
  ``,
  `## Metric classifications`,
  ...Object.entries(metricExceptions.reduce((counts, row) => { counts[row.classification] = (counts[row.classification] || 0) + 1; return counts; }, {})).map(([key, value]) => `- ${key}: ${value}`),
  ``,
  `## Replacement verification`,
  ...Object.entries(replacementVerification.checks).map(([key, value]) => `- ${key}: ${value ? "PASS" : "FAIL"}`),
  ``,
  `Algorithmic candidates are not governance-confirmed replacements. Scores >=85 are strong algorithmic candidates; scores 70-84.99 require review; lower scores are not reliable candidates.`,
].join("\n");
fs.writeFileSync(path.join(outputDir, "migration-data-verification.md"), `${summary}\n`);
console.log(JSON.stringify({ outputDir, unmapped: unmapped.length, metricExceptions: metricExceptions.length, replacementRows: replacements.length, replacementFailures: replacementFailures.length, overlap: overlap.length }, null, 2));
