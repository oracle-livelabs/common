#!/usr/bin/env node

import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const option = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const sourcePath = option('--source', path.join(root, "inventory", "data", "portfolio_inventory.json"));
const outputPath = option('--output', path.join(root, "inventory", "data", "public_portfolio_inventory.json"));
const policyPath = option('--policy', path.join(root, 'dev/config/dashboard-policy.json'));
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

if (!Array.isArray(source.records)) throw new Error("Canonical inventory payload must contain a records array.");

const eligibility = JSON.parse(execFileSync('python', [path.join(root, 'dev/scripts/dashboard_policy.py'), '--source', sourcePath, '--policy', policyPath, '--reviews'], {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024}));
const eligibleKeys = new Set(eligibility.keys);
const eligible = source.records.filter(record => eligibleKeys.has(record.key));
const damagedTitles = eligible.filter(record => /(?:¿[¿·\s]*){2,}|\uFFFD/u.test(String(record.title || "")));
if (damagedTitles.length) throw new Error(`Review damaged source titles before publishing: ${damagedTitles.map(record => record.key).join(", ")}. Restore verified text; do not strip non-English characters.`);
const unresolved = eligible.filter((record) => !String(record?.sourceFlags?.publish_type_resolution_status || "").trim());
if (unresolved.length) throw new Error(`${unresolved.length} public/published records have no publish-type resolution status.`);

const publicKeys = new Set(eligible.map((record) => String(record?.key || "").trim()).filter(Boolean));
const publicIds = new Set(eligible.map((record) => String(record?.livelabsId || "").trim()).filter(Boolean));
const publicRecords = eligible.map((record) => {
  const familySiblings = Array.isArray(record?.family?.siblings)
    ? record.family.siblings.filter((sibling) =>
      publicKeys.has(String(sibling?.key || "").trim())
      || publicIds.has(String(sibling?.livelabsId || "").trim())
    )
    : [];
  const family = record?.family ? {
    wmsId: record.family.wmsId || record.wmsId || "",
    total: familySiblings.length + 1,
    siblings: familySiblings.map((sibling) => ({
      key: sibling.key || "",
      livelabsId: sibling.livelabsId || "",
      wmsId: sibling.wmsId || "",
      title: sibling.title || "",
      publishStatus: sibling.publishStatus || "",
      publishType: sibling.publishType || "",
      category: sibling.category || "",
    })),
  } : null;
  const values = Array.isArray(record?.values) ? record.values : [];
  const details = Array.isArray(record?.details) ? record.details : [];
  const searchable = [
    record?.title, record?.wmsId, record?.livelabsId, record?.category, record?.owner,
    record?.type, record?.status,
    ...values.flatMap((pair) => Array.isArray(pair) ? pair : []),
    ...details.flatMap((pair) => Array.isArray(pair) ? pair : []),
    ...familySiblings.flatMap((sibling) => [sibling?.livelabsId, sibling?.wmsId, sibling?.title, sibling?.category]),
  ].filter(Boolean).join(" ").toLowerCase().replace(/\s+/g, " ").trim();
  return {
    key: record.key || "",
    title: record.title || "",
    wmsId: record.wmsId || "",
    livelabsId: record.livelabsId || "",
    category: record.category || "",
    owner: record.owner || "",
    ownerMissing: record.ownerMissing,
    type: record.type || "",
    publishStatus: record.publishStatus || "",
    publishType: record.publishType || "",
    status: record.status || "",
    update: record.update || "",
    contactCoverage: record.contactCoverage || null,
    source: record.source || "",
    sourceFlags: record.sourceFlags || {},
    review: eligibility.reviews[record.key],
    values,
    details,
    fileUpdates: Array.isArray(record.fileUpdates) ? record.fileUpdates : [],
    family,
    searchable,
  };
});

const sourceFreshness = source.metadata?.data_freshness || {};
const metadata = {
  generated_at: source.metadata?.generated_at || null,
  snapshot_date: source.metadata?.snapshot_date || null,
  data_freshness: Object.fromEntries(Object.entries(sourceFreshness).filter(([key]) => key.endsWith("_snapshot_date"))),
  data_scope: "public_published",
  record_count: eligible.length,
  source_record_count: source.records.length,
  eligibility_rule: "Public and Published; confirmed test and internal-training content excluded by reviewed individual-record policy",
  visibility_policy_revision: eligibility.revision,
  retirement_criteria: eligibility.retirement,
  review_criteria: eligibility.reviewCriteria,
  review_evaluation_date: eligibility.reviewEvaluationDate,
};
let redactions = 0;
function redactAccessLinks(value) {
  if (typeof value === "string") return value.replace(/https?:\/\/[^\s"'<>)]*objectstorage[^\s"'<>)]*\/p\/[A-Za-z0-9_-]{12,}\/[^\s"'<>)]*/gi, () => {
    redactions += 1;
    return "[Access-bearing Object Storage link withheld; request a current link from the owner]";
  });
  if (Array.isArray(value)) return value.map(redactAccessLinks);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactAccessLinks(item)]));
  return value;
}
const projection = redactAccessLinks({ ...source, metadata, records: publicRecords });
projection.metadata.access_link_redactions = redactions + Number(source.metadata?.access_link_redactions || 0);
const outputText = `${JSON.stringify(projection, null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (fs.readFileSync(outputPath, "utf8") !== outputText) throw new Error("Public projection is stale. Regenerate and review it before packaging.");
} else {
  fs.writeFileSync(outputPath, outputText, "utf8");
}

const byType = eligible.reduce((counts, record) => {
  const type = String(record?.type || "Unknown");
  counts[type] = (counts[type] || 0) + 1;
  return counts;
}, {});
console.log(JSON.stringify({ output: outputPath, totalSourceRecords: source.records.length, publicPublishedRecords: eligible.length, byType }, null, 2));
