import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  issueDetailHtml,
  reportHistoryPageHtml,
  resultsCsv,
  writeReportHistory,
  writeSummaryFiles,
} from "./root-summary-reporter.mjs";

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
test("renders PAR scan failures with the actual missing source", () => {
  const html = issueDetailHtml(
    {
      code: "PAR_SCAN_INCOMPLETE",
      label: "PAR scan incomplete",
      severity: "major",
      message: "One page could not be scanned.",
      details: [
        {
          label: "Preview instructions: Getting Started",
          page_url: "https://example.com/workshop/missing.md",
          error: "Workshop source returned HTTP 404.",
        },
      ],
    },
    0,
  );

  assert.match(html, /Source page not scanned/);
  assert.match(html, /What failed/);
  assert.match(html, /What remained untested/);
  assert.match(html, /What to do/);
  assert.match(html, /Correct the missing source path/);
  assert.match(html, /Workshop source returned HTTP 404/);
  assert.match(html, /https:\/\/example\.com\/workshop\/missing\.md/);
  assert.match(html, /Open failing source/);
  assert.doesNotMatch(html, /<summary>Issue details<\/summary>/);
});
test("explains PAR source timeouts without calling the PAR link broken", () => {
  const html = issueDetailHtml(
    {
      code: "PAR_SCAN_INCOMPLETE",
      label: "PAR scan incomplete",
      severity: "major",
      message: "One page could not be scanned.",
      details: [
        {
          label: "Preview instructions: Lab 1",
          page_url: "https://example.com/workshop/lab-1.md",
          error: "apiRequestContext.get: Timeout 45000ms exceeded.",
        },
      ],
    },
    0,
  );

  assert.match(html, /did not return the page within 45 seconds/);
  assert.match(html, /does not prove it was deleted/);
  assert.match(html, /<summary>Technical details<\/summary>/);
  assert.match(html, /Timeout 45000ms exceeded/);
});

test("renders actionable stale PAR details on the tested-item page", () => {
  const html = issueDetailHtml(
    {
      code: "STALE_PAR_LINK",
      label: "Stale PAR link",
      severity: "major",
      message: "One PAR link is broken.",
      details: [
        {
          status: "broken",
          object_name: "starter-data.zip",
          http_status: 404,
          attempts: 1,
          masked_url: "https://objectstorage.example.com/p/***/n/ns/b/assets/o/starter-data.zip",
          sources: [
            {
              label: "Preview instructions: Lab 3",
              pageUrl: "https://example.com/workshop?lab=3",
              sourceFileUrl: "https://example.com/lab-3.md",
              sourceLine: 209,
              section: "Task 3: Download data",
              sourceExcerpt: "wget https://objectstorage.example.com/p/***/n/ns/b/assets/o/starter-data.zip",
            },
          ],
        },
      ],
    },
    0,
  );

  assert.match(html, /HTTP 404/);
  assert.match(html, /cannot be downloaded/);
  assert.match(html, /Fix: Replace this PAR/);
  assert.match(html, /Markdown line 209/);
  assert.match(html, /Open affected lab/);
  assert.doesNotMatch(html, />Open source</);
  assert.match(html, /class="par-finding-list"/);
  assert.doesNotMatch(html, /class="route-grid"/);
});

test("renders a selectable history of saved report runs", () => {
  const html = reportHistoryPageHtml({
    report_channel: "par",
    landing_page: "par-links.html",
    runs: [
      {
        runId: "2026-07-27T08-20-53-917Z",
        status: "failed",
        startedAt: "2026-07-27T08:20:53.917Z",
        durationMs: 92000,
        itemsTested: 5,
        pagesScanned: 69,
        parBroken: 0,
        parUnverified: 0,
        scanProblems: 1,
        unexpected: 1,
        href: "runs/2026-07-27T08-20-53-917Z/par-links.html",
      },
      {
        runId: "2026-07-20T08-00-00-000Z",
        status: "passed",
        startedAt: "2026-07-20T08:00:00.000Z",
        durationMs: 81000,
        itemsTested: 5,
        pagesScanned: 65,
        parBroken: 0,
        parUnverified: 0,
        scanProblems: 0,
        unexpected: 0,
        href: "runs/2026-07-20T08-00-00-000Z/par-links.html",
      },
    ],
  });

  assert.match(html, /Choose a saved run/);
  assert.match(html, /Open selected run/);
  assert.match(html, /Open latest/);
  assert.match(html, /latest\/par-links\.html/);
  assert.match(html, /runs\/2026-07-27T08-20-53-917Z\/par-links\.html/);
  assert.match(html, /runs\/2026-07-20T08-00-00-000Z\/par-links\.html/);
  assert.match(html, /69 pages/);
  assert.match(html, /PAR audit/);
  assert.match(html, /Pages not scanned/);
  assert.doesNotMatch(html, /Needs review/);
  assert.match(html, /Passed/);
  assert.doesNotMatch(html, /http-equiv="refresh"/);
});

test("labels overall regression history rows separately from PAR audits", () => {
  const html = reportHistoryPageHtml({
    report_channel: "regression",
    landing_page: "summary.html",
    runs: [
      {
        runId: "2026-07-27T23-00-00-000Z",
        reportChannel: "regression",
        runType: "regression",
        status: "failed",
        startedAt: "2026-07-27T23:00:00.000Z",
        durationMs: 120000,
        itemsTested: 50,
        issuesFound: 4,
        unexpected: 4,
        href: "runs/2026-07-27T23-00-00-000Z/summary.html",
      },
    ],
  });

  assert.match(html, /Overall regression/);
  assert.match(html, /QA Hub home/);
  assert.match(html, /Test failures/);
  assert.match(html, /50 items/);
  assert.doesNotMatch(html, /PAR audit/);
});

test("renders overall regression items as searchable paginated expandable table rows", () => {
  const reportsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "livelabs-report-table-"));
  const outputDir = path.join(reportsRoot, "latest");
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    writeSummaryFiles(
      outputDir,
      {
        runId: "2026-07-30T10-00-00-000Z",
        reportChannel: "regression",
        status: "failed",
        startedAt: "2026-07-30T10:00:00.000Z",
        endedAt: "2026-07-30T10:01:00.000Z",
        durationMs: 60000,
        counts: {
          total: 1,
          passed: 0,
          failed: 1,
          skipped: 0,
          timedOut: 0,
          interrupted: 0,
          unexpected: 1,
          flaky: 0,
        },
        failureCategories: [{ code: "BROKEN_VISIBLE_LINK", label: "Broken visible link", count: 1 }],
        catalogItems: [
          {
            key: "workshop-877",
            status: "failed",
            issueCount: 1,
            counts: { total: 1 },
            sections: ["Generated Tenancy Instructions"],
            catalogItem: {
              type: "workshop",
              id: "877",
              title: "Example workshop",
              absolute_url: "https://livelabs.oracle.com/example",
            },
            issues: [
              {
                code: "BROKEN_VISIBLE_LINK",
                label: "Broken visible link",
                severity: "major",
                message: "One visible link did not load.",
              },
            ],
            tests: [
              {
                section: "Generated Tenancy Instructions",
                status: "failed",
                expectedStatus: "passed",
                file: "tests/platform/generated/tenancyInstructions.generated.spec.ts",
                line: 42,
                attachments: [],
              },
            ],
          },
        ],
        failures: [
          {
            title: "validates indexed workshop: Example workshop [877]",
            titlePath: [
              "chromium",
              "platform/generated/tenancyInstructions.generated.spec.ts",
              "validates indexed workshop: Example workshop [877]",
            ],
            file: "tests/platform/generated/tenancyInstructions.generated.spec.ts",
            line: 42,
            section: "Generated Tenancy Instructions",
            status: "failed",
            expectedStatus: "passed",
            classification: {
              code: "BROKEN_VISIBLE_LINK",
              label: "Broken visible link",
            },
            catalogItem: {
              type: "workshop",
              id: "877",
              title: "Example workshop",
              normalized_href: "https://livelabs.oracle.com/example",
            },
            finalUrl: "https://livelabs.oracle.com/example",
            finalTitle: "Example workshop",
            failedStep: {
              title: "Check visible links",
              path: ["Check visible links"],
              error: "A visible link returned HTTP 404.",
            },
            errors: ["A visible link returned HTTP 404."],
            attachments: [],
            steps: [],
            issues: [
              {
                code: "BROKEN_VISIBLE_LINK",
                label: "Broken visible link",
                severity: "major",
                message: "One visible link did not load.",
              },
            ],
            bugSummary: "BROKEN_VISIBLE_LINK: One visible link did not load.",
          },
        ],
        sections: [],
      },
      reportsRoot,
    );

    const html = fs.readFileSync(path.join(outputDir, "summary.html"), "utf-8");
    assert.match(html, /Overall regression results/);
    assert.match(html, /name="livelabs-qa-renderer" content="regression-table-v3"/);
    assert.match(html, /role="table" aria-label="Overall regression results"/);
    assert.match(html, /<details class="result-row failed"\s+id="item-workshop-877"/);
    assert.match(html, /<summary class="result-summary">/);
    assert.match(html, /\.result-row\[open\] > \.result-summary \{\s+background: #eaf4fb/);
    assert.match(html, /data-item-search/);
    assert.match(html, /data-item-page-size/);
    assert.match(html, /data-item-previous/);
    assert.match(html, /data-item-next/);
    assert.match(html, /Rows per page/);
    assert.match(html, /Technical details for developers/);
    assert.match(html, /Checks run \(1\)/);
    assert.match(html, /One visible link did not load/);
    assert.match(html, /Next action:/);
    assert.doesNotMatch(html, /<summary>Issue details<\/summary>/);
    assert.doesNotMatch(html, /<summary>Checks run \(1\)<\/summary>/);
    assert.doesNotMatch(html, /<summary>Bug report details<\/summary>/);
    assert.doesNotMatch(html, /What the test did/);
    assert.match(html, /results\.csv/);
    assert.match(html, /latest\.runId !== loadedRunId/);
    assert.doesNotMatch(html, /<dialog/);
    assert.doesNotMatch(html, /showModal/);
    assert.doesNotMatch(html, /href="#item-workshop-877"/);
  } finally {
    fs.rmSync(reportsRoot, { recursive: true, force: true });
  }
});

test("renders 500 regression items with bounded 25, 50, and 100 row pages", () => {
  const reportsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "livelabs-regression-scale-"));
  const outputDir = path.join(reportsRoot, "latest");
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    const catalogItems = Array.from({ length: 500 }, (_, index) => ({
      key: `workshop-${index + 1}`,
      status: "passed",
      issueCount: 0,
      counts: { total: 1 },
      sections: ["Generated Workshop Overview"],
      catalogItem: {
        type: index % 10 === 0 ? "livestack" : "workshop",
        id: String(index + 1),
        title: `Catalog item ${index + 1}`,
        absolute_url: `https://livelabs.oracle.com/example/${index + 1}`,
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
    }));

    writeSummaryFiles(
      outputDir,
      {
        runId: "2026-07-30T11-00-00-000Z",
        reportChannel: "regression",
        status: "passed",
        startedAt: "2026-07-30T11:00:00.000Z",
        endedAt: "2026-07-30T11:10:00.000Z",
        durationMs: 600000,
        counts: {
          total: 500,
          passed: 500,
          failed: 0,
          skipped: 0,
          timedOut: 0,
          interrupted: 0,
          unexpected: 0,
          flaky: 0,
        },
        failureCategories: [],
        catalogItems,
        failures: [],
        sections: [],
      },
      reportsRoot,
    );

    const html = fs.readFileSync(path.join(outputDir, "summary.html"), "utf-8");
    assert.equal((html.match(/<details class="result-row[^>]+data-item-row/g) || []).length, 500);
    assert.match(html, /<option value="25">25<\/option>/);
    assert.match(html, /<option value="50">50<\/option>/);
    assert.match(html, /<option value="100">100<\/option>/);
    assert.match(html, /matched\.slice\(start, start \+ size\)/);
    assert.match(html, /if \(row\.hidden\) row\.open = false/);
  } finally {
    fs.rmSync(reportsRoot, { recursive: true, force: true });
  }
});

test("builds report history from immutable run folders newest first", () => {
  const reportsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "livelabs-report-history-"));
  try {
    writeRunSummary(reportsRoot, "2026-07-20T08-00-00-000Z", {
      status: "passed",
      startedAt: "2026-07-20T08:00:00.000Z",
      scanProblems: 0,
    });
    writeRunSummary(reportsRoot, "2026-07-27T08-20-53-917Z", {
      status: "failed",
      startedAt: "2026-07-27T08:20:53.917Z",
      scanProblems: 1,
    });

    writeReportHistory(reportsRoot, "par-links.html");

    const history = JSON.parse(fs.readFileSync(path.join(reportsRoot, "history.json"), "utf-8"));
    const html = fs.readFileSync(path.join(reportsRoot, "index.html"), "utf-8");
    const newestReport = fs.readFileSync(
      path.join(reportsRoot, "runs", "2026-07-27T08-20-53-917Z", "par-links.html"),
      "utf-8",
    );
    const oldestReport = fs.readFileSync(
      path.join(reportsRoot, "runs", "2026-07-20T08-00-00-000Z", "par-links.html"),
      "utf-8",
    );
    assert.equal(history.runs.length, 2);
    assert.equal(history.runs[0].runId, "2026-07-27T08-20-53-917Z");
    assert.equal(history.runs[1].runId, "2026-07-20T08-00-00-000Z");
    assert.match(html, /runs\/2026-07-27T08-20-53-917Z\/par-links\.html/);
    assert.match(html, /runs\/2026-07-20T08-00-00-000Z\/par-links\.html/);
    assert.match(newestReport, /\.\.\/2026-07-20T08-00-00-000Z\/par-links\.html/);
    assert.match(newestReport, /Previous report/);
    assert.match(oldestReport, /\.\.\/2026-07-27T08-20-53-917Z\/par-links\.html/);
    assert.match(oldestReport, /Next report/);
  } finally {
    fs.rmSync(reportsRoot, { recursive: true, force: true });
  }
});

function writeRunSummary(reportsRoot, runId, options) {
  const runDir = path.join(reportsRoot, "runs", runId);
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(
    path.join(runDir, "summary.json"),
    JSON.stringify({
      runId,
      reportChannel: "par",
      status: options.status,
      startedAt: options.startedAt,
      endedAt: options.startedAt,
      durationMs: 1000,
      counts: { total: 5, unexpected: options.status === "passed" ? 0 : 1 },
      failureCategories: [],
      catalogItems: [{}, {}, {}, {}, {}],
      parAudit: {
        schema_version: 1,
        has_data: true,
        pages_scanned: 10,
        counts: { total: 0, working: 0, broken: 0, unverified: 0 },
        catalog: {
          counts: { total: 0, working: 0, broken: 0, unverified: 0 },
          links: [],
        },
        scan_errors: Array.from({ length: options.scanProblems }, () => ({ error: "HTTP 404" })),
      },
    }),
  );
}
