import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildFixPrompt,
  buildRetestPlan,
  normalizePayload,
  selectedChecksFromPayload,
  writeFixHandoff,
} from "./report-review-action.mjs";

const SAMPLE_PAYLOAD = {
  type: "retest",
  sourceExecutionId: "run-123",
  tests: [
    {
      testId: "workshop:100",
      testName: "Sample workshop",
      testPath: "tests/platform/generated/workshopOverview.generated.spec.ts",
      suiteName: "Generated Workshop Overview",
      lastStatus: "failed",
      checks: [
        {
          testId: "workshop:100:overview",
          testName: "validates indexed workshop: Sample workshop",
          testPath: "tests/platform/generated/workshopOverview.generated.spec.ts",
          suiteName: "Generated Workshop Overview",
          lastStatus: "failed",
          failureReason: "Broken visible image",
          stackTrace: "tests/platform/generated/workshopOverview.generated.spec.ts:47",
        },
        {
          testId: "workshop:100:overview-duplicate",
          testName: "validates indexed workshop: Sample workshop",
          testPath: "tests/platform/generated/workshopOverview.generated.spec.ts",
          suiteName: "Generated Workshop Overview",
          lastStatus: "failed",
        },
      ],
    },
  ],
};

test("normalizePayload rejects an empty review list", () => {
  assert.throws(
    () => normalizePayload({ type: "retest", tests: [] }, "retest"),
    /Retest List is empty/,
  );
});

test("selectedChecksFromPayload dedupes repeated tests", () => {
  const payload = normalizePayload(SAMPLE_PAYLOAD, "retest");
  const selected = selectedChecksFromPayload(payload);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].testPath, "tests/platform/generated/workshopOverview.generated.spec.ts");
});

test("buildRetestPlan runs only the selected test paths and marker", () => {
  const payload = normalizePayload(SAMPLE_PAYLOAD, "retest");
  const plan = buildRetestPlan(payload, { outputDir: path.join(os.tmpdir(), "qa-review-test-output") });
  assert.deepEqual(plan.checks.map((item) => item.testName), ["validates indexed workshop: Sample workshop"]);
  assert(plan.command.includes("tests/platform/generated/workshopOverview.generated.spec.ts"));
  assert(plan.command.includes("--marker"));
  assert(plan.command.includes("validates indexed workshop: Sample workshop"));
});

test("buildRetestPlan reports selected tests that no longer exist", () => {
  const payload = normalizePayload(
    {
      type: "retest",
      tests: [{ testName: "missing", testPath: "tests/not-here/missing.spec.ts" }],
    },
    "retest",
  );

  assert.throws(() => buildRetestPlan(payload), /no longer exist/);
});

test("buildFixPrompt includes selected failures and rerun instruction", () => {
  const payload = normalizePayload({ ...SAMPLE_PAYLOAD, type: "fix" }, "fix");
  const prompt = buildFixPrompt(payload);
  assert.match(prompt, /Fix Selected LiveLabs QA Tests/);
  assert.match(prompt, /Broken visible image/);
  assert.match(prompt, /report-review-action\.mjs retest/);
});

test("writeFixHandoff writes a payload and prompt", () => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "qa-review-fix-"));
  const payload = normalizePayload({ ...SAMPLE_PAYLOAD, type: "fix" }, "fix");
  const handoff = writeFixHandoff(payload, outputRoot);

  assert(fs.existsSync(handoff.payloadFile));
  assert(fs.existsSync(handoff.promptFile));
  assert.match(fs.readFileSync(handoff.promptFile, "utf-8"), /Sample workshop/);
});
