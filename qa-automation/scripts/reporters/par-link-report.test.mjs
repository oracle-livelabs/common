import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildParAuditSummary,
  parLinksPageHtml,
  parRetestListPageHtml,
  readParAudits,
  sanitizeSensitiveText,
  writeParAuditDataFiles,
} from "./par-link-report.mjs";

test("builds token-safe catalog PAR outputs", () => {
  const catalogAudit = auditAttachment("catalog", "Workshop with stale asset", "broken", 404);
  const results = [
    testResult(catalogAudit, { type: "workshop", id: "3794", title: "Workshop with stale asset" }),
  ];

  const summary = buildParAuditSummary(results);
  assert.equal(summary.catalog.counts.broken, 1);
  assert.equal(summary.pages_scanned, 2);

  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "livelabs-par-report-"));
  try {
    writeParAuditDataFiles(outputDir, summary);
    const catalog = JSON.parse(fs.readFileSync(path.join(outputDir, "par-catalog-not-working.json"), "utf-8"));
    const html = parLinksPageHtml({
      runId: "test-run",
      startedAt: "2026-07-13T00:00:00.000Z",
      parAudit: summary,
    });

    assert.equal(catalog.links.length, 1);
    assert.match(html, /Workshop with stale asset/);
    assert.doesNotMatch(html, /Needs attention/);
    assert.match(html, /PAR audit results/);
    assert.match(html, /Download CSV/);
    assert.match(html, /All PAR links/);
    assert.match(html, /Working/);
    assert.match(html, /Broken.*The file cannot be downloaded and needs a replacement link/s);
    assert.match(html, /Not verified.*exact cause/s);
    assert.match(html, /Search results/);
    assert.match(html, /Rows per page/);
    assert.match(html, /File cannot be downloaded \(404\)/);
    assert.match(html, /Problem/);
    assert.match(html, /Next action/);
    assert.doesNotMatch(html, /Why it matters/);
    assert.match(html, /Replace this PAR/);
    assert.match(html, /Bucket/);
    assert.match(html, /eu-frankfurt-1/);
    assert.match(html, /assets\/demo\.zip/);
    assert.match(html, /Lab 1<\/span><strong>/);
    assert.match(html, /Task 8: Install sample data/);
    assert.match(html, /Step<\/span><strong>1\. Get sample file/);
    assert.match(html, /Markdown line 273/);
    assert.match(html, /Open exact lab/);
    assert.doesNotMatch(html, /Open source file/);
    assert.match(html, /name="livelabs-qa-par-renderer" content="par-table-v5"/);
    assert.match(html, /PAR Retest List/);
    assert.match(html, /Add to PAR Retest/);
    assert.match(html, /Remove from PAR Retest/);
    assert.match(html, /Copy full link/);
    assert.match(html, /Show full link/);
    assert.match(html, /Hide full link/);
    assert.ok(
      html.indexOf("<summary>Technical details for developers</summary>") <
        html.indexOf("PAR link (masked by default)"),
    );
    assert.match(html, /\/api\/par-link\/resolve/);
    assert.match(
      html,
      /data-source-url="https:\/\/livelabs\.oracle\.com\/cdn\/example\/lab-1\.md"/,
    );
    assert.match(html, /\.result-row\[open\] > \.result-summary \{ background: #eaf4fb/);
    assert.ok(html.indexOf('id="par-retest-items"') < html.indexOf("const retestItems"));
    assert.doesNotMatch(html, /Fix List|All safe JSON|<summary>Show<\/summary>/i);
    assert.doesNotMatch(html, /private-token-value/);
    const retestHtml = parRetestListPageHtml({
      runId: "test-run",
      startedAt: "2026-07-13T00:00:00.000Z",
      parAudit: summary,
    });
    assert.match(retestHtml, /Links ready to verify again/);
    assert.match(retestHtml, /CATALOG_ITEM_IDS/);
    assert.match(retestHtml, /Open Jenkins PAR audit/);
    assert.doesNotMatch(retestHtml, /private-token-value/);
    assert.ok(fs.existsSync(path.join(outputDir, "par-all-results.csv")));
    assert.ok(fs.existsSync(path.join(outputDir, "par-working.csv")));

    for (const file of fs.readdirSync(outputDir)) {
      assert.doesNotMatch(fs.readFileSync(path.join(outputDir, file), "utf-8"), /private-token-value/);
    }
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
});

test("reads only valid PAR audit attachments", () => {
  const valid = auditAttachment("catalog", "Workshop", "unverified", 503);
  const audits = readParAudits([
    { name: "par-audit.json", bodyText: JSON.stringify(valid) },
    { name: "par-audit.json", bodyText: "not-json" },
    { name: "other.json", bodyText: JSON.stringify(valid) },
  ]);

  assert.equal(audits.length, 1);
  assert.equal(audits[0].links[0].status, "unverified");
});

test("redacts PAR tokens, authentication headers, and APEX sessions from report text", () => {
  const unsafe = [
    "https://objectstorage.example.com/p/private-token-value/n/ns/b/bucket/o/file.zip",
    'HEAD "/p/relative-private-token/n/ns/b/bucket/o/file.zip"',
    "- cookie: session=private-cookie-value",
    "https://example.com/workshop?session=123456789&p_instance=987654321",
  ].join("\n");
  const safe = sanitizeSensitiveText(unsafe);

  assert.doesNotMatch(safe, /private-token-value/);
  assert.doesNotMatch(safe, /relative-private-token/);
  assert.doesNotMatch(safe, /private-cookie-value/);
  assert.doesNotMatch(safe, /123456789|987654321/);
  assert.match(safe, /\/p\/\*\*\*\/n\//);
  assert.match(safe, /cookie: \*\*\*/);
  assert.match(safe, /session=\*\*\*/);
});
test("links regression reports to PAR results and watches for a newer run", () => {
  const html = parLinksPageHtml({
    runId: "regression-run",
    reportChannel: "regression",
    startedAt: "2026-07-17T00:00:00.000Z",
    parAudit: buildParAuditSummary([]),
  });

  assert.match(html, /overall regression report/);
  assert.match(html, /\/par\/latest\/par-links\.html/);
  assert.match(html, /Tested items/);
  assert.match(html, /fetch\("summary\.json"/);
  assert.match(html, /latest\.runId !== loadedRunId/);
});

test("shows a complete PAR scan failure explanation on the PAR page", () => {
  const audit = {
    schema_version: 1,
    scope: "catalog",
    source_name: "Build a Starter Online Shopping App using Oracle APEX!",
    generated_at: "2026-07-27T08:20:53.917Z",
    pages_scanned: 4,
    counts: { total: 0, working: 0, broken: 0, unverified: 0 },
    links: [],
    scan_errors: [
      {
        page_type: "preview-instructions",
        label: "Preview instructions: Getting Started",
        page_url: "https://example.com/workshops/apex/getting-started.md",
        error: "Workshop source returned HTTP 404.",
      },
    ],
  };
  const parAudit = buildParAuditSummary([
    {
      title: "PAR audit",
      section: "Catalog PAR Links",
      file: "tests/platform/par/catalogParLinks.spec.ts",
      line: 1,
      status: "failed",
      catalogItem: {
        type: "workshop",
        id: "848",
        title: "Build a Starter Online Shopping App using Oracle APEX!",
      },
      parAudits: [audit],
    },
  ]);
  const html = parLinksPageHtml(
    {
      runId: "scan-failure",
      startedAt: "2026-07-27T08:20:53.917Z",
      parAudit,
    },
    {
      historyHref: "../index.html",
      olderReportHref: "../older/par-links.html",
      newerReportHref: "../newer/par-links.html",
      reportType: "par",
    },
  );

  assert.match(html, /QA Hub home/);
  assert.match(html, /All runs/);
  assert.doesNotMatch(html, /Tested items/);
  assert.match(html, /Previous report/);
  assert.match(html, /Next report/);
  assert.match(html, /Source page does not exist at this address/);
  assert.match(html, /Page not found/);
  assert.match(html, /What was not tested/);
  assert.match(html, /Next action/);
  assert.match(html, /returned HTTP 404/);
  assert.match(html, /PAR links on &quot;Preview instructions: Getting Started&quot; were not checked/);
  assert.match(html, /Correct the path for &quot;Preview instructions: Getting Started&quot;/);
  assert.match(html, /WMS 848/);
  assert.match(html, /Open page/);
  assert.match(html, /Technical details/);
  assert.match(html, /Workshop source returned HTTP 404/);
});

test("collapses duplicate rendered detections into one actionable source location", () => {
  const audit = auditAttachment("catalog", "Workshop with duplicate detections", "broken", 401);
  audit.links[0].sources = [
    {
      pageType: "direct-instructions",
      pageUrl: "https://oracle-livelabs.github.io/example/index.html?lab=lab-2",
      label: "Workshop with duplicate detections",
      location: "a[href]: here",
    },
    {
      pageType: "direct-instructions",
      pageUrl: "https://oracle-livelabs.github.io/example/index.html?lab=lab-2",
      label: "Workshop with duplicate detections",
      location: "Rendered page content",
    },
    {
      pageType: "direct-instructions-lab",
      pageUrl: "https://oracle-livelabs.github.io/example/index.html?lab=lab-2",
      sourceFileUrl: "https://oracle-livelabs.github.io/example/lab-2.md",
      label: "Workshop with duplicate detections: Download the sample",
      labNumber: 2,
      sourceLine: 42,
      section: "Task 2: Download the sample",
      instruction: "2. Select the download link.",
      searchText: "assets/demo.zip",
      sourceExcerpt: "Download [the sample](https://objectstorage.example.com/p/***/n/ns/b/bucket/o/demo.zip)",
    },
  ];
  const summary = buildParAuditSummary([
    testResult(audit, {
      type: "workshop",
      id: "4242",
      title: "Workshop with duplicate detections",
    }),
  ]);
  const html = parLinksPageHtml({
    runId: "duplicate-source-run",
    startedAt: "2026-07-27T08:20:53.917Z",
    parAudit: summary,
  });

  assert.equal((html.match(/class="source-copy"/g) || []).length, 1);
  assert.match(html, /Lab 2<\/span><strong>Download the sample/);
  assert.match(html, /Task or section<\/span><strong>Task 2: Download the sample/);
  assert.match(html, /Step<\/span><strong>2\. Select the download link/);
  assert.match(html, /WMS 4242 \/ Lab 2: Download the sample \/ Task: Task 2: Download the sample \/ Step 2/);
});

test("labels overview-only recheck sources honestly and removes duplicate locations", () => {
  const audit = auditAttachment("catalog", "Workshop with temporary asset result", "unverified", 503);
  audit.links[0].sources = [
    {
      pageType: "overview",
      pageUrl: "https://livelabs.oracle.com/ords/r/dbpm/livelabs/view-workshop?wid=3811&clear=RR%2C180",
      label: "Source page",
      location: "img[src]",
    },
    {
      pageType: "tenancy-instructions",
      pageUrl: "https://livelabs.oracle.com/ords/r/dbpm/livelabs/view-workshop?wid=3811&clear=RR%2C180",
      label: "Run on your tenancy instructions",
      location: "Rendered page content",
    },
  ];
  audit.links[0].http_status = undefined;
  audit.links[0].attempts = 0;
  audit.links[0].error = "The isolated PAR probe returned an unreadable result.";
  const summary = buildParAuditSummary([
    testResult(audit, {
      type: "workshop",
      id: "3811",
      title: "Workshop with temporary asset result",
    }),
  ]);
  const html = parLinksPageHtml({
    runId: "overview-recheck-run",
    startedAt: "2026-07-27T08:20:53.917Z",
    parAudit: summary,
  });

  assert.equal((html.match(/class="source-copy"/g) || []).length, 1);
  assert.match(html, /Page<\/span><strong>Workshop overview/);
  assert.match(html, /Open workshop overview/);
  assert.doesNotMatch(html, /Open exact lab/);
  assert.match(html, /QA checker error/);
  assert.match(html, /Link was not tested/);
  assert.match(html, /QA system error, not evidence that the workshop link is broken/);
  assert.match(html, /report it to the QA Hub maintainer/);
});

test("explains temporary page connection failures without calling the page deleted", () => {
  const audit = {
    schema_version: 1,
    scope: "catalog",
    source_name: "Workshop with temporary route problem",
    generated_at: "2026-07-27T08:20:53.917Z",
    pages_scanned: 0,
    counts: { total: 0, working: 0, broken: 0, unverified: 0 },
    links: [],
    scan_errors: [
      {
        page_type: "tenancy-instructions",
        label: "Run on your tenancy instructions",
        page_url: "chrome-error://chromewebdata/",
        error:
          "Could not open indexed catalog item after trying https://livelabs.oracle.com/ords/r/dbpm/livelabs/view-workshop?wid=3925&clear=RR%2C180. Last error: page.goto: net::ERR_HTTP2_PROTOCOL_ERROR",
      },
    ],
  };
  const parAudit = buildParAuditSummary([
    {
      title: "PAR audit",
      section: "Catalog PAR Links",
      file: "tests/platform/par/catalogParLinks.spec.ts",
      line: 1,
      status: "failed",
      catalogItem: {
        type: "workshop",
        id: "3925",
        title: "Workshop with temporary route problem",
        normalized_href:
          "https://livelabs.oracle.com/ords/r/dbpm/livelabs/view-workshop?wid=3925&clear=RR%2C180",
      },
      parAudits: [audit],
    },
  ]);
  const html = parLinksPageHtml({
    runId: "temporary-route",
    startedAt: "2026-07-27T08:20:53.917Z",
    parAudit,
  });

  assert.match(html, /Connection closed/);
  assert.match(html, /Attempted page<\/span><strong>Workshop overview/);
  assert.match(html, /Intended check<\/span><strong>Run on your tenancy instructions was never reached/);
  assert.match(html, /Open workshop overview/);
  assert.match(html, /LiveLabs closed the HTTP\/2 connection/);
  assert.match(html, /What was not tested/);
  assert.match(html, /&quot;Run on your tenancy instructions&quot; was never reached, so its PAR links were not checked/);
  assert.doesNotMatch(html, /Temporarily unreachable/);
  assert.doesNotMatch(html, /chrome-error|<code>\/<\/code>/);
});

test("renders 500 PAR results as a searchable and paginated table", () => {
  const results = Array.from({ length: 500 }, (_, index) => {
    const status = index % 10 === 0 ? "broken" : "working";
    const audit = auditAttachment("catalog", "Workshop " + index, status, status === "broken" ? 404 : 200);
    audit.links[0].object_name = "asset-" + index + ".zip";
    return testResult(audit, {
      type: index % 2 === 0 ? "workshop" : "livestack",
      id: String(4000 + index),
      title: "Catalog item " + index,
    });
  });
  const summary = buildParAuditSummary(results);
  const html = parLinksPageHtml({
    runId: "large-run",
    startedAt: "2026-07-27T08:20:53.917Z",
    parAudit: summary,
  });

  assert.equal(summary.counts.total, 500);
  assert.doesNotMatch(html, /data-par-filter="attention"/);
  assert.match(html, /data-par-filter="broken"/);
  assert.match(html, /data-par-filter="working"/);
  assert.match(html, /id="par-result-search"/);
  assert.match(html, /id="par-page-size"/);
  assert.match(html, /option value="100"/);
  assert.match(html, /Showing " \+ \(start \+ 1\)/);
  assert.match(html, /Catalog item 499/);
});

function auditAttachment(scope, sourceName, status, httpStatus) {
  return {
    schema_version: 1,
    scope,
    source_name: sourceName,
    generated_at: "2026-07-13T00:00:00.000Z",
    pages_scanned: 2,
    scan_errors: [],
    counts: {
      total: 1,
      working: status === "working" ? 1 : 0,
      broken: status === "broken" ? 1 : 0,
      unverified: status === "unverified" ? 1 : 0,
    },
    links: [
      {
        id: "par-test",
        label: "Asset ZIP",
        scope,
        status,
        masked_url:
          "https://objectstorage.eu-frankfurt-1.oraclecloud.com/p/***/n/example/b/qa/o/assets/demo.zip",
        fingerprint: "0123456789abcdef",
        object_name: "assets/demo.zip",
        host: "objectstorage.eu-frankfurt-1.oraclecloud.com",
        region: "eu-frankfurt-1",
        namespace: "example",
        bucket: "qa",
        http_status: httpStatus,
        method: "GET range",
        attempts: 1,
        checked_at: "2026-07-13T00:00:00.000Z",
        sources: [
          {
            pageType: "preview-instructions",
            pageUrl: "https://example.com/workshop?lab=1",
            label: "Workshop: Lab 1",
            labNumber: 1,
            sourceFileUrl: "https://livelabs.oracle.com/cdn/example/lab-1.md",
            sourceLine: 273,
            section: "Task 8: Install sample data",
            instruction: "1. Get sample file",
            searchText: "assets/demo.zip",
            sourceExcerpt:
              "wget https://objectstorage.eu-frankfurt-1.oraclecloud.com/p/***/n/example/b/qa/o/assets/demo.zip",
          },
        ],
      },
    ],
  };
}

function testResult(audit, catalogItem) {
  return {
    title: "PAR audit",
    section: "Generated PAR Links",
    file: "tests/platform/par/example.spec.ts",
    line: 1,
    status: audit.links[0].status === "working" ? "passed" : "failed",
    catalogItem,
    parAudits: [audit],
  };
}
