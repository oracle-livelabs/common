import fs from "node:fs";
import path from "node:path";

export function sanitizeSensitiveText(value) {
  return String(value || "")
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(
      /(https?:\/\/[^\s"'<>]*objectstorage[^\s"'<>]*\/p\/)[^/\s"'<>]+/gi,
      "$1***",
    )
    .replace(/\/p\/[^\/\s"'<>]+/gi, "/p/***")
    .replace(
      /(^|\n)\s*-?\s*(cookie|set-cookie|authorization|proxy-authorization|x-api-key|x-auth-token):[^\n]*/gi,
      "$1$2: ***",
    )
    .replace(
      /([?&](?:session|p_instance|token|access_token|auth|authorization)=)[^&\s"'<>]*/gi,
      "$1***",
    );
}
const STATUS_ORDER = {
  broken: 0,
  unverified: 1,
  working: 2,
};
export const PAR_REPORT_RENDERER_VERSION = "par-table-v5";
const PAR_RETEST_STORAGE_KEY = "livelabs-qa-par-retest-list:v1";
const PAR_RESOLVER_SOURCE_HOSTS = new Set([
  "livelabs.oracle.com",
  "oracle-livelabs.github.io",
]);

export function readParAudits(attachments) {
  const audits = [];

  for (const attachment of attachments) {
    if (attachment.name !== "par-audit.json" || !attachment.bodyText) continue;

    try {
      const parsed = JSON.parse(attachment.bodyText);
      if (parsed?.schema_version === 1 && Array.isArray(parsed.links)) {
        audits.push({
          ...parsed,
          pages_scanned: Number.isFinite(parsed.pages_scanned) ? parsed.pages_scanned : 0,
          scan_errors: Array.isArray(parsed.scan_errors) ? parsed.scan_errors : [],
        });
      }
    } catch {
      // A malformed attachment is ignored here; the originating test still
      // carries its normal Playwright failure and diagnostics.
    }
  }

  return audits;
}

export function buildParAuditSummary(results) {
  const summary = {
    schema_version: 1,
    has_data: false,
    tests_with_data: 0,
    pages_scanned: 0,
    counts: emptyCounts(),
    catalog: { counts: emptyCounts(), links: [] },
    scan_errors: [],
  };

  for (const test of results) {
    for (const audit of test.parAudits || []) {
      summary.has_data = true;
      summary.tests_with_data += 1;
      summary.pages_scanned += Number(audit.pages_scanned || 0);

      for (const link of audit.links || []) {
        const record = {
          ...link,
          scope: audit.scope,
          source_name: audit.source_name || "",
          audit_generated_at: audit.generated_at || "",
          test: {
            title: test.title || "",
            section: test.section || "",
            file: test.file || "",
            line: test.line || 0,
            status: test.status || "",
          },
          catalog_item: catalogItemSummary(test.catalogItem),
        };
        summary.catalog.links.push(record);
        incrementCount(summary.catalog.counts, record.status);
        incrementCount(summary.counts, record.status);
      }

      for (const scanError of audit.scan_errors || []) {
        summary.scan_errors.push({
          ...scanError,
          scope: audit.scope,
          source_name: audit.source_name || "",
          catalog_item: catalogItemSummary(test.catalogItem),
          test: {
            title: test.title || "",
            section: test.section || "",
            file: test.file || "",
            line: test.line || 0,
          },
        });
      }
    }
  }
  summary.catalog.links.sort(compareParLinks);
  summary.scan_errors.sort((left, right) =>
    String(left.source_name || "").localeCompare(String(right.source_name || "")),
  );

  return summary;
}

export function writeParAuditDataFiles(outputDir, parAudit) {
  const audit = parAudit || buildParAuditSummary([]);
  const catalogBroken = audit.catalog.links.filter((link) => link.status === "broken");
  const unverified = audit.catalog.links.filter((link) => link.status === "unverified");
  const working = audit.catalog.links.filter((link) => link.status === "working");

  writeJson(path.join(outputDir, "par-links-safe.json"), audit);
  writeJson(path.join(outputDir, "par-catalog-not-working.json"), {
    schema_version: 1,
    scope: "catalog",
    status: "broken",
    links: catalogBroken,
  });
  writeJson(path.join(outputDir, "par-unverified.json"), {
    schema_version: 1,
    status: "unverified",
    links: unverified,
  });
  writeJson(path.join(outputDir, "par-scan-incomplete.json"), {
    schema_version: 1,
    scan_errors: audit.scan_errors,
  });

  fs.writeFileSync(path.join(outputDir, "par-all-results.csv"), parLinksCsv(audit.catalog.links), "utf-8");
  fs.writeFileSync(path.join(outputDir, "par-catalog-not-working.csv"), parLinksCsv(catalogBroken), "utf-8");
  fs.writeFileSync(path.join(outputDir, "par-unverified.csv"), parLinksCsv(unverified), "utf-8");
  fs.writeFileSync(path.join(outputDir, "par-working.csv"), parLinksCsv(working), "utf-8");
  fs.writeFileSync(path.join(outputDir, "par-scan-incomplete.csv"), scanErrorsCsv(audit.scan_errors), "utf-8");
}

export function parLinksPageHtml(summary, context = {}) {
  const audit = summary.parAudit || buildParAuditSummary([]);
  const parRetestEntries = buildParRetestEntries(audit.catalog.links || [], summary.runId || "");
  const isParOnlyRun =
    context.reportType === "par" || summary.runType === "par" || summary.reportChannel === "par";
  const totalBroken = audit.counts.broken || 0;
  const totalUnverified = audit.counts.unverified || 0;
  const runTone = totalBroken > 0 || audit.scan_errors.length > 0 ? "fail" : totalUnverified > 0 ? "warn" : "pass";
  const runLabel =
    totalBroken > 0
      ? totalBroken + " broken PAR link" + (totalBroken === 1 ? "" : "s")
      : audit.scan_errors.length > 0
        ? audit.scan_errors.length + " page scan problem" + (audit.scan_errors.length === 1 ? "" : "s")
        : totalUnverified > 0
          ? totalUnverified + " link" + (totalUnverified === 1 ? "" : "s") + " not verified"
          : audit.has_data
            ? "No broken PAR links"
            : "No PAR audit data";

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    '  <meta name="livelabs-qa-par-renderer" content="' + PAR_REPORT_RENDERER_VERSION + '" />',
    "  <title>LiveLabs PAR Link Audit " + escapeHtml(summary.runId || "") + "</title>",
    "  <style>",
    parPageStyles(),
    "  </style>",
    "</head>",
    "<body>",
    '  <header class="topbar">',
    '    <div class="header-copy">',
    "      <p class=\"eyebrow\">LiveLabs QA</p>",
    "      <h1>PAR Link Audit</h1>",
    '      <p class="run-meta">Run ' + escapeHtml(summary.runId || "") + " &middot; " + escapeHtml(formatDate(summary.startedAt)) + " &middot; " + audit.pages_scanned + " pages scanned</p>",
    "    </div>",
    '    <div class="status-block ' + runTone + '">',
    '      <span class="status-dot" aria-hidden="true"></span>',
    "      <strong>" + escapeHtml(runLabel) + "</strong>",
    "    </div>",
    "  </header>",
    '  <nav class="page-nav" aria-label="Report views">',
    '    <div class="page-nav-views">',
    '      <a href="/">QA Hub home</a>',
    context.historyHref ? '      <a href="' + escapeHtml(context.historyHref) + '">All runs</a>' : "",
    isParOnlyRun ? "" : '      <a href="summary.html">Tested items</a>',
    '      <a class="active" href="par-links.html">PAR Links</a>',
    '      <a href="par-retest-list.html">PAR Retest List <span class="nav-count" data-par-retest-count>0</span></a>',
    "    </div>",
    reportTimelineNavigationHtml(context),
    "  </nav>",
    '  <script id="par-retest-items" type="application/json">' + escapeScriptJson(parRetestEntries) + "</script>",
    '  <main class="content">',
    '    <p class="par-action-message" data-par-action-message aria-live="polite"></p>',
    audit.has_data ? parOverviewHtml(audit) : parEmptyHtml(summary),
    "  </main>",
    latestReportRefreshScript(summary.runId),
    "</body>",
    "</html>",
  ].join("\n");
}

function reportTimelineNavigationHtml(context = {}) {
  return [
    '    <div class="page-nav-timeline" aria-label="Move between saved reports">',
    context.olderReportHref
      ? '      <a class="timeline-link" href="' + escapeHtml(context.olderReportHref) + '">Previous report</a>'
      : '      <span class="timeline-link disabled">Previous report</span>',
    context.newerReportHref
      ? '      <a class="timeline-link" href="' + escapeHtml(context.newerReportHref) + '">Next report</a>'
      : '      <span class="timeline-link disabled">Next report</span>',
    "    </div>",
  ].join("\n");
}

function parOverviewHtml(audit) {
  const links = audit.catalog.links || [];
  const catalogProblems = links.filter((link) => link.status === "broken");
  const recheck = links.filter((link) => link.status === "unverified");
  const working = links.filter((link) => link.status === "working");
  const scanErrors = audit.scan_errors || [];
  const resultRows = [
    ...catalogProblems.map(parLinkResultRowHtml),
    ...recheck.map(parLinkResultRowHtml),
    ...scanErrors.map(parScanResultRowHtml),
    ...working.map(parLinkResultRowHtml),
  ].join("\n");

  return [
    '    <section class="metrics" aria-label="PAR audit totals">',
    metricHtml("Broken", audit.counts.broken, "Confirmed unusable", audit.counts.broken ? "fail" : ""),
    metricHtml("Not verified", audit.counts.unverified, "Open a row for the exact cause", audit.counts.unverified ? "warn" : ""),
    metricHtml("Working", audit.counts.working, "Confirmed with HTTP 2xx", "pass"),
    metricHtml("Pages not scanned", audit.scan_errors.length, "Links inside remain unknown", audit.scan_errors.length ? "fail" : ""),
    "    </section>",
    '    <details class="report-help">',
    "      <summary>What the statuses mean and why full PAR links are hidden</summary>",
    '      <section class="status-key" aria-label="PAR status meanings">',
    '        <div><strong>Broken</strong><span>The file cannot be downloaded and needs a replacement link.</span></div>',
    '        <div><strong>Not verified</strong><span>QA did not obtain a conclusive HTTP result. Each row identifies the exact cause and who should act.</span></div>',
    '        <div><strong>Page not scanned</strong><span>The page could not be opened, so links inside it remain unknown.</span></div>',
    "      </section>",
    '      <p class="security-note">A full PAR URL grants access to its file. Reports keep it masked; authorized users can copy it or temporarily show it inside one finding.</p>',
    "    </details>",
    catalogProblems.length + recheck.length + scanErrors.length === 0
      ? '    <section class="all-clear"><strong>Nothing needs fixing.</strong><span>All discovered PAR links worked and every requested page was scanned.</span></section>'
      : "",
    '    <section class="results-panel">',
    '      <div class="results-heading">',
    '        <div><h2>PAR audit results</h2><p>Search or filter the run, then open one row for the exact location and next action.</p></div>',
    '        <details class="download-menu"><summary>Download CSV</summary><div>',
    '          <p>For bulk review, spreadsheets, or Codex.</p>',
    '          <a href="par-all-results.csv"><strong>All PAR links</strong><span>' + links.length + " results</span></a>",
    '          <a href="par-catalog-not-working.csv"><strong>Broken</strong><span>' + catalogProblems.length + " results</span></a>",
    '          <a href="par-unverified.csv"><strong>Not verified</strong><span>' + recheck.length + " results</span></a>",
    '          <a href="par-working.csv"><strong>Working</strong><span>' + working.length + " results</span></a>",
    '          <a href="par-scan-incomplete.csv"><strong>Pages not scanned</strong><span>' + scanErrors.length + " results</span></a>",
    "        </div></details>",
    "      </div>",
    '      <div class="result-tools">',
    '        <label class="result-search"><span>Search results</span><input id="par-result-search" type="search" placeholder="Workshop, WMS ID, file, bucket, or issue" /></label>',
    '        <div class="filter-buttons" role="group" aria-label="Filter PAR results">',
    filterButtonHtml("all", "All", links.length + scanErrors.length),
    filterButtonHtml("broken", "Broken", catalogProblems.length),
    filterButtonHtml("unverified", "Not verified", recheck.length),
    filterButtonHtml("scan-error", "Pages not scanned", scanErrors.length),
    filterButtonHtml("working", "Working", working.length),
    "        </div>",
    '        <label class="page-size"><span>Rows per page</span><select id="par-page-size"><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label>',
    "      </div>",
    '      <div class="result-table" role="table" aria-label="PAR audit results">',
    '        <div class="result-table-head" role="row"><span>Status</span><span>Workshop or LiveStack</span><span>Finding</span><span>Exact location</span></div>',
    '        <div id="par-result-rows">' + resultRows + "</div>",
    '        <div id="par-no-results" class="no-results" hidden>No results match this search and filter.</div>',
    "      </div>",
    '      <div class="pagination"><span id="par-result-count"></span><div><button id="par-previous-page" type="button">Previous</button><button id="par-next-page" type="button">Next</button></div></div>',
    "    </section>",
    parResultsScript("all"),
  ]
    .filter(Boolean)
    .join("\n");
}

function filterButtonHtml(filter, label, count) {
  return '<button type="button" data-par-filter="' + escapeHtml(filter) + '">' +
    escapeHtml(label) + " <span>" + Number(count || 0) + "</span></button>";
}

function parLinkResultRowHtml(link) {
  const catalogItem = link.catalog_item || {};
  const retestId = link.status === "working" ? "" : parRetestEntryId(link);
  const itemName = catalogItem.title || link.source_name || "Catalog item";
  const itemMeta = [catalogItem.type, catalogItem.id ? "WMS " + catalogItem.id : catalogItem.slug]
    .filter(Boolean)
    .join(" / ");
  const source = preferredParSources(link.sources || [])[0];
  const guidance = parLinkGuidance(link);
  const exactLocation = parSourceLocation(source, catalogItem);
  const response = link.http_status
    ? "HTTP " + link.http_status + (link.method ? " via " + link.method : "")
    : "No final response";
  const searchable = [
    link.status,
    itemName,
    itemMeta,
    link.object_name,
    link.bucket,
    link.namespace,
    link.region,
    guidance.finding,
    guidance.action,
    exactLocation,
    ...(link.sources || []).flatMap((entry) => [
      entry.label,
      entry.section,
      entry.instruction,
      entry.location,
      entry.searchText,
      entry.sourceExcerpt,
    ]),
  ].filter(Boolean).join(" ").toLowerCase();

  return [
    '<details class="result-row ' + escapeHtml(link.status || "") + '" data-par-row data-status="' +
      escapeHtml(link.status || "") + '" data-search="' + escapeHtml(searchable) + '">',
    '  <summary class="result-summary">',
    '    <span class="status-cell">' + statusBadgeHtml(link.status, guidance.badge) + "</span>",
    '    <span class="item-cell"><strong>' + escapeHtml(itemName) + "</strong><small>" + escapeHtml(itemMeta || "Catalog item") + "</small></span>",
    '    <span class="finding-cell"><strong>' + escapeHtml(guidance.shortFinding) + "</strong><small>" + escapeHtml(link.object_name || link.label || "PAR link") + "</small></span>",
    '    <span class="location-cell">' + escapeHtml(exactLocation) + "</span>",
    "  </summary>",
    '  <div class="result-details">',
    guidanceSummaryHtml([
      ["Problem", guidance.finding],
      ["Next action", guidance.action],
    ]),
    sourceLocationsHtml(link.sources || [], catalogItem, retestId),
    '    <details class="technical-details"><summary>Technical details for developers</summary>',
    parLinkLocationHtml(link),
    '      <div class="fact-grid">',
    factHtml("Bucket", link.bucket || "Not available"),
    factHtml("Namespace", link.namespace || "Not available"),
    factHtml("Region", link.region || link.host || "Not available"),
    factHtml("Response", response),
    "      </div>",
    link.fingerprint
      ? '      <p class="fingerprint">Fingerprint <code>' + escapeHtml(link.fingerprint) + "</code></p>"
      : "",
    link.error ? '      <pre>' + escapeHtml(link.error) + "</pre>" : "",
    "    </details>",
    "  </div>",
    "</details>",
  ]
    .filter(Boolean)
    .join("\n");
}

export function parLinkGuidance(link) {
  const objectName = link.object_name || link.label || "the linked file";
  const quotedObject = '"' + objectName + '"';
  const status = Number(link.http_status || 0);
  const catalogItem = link.catalog_item || {};
  const itemReference = catalogItem.id ? "WMS " + catalogItem.id : catalogItem.title || "this catalog item";

  if (link.status === "working") {
    return {
      badge: "Working",
      shortFinding: "Link works",
      finding: `${quotedObject} returned HTTP ${status || "2xx"} and can be downloaded.`,
      impact: "No learner action is blocked by this link.",
      action: "No change is needed.",
    };
  }

  if (link.status === "unverified") {
    return unverifiedParGuidance(link, quotedObject, itemReference);
  }

  const responseText = status ? `HTTP ${status}` : "an unusable response";
  const finding =
    status === 404
      ? `${quotedObject} returned HTTP 404, so the file cannot be downloaded.`
      : status === 401 || status === 403
        ? `${quotedObject} returned HTTP ${status}, so the file cannot be downloaded.`
        : `${quotedObject} returned ${responseText}, so the file cannot be downloaded.`;

  return {
    badge: "Broken",
    shortFinding: status === 404 ? "File cannot be downloaded (404)" : "File cannot be downloaded",
    finding,
    impact: `A learner who follows this instruction cannot get ${quotedObject}.`,
    action: `Replace this PAR at the location below, or remove the instruction if ${quotedObject} is no longer needed.`,
  };
}

function unverifiedParGuidance(link, quotedObject, itemReference) {
  const error = sanitizeSensitiveText(link.error || "").trim();
  const attempts = Number(link.attempts || 0);
  const status = Number(link.http_status || 0);

  if (/isolated PAR probe (?:returned an unreadable result|did not return a complete result|could not start|could not receive its input|omitted this result)/i.test(error)) {
    return {
      badge: "QA checker error",
      shortFinding: "Link was not tested",
      finding: `QA Hub found ${quotedObject}, but its isolated link checker returned invalid data before recording an HTTP result. This is a QA system error, not evidence that the workshop link is broken.`,
      impact: "The link status remains unknown because the QA checker failed.",
      action: `Rerun ${itemReference}. If the same QA checker error repeats, report it to the QA Hub maintainer; do not change the workshop link without a real HTTP failure.`,
    };
  }

  if (/safety timeout|timed?\s*out|timeout/i.test(error)) {
    return {
      badge: "Link check timed out",
      shortFinding: "No response before the checker timeout",
      finding: `QA Hub attempted to test ${quotedObject}, but no HTTP result arrived before the link-check timeout. The link is not confirmed broken.`,
      impact: "The link may be slow or temporarily unavailable.",
      action: `Rerun ${itemReference}. If the timeout repeats, ask the Object Storage owner to check the file before changing the workshop.`,
    };
  }

  if (status >= 500) {
    return {
      badge: "Storage server error",
      shortFinding: `Object Storage returned HTTP ${status}`,
      finding: `${quotedObject} returned HTTP ${status}. QA did not mark it broken because a storage server error can be temporary.`,
      impact: "The file could not be confirmed during this run.",
      action: `Rerun ${itemReference}. If HTTP ${status} repeats, ask the Object Storage owner to investigate.`,
    };
  }

  return {
    badge: "No HTTP result",
    shortFinding: "Link status is unknown",
    finding: attempts > 0
      ? `QA Hub attempted to test ${quotedObject} ${attempts} time${attempts === 1 ? "" : "s"}, but received no final HTTP result. The link is not confirmed broken.`
      : `QA Hub found ${quotedObject}, but no HTTP test result was recorded. The link is not confirmed broken.`,
    impact: "The link status remains unknown.",
    action: `Rerun ${itemReference}. Change the workshop only after a later check records a real broken response.`,
  };
}

function guidanceSummaryHtml(entries) {
  return '<section class="guidance-summary">' +
    entries
      .map(([label, value]) => '<p><strong>' + escapeHtml(label) + ":</strong> " + escapeHtml(value) + "</p>")
      .join("") +
    "</section>";
}

function factHtml(label, value) {
  return '<div><span>' + escapeHtml(label) + "</span><strong>" + escapeHtml(value) + "</strong></div>";
}

function parRetestEntryId(link) {
  const catalogItem = link.catalog_item || {};
  return [
    catalogItem.type || "catalog",
    catalogItem.id || catalogItem.slug || "unknown",
    link.fingerprint || link.id || "par",
  ].join(":");
}

function buildParRetestEntries(links, runId) {
  return Object.fromEntries(
    links
      .filter((link) => link.status === "broken" || link.status === "unverified")
      .map((link) => {
        const catalogItem = link.catalog_item || {};
        const id = parRetestEntryId(link);
        return [
          id,
          {
            id,
            runId,
            status: link.status,
            fingerprint: link.fingerprint || "",
            objectName: link.object_name || link.label || "PAR link",
            maskedUrl: link.masked_url || "",
            itemType: catalogItem.type || "catalog item",
            itemId: catalogItem.id || catalogItem.slug || "",
            itemTitle: catalogItem.title || link.source_name || "Catalog item",
            catalogUrl: catalogItem.normalized_href || "",
            sources: preferredParSources(link.sources || []).map((source) => ({
              label: source.label || "Source page",
              labNumber: source.labNumber || 0,
              pageUrl: source.pageUrl || "",
              sourceFileUrl: source.sourceFileUrl || "",
              sourceLine: source.sourceLine || 0,
              section: source.section || "",
              instruction: source.instruction || "",
            })),
          },
        ];
      }),
  );
}

function parLinkLocationHtml(link) {
  if (!link.masked_url) return "";
  const sources = preferredParSources(link.sources || []);
  const sourceFile = sources.find((entry) => isResolvableParSourceUrl(entry.sourceFileUrl));
  const sourcePage = sources.find((entry) => isResolvableParSourceUrl(entry.pageUrl));
  const resolverSource = sourceFile?.sourceFileUrl || sourcePage?.pageUrl || "";
  const canResolve = Boolean(resolverSource && link.fingerprint);

  return [
    '      <div class="link-location">',
    "        <span>PAR link (masked by default)</span>",
    '        <div class="link-value">',
    '          <code data-par-link-value data-par-masked-value="' + escapeHtml(link.masked_url) + '">' + escapeHtml(link.masked_url) + "</code>",
    canResolve
      ? '          <button class="copy-link-button" type="button" title="Retrieve and copy the full PAR link" data-par-copy-link data-source-url="' +
        escapeHtml(resolverSource) +
        '" data-fingerprint="' +
        escapeHtml(link.fingerprint) +
        '">' +
        copyIconHtml() +
        "<span>Copy full link</span></button>"
      : "",
    canResolve
      ? '          <button class="copy-link-button" type="button" data-par-toggle-link data-source-url="' +
        escapeHtml(resolverSource) +
        '" data-fingerprint="' +
        escapeHtml(link.fingerprint) +
        '"><span>Show full link</span></button>'
      : "",
    canResolve
      ? '          <a class="source-link" data-par-open-link hidden target="_blank" rel="noreferrer">Open full link</a>'
      : "",
    "        </div>",
    canResolve
      ? '        <small>Copy keeps the link masked. Show reveals it only in this browser until you hide or reload it.</small>'
      : '        <small>Open the exact lab to retrieve this link; its source could not be resolved automatically.</small>',
    "      </div>",
  ]
    .filter(Boolean)
    .join("\n");
}

function isResolvableParSourceUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return (
      url.protocol === "https:" &&
      PAR_RESOLVER_SOURCE_HOSTS.has(url.hostname.toLowerCase()) &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443")
    );
  } catch {
    return false;
  }
}

function copyIconHtml() {
  return '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>';
}

function preferredParSources(sources) {
  if (!Array.isArray(sources)) return [];
  const actionable = sources.filter(
    (source) =>
      source?.sourceFileUrl ||
      source?.sourceLine ||
      source?.section ||
      source?.instruction,
  );
  const candidates = actionable.length > 0 ? actionable : sources;
  const seen = new Set();

  return candidates.filter((source) => {
    const key = actionable.length > 0
      ? [
          source.sourceFileUrl || source.pageUrl || "",
          source.labNumber || "",
          source.sourceLine || "",
          source.section || "",
          source.instruction || "",
          source.searchText || "",
        ].join("|")
      : source.pageUrl || source.label || "";
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function friendlySourceLabel(source, catalogItem = {}) {
  const itemTitle = String(catalogItem.title || "").trim();
  let label = String(source?.label || "").trim();
  if (itemTitle && label.startsWith(itemTitle + ":")) {
    label = label.slice(itemTitle.length + 1).trim();
  }
  label = label.replace(/^Preview instructions:\s*/i, "").trim();
  if (label && label !== itemTitle) return label;

  try {
    const lab = new URL(String(source?.pageUrl || "")).searchParams.get("lab");
    if (lab) {
      return lab
        .split(/[-_]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
  } catch {
    // The recorded label and section remain available when the URL is not parseable.
  }

  return source?.section || "Source page";
}

function sourceStepLabel(instruction) {
  const value = String(instruction || "").trim();
  if (!value) return "";
  const numbered = value.match(/^(\d+)[.)]\s*/);
  if (numbered) return "Step " + numbered[1];
  const named = value.match(/^(Step\s+\d+)/i);
  return named ? named[1] : "";
}

function sourcePagePresentation(source, catalogItem = {}) {
  const pageUrl = String(source?.pageUrl || "");
  const exactLab =
    Boolean(source?.sourceFileUrl || source?.sourceLine || source?.section || source?.instruction) ||
    urlHasLabParameter(pageUrl);

  if (exactLab) {
    const labNumber = sourceLabNumber(source);
    return {
      label: labNumber ? "Lab " + labNumber : "Lab",
      value: friendlySourceLabel(source, catalogItem),
      action: "Open exact lab",
    };
  }

  try {
    const pathname = new URL(pageUrl).pathname.toLowerCase();
    if (pathname.includes("/view-workshop")) {
      return {
        label: "Page",
        value: "Workshop overview",
        action: "Open workshop overview",
      };
    }
    if (pathname.includes("/run-workshop")) {
      return {
        label: "Page",
        value: "Workshop instructions",
        action: "Open workshop instructions",
      };
    }
  } catch {
    // Fall back to the recorded page label.
  }

  return {
    label: "Page",
    value: friendlySourceLabel(source, catalogItem),
    action: "Open source page",
  };
}

function sourceLabNumber(source) {
  const explicit = Number(source?.labNumber || 0);
  if (Number.isInteger(explicit) && explicit > 0) return explicit;

  const recordedLabel = String(source?.label || "");
  const labelMatch = recordedLabel.match(/(?:^|:\s*)Lab\s+(\d+)\b/i);
  return labelMatch ? Number(labelMatch[1]) : 0;
}

function urlHasLabParameter(value) {
  try {
    return Boolean(new URL(String(value || "")).searchParams.get("lab"));
  } catch {
    return false;
  }
}

function parSourceLocation(source, catalogItem = {}) {
  const parts = [];
  if (catalogItem.id) parts.push("WMS " + catalogItem.id);
  const page = sourcePagePresentation(source, catalogItem);
  if (page.value) parts.push(page.label + ": " + page.value);
  if (source?.section && source.section !== page.value) parts.push("Task: " + source.section);
  const step = sourceStepLabel(source?.instruction);
  if (step) parts.push(step);
  else if (source?.sourceLine) parts.push("line " + source.sourceLine);
  else if (source?.location && !parts.includes(source.location)) parts.push(source.location);
  return parts.join(" / ") || "Source location not recorded";
}

function sourceLocationsHtml(sources, catalogItem = {}, retestId = "") {
  const preferredSources = preferredParSources(sources);
  const retestButton = retestId
    ? '<button class="source-link retest-link-button" type="button" data-par-retest-action data-par-retest-id="' +
      escapeHtml(retestId) +
      '">Add to PAR Retest</button>'
    : "";
  if (preferredSources.length === 0) {
    return '    <section class="source-block"><h3>Where to fix it</h3><p>Source page was not recorded.</p></section>';
  }

  const rows = preferredSources
    .map((source) => {
      const page = sourcePagePresentation(source, catalogItem);
      const details = [
        page.value ? [page.label, page.value] : undefined,
        source.section && source.section !== page.value ? ["Task or section", source.section] : undefined,
        source.instruction ? ["Step", source.instruction] : undefined,
        source.sourceLine ? ["Source line", "Markdown line " + source.sourceLine] : undefined,
      ].filter(Boolean);
      return '<li><div class="source-copy">' +
        details
          .map(
            ([label, value]) =>
              '<p><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + "</strong></p>",
          )
          .join("") +
        (source.sourceExcerpt
          ? '<details class="source-match"><summary>Show matching source text</summary><code class="source-excerpt">' +
            escapeHtml(source.sourceExcerpt) +
            "</code></details>"
          : "") +
        '</div><div class="source-actions">' +
        sourceLinkHtml(source.pageUrl || "", page.action) +
        "</div></li>";
    })
    .join("\n");

  return '    <section class="source-block"><div class="source-block-heading"><div><h3>Where to fix it</h3>' +
    (preferredSources.length > 1
      ? "<p>" + preferredSources.length + " separate source locations use this PAR.</p>"
      : "") +
    "</div>" +
    retestButton +
    "</div><ul>" +
    rows +
    "</ul></section>";
}

function parScanResultRowHtml(error) {
  const item = error.catalog_item || {};
  const itemName = item.title || error.source_name || "Catalog item";
  const itemMeta = [item.type || error.scope, item.id ? "WMS " + item.id : item.slug].filter(Boolean).join(" / ");
  const technicalError = sanitizeSensitiveText(error.error || "The page could not be scanned.");
  const intendedLabel = error.label || error.page_type || "source page";
  const scanTarget = parScanFailureTarget(error, item, intendedLabel, technicalError);
  const scanState = parScanErrorPresentation(technicalError, intendedLabel, scanTarget);
  const pageUrl = scanTarget.url;
  const sourceFileUrl = safeReportUrl(error.source_file_url || error.sourceFileUrl || "");
  const exactLocation = [item.id ? "WMS " + item.id : "", scanTarget.label]
    .filter(Boolean)
    .join(" / ");
  const searchable = [
    "scan error page not scanned incomplete",
    scanState.kind,
    scanState.badge,
    itemName,
    itemMeta,
    error.label,
    error.page_type,
    scanState.problem,
    scanState.notChecked,
    technicalError,
    pageUrl,
  ].filter(Boolean).join(" ").toLowerCase();

  return [
    '<details class="result-row scan-error" data-par-row data-status="scan-error" data-search="' + escapeHtml(searchable) + '">',
    '  <summary class="result-summary">',
    '    <span class="status-cell"><span class="badge unverified">' + escapeHtml(scanState.badge) + "</span></span>",
    '    <span class="item-cell"><strong>' + escapeHtml(itemName) + "</strong><small>" + escapeHtml(itemMeta || "Catalog item") + "</small></span>",
    '    <span class="finding-cell"><strong>' + escapeHtml(scanState.title) + "</strong><small>" + escapeHtml(scanState.summary) + "</small></span>",
    '    <span class="location-cell">' + escapeHtml(exactLocation) + "</span>",
    "  </summary>",
    '  <div class="result-details">',
    guidanceSummaryHtml([
      ["Problem", scanState.problem],
      ["What was not tested", scanState.notChecked],
      ["Next action", scanState.action],
    ]),
    '    <section class="source-block"><h3>Page that failed to open</h3><div class="scan-source">',
    '      <p><span>Attempted page</span><strong>' + escapeHtml(scanTarget.label) + "</strong></p>",
    scanTarget.intendedLabel && scanTarget.intendedLabel !== scanTarget.label
      ? '      <p><span>Intended check</span><strong>' + escapeHtml(scanTarget.intendedLabel) + " was never reached</strong></p>"
      : "",
    pageUrl
      ? '<code>' + escapeHtml(pageUrl) + "</code>" + sourceLinkHtml(pageUrl, scanTarget.actionLabel)
      : "",
    sourceFileUrl && sourceFileUrl !== pageUrl
      ? '<code>' + escapeHtml(sourceFileUrl) + "</code>"
      : "",
    "    </div></section>",
    '    <details class="technical-details"><summary>Technical details for developers</summary><pre>' + escapeHtml(technicalError) + "</pre></details>",
    "  </div>",
    "</details>",
  ].filter(Boolean).join("\n");
}

export function parScanErrorExplanation(error) {
  return parScanErrorPresentation(error).problem;
}

function parScanErrorPresentation(error, label = "source page", target = {}) {
  const value = sanitizeSensitiveText(error).trim();
  const targetLabel = target.label || label;
  const itemReference = target.itemReference || "this WMS item";
  const intendedLabel = target.intendedLabel || label;
  const notChecked = intendedLabel === targetLabel
    ? `PAR links on "${targetLabel}" were not checked.`
    : `"${intendedLabel}" was never reached, so its PAR links were not checked.`;
  const timeout = value.match(/Timeout\s+(\d+)ms\s+exceeded/i);
  if (timeout) {
    const seconds = Math.max(1, Math.round(Number(timeout[1]) / 1000));
    return {
      kind: "temporary",
      badge: "Page timed out",
      title: `${targetLabel} did not load`,
      summary: `No page response within ${seconds} seconds`,
      problem: `QA tried to open "${targetLabel}", but LiveLabs did not return the page within ${seconds} seconds. This does not prove it was deleted.`,
      notChecked,
      action: scanRetryAction(target, `the ${seconds}-second timeout`, itemReference),
    };
  }

  const httpStatus = value.match(/HTTP\s+(\d{3})/i)?.[1];
  if (httpStatus === "404") {
    return {
      kind: "not-found",
      badge: "Page not found",
      title: "Source page does not exist at this address",
      summary: "HTTP 404",
      problem: `The address for "${label}" returned HTTP 404. The page was removed or its configured path is wrong.`,
      notChecked,
      action: `Correct the path for "${label}", or remove its manifest entry if the page was intentionally deleted. Republish, then rerun the audit.`,
    };
  }
  if (httpStatus === "401" || httpStatus === "403") {
    return {
      kind: "access-blocked",
      badge: "Access blocked",
      title: "Scanner could not access source page",
      summary: `HTTP ${httpStatus}`,
      problem: `The page refused the scanner with HTTP ${httpStatus}. It may still exist, but its PAR links could not be inspected.`,
      notChecked,
      action: "Confirm that the QA runner should have access, correct the page permissions if needed, and rerun the audit.",
    };
  }
  if (httpStatus && Number(httpStatus) >= 500) {
    return {
      kind: "temporary",
      badge: "Server error",
      title: `${targetLabel} returned a server error`,
      summary: `HTTP ${httpStatus}`,
      problem: `QA opened "${targetLabel}", but LiveLabs returned HTTP ${httpStatus} instead of the page.`,
      notChecked,
      action: scanRetryAction(target, `HTTP ${httpStatus}`, itemReference),
    };
  }

  if (/ERR_HTTP2_PROTOCOL_ERROR/i.test(value)) {
    return {
      kind: "temporary",
      badge: "Connection closed",
      title: `${targetLabel} did not load`,
      summary: "LiveLabs closed the HTTP/2 connection",
      problem: `QA tried to open "${targetLabel}", but LiveLabs closed the HTTP/2 connection before returning a page.`,
      notChecked,
      action: scanRetryAction(target, "the HTTP/2 connection error", itemReference),
    };
  }

  if (/ERR_(?:CONNECTION|NETWORK|TIMED_OUT|INTERNET|NAME_NOT_RESOLVED)/i.test(value)) {
    const connectionCause = browserConnectionCause(value);
    return {
      kind: "temporary",
      badge: "Connection failed",
      title: `${targetLabel} did not load`,
      summary: connectionCause,
      problem: `QA tried to open "${targetLabel}", but the browser reported: ${connectionCause}.`,
      notChecked,
      action: scanRetryAction(target, connectionCause.toLowerCase(), itemReference),
    };
  }

  return {
    kind: "unknown",
    badge: "Page not scanned",
    title: "Source page could not be scanned",
    summary: "Reason available in technical details",
    problem: "The scanner could not open this page, so its PAR links remain unknown.",
    notChecked,
    action: "Open the page, correct the problem if it is reproducible, and rerun the audit.",
  };
}

function parScanFailureTarget(error, item, intendedLabel, technicalError) {
  const recordedUrl = safeReportUrl(error.page_url || error.pageUrl || "");
  const attemptedUrl = firstHttpUrl(technicalError);
  const catalogUrl = safeReportUrl(item.normalized_href || item.absolute_url || item.href || "");
  const url = attemptedUrl || recordedUrl || catalogUrl;
  let label = intendedLabel;
  let actionLabel = "Open page";

  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.includes("/view-workshop")) {
      label = "Workshop overview";
      actionLabel = "Open workshop overview";
    } else if (pathname.includes("/run-workshop")) {
      label = "Workshop instructions";
      actionLabel = "Open workshop instructions";
    }
  } catch {
    // Keep the recorded label when there is no safe HTTP page URL.
  }

  return {
    url,
    label,
    actionLabel,
    intendedLabel,
    itemReference: item.id ? "WMS " + item.id : item.title || "this WMS item",
  };
}

function firstHttpUrl(value) {
  const match = String(value || "").match(/https?:\/\/[^\s"'<>]+/i);
  if (!match) return "";
  return safeReportUrl(match[0].replace(/[),.;]+$/, ""));
}

function scanRetryAction(target, cause, itemReference) {
  const openTarget = target.label ? `Open "${target.label}" below.` : "Open the page below.";
  return `${openTarget} If it opens now, rerun ${itemReference}. If ${cause} repeats, report ${itemReference} and the attempted page to the LiveLabs platform owner.`;
}

function browserConnectionCause(value) {
  if (/ERR_NAME_NOT_RESOLVED/i.test(value)) return "The page hostname could not be resolved";
  if (/ERR_CONNECTION_REFUSED/i.test(value)) return "The server refused the connection";
  if (/ERR_CONNECTION_RESET/i.test(value)) return "The server reset the connection";
  if (/ERR_(?:TIMED_OUT|CONNECTION_TIMED_OUT)/i.test(value)) return "The connection timed out";
  if (/ERR_INTERNET_DISCONNECTED/i.test(value)) return "The QA runner lost network access";
  return "The browser could not connect to the page";
}

function parResultsScript(defaultFilter) {
  return `<script>
    (() => {
      const rows = Array.from(document.querySelectorAll("[data-par-row]"));
      const search = document.getElementById("par-result-search");
      const pageSize = document.getElementById("par-page-size");
      const count = document.getElementById("par-result-count");
      const previous = document.getElementById("par-previous-page");
      const next = document.getElementById("par-next-page");
      const empty = document.getElementById("par-no-results");
      const buttons = Array.from(document.querySelectorAll("[data-par-filter]"));
      const retestItems = JSON.parse(document.getElementById("par-retest-items")?.textContent || "{}");
      const retestStorageKey = ${JSON.stringify(PAR_RETEST_STORAGE_KEY)};
      const resolvedParLinks = new Map();
      let activeFilter = ${JSON.stringify(defaultFilter)};
      let page = 1;

      function readRetestState() {
        try {
          const parsed = JSON.parse(localStorage.getItem(retestStorageKey) || "{}");
          return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
          return {};
        }
      }

      function writeRetestState(state) {
        localStorage.setItem(retestStorageKey, JSON.stringify(state || {}));
      }

      function showActionMessage(message, error = false) {
        const target = document.querySelector("[data-par-action-message]");
        if (!target) return;
        target.textContent = message;
        target.classList.toggle("error", error);
        window.clearTimeout(showActionMessage.timer);
        showActionMessage.timer = window.setTimeout(() => {
          target.textContent = "";
          target.classList.remove("error");
        }, 4200);
      }

      function updateRetestUi() {
        const state = readRetestState();
        const selectedCount = Object.keys(state).length;
        document.querySelectorAll("[data-par-retest-count]").forEach((counter) => {
          counter.textContent = String(selectedCount);
        });
        document.querySelectorAll("[data-par-retest-action]").forEach((button) => {
          const selected = Boolean(state[button.dataset.parRetestId || ""]);
          button.classList.toggle("selected", selected);
          button.setAttribute("aria-pressed", String(selected));
          button.textContent = selected ? "Remove from PAR Retest" : "Add to PAR Retest";
        });
      }

      async function copyText(value) {
        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(value);
            return true;
          } catch {
            // Fall through for restricted artifact pages.
          }
        }
        const field = document.createElement("textarea");
        field.value = value;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.left = "-9999px";
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        return copied;
      }

      function matchesFilter(row) {
        if (activeFilter === "all") return true;
        return row.dataset.status === activeFilter;
      }

      function render() {
        const query = String(search?.value || "").trim().toLowerCase();
        const matched = rows.filter((row) =>
          matchesFilter(row) && (!query || String(row.dataset.search || "").includes(query))
        );
        const size = Math.max(1, Number(pageSize?.value || 25));
        const pages = Math.max(1, Math.ceil(matched.length / size));
        page = Math.min(page, pages);
        const start = (page - 1) * size;
        const visible = new Set(matched.slice(start, start + size));

        rows.forEach((row) => {
          row.hidden = !visible.has(row);
          if (row.hidden) row.open = false;
        });
        buttons.forEach((button) => {
          const selected = button.dataset.parFilter === activeFilter;
          button.classList.toggle("active", selected);
          button.setAttribute("aria-pressed", String(selected));
        });
        if (empty) empty.hidden = matched.length !== 0;
        if (count) {
          count.textContent = matched.length
            ? "Showing " + (start + 1) + "-" + Math.min(start + size, matched.length) + " of " + matched.length
            : "Showing 0 results";
        }
        if (previous) previous.disabled = page <= 1 || matched.length === 0;
        if (next) next.disabled = page >= pages || matched.length === 0;
      }

      buttons.forEach((button) => button.addEventListener("click", () => {
        activeFilter = button.dataset.parFilter || "all";
        page = 1;
        render();
      }));
      search?.addEventListener("input", () => { page = 1; render(); });
      pageSize?.addEventListener("change", () => { page = 1; render(); });
      previous?.addEventListener("click", () => { page -= 1; render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
      next?.addEventListener("click", () => { page += 1; render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
      document.querySelectorAll("[data-par-retest-action]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.dataset.parRetestId || "";
          const entry = retestItems[id];
          if (!entry) {
            showActionMessage("This PAR finding is missing the metadata needed for a targeted retest.", true);
            return;
          }
          const state = readRetestState();
          if (!state[id]) {
            state[id] = entry;
            writeRetestState(state);
            showActionMessage(entry.objectName + " was added to the PAR Retest List.");
          } else {
            delete state[id];
            writeRetestState(state);
            showActionMessage(entry.objectName + " was removed from the PAR Retest List.");
          }
          updateRetestUi();
        });
      });

      async function resolveFullParLink(button) {
        const sourceUrl = button.dataset.sourceUrl || "";
        const fingerprint = button.dataset.fingerprint || "";
        const key = sourceUrl + "|" + fingerprint;
        if (resolvedParLinks.has(key)) return resolvedParLinks.get(key);
        const response = await fetch("/api/par-link/resolve", {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceUrl, fingerprint }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.url) {
          throw new Error(result.error || "The full PAR link could not be found in the current source.");
        }
        resolvedParLinks.set(key, result.url);
        return result.url;
      }

      document.querySelectorAll("[data-par-copy-link]").forEach((button) => {
        button.addEventListener("click", async () => {
          const label = button.querySelector("span");
          const originalLabel = label?.textContent || "Copy full link";
          button.disabled = true;
          if (label) label.textContent = "Retrieving...";
          try {
            const fullUrl = await resolveFullParLink(button);
            const copied = await copyText(fullUrl);
            if (label) label.textContent = copied ? "Copied" : "Copy failed";
            showActionMessage(
              copied
                ? "The full PAR link was copied and remains masked on screen."
                : "The link was retrieved, but the browser could not copy it.",
              !copied,
            );
          } catch (error) {
            if (label) label.textContent = "Try again";
            showActionMessage(error?.message || "The full PAR link could not be retrieved.", true);
          } finally {
            button.disabled = false;
            window.setTimeout(() => {
              if (label && label.textContent !== "Try again") label.textContent = originalLabel;
            }, 1800);
          }
        });
      });
      document.querySelectorAll("[data-par-toggle-link]").forEach((button) => {
        button.addEventListener("click", async () => {
          const location = button.closest(".link-location");
          const code = location?.querySelector("[data-par-link-value]");
          const openLink = location?.querySelector("[data-par-open-link]");
          const label = button.querySelector("span");
          if (!code || !label) return;

          if (code.dataset.revealed === "true") {
            code.textContent = code.dataset.parMaskedValue || "";
            delete code.dataset.revealed;
            if (openLink) {
              openLink.hidden = true;
              openLink.removeAttribute("href");
            }
            label.textContent = "Show full link";
            showActionMessage("The PAR link is masked again.");
            return;
          }

          button.disabled = true;
          label.textContent = "Retrieving...";
          try {
            const fullUrl = await resolveFullParLink(button);
            code.textContent = fullUrl;
            code.dataset.revealed = "true";
            if (openLink) {
              openLink.href = fullUrl;
              openLink.hidden = false;
            }
            label.textContent = "Hide full link";
            showActionMessage("The full PAR link is visible only in this browser.");
          } catch (error) {
            label.textContent = "Show full link";
            showActionMessage(error?.message || "The full PAR link could not be retrieved.", true);
          } finally {
            button.disabled = false;
          }
        });
      });
      window.addEventListener("storage", (event) => {
        if (event.key === retestStorageKey) updateRetestUi();
      });
      updateRetestUi();
      render();
    })();
  </script>`;
}

export function parRetestListPageHtml(summary, context = {}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="livelabs-qa-par-renderer" content="${PAR_REPORT_RENDERER_VERSION}" />
  <title>PAR Retest List ${escapeHtml(summary.runId || "")}</title>
  <style>
    ${parPageStyles()}
    .retest-panel { background: var(--panel); border: 1px solid var(--line); }
    .retest-heading { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; padding: 18px; border-bottom: 1px solid var(--line); }
    .retest-heading h2 { margin: 0; font-size: 21px; }
    .retest-heading p { margin: 5px 0 0; color: var(--muted); }
    .retest-count { display: inline-flex; align-items: center; min-height: 36px; padding: 7px 11px; border: 1px solid #b9d8eb; background: #eaf4fb; color: var(--link); font-size: 13px; font-weight: 800; white-space: nowrap; }
    .retest-instructions { margin: 0; padding: 14px 18px; border-bottom: 1px solid var(--line); background: #f8fafb; color: var(--muted); line-height: 1.5; }
    .retest-toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--line); }
    .retest-toolbar-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .retest-search { display: grid; gap: 5px; color: var(--muted); font-size: 12px; font-weight: 700; }
    .retest-search input { min-width: 280px; min-height: 38px; padding: 8px 10px; border: 1px solid #aebbc7; font: inherit; }
    .action-button { min-height: 38px; padding: 8px 11px; border: 1px solid #aebbc7; background: #fff; color: var(--link); cursor: pointer; font: inherit; font-size: 13px; font-weight: 700; text-decoration: none; }
    .action-button.primary { border-color: var(--link); background: var(--link); color: #fff; }
    .action-button.danger { color: var(--fail); }
    .action-button:disabled { cursor: default; opacity: .45; }
    .retest-table { overflow-x: auto; }
    .retest-table-head, .retest-row { display: grid; grid-template-columns: 110px minmax(260px, 1.4fr) minmax(180px, .8fr) minmax(250px, 1.2fr) auto; gap: 14px; align-items: center; min-width: 980px; }
    .retest-table-head { padding: 10px 16px; background: #eef2f5; color: var(--muted); font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .retest-row { padding: 13px 16px; border-top: 1px solid var(--line); }
    .retest-row:first-child { border-top: 0; }
    .retest-row strong, .retest-row small { display: block; overflow-wrap: anywhere; }
    .retest-row small { margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.4; }
    .retest-row-actions { display: flex; gap: 6px; justify-content: flex-end; }
    .retest-empty { padding: 34px 20px; color: var(--muted); text-align: center; }
    .retest-message { min-height: 20px; margin: 0; padding: 0 18px 12px; color: var(--pass); font-size: 13px; font-weight: 700; }
    .retest-message.error { color: var(--fail); }
    @media (max-width: 720px) {
      .retest-heading, .retest-toolbar { display: grid; }
      .retest-search input { min-width: 0; width: 100%; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="header-copy">
      <p class="eyebrow">LiveLabs QA</p>
      <h1>PAR Retest List</h1>
      <p class="run-meta">Links selected from PAR reports for a focused verification run.</p>
    </div>
  </header>
  <nav class="page-nav" aria-label="Report views">
    <div class="page-nav-views">
      <a href="/">QA Hub home</a>
      ${context.historyHref ? `<a href="${escapeHtml(context.historyHref)}">All runs</a>` : ""}
      <a href="par-links.html">PAR Links</a>
      <a class="active" href="par-retest-list.html">PAR Retest List <span class="nav-count" data-par-retest-count>0</span></a>
    </div>
  </nav>
  <main class="content">
    <section class="retest-panel">
      <div class="retest-heading">
        <div>
          <h2>Links ready to verify again</h2>
          <p>Add a finding after its workshop link is repaired, then target only those catalog items in Jenkins.</p>
        </div>
        <span class="retest-count"><span data-par-retest-count>0</span>&nbsp;selected</span>
      </div>
      <p class="retest-instructions"><strong>How to use:</strong> copy the item IDs, open the Jenkins PAR audit, paste them into <code>CATALOG_ITEM_IDS</code>, and run the audit. Remove an entry after the new report confirms it is working.</p>
      <div class="retest-toolbar">
        <label class="retest-search">
          <span>Search selected links</span>
          <input type="search" data-par-retest-search placeholder="Workshop, WMS ID, or file" />
        </label>
        <div class="retest-toolbar-actions">
          <button class="action-button primary" type="button" data-copy-item-ids>Copy item IDs</button>
          <a class="action-button" href="/jenkins/job/livelabs-par-audit/">Open Jenkins PAR audit</a>
          <button class="action-button" type="button" data-download-retest>Download CSV</button>
          <button class="action-button danger" type="button" data-clear-retest>Clear list</button>
        </div>
      </div>
      <p class="retest-message" data-par-retest-message aria-live="polite"></p>
      <div class="retest-table" role="table" aria-label="PAR links selected for retest">
        <div class="retest-table-head" role="row">
          <span>Previous result</span>
          <span>Workshop or LiveStack</span>
          <span>PAR file</span>
          <span>Where it was found</span>
          <span>Action</span>
        </div>
        <div data-par-retest-rows></div>
        <div class="retest-empty" data-par-retest-empty>No PAR links have been added yet. Return to the PAR report and use <strong>Add to PAR Retest</strong>.</div>
      </div>
    </section>
  </main>
  <script>
    (() => {
      const storageKey = ${JSON.stringify(PAR_RETEST_STORAGE_KEY)};
      const rows = document.querySelector("[data-par-retest-rows]");
      const empty = document.querySelector("[data-par-retest-empty]");
      const search = document.querySelector("[data-par-retest-search]");
      const message = document.querySelector("[data-par-retest-message]");

      function readState() {
        try {
          const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
          return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
          return {};
        }
      }

      function writeState(state) {
        localStorage.setItem(storageKey, JSON.stringify(state || {}));
      }

      function escapeText(value) {
        return String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }

      function firstSource(entry) {
        return Array.isArray(entry.sources) && entry.sources.length ? entry.sources[0] : {};
      }

      function sourceDescription(entry) {
        const source = firstSource(entry);
        return [
          source.section || source.label || "",
          source.sourceLine ? "line " + source.sourceLine : "",
          entry.sources?.length > 1 ? "+" + (entry.sources.length - 1) + " more location(s)" : "",
        ].filter(Boolean).join(" / ");
      }

      function selectedEntries() {
        return Object.values(readState()).sort((left, right) =>
          String(left.itemTitle || "").localeCompare(String(right.itemTitle || "")) ||
          String(left.objectName || "").localeCompare(String(right.objectName || ""))
        );
      }

      function showMessage(text, error = false) {
        message.textContent = text;
        message.classList.toggle("error", error);
      }

      async function copyText(value) {
        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(value);
            return true;
          } catch {}
        }
        const field = document.createElement("textarea");
        field.value = value;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.left = "-9999px";
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        return copied;
      }

      function updateCounts(count) {
        document.querySelectorAll("[data-par-retest-count]").forEach((target) => {
          target.textContent = String(count);
        });
      }

      function render() {
        const query = String(search?.value || "").trim().toLowerCase();
        const entries = selectedEntries();
        const visible = entries.filter((entry) => !query || [
          entry.itemTitle,
          entry.itemId,
          entry.itemType,
          entry.objectName,
          sourceDescription(entry),
        ].filter(Boolean).join(" ").toLowerCase().includes(query));
        updateCounts(entries.length);
        empty.hidden = entries.length > 0;
        rows.innerHTML = visible.map((entry) => {
          const source = firstSource(entry);
          const sourceUrl = source.pageUrl || entry.catalogUrl || "";
          const statusLabel = entry.status === "broken" ? "Broken" : "Check again";
          return '<div class="retest-row" role="row">' +
            '<span><span class="badge ' + escapeText(entry.status) + '">' + statusLabel + '</span></span>' +
            '<span><strong>' + escapeText(entry.itemTitle) + '</strong><small>' +
              escapeText([entry.itemType, entry.itemId ? "WMS " + entry.itemId : ""].filter(Boolean).join(" / ")) +
            '</small></span>' +
            '<span><strong>' + escapeText(entry.objectName) + '</strong><small>' + escapeText(entry.maskedUrl) + '</small></span>' +
            '<span><strong>' + escapeText(sourceDescription(entry) || "Source location not recorded") + '</strong>' +
              (sourceUrl ? '<small><a href="' + escapeText(sourceUrl) + '" target="_blank" rel="noreferrer">Open exact lab</a></small>' : '') +
            '</span>' +
            '<span class="retest-row-actions"><button class="action-button danger" type="button" data-remove-retest="' + escapeText(entry.id) + '">Remove</button></span>' +
          '</div>';
        }).join("");
        rows.querySelectorAll("[data-remove-retest]").forEach((button) => {
          button.addEventListener("click", () => {
            const state = readState();
            delete state[button.dataset.removeRetest || ""];
            writeState(state);
            showMessage("Removed from the PAR Retest List.");
            render();
          });
        });
      }

      document.querySelector("[data-copy-item-ids]")?.addEventListener("click", async () => {
        const ids = Array.from(new Set(selectedEntries().map((entry) => entry.itemId).filter(Boolean)));
        if (!ids.length) {
          showMessage("No WMS IDs are available in this list.", true);
          return;
        }
        const copied = await copyText(ids.join(","));
        showMessage(copied ? "Item IDs copied. Paste them into CATALOG_ITEM_IDS in Jenkins." : "Copy failed.", !copied);
      });
      document.querySelector("[data-download-retest]")?.addEventListener("click", () => {
        const entries = selectedEntries();
        const cells = (values) => values.map((value) => '"' + String(value || "").replace(/"/g, '""') + '"').join(",");
        const csv = [
          cells(["previous_status", "catalog_type", "catalog_id", "catalog_title", "object_name", "fingerprint", "source"]),
          ...entries.map((entry) => cells([
            entry.status,
            entry.itemType,
            entry.itemId,
            entry.itemTitle,
            entry.objectName,
            entry.fingerprint,
            firstSource(entry).pageUrl || "",
          ])),
        ].join("\\n") + "\\n";
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "par-retest-list.csv";
        link.click();
        URL.revokeObjectURL(url);
        showMessage("PAR Retest List CSV downloaded.");
      });
      document.querySelector("[data-clear-retest]")?.addEventListener("click", () => {
        writeState({});
        showMessage("PAR Retest List cleared.");
        render();
      });
      search?.addEventListener("input", render);
      window.addEventListener("storage", (event) => {
        if (event.key === storageKey) render();
      });
      render();
    })();
  </script>
</body>
</html>`;
}

function parEmptyHtml(summary) {
  const isRegressionReport = summary.reportChannel === "regression";
  return [
    '    <section class="empty-state">',
    "      <h2>No PAR audit data in this run</h2>",
    isRegressionReport
      ? "      <p>This is an overall regression report. PAR audits are published separately.</p>"
      : "      <p>Run the PAR audit profile or the PAR test command.</p>",
    isRegressionReport
      ? '      <p><a class="report-link" href="/par/latest/par-links.html">Open the latest PAR audit</a></p>'
      : "",
    "    </section>",
  ].filter(Boolean).join("\n");
}

function latestReportRefreshScript(runId) {
  return `<script>
    (() => {
      const loadedRunId = ${JSON.stringify(String(runId || ""))};
      window.setInterval(async () => {
        try {
          const response = await fetch("summary.json", { cache: "no-store" });
          if (!response.ok) return;
          const latest = await response.json();
          if (latest.runId && latest.runId !== loadedRunId) window.location.reload();
        } catch {}
      }, 15000);
    })();
  </script>`;
}

function metricHtml(label, value, description, tone = "") {
  return [
    '<div class="metric ' + escapeHtml(tone) + '">',
    "<strong>" + Number(value || 0) + "</strong>",
    "<span>" + escapeHtml(label) + "</span>",
    "<small>" + escapeHtml(description) + "</small>",
    "</div>",
  ].join("");
}

function statusBadgeHtml(status, overrideLabel = "") {
  const labels = {
    working: "Working",
    broken: "Broken",
    unverified: "Not verified",
  };
  return '<span class="badge ' + escapeHtml(status || "") + '">' +
    escapeHtml(overrideLabel || labels[status] || status || "Unknown") +
    "</span>";
}

function sourceLinkHtml(url, label = "Open page") {
  if (!/^https?:\/\//i.test(url || "")) return "";
  return '<a class="source-link" href="' + escapeHtml(url) + '" target="_blank" rel="noreferrer">' + escapeHtml(label) + "</a>";
}

function parPageStyles() {
  return [
    ":root { color-scheme: light; font-family: Arial, Helvetica, sans-serif; --bg: #f5f7f9; --panel: #ffffff; --line: #d7dfe6; --text: #17212b; --muted: #52606d; --pass: #087443; --pass-bg: #e8f7ef; --fail: #b42318; --fail-bg: #fff0ee; --warn: #8a5a00; --warn-bg: #fff5d8; --link: #005ea8; }",
    "* { box-sizing: border-box; }",
    "[hidden] { display: none !important; }",
    "body { margin: 0; background: var(--bg); color: var(--text); }",
    "a { color: var(--link); }",
    ".topbar { display: flex; justify-content: space-between; gap: 24px; align-items: center; padding: 26px max(24px, calc((100vw - 1180px) / 2)); background: #fff; border-bottom: 1px solid var(--line); }",
    ".eyebrow { margin: 0 0 5px; color: var(--muted); font-size: 13px; font-weight: 700; text-transform: uppercase; }",
    "h1 { margin: 0; font-size: 30px; letter-spacing: 0; }",
    ".run-meta { margin: 7px 0 0; color: var(--muted); }",
    ".status-block { display: flex; align-items: center; gap: 9px; padding: 9px 12px; border: 1px solid var(--line); background: #fff; }",
    ".status-dot { width: 10px; height: 10px; border-radius: 50%; background: #64748b; }",
    ".status-block.pass .status-dot { background: var(--pass); }",
    ".status-block.fail .status-dot { background: var(--fail); }",
    ".status-block.warn .status-dot { background: var(--warn); }",
    ".page-nav { display: flex; justify-content: space-between; gap: 18px; padding: 9px max(24px, calc((100vw - 1180px) / 2)); background: #fff; border-bottom: 1px solid var(--line); }",
    ".page-nav-views, .page-nav-timeline { display: flex; gap: 14px; align-items: center; }",
    ".page-nav a { padding: 7px 2px; color: var(--muted); text-decoration: none; border-bottom: 2px solid transparent; }",
    ".page-nav a.active { color: var(--text); border-color: #c74634; font-weight: 700; }",
    ".nav-count { display: inline-flex; min-width: 20px; justify-content: center; margin-left: 3px; padding: 2px 5px; border-radius: 999px; background: #eaf4fb; color: var(--link); font-size: 11px; font-weight: 800; }",
    ".page-nav .timeline-link { padding: 6px 9px; border: 1px solid #aebbc7; color: var(--link); font-size: 13px; font-weight: 700; }",
    ".page-nav .timeline-link.disabled { color: #7b8794; background: #f1f4f6; cursor: default; opacity: .65; }",
    ".content { max-width: 1180px; margin: 0 auto; padding: 24px; }",
    ".par-action-message { min-height: 20px; margin: 0 0 8px; color: var(--pass); font-size: 13px; font-weight: 700; }",
    ".par-action-message.error { color: var(--fail); }",
    ".metrics { display: grid; grid-template-columns: repeat(4, minmax(150px, 1fr)); gap: 10px; }",
    ".metric { min-height: 94px; padding: 14px; background: var(--panel); border: 1px solid var(--line); }",
    ".metric strong { display: block; font-size: 27px; }",
    ".metric span { display: block; margin-top: 3px; font-weight: 700; }",
    ".metric small { display: block; margin-top: 5px; color: var(--muted); }",
    ".metric.pass { border-left: 4px solid var(--pass); }",
    ".metric.fail { border-left: 4px solid var(--fail); }",
    ".metric.warn { border-left: 4px solid var(--warn); }",
    ".report-help { margin-top: 12px; padding: 11px 12px; border: 1px solid var(--line); background: #fff; }",
    ".report-help > summary { color: var(--link); cursor: pointer; font-size: 13px; font-weight: 700; }",
    ".status-key { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }",
    ".status-key div { padding: 11px 12px; border: 1px solid var(--line); background: #fff; }",
    ".status-key strong, .status-key span { display: block; }",
    ".status-key span { margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.4; }",
    ".security-note { margin-top: 12px; color: var(--muted); font-size: 13px; line-height: 1.45; }",
    ".all-clear { display: flex; gap: 8px; align-items: baseline; margin-top: 22px; padding: 16px; border-left: 4px solid var(--pass); background: var(--pass-bg); }",
    ".all-clear span { color: var(--muted); }",
    ".results-panel { margin-top: 24px; background: var(--panel); border: 1px solid var(--line); }",
    ".results-heading { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; padding: 18px; border-bottom: 1px solid var(--line); }",
    ".results-heading h2 { margin: 0; font-size: 21px; }",
    ".results-heading p { margin: 5px 0 0; color: var(--muted); }",
    ".download-menu { position: relative; flex: 0 0 auto; }",
    ".download-menu > summary { min-height: 38px; padding: 8px 12px; border: 1px solid #aebbc7; background: #fff; color: var(--link); cursor: pointer; font-size: 13px; font-weight: 700; list-style: none; }",
    ".download-menu > summary::-webkit-details-marker { display: none; }",
    ".download-menu > summary::after { content: ' v'; }",
    ".download-menu[open] > summary::after { content: ' ^'; }",
    ".download-menu > div { position: absolute; z-index: 5; right: 0; width: 270px; margin-top: 5px; padding: 8px; border: 1px solid var(--line); background: #fff; box-shadow: 0 8px 24px rgba(23, 33, 43, .14); }",
    ".download-menu p { margin: 2px 5px 7px; color: var(--muted); font-size: 12px; }",
    ".download-menu a { display: flex; justify-content: space-between; gap: 12px; padding: 8px; color: var(--text); text-decoration: none; }",
    ".download-menu a:hover { background: #eef5fa; }",
    ".download-menu a span { color: var(--muted); font-size: 12px; white-space: nowrap; }",
    ".result-tools { display: grid; grid-template-columns: minmax(240px, 1fr) minmax(0, 2fr) auto; gap: 14px; align-items: end; padding: 14px 18px; background: #f8fafb; border-bottom: 1px solid var(--line); }",
    ".result-search, .page-size { display: grid; gap: 5px; color: var(--muted); font-size: 12px; font-weight: 700; }",
    ".result-search input, .page-size select { min-height: 38px; border: 1px solid #aebbc7; background: #fff; color: var(--text); font: inherit; padding: 8px 10px; }",
    ".filter-buttons { display: flex; flex-wrap: wrap; gap: 6px; }",
    ".filter-buttons button, .pagination button { min-height: 38px; border: 1px solid #aebbc7; background: #fff; color: var(--text); cursor: pointer; font: inherit; font-weight: 700; padding: 7px 10px; }",
    ".filter-buttons button span { margin-left: 4px; color: var(--muted); font-size: 12px; }",
    ".filter-buttons button.active { border-color: var(--link); background: #eaf4fb; color: var(--link); }",
    ".result-table { overflow-x: auto; }",
    ".result-table-head, .result-summary { display: grid; grid-template-columns: 105px minmax(240px, 1.25fr) minmax(250px, 1.35fr) minmax(190px, 1fr); gap: 14px; align-items: center; min-width: 920px; }",
    ".result-table-head { padding: 10px 16px; background: #eef2f5; color: var(--muted); font-size: 12px; font-weight: 800; text-transform: uppercase; }",
    ".result-row { margin: 0; border-top: 1px solid var(--line); background: #fff; }",
    ".result-row:first-child { border-top: 0; }",
    ".result-row[hidden] { display: none; }",
    ".result-row > summary { list-style: none; cursor: pointer; }",
    ".result-row > summary::-webkit-details-marker { display: none; }",
    ".result-summary { position: relative; padding: 13px 38px 13px 16px; }",
    ".result-summary::after { position: absolute; right: 16px; content: '+'; color: var(--muted); font-size: 20px; font-weight: 700; }",
    ".result-row[open] > .result-summary::after { content: '-'; }",
    ".result-row[open] { box-shadow: inset 5px 0 0 var(--link); }",
    ".result-row[open] > .result-summary { background: #eaf4fb; color: #063b66; }",
    ".result-summary:hover { background: #f8fbfd; }",
    ".result-row[open] > .result-summary:hover { background: #eaf4fb; }",
    ".item-cell, .finding-cell { display: grid; gap: 4px; min-width: 0; }",
    ".item-cell strong, .finding-cell strong { overflow-wrap: anywhere; }",
    ".item-cell small, .finding-cell small, .location-cell { color: var(--muted); font-size: 12px; line-height: 1.35; overflow-wrap: anywhere; }",
    ".result-details { display: grid; gap: 16px; padding: 18px; border-top: 1px solid var(--line); background: #fbfcfd; }",
    ".guidance-summary { display: grid; gap: 7px; padding: 13px; border: 1px solid var(--line); border-left: 4px solid var(--fail); background: #fff; }",
    ".guidance-summary p { margin: 0; font-size: 14px; line-height: 1.4; }",
    ".source-block { margin-top: 0; padding: 14px; border: 1px solid var(--line); background: #fff; }",
    ".source-block h3 { margin: 0; font-size: 16px; }",
    ".source-block-heading { display: flex; justify-content: space-between; gap: 14px; align-items: center; margin-bottom: 10px; }",
    ".source-block-heading p { margin: 3px 0 0; color: var(--muted); font-size: 12px; }",
    ".source-block ul { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }",
    ".source-block li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 14px; align-items: start; padding-top: 10px; border-top: 1px solid #e8edf1; }",
    ".source-block li:first-child { padding-top: 0; border-top: 0; }",
    ".source-block li span { display: block; margin-top: 4px; color: var(--muted); font-size: 12px; }",
    ".source-copy { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px 14px; }",
    ".source-copy p { margin: 0; }",
    ".source-copy p strong { display: block; margin-top: 2px; font-size: 13px; line-height: 1.35; }",
    ".source-match { grid-column: 1 / -1; }",
    ".source-match > summary { color: var(--link); cursor: pointer; font-size: 12px; font-weight: 700; }",
    ".source-block .source-location { color: var(--text); font-size: 13px; font-weight: 700; }",
    ".source-file, .source-excerpt { display: block; margin-top: 7px; padding: 7px; border: 1px solid var(--line); background: #f8fafb; color: var(--muted); font-size: 12px; overflow-wrap: anywhere; white-space: normal; }",
    ".source-excerpt { color: var(--text); }",
    ".source-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }",
    ".source-link, .copy-link-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 9px; border: 1px solid #aebbc7; background: #fff; color: var(--link); cursor: pointer; font: inherit; text-decoration: none; white-space: nowrap; font-size: 13px; font-weight: 700; }",
    ".source-link:hover, .copy-link-button:hover { border-color: var(--link); background: #eef6fb; }",
    ".source-link.selected, .retest-link-button.selected { border-color: var(--pass); background: var(--pass-bg); color: var(--pass); }",
    ".copy-link-button:disabled { cursor: wait; opacity: .65; }",
    ".link-location { display: grid; gap: 6px; margin-top: 12px; }",
    ".link-location > span { color: var(--muted); font-size: 12px; font-weight: 700; text-transform: uppercase; }",
    ".link-location > small { color: var(--muted); font-size: 12px; line-height: 1.4; }",
    ".link-value { display: grid; grid-template-columns: minmax(0, 1fr) repeat(3, auto); gap: 8px; align-items: stretch; }",
    ".link-value code { min-width: 0; padding: 9px; border: 1px solid var(--line); background: #f8fafb; overflow-wrap: anywhere; white-space: normal; }",
    ".scan-source { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 14px; align-items: center; }",
    ".scan-source strong { grid-column: 1 / -1; }",
    ".scan-source code { min-width: 0; padding: 9px; border: 1px solid var(--line); background: #f8fafb; overflow-wrap: anywhere; white-space: normal; }",
    ".technical-details { margin-top: 0; padding: 12px; border: 1px solid var(--line); background: #fff; }",
    ".technical-details summary { color: var(--muted); cursor: pointer; font-size: 13px; font-weight: 700; }",
    ".technical-details pre { margin: 10px 0 0; padding: 10px; background: #111827; color: #e5e7eb; overflow-wrap: anywhere; white-space: pre-wrap; }",
    ".pagination { display: flex; justify-content: space-between; gap: 14px; align-items: center; padding: 12px 18px; border-top: 1px solid var(--line); color: var(--muted); font-size: 13px; }",
    ".pagination div { display: flex; gap: 7px; }",
    ".pagination button:disabled { cursor: default; opacity: .45; }",
    ".no-results { padding: 28px; text-align: center; color: var(--muted); }",
    ".attention-title { margin: 28px 0 2px; font-size: 22px; }",
    ".issue-section { margin-top: 24px; }",
    ".issue-section-heading { display: flex; justify-content: space-between; gap: 18px; align-items: end; padding-bottom: 10px; border-bottom: 1px solid var(--line); }",
    ".issue-section-heading h2 { margin: 0; font-size: 19px; }",
    ".issue-section-heading p { margin: 5px 0 0; color: var(--muted); }",
    ".issue-section-meta { display: flex; gap: 12px; align-items: center; white-space: nowrap; }",
    ".issue-section-meta strong { color: var(--fail); font-size: 20px; }",
    ".issue-section-meta a { font-size: 13px; }",
    ".issue-list { display: grid; gap: 12px; margin-top: 12px; }",
    ".par-issue { padding: 16px; border: 1px solid var(--line); border-left: 5px solid var(--fail); background: var(--panel); }",
    ".par-issue.unverified, .par-issue.scan-error { border-left-color: var(--warn); }",
    ".issue-header { display: flex; gap: 12px; align-items: flex-start; }",
    ".issue-header h3 { margin: 0; font-size: 18px; overflow-wrap: anywhere; }",
    ".issue-header p { margin: 4px 0 0; color: var(--muted); }",
    ".issue-header p span { margin-left: 5px; font-size: 12px; font-weight: 700; text-transform: uppercase; }",
    ".badge { display: inline-block; min-width: 74px; padding: 4px 7px; border-radius: 999px; text-align: center; font-size: 12px; font-weight: 800; background: #e8edf2; }",
    ".badge.working { color: var(--pass); background: var(--pass-bg); }",
    ".badge.broken { color: var(--fail); background: var(--fail-bg); }",
    ".badge.unverified { color: var(--warn); background: var(--warn-bg); }",
    ".fact-grid { display: grid; grid-template-columns: repeat(4, minmax(130px, 1fr)); gap: 10px; margin-top: 15px; }",
    ".fact-grid div { min-width: 0; padding: 10px; background: #f6f8fa; }",
    ".fact-grid span, .link-location span { display: block; color: var(--muted); font-size: 12px; font-weight: 700; text-transform: uppercase; }",
    ".fact-grid strong { display: block; margin-top: 4px; overflow-wrap: anywhere; }",
    ".link-location { margin-top: 13px; }",
    ".link-location code { display: block; margin-top: 5px; padding: 9px; border: 1px solid var(--line); background: #f8fafb; overflow-wrap: anywhere; white-space: normal; }",
    ".fingerprint { margin: 8px 0 0; color: var(--muted); font-size: 12px; }",
    ".issue-error { margin: 12px 0 0; padding: 10px; color: var(--fail); background: var(--fail-bg); }",
    ".scan-explanation { display: grid; gap: 6px; margin-top: 14px; padding: 13px; border-left: 4px solid var(--warn); background: var(--warn-bg); }",
    ".scan-explanation span, .scan-next-step span { color: var(--muted); font-size: 12px; font-weight: 800; text-transform: uppercase; }",
    ".scan-explanation strong { font-size: 16px; line-height: 1.4; }",
    ".scan-explanation p, .scan-next-step p { margin: 0; color: var(--muted); line-height: 1.45; }",
    ".scan-facts { margin-top: 12px; }",
    ".scan-next-step { display: grid; gap: 5px; margin-top: 12px; padding: 11px 12px; border: 1px solid var(--line); background: #f8fafb; }",
    ".empty-state { margin-top: 18px; padding: 28px; background: #fff; border: 1px solid var(--line); text-align: center; }",
    ".empty-state h2 { margin-top: 0; }",
    ".report-link { display: inline-block; padding: 9px 13px; border: 1px solid var(--blue); color: var(--blue); font-weight: 700; text-decoration: none; }",
    "@media (max-width: 980px) { .result-tools { grid-template-columns: 1fr; align-items: stretch; } .page-size { max-width: 180px; } .plain-guidance { grid-template-columns: 1fr; } }",
    "@media (max-width: 820px) { .metrics, .fact-grid { grid-template-columns: repeat(2, minmax(140px, 1fr)); } .status-key { grid-template-columns: 1fr; } .working-row { grid-template-columns: 1fr; } .working-row > strong { text-align: left; } .results-heading { flex-direction: column; } .download-menu > div { left: 0; right: auto; } }",
    "@media (max-width: 600px) { .topbar { padding: 20px 16px; align-items: flex-start; flex-direction: column; } .page-nav { padding-inline: 16px; align-items: flex-start; flex-direction: column; } .page-nav-views, .page-nav-timeline { flex-wrap: wrap; } .content { padding: 16px 10px; } .metrics { grid-template-columns: 1fr 1fr; } .issue-section-heading, .source-block li, .source-copy { align-items: flex-start; grid-template-columns: 1fr; } .source-block-heading { align-items: flex-start; flex-direction: column; } .source-actions { justify-content: flex-start; } .fact-grid, .scan-source, .link-value { grid-template-columns: 1fr; } .issue-header { flex-direction: column; } .pagination { align-items: flex-start; flex-direction: column; } }",
  ].join("\n");
}

function catalogItemSummary(item) {
  if (!item || typeof item !== "object") return null;
  return {
    type: item.type || "",
    id: item.id || "",
    slug: item.slug || "",
    title: item.title || "",
    normalized_href: safeReportUrl(item.normalized_href || item.absolute_url || item.href || ""),
  };
}

function safeReportUrl(value) {
  try {
    const rawValue = String(value || "").trim();
    if (!rawValue) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(rawValue) && !/^https?:/i.test(rawValue)) return "";
    const relative = !/^https?:\/\//i.test(rawValue);
    const url = new URL(rawValue, "https://livelabs.oracle.com/");
    for (const key of ["session", "p_instance"]) url.searchParams.delete(key);
    for (const key of ["token", "access_token", "auth", "authorization"]) {
      if (url.searchParams.has(key)) url.searchParams.set(key, "***");
    }
    return relative ? url.pathname + url.search + url.hash : url.toString();
  } catch {
    return "";
  }
}
function emptyCounts() {
  return {
    total: 0,
    working: 0,
    broken: 0,
    unverified: 0,
  };
}

function incrementCount(counts, status) {
  counts.total += 1;
  counts[status] = (counts[status] || 0) + 1;
}

function compareParLinks(left, right) {
  return (
    (STATUS_ORDER[left.status] ?? 9) - (STATUS_ORDER[right.status] ?? 9) ||
    String(left.catalog_item?.title || left.source_name || left.label || "").localeCompare(
      String(right.catalog_item?.title || right.source_name || right.label || ""),
    ) ||
    String(left.object_name || "").localeCompare(String(right.object_name || ""))
  );
}

function parLinksCsv(links) {
  const header = [
    "scope",
    "status",
    "catalog_type",
    "catalog_id",
    "catalog_title",
    "link_id",
    "link_label",
    "object_name",
    "host",
    "region",
    "namespace",
    "bucket",
    "http_status",
    "method",
    "fingerprint",
    "masked_url",
    "source_page_types",
    "source_labels",
    "source_lab_numbers",
    "source_urls",
    "source_file_urls",
    "source_lines",
    "source_sections",
    "source_instructions",
    "source_search_text",
    "source_excerpts",
    "attempts",
    "checked_at",
    "owner",
    "error",
  ];
  const rows = links.map((link) => {
    const catalogItem = link.catalog_item || {};
    const sources = Array.isArray(link.sources) ? link.sources : [];
    return [
      link.scope,
      link.status,
      catalogItem.type,
      catalogItem.id || catalogItem.slug,
      catalogItem.title,
      link.id,
      link.label,
      link.object_name,
      link.host,
      link.region,
      link.namespace,
      link.bucket,
      link.http_status,
      link.method,
      link.fingerprint,
      link.masked_url,
      sources.map((source) => source.pageType).join(" | "),
      sources.map((source) => source.label).join(" | "),
      sources.map((source) => source.labNumber).filter(Boolean).join(" | "),
      sources.map((source) => source.pageUrl).join(" | "),
      sources.map((source) => source.sourceFileUrl).filter(Boolean).join(" | "),
      sources.map((source) => source.sourceLine).filter(Boolean).join(" | "),
      sources.map((source) => source.section).filter(Boolean).join(" | "),
      sources.map((source) => source.instruction).filter(Boolean).join(" | "),
      sources.map((source) => source.searchText).filter(Boolean).join(" | "),
      sources.map((source) => source.sourceExcerpt).filter(Boolean).join(" | "),
      link.attempts,
      link.checked_at,
      link.owner,
      link.error,
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

function scanErrorsCsv(errors) {
  const header = ["scope", "catalog_type", "catalog_id", "catalog_title", "source_name", "page_type", "label", "page_url", "error"];
  const rows = errors.map((error) => {
    const catalogItem = error.catalog_item || {};
    return [
      error.scope,
      catalogItem.type,
      catalogItem.id || catalogItem.slug,
      catalogItem.title,
      error.source_name,
      error.page_type,
      error.label,
      error.page_url,
      error.error,
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

function csvCell(value) {
  const text = value === undefined || value === null ? "" : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf-8");
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeScriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
