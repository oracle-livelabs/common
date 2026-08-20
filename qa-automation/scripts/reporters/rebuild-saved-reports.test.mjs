import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { rebuildSavedReports } from "./rebuild-saved-reports.mjs";

test("rebuilds shared latest and history pages from saved report JSON without running tests", () => {
  const reportsBase = fs.mkdtempSync(path.join(os.tmpdir(), "livelabs-saved-reports-"));
  const latestDir = path.join(reportsBase, "regression", "latest");
  fs.mkdirSync(latestDir, { recursive: true });

  try {
    const summary = regressionSummary("2026-07-30T12-00-00-000Z");
    fs.writeFileSync(path.join(latestDir, "summary.json"), JSON.stringify(summary), "utf-8");
    fs.writeFileSync(path.join(latestDir, "summary.html"), "old report layout", "utf-8");

    const results = rebuildSavedReports(reportsBase);

    assert.deepEqual(
      results.map((result) => [result.channel, result.runCount]),
      [
        ["par", 0],
        ["regression", 1],
      ],
    );
    assert.equal(results[1].restoredLatestRun, true);

    const immutableReport = path.join(
      reportsBase,
      "regression",
      "runs",
      summary.runId,
      "summary.html",
    );
    const latestReport = path.join(reportsBase, "regression", "latest", "summary.html");
    const historyPage = path.join(reportsBase, "regression", "index.html");

    assert.match(fs.readFileSync(immutableReport, "utf-8"), /Overall regression results/);
    assert.match(fs.readFileSync(latestReport, "utf-8"), /Overall regression results/);
    assert.doesNotMatch(fs.readFileSync(latestReport, "utf-8"), /old report layout/);
    assert.match(fs.readFileSync(historyPage, "utf-8"), new RegExp(summary.runId));
    assert.match(fs.readFileSync(historyPage, "utf-8"), /Open latest/);
    assert.match(
      fs.readFileSync(path.join(reportsBase, "par", "index.html"), "utf-8"),
      /No completed reports have been saved yet/,
    );
  } finally {
    fs.rmSync(reportsBase, { recursive: true, force: true });
  }
});

test("selects the newest immutable run as latest and preserves every saved run", () => {
  const reportsBase = fs.mkdtempSync(path.join(os.tmpdir(), "livelabs-report-order-"));

  try {
    const older = regressionSummary("2026-07-20T12-00-00-000Z", "2026-07-20T12:00:00.000Z");
    const newer = regressionSummary("2026-07-30T12-00-00-000Z", "2026-07-30T12:00:00.000Z");
    writeRun(reportsBase, older);
    writeRun(reportsBase, newer);

    const [result] = rebuildSavedReports(reportsBase, { channels: ["regression"] });

    assert.equal(result.runCount, 2);
    assert.equal(result.latestRunId, newer.runId);
    const latest = JSON.parse(
      fs.readFileSync(path.join(reportsBase, "regression", "latest", "summary.json"), "utf-8"),
    );
    const history = JSON.parse(
      fs.readFileSync(path.join(reportsBase, "regression", "history.json"), "utf-8"),
    );
    assert.equal(latest.runId, newer.runId);
    assert.deepEqual(
      history.runs.map((run) => run.runId),
      [newer.runId, older.runId],
    );

    const secondPass = rebuildSavedReports(reportsBase, { channels: ["regression"] });
    assert.equal(secondPass[0].rebuiltRunCount, 0);
  } finally {
    fs.rmSync(reportsBase, { recursive: true, force: true });
  }
});

test("upgrades saved PAR reports and adds the shared PAR retest page", () => {
  const reportsBase = fs.mkdtempSync(path.join(os.tmpdir(), "livelabs-par-upgrade-"));
  const latestDir = path.join(reportsBase, "par", "latest");
  fs.mkdirSync(latestDir, { recursive: true });

  try {
    const summary = parSummary("2026-07-30T13-00-00-000Z");
    fs.writeFileSync(path.join(latestDir, "summary.json"), JSON.stringify(summary), "utf-8");
    fs.writeFileSync(path.join(latestDir, "par-links.html"), "old PAR report layout", "utf-8");

    const [result] = rebuildSavedReports(reportsBase, { channels: ["par"] });

    assert.equal(result.runCount, 1);
    assert.equal(result.restoredLatestRun, true);
    const latestReport = fs.readFileSync(
      path.join(reportsBase, "par", "latest", "par-links.html"),
      "utf-8",
    );
    assert.match(latestReport, /name="livelabs-qa-par-renderer" content="par-table-v5"/);
    assert.doesNotMatch(latestReport, /old PAR report layout/);
    assert.ok(
      fs.existsSync(path.join(reportsBase, "par", "latest", "par-retest-list.html")),
    );

    const secondPass = rebuildSavedReports(reportsBase, { channels: ["par"] });
    assert.equal(secondPass[0].rebuiltRunCount, 0);
  } finally {
    fs.rmSync(reportsBase, { recursive: true, force: true });
  }
});

test("VM startup restores shared reports before rebuilding their indexes", () => {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const entrypoint = fs.readFileSync(
    path.join(projectRoot, "deploy", "vm", "jenkins", "entrypoint.sh"),
    "utf-8",
  );
  const containerfile = fs.readFileSync(
    path.join(projectRoot, "deploy", "vm", "jenkins", "Containerfile"),
    "utf-8",
  );

  const restoreIndex = entrypoint.indexOf("livelabs-qa-restore-reports");
  const rebuildIndex = entrypoint.indexOf("rebuild-saved-reports.mjs");
  assert.ok(restoreIndex >= 0);
  assert.ok(rebuildIndex > restoreIndex);
  assert.match(containerfile, /COPY scripts\/reporters\/rebuild-saved-reports\.mjs/);
  assert.match(containerfile, /COPY deploy\/vm\/scripts\/restore-reports\.sh/);
  assert.doesNotMatch(entrypoint, /Run the matching Jenkins job to create the first report/);
});

function writeRun(reportsBase, summary) {
  const runDir = path.join(reportsBase, "regression", "runs", summary.runId);
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, "summary.json"), JSON.stringify(summary), "utf-8");
}

function regressionSummary(runId, startedAt = "2026-07-30T12:00:00.000Z") {
  return {
    runId,
    reportChannel: "regression",
    status: "passed",
    startedAt,
    endedAt: startedAt,
    durationMs: 1000,
    counts: {
      total: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
      timedOut: 0,
      interrupted: 0,
      unexpected: 0,
      flaky: 0,
    },
    failureCategories: [],
    catalogItems: [
      {
        key: "workshop-100",
        status: "passed",
        issueCount: 0,
        counts: { total: 1 },
        sections: ["Generated Workshop Overview"],
        catalogItem: {
          type: "workshop",
          id: "100",
          title: "Saved workshop",
          absolute_url: "https://livelabs.oracle.com/example",
        },
        issues: [],
        tests: [
          {
            section: "Generated Workshop Overview",
            status: "passed",
            expectedStatus: "passed",
            file: "tests/platform/generated/workshopOverview.generated.spec.ts",
            line: 10,
            attachments: [],
          },
        ],
      },
    ],
    failures: [],
    sections: [],
  };
}

function parSummary(runId) {
  return {
    ...regressionSummary(runId, "2026-07-30T13:00:00.000Z"),
    reportChannel: "par",
    runType: "par",
    catalogItems: [],
    parAudit: {
      schema_version: 1,
      has_data: true,
      tests_with_data: 1,
      pages_scanned: 1,
      counts: { total: 1, working: 1, broken: 0, unverified: 0 },
      catalog: {
        counts: { total: 1, working: 1, broken: 0, unverified: 0 },
        links: [],
      },
      scan_errors: [],
    },
  };
}
