import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { resultsCsv } from "./root-summary-reporter.mjs";

test("results CSV keeps one row per issue and masks sensitive URL values", () => {
  const parToken = "private-token-value";
  const csv = resultsCsv({
    runId: "2026-07-14T10-00-00Z",
    startedAt: "2026-07-14T10:00:00.000Z",
    catalogItems: [
      {
        status: "failed",
        catalogItem: {
          type: "workshop",
          id: "workshop-42",
          title: "Example workshop",
          absolute_url: `https://objectstorage.example.com/p/${parToken}/n/ns/b/bucket/o/file.zip?session=12345`,
        },
        issues: [
          {
            code: "BROKEN_VISIBLE_IMAGE",
            label: "Broken visible image",
            severity: "major",
            message: `Two images failed to load at ${path.join(process.cwd(), "tests", "example.spec.ts")}.`,
            section: "Workshop overview",
            file: "tests/platform/generated/workshopOverview.generated.spec.ts",
            line: 42,
          },
          {
            code: "BROKEN_VISIBLE_LINK",
            label: "Broken visible link",
            severity: "major",
            message: "One visible link returned 404.",
            section: "Workshop overview",
            file: "tests/platform/generated/workshopOverview.generated.spec.ts",
            line: 42,
          },
        ],
        tests: [
          {
            section: "Workshop overview",
            file: "tests/platform/generated/workshopOverview.generated.spec.ts",
            line: 42,
            finalUrl: "https://livelabs.oracle.com/workshop?session=12345",
          },
        ],
      },
      {
        status: "passed",
        catalogItem: { type: "livestack", id: "livestack-7", title: "Example LiveStack" },
        issues: [],
        tests: [{ section: "LiveStack overview", finalUrl: "https://livelabs.oracle.com/livestack" }],
      },
    ],
    sections: [],
  });

  const lines = csv.trim().split("\n");
  assert.equal(lines.length, 4);
  assert.match(csv, /BROKEN_VISIBLE_IMAGE/);
  assert.match(csv, /BROKEN_VISIBLE_LINK/);
  assert.match(csv, /livestack-7/);
  assert.doesNotMatch(csv, new RegExp(parToken));
  assert.doesNotMatch(csv, /session=12345/);
  assert.match(csv, /\/p\/\*\*\*/);
  assert.match(csv, /session=\*\*\*/);
  assert.doesNotMatch(csv, new RegExp(process.cwd().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(csv, /<qa-automation>/);
});