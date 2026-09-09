#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const htmlPath = path.join(root, "index.html");
const fragmentDirectory = path.join(root, "assets", "fragments");
const sections = [
  {
    id: "top-performers",
    label: "Top Performers",
    description: "Load the scored Top 100 workshop and sprint review tables when you need them.",
  },
  {
    id: "at-risk-content",
    label: "At-Risk Content",
    description: "Load the at-risk review queue when you need to assess retirement signals.",
  },
  {
    id: "retire-now-content",
    label: "Retire-Now Content",
    description: "Load the governed retirement review queue when you need it.",
  },
  {
    id: "replacement-suggestions",
    label: "Replacement Suggestions",
    description: "Load the algorithmic successor review queue when you need it.",
  },
  {
    id: "disabled-content",
    label: "Disabled Content",
    description: "Load the disabled-content audit tables when you need them.",
  },
];

function sectionBounds(html, id) {
  const opening = `<section class="section" id="${id}">`;
  const start = html.indexOf(opening);
  if (start < 0) throw new Error(`Section not found: ${id}`);
  const tagPattern = /<\/?section\b[^>]*>/gi;
  tagPattern.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = tagPattern.exec(html))) {
    if (match.index < start) continue;
    if (match[0].startsWith("</")) depth -= 1;
    else depth += 1;
    if (depth === 0) return { start, end: tagPattern.lastIndex };
  }
  throw new Error(`Section does not close: ${id}`);
}

function placeholder(section) {
  return `<section class="section lazy-section" id="${section.id}" data-lazy-section="${section.id}" data-lazy-src="./assets/fragments/${section.id}.html" aria-busy="false"><div class="section-head"><div class="section-head-top"><h2>${section.label}</h2></div><p>${section.description}</p></div><div class="lazy-section-panel"><p>This large review queue is loaded on demand so the dashboard opens quickly.</p><button class="lazy-section-button" type="button" data-load-lazy-section="${section.id}">Load ${section.label}</button></div></section>`;
}

let html = fs.readFileSync(htmlPath, "utf8");
if (html.includes('data-lazy-section="top-performers"')) {
  console.log("Dashboard review queues are already externalized.");
  process.exit(0);
}

const extracted = sections.map((section) => ({ section, ...sectionBounds(html, section.id) }));
fs.mkdirSync(fragmentDirectory, { recursive: true });
for (const item of extracted) {
  const fragment = html.slice(item.start, item.end);
  fs.writeFileSync(path.join(fragmentDirectory, `${item.section.id}.html`), `${fragment}\n`, "utf8");
}
for (const item of [...extracted].sort((left, right) => right.start - left.start)) {
  html = `${html.slice(0, item.start)}${placeholder(item.section)}${html.slice(item.end)}`;
}
fs.writeFileSync(htmlPath, html, "utf8");

const originalBytes = extracted.reduce((total, item) => total + item.end - item.start, 0);
console.log(JSON.stringify({
  externalized_sections: sections.map((section) => section.id),
  externalized_bytes: originalBytes,
  html_bytes: Buffer.byteLength(html),
}, null, 2));
