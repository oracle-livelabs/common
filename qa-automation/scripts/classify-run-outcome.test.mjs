import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { classifyRunOutcome } from "./classify-run-outcome.mjs";

test("distinguishes findings from incomplete runs", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "qa-outcome-"));
  try {
    writeSummary(root, "complete", { attemptId: "build-1", completion: { state: "completed" }, counts: { unexpected: 2 } });
    writeSummary(root, "incomplete", { attemptId: "build-2", completion: { state: "incomplete" }, counts: { unexpected: 1 } });
    assert.equal(classifyRunOutcome(root, "build-1"), "completed-with-findings");
    assert.equal(classifyRunOutcome(root, "build-2"), "failed");
    assert.equal(classifyRunOutcome(root, "missing"), "failed");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function writeSummary(root, runId, summary) {
  const directory = path.join(root, "runs", runId);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "summary.json"), JSON.stringify(summary));
}
