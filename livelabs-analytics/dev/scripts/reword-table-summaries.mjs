#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const replacements = {
  "assets/fragments/at-risk-content.html": [
    [
      "Rows to review next. Higher retire score is worse. The Top 100 workshop and sprint tables below show 10 rows first and continue through filtering and pagination.",
      "Rows requiring review. Higher scores indicate greater retirement risk. Workshop and Sprint tables show 10 rows first and support filtering and pagination."
    ],
    ["Higher retire score is worse.", "Higher scores indicate greater retirement risk."],
    [
      "Higher is worse. At-Risk rows use this score with rule gates, so the score explains priority but does not retire content by itself.",
      "Higher scores indicate greater retirement risk. At-Risk rows also use rule gates, so the score prioritizes review but does not retire content by itself."
    ]
  ],
  "assets/fragments/retire-now-content.html": [
    [
      "Rows with the strongest retirement signal. Higher retire score is worse. The Top 100 workshop and sprint tables below show 10 rows first and continue through filtering and pagination.",
      "Rows with the strongest retirement signals. Higher scores indicate greater retirement risk. Workshop and Sprint tables show 10 rows first and support filtering and pagination."
    ],
    ["Higher retire score is worse.", "Higher scores indicate greater retirement risk."],
    [
      "Higher is worse. Retire-Now rows are selected by score plus stricter gates, so they are the strongest retirement candidates, not just the highest raw scores.",
      "Higher scores indicate greater retirement risk. Retire-Now rows also pass stricter gates, so they represent the strongest retirement candidates, not simply the highest scores."
    ]
  ],
  "assets/fragments/replacement-suggestions.html": [
    [
      "Best algorithmic successor candidate for each row. Candidates require governance confirmation before retirement.",
      "Potential successors ranked by similarity. Review each recommendation before retirement."
    ],
    [
      "Higher is better. A higher score means the candidate is a stronger replacement match.",
      "Higher scores indicate stronger replacement matches."
    ]
  ],
  "assets/fragments/disabled-content.html": [
    [
      "Use these tables for cleanup planning. Disabled Content has no scoring formula; it is included from disabled publish state fields for audit context. Disabled date is the first date seen in available WMS snapshots.",
      "Disabled content for cleanup review. No score is applied; rows are included from disabled publish-state data."
    ]
  ]
};

for (const [relativePath, pairs] of Object.entries(replacements)) {
  const filePath = path.join(projectRoot, relativePath);
  let html = fs.readFileSync(filePath, "utf8");
  for (const [before, after] of pairs) html = html.split(before).join(after);
  fs.writeFileSync(filePath, html, "utf8");
  console.log(JSON.stringify({ file: relativePath, updated: true }));
}
