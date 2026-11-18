#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function classifyRunOutcome(reportsRoot, attemptId) {
  const runsRoot = path.join(reportsRoot, "runs");
  if (!fs.existsSync(runsRoot)) return "failed";

  const summaries = fs
    .readdirSync(runsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(runsRoot, entry.name, "summary.json"))
    .filter((filePath) => fs.existsSync(filePath));

  for (const filePath of summaries) {
    try {
      const summary = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (summary.attemptId !== attemptId) continue;
      if (summary.completion?.state !== "completed") return "failed";
      return Number(summary.counts?.unexpected || 0) > 0 ? "completed-with-findings" : "passed";
    } catch {
      // Ignore a partial or unrelated report and keep looking.
    }
  }

  return "failed";
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const reportsRoot = process.argv[2];
  const attemptId = process.argv[3];
  if (!reportsRoot || !attemptId) {
    process.stderr.write("Usage: node scripts/classify-run-outcome.mjs <reports-root> <attempt-id>\n");
    process.exit(2);
  }
  process.stdout.write(`${classifyRunOutcome(path.resolve(reportsRoot), attemptId)}\n`);
}
