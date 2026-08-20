#!/usr/bin/env node

import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(projectRoot, "..");
const redactionLabel = "Contact withheld from public bundle";
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"));
}

function readGitJson(relativePath) {
  const text = childProcess.execFileSync(
    "git",
    ["-c", `safe.directory=${repoRoot}`, "show", `HEAD:livelabs-analytics/${relativePath}`],
    { cwd: repoRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }
  );
  return JSON.parse(text);
}

function restoreRedactedValues(value, source) {
  if (typeof value === "string") {
    if (!value.includes(redactionLabel)) return value;
    return typeof source === "string" && source !== redactionLabel ? source : value;
  }
  if (Array.isArray(value)) return value.map((entry, index) => restoreRedactedValues(entry, source?.[index]));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, restoreRedactedValues(entry, source?.[key])]));
  }
  return value;
}

function cleanContactEnumeration(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

function normalizeContactFields(record) {
  const entries = [record.values, record.details];
  for (const pairs of entries) {
    for (const pair of pairs || []) {
      if (!Array.isArray(pair) || typeof pair[1] !== "string") continue;
      if (!/email|contact|team|author|manager/i.test(String(pair[0]))) continue;
      pair[1] = cleanContactEnumeration(pair[1]);
    }
  }
  if (typeof record.owner === "string") record.owner = cleanContactEnumeration(record.owner);
  return record;
}

function normalizeRecord(record, sourceRecord) {
  const restored = restoreRedactedValues(record, sourceRecord);
  normalizeContactFields(restored);
  const rawTitle = String(restored.rawTitle ?? sourceRecord?.rawTitle ?? sourceRecord?.title ?? "").trim();
  const titleMissing = Boolean(restored.titleMissing) || !rawTitle;
  const wmsIdMissing = !String(restored.wmsId ?? "").trim();
  const livelabsIdMissing = !String(restored.livelabsId ?? "").trim();
  const reviewReasons = [];
  if (titleMissing) reviewReasons.push("Missing title");
  if (wmsIdMissing) reviewReasons.push("Missing WMS ID");
  if (livelabsIdMissing) reviewReasons.push("Missing LiveLabs ID");
  const contentReviewState = reviewReasons.length ? "Content to review/remove" : "Ready";
  const contentReviewReason = reviewReasons.join("; ");
  const title = titleMissing ? "N/A" : String(restored.title || rawTitle || "N/A").trim();
  const searchable = [restored.searchable, title, contentReviewState, contentReviewReason].filter(Boolean).join(" ");
  return {
    ...restored,
    rawTitle,
    title,
    titleMissing,
    wmsIdMissing,
    livelabsIdMissing,
    contentReviewState,
    contentReviewReason,
    searchable
  };
}

function stableRecordKey(record) {
  const livelabsId = String(record?.livelabsId ?? "").trim();
  if (livelabsId) return `livelabs:${livelabsId}`;
  const explicitKey = String(record?.key ?? "").trim();
  if (explicitKey) return `key:${explicitKey}`;
  const wmsId = String(record?.wmsId ?? "").trim();
  const title = String(record?.rawTitle ?? record?.title ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const type = String(record?.type ?? "").trim().toLowerCase();
  if (wmsId && title) return `fallback:${wmsId}:${type}:${title}`;
  return "";
}

function updateMetadata(metadata, records, sourceMetadata) {
  const missingTitle = records.filter((record) => record.titleMissing).length;
  const missingWmsId = records.filter((record) => record.wmsIdMissing).length;
  const missingLivelabsId = records.filter((record) => record.livelabsIdMissing).length;
  const reviewCount = records.filter((record) => record.contentReviewState === "Content to review/remove").length;
  const next = { ...metadata, ...(sourceMetadata || {}) };
  delete next.public_contact_data_redacted;
  delete next.public_contact_redaction_label;
  next.internal_contact_data = true;
  next.contact_email_domain_policy = "Oracle internal contacts retained";
  next.quality_gaps = {
    ...(next.quality_gaps || {}),
    missing_title: missingTitle,
    missing_wms_id: missingWmsId,
    missing_livelabs_id: missingLivelabsId,
    content_to_review_or_remove: reviewCount
  };
  next.content_review_count = reviewCount;
  return next;
}

function writeJson(relativePath, current, source) {
  const sourceByKey = new Map();
  for (const sourceRecord of source.records || []) {
    const key = stableRecordKey(sourceRecord);
    if (!key) continue;
    if (sourceByKey.has(key)) throw new Error(`${relativePath}: duplicate source recovery key ${key}`);
    sourceByKey.set(key, sourceRecord);
  }
  current.records = (current.records || []).map((record) => {
    const key = stableRecordKey(record);
    return normalizeRecord(record, key ? sourceByKey.get(key) : undefined);
  });
  current.metadata = updateMetadata(current.metadata, current.records, null);
  fs.writeFileSync(path.join(projectRoot, relativePath), `${JSON.stringify(current)}\n`, "utf8");
  return current.records.length;
}

function restoreHtmlContacts() {
  const filePath = path.join(projectRoot, "index.html");
  const current = fs.readFileSync(filePath, "utf8");
  if (!current.includes(redactionLabel)) return 0;
  throw new Error(
    "Unsafe positional HTML contact restoration is disabled. Regenerate the internal HTML from authoritative keyed source data instead."
  );
}

const sourceInventory = readGitJson("data/portfolio_inventory.json");
const inventoryCount = writeJson("data/portfolio_inventory.json", readJson("data/portfolio_inventory.json"), sourceInventory);
const emailCount = restoreHtmlContacts();
console.log(JSON.stringify({ inventoryCount, canonicalPayload: "data/portfolio_inventory.json", htmlEmailValuesRestored: emailCount }, null, 2));
