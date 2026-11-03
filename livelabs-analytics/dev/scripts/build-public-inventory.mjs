#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourcePath = path.join(root, "inventory", "data", "portfolio_inventory.json");
const outputPath = path.join(root, "inventory", "data", "public_portfolio_inventory.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

if (!Array.isArray(source.records)) throw new Error("Canonical inventory payload must contain a records array.");

const eligible = source.records.filter((record) =>
  String(record?.publishType || "").trim().toLowerCase() === "public"
  && String(record?.publishStatus || "").trim().toLowerCase() === "published"
);
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
  eligibility_rule: "publishType = Public AND publishStatus = Published",
};
const projection = { ...source, metadata, records: publicRecords };
fs.writeFileSync(outputPath, `${JSON.stringify(projection)}\n`, "utf8");

const byType = eligible.reduce((counts, record) => {
  const type = String(record?.type || "Unknown");
  counts[type] = (counts[type] || 0) + 1;
  return counts;
}, {});
console.log(JSON.stringify({ output: outputPath, totalSourceRecords: source.records.length, publicPublishedRecords: eligible.length, byType }, null, 2));
