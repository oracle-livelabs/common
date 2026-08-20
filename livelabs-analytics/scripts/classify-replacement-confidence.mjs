#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const files = [];
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--file" && args[index + 1]) files.push(path.resolve(projectRoot, args[++index]));
}
if (!files.length) files.push(path.join(projectRoot, "index.html"));

function stripTags(value) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&mdash;/g, "—")
    .trim();
}

function classification(score) {
  if (score >= 85) return { filter: "strong algorithmic candidate", label: "Strong algorithmic candidate" };
  if (score >= 70) return { filter: "review required", label: "Review required" };
  return { filter: "no reliable candidate", label: "No reliable candidate" };
}

function normalizeFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  const marker = '<section class="section" id="replacement-suggestions">';
  const start = original.indexOf(marker);
  if (start < 0) throw new Error(`Replacement Suggestions section not found: ${filePath}`);
  const end = original.indexOf('<section class="section" id="disabled-content">', start);
  if (end < 0) throw new Error(`Disabled Content section not found after replacements: ${filePath}`);
  const before = original.slice(0, start);
  const section = original.slice(start, end);
  const after = original.slice(end);
  let changed = 0;
  const rowPattern = /<tr class="expandable-row"[^>]*data-detail-row-id="replacement-recommendations-detail-[^"]+"[^>]*>[\s\S]*?<\/tr>/g;
  const nextSection = section.replace(rowPattern, (row) => {
    const cells = [...row.matchAll(/<td(?: [^>]*)?>([\s\S]*?)<\/td>/g)];
    if (cells.length < 12) return row;
    const score = Number(stripTags(cells[9][1]).replace(/,/g, ""));
    if (!Number.isFinite(score)) return row;
    const next = classification(score);
    const cell = cells[10][0]
      .replace(/data-filter-value="[^"]*"/, `data-filter-value="${next.filter}"`)
      .replace(/data-sort-value="[^"]*"/, `data-sort-value="${next.filter}"`)
      .replace(/>([\s\S]*?)<\/td>$/, `>${next.label}</td>`);
    if (cell === cells[10][0]) return row;
    changed += 1;
    return row.replace(cells[10][0], cell);
  });
  const explanatoryText = "Best current replacement for each row. Replacement chains are not expanded.";
  const replacementText = "Best algorithmic successor candidate for each row. Candidates require governance confirmation before retirement.";
  const finalSection = nextSection.replace(explanatoryText, replacementText);
  if (finalSection !== section) fs.writeFileSync(filePath, `${before}${finalSection}${after}`, "utf8");
  return { file: filePath, changed, modified: finalSection !== section };
}

const results = files.map(normalizeFile);
console.log(JSON.stringify({ results }, null, 2));
