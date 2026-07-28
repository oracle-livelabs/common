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
          ? totalUnverified + " link" + (totalUnverified === 1 ? "" : "s") + " to recheck"
          : audit.has_data
            ? "No broken PAR links"
            : "No PAR audit data";

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
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
    "    </div>",
    reportTimelineNavigationHtml(context),
    "  </nav>",
    '  <main class="content">',
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
    metricHtml("Recheck", audit.counts.unverified, "Temporary or no response", audit.counts.unverified ? "warn" : ""),
    metricHtml("Working", audit.counts.working, "Confirmed with HTTP 2xx", "pass"),
    metricHtml("Pages missed", audit.scan_errors.length, "Could not be fully scanned", audit.scan_errors.length ? "fail" : ""),
    "    </section>",
    '    <section class="status-key" aria-label="PAR status meanings">',
    '      <div><strong>Broken</strong><span>OCI confirmed the file cannot be downloaded. It needs a replacement link.</span></div>',
    '      <div><strong>Recheck</strong><span>The server timed out or returned a temporary response. Rerun before changing content.</span></div>',
    '      <div><strong>Pages missed</strong><span>A source page could not be opened, so links inside it remain unknown.</span></div>',
    "    </section>",
    '    <section class="security-note"><strong>Why the URL is hidden:</strong> a complete PAR URL grants access to the Object Storage object. The scanner uses it in memory but never writes the token into HTML, CSV, logs, or browser history. Open the exact lab below to reproduce the learner step.</section>',
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
    '          <a href="par-unverified.csv"><strong>Recheck</strong><span>' + recheck.length + " results</span></a>",
    '          <a href="par-working.csv"><strong>Working</strong><span>' + working.length + " results</span></a>",
    '          <a href="par-scan-incomplete.csv"><strong>Pages missed</strong><span>' + scanErrors.length + " results</span></a>",
    "        </div></details>",
    "      </div>",
    '      <div class="result-tools">',
    '        <label class="result-search"><span>Search results</span><input id="par-result-search" type="search" placeholder="Workshop, WMS ID, file, bucket, or issue" /></label>',
    '        <div class="filter-buttons" role="group" aria-label="Filter PAR results">',
    filterButtonHtml("all", "All", links.length + scanErrors.length),
    filterButtonHtml("broken", "Broken", catalogProblems.length),
    filterButtonHtml("unverified", "Recheck", recheck.length),
    filterButtonHtml("scan-error", "Pages missed", scanErrors.length),
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
  const itemName = catalogItem.title || link.source_name || "Catalog item";
  const itemMeta = [catalogItem.type, catalogItem.id ? "WMS " + catalogItem.id : catalogItem.slug]
    .filter(Boolean)
    .join(" / ");
  const source = Array.isArray(link.sources) ? link.sources[0] : undefined;
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
    '    <span class="status-cell">' + statusBadgeHtml(link.status) + "</span>",
    '    <span class="item-cell"><strong>' + escapeHtml(itemName) + "</strong><small>" + escapeHtml(itemMeta || "Catalog item") + "</small></span>",
    '    <span class="finding-cell"><strong>' + escapeHtml(guidance.shortFinding) + "</strong><small>" + escapeHtml(link.object_name || link.label || "PAR link") + "</small></span>",
    '    <span class="location-cell">' + escapeHtml(exactLocation) + "</span>",
    "  </summary>",
    '  <div class="result-details">',
    guidanceSummaryHtml([
      ["Problem", guidance.finding],
      ["Fix", guidance.action],
    ]),
    sourceLocationsHtml(link.sources || [], catalogItem),
    '    <details class="technical-details"><summary>Technical details for developers</summary>',
    '      <div class="fact-grid">',
    factHtml("Bucket", link.bucket || "Not available"),
    factHtml("Namespace", link.namespace || "Not available"),
    factHtml("Region", link.region || link.host || "Not available"),
    factHtml("Response", response),
    "      </div>",
    link.masked_url
      ? '      <div class="link-location"><span>PAR location (access token hidden)</span><code>' + escapeHtml(link.masked_url) + "</code></div>"
      : "",
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

  if (link.status === "working") {
    return {
      shortFinding: "Link works",
      finding: `The PAR URL for ${quotedObject} returned HTTP ${status || "2xx"} and is working.`,
      impact: "No learner action is blocked by this link.",
      action: "No change is needed.",
    };
  }

  if (link.status === "unverified") {
    const attempts = Number(link.attempts || 0);
    return {
      shortFinding: "Could not confirm link",
      finding: `The PAR URL for ${quotedObject} did not return a reliable result after ${attempts || 1} attempt${attempts === 1 ? "" : "s"}.`,
      impact: "The link may be temporarily unavailable, but it is not confirmed broken.",
      action: `Rerun this item once before editing the workshop. If it fails again, open the affected lab and verify the PAR URL for ${quotedObject}.`,
    };
  }

  const responseText = status ? `HTTP ${status}` : "an unusable response";
  const finding =
    status === 404
      ? `The file ${quotedObject} cannot be downloaded because its PAR URL returned HTTP 404 (not found).`
      : status === 401 || status === 403
        ? `The file ${quotedObject} cannot be downloaded because its PAR URL refused access with HTTP ${status}.`
        : `The file ${quotedObject} cannot be downloaded because its PAR URL returned ${responseText}.`;

  return {
    shortFinding: status === 404 ? "File cannot be downloaded (404)" : "File cannot be downloaded",
    finding,
    impact: `A learner who follows this instruction cannot get ${quotedObject}.`,
    action: `Open the affected lab at the location shown and replace the PAR URL for ${quotedObject} with a working PAR. If the file is no longer required, remove the instruction. Republish, then rerun the PAR audit.`,
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

function parSourceLocation(source, catalogItem = {}) {
  const parts = [];
  if (catalogItem.id) parts.push("WMS " + catalogItem.id);
  if (source?.section) parts.push(source.section);
  else if (source?.label) parts.push(source.label);
  if (source?.sourceLine) parts.push("line " + source.sourceLine);
  else if (source?.location && !parts.includes(source.location)) parts.push(source.location);
  return parts.join(" / ") || "Source location not recorded";
}

function sourceLocationsHtml(sources, catalogItem = {}) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return '    <section class="source-block"><h3>Where to fix it</h3><p>Source page was not recorded.</p></section>';
  }

  const rows = sources
    .map((source) => {
      const location = parSourceLocation(source, catalogItem);
      const findText = [
        source.instruction ? "Step: " + source.instruction : "",
        source.sourceLine ? "Markdown line " + source.sourceLine : "",
        source.searchText ? 'Search for "' + source.searchText + '"' : "",
      ]
        .filter(Boolean)
        .join(" / ");
      return '<li><div><strong>' + escapeHtml(source.label || "Source page") + "</strong>" +
        '<span class="source-location">Exact location: ' + escapeHtml(location) + "</span>" +
        (findText ? '<span>' + escapeHtml(findText) + "</span>" : "") +
        (source.sourceExcerpt
          ? '<code class="source-excerpt">' + escapeHtml(source.sourceExcerpt) + "</code>"
          : "") +
        '</div><div class="source-actions">' +
        sourceLinkHtml(source.pageUrl || "", "Open exact lab") +
        "</div></li>";
    })
    .join("\n");

  return '    <section class="source-block"><h3>Where to fix it</h3><ul>' + rows + "</ul></section>";
}

function parScanResultRowHtml(error) {
  const item = error.catalog_item || {};
  const itemName = item.title || error.source_name || "Catalog item";
  const itemMeta = [item.type || error.scope, item.id ? "WMS " + item.id : item.slug].filter(Boolean).join(" / ");
  const technicalError = sanitizeSensitiveText(error.error || "The page could not be scanned.");
  const explanation = parScanErrorExplanation(technicalError);
  const action = parScanSuggestedAction(technicalError, error.label || error.page_type || "source page");
  const pageUrl = safeReportUrl(error.page_url || error.pageUrl || "");
  const sourceFileUrl = safeReportUrl(error.source_file_url || error.sourceFileUrl || "");
  const exactLocation = [item.id ? "WMS " + item.id : "", error.label || error.page_type || "Source page"]
    .filter(Boolean)
    .join(" / ");
  const searchable = [
    "scan error pages missed incomplete",
    itemName,
    itemMeta,
    error.label,
    error.page_type,
    explanation,
    technicalError,
    pageUrl,
  ].filter(Boolean).join(" ").toLowerCase();

  return [
    '<details class="result-row scan-error" data-par-row data-status="scan-error" data-search="' + escapeHtml(searchable) + '">',
    '  <summary class="result-summary">',
    '    <span class="status-cell"><span class="badge unverified">Page missed</span></span>',
    '    <span class="item-cell"><strong>' + escapeHtml(itemName) + "</strong><small>" + escapeHtml(itemMeta || "Catalog item") + "</small></span>",
    '    <span class="finding-cell"><strong>Source page could not be scanned</strong><small>' + escapeHtml(explanation) + "</small></span>",
    '    <span class="location-cell">' + escapeHtml(exactLocation) + "</span>",
    "  </summary>",
    '  <div class="result-details">',
    guidanceSummaryHtml([
      ["Problem", explanation],
      ["Not checked", "PAR links inside this source page were not marked working or broken."],
      ["Fix", action],
    ]),
    '    <section class="source-block"><h3>Where to fix it</h3><div class="scan-source">',
    '      <strong>' + escapeHtml(error.label || error.page_type || "Source page") + "</strong>",
    pageUrl ? '<code>' + escapeHtml(pageUrl) + "</code>" + sourceLinkHtml(pageUrl, "Open failing source") : "",
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
  const value = sanitizeSensitiveText(error).trim();
  const timeout = value.match(/Timeout\s+(\d+)ms\s+exceeded/i);
  if (timeout) {
    const seconds = Math.max(1, Math.round(Number(timeout[1]) / 1000));
    return `The source did not respond within ${seconds} seconds. It remains unverified and is not counted as a broken PAR link.`;
  }

  const httpStatus = value.match(/HTTP\s+(\d{3})/i)?.[1];
  if (httpStatus === "404") {
    return "The source page returned HTTP 404 (not found). The scanner could not open it, so any PAR links inside were not checked.";
  }
  if (httpStatus === "401" || httpStatus === "403") {
    return `The source page refused access with HTTP ${httpStatus}. The scanner could not inspect its PAR links.`;
  }
  if (httpStatus && Number(httpStatus) >= 500) {
    return `The source page returned server error HTTP ${httpStatus}. Its PAR links could not be checked in this run.`;
  }

  return value || "The source page could not be scanned, so its PAR links remain unchecked.";
}

function parScanSuggestedAction(error, label = "source page") {
  const value = String(error || "");
  if (/HTTP\s+404/i.test(value)) {
    return `Open the workshop manifest or source configuration and correct the path for "${label}". If the page was intentionally removed, remove its manifest entry. Republish the catalog item, then rerun the PAR audit.`;
  }
  if (/HTTP\s+(401|403)/i.test(value)) {
    return "Confirm that the page should be accessible to the QA runner, correct its access if needed, and rerun the audit.";
  }
  if (/Timeout\s+\d+ms\s+exceeded/i.test(value) || /HTTP\s+5\d\d/i.test(value)) {
    return "Rerun this page once. If it fails again, ask the page owner to investigate its availability.";
  }
  return "Open the exact source below, correct the page problem, and rerun the PAR audit.";
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
      let activeFilter = ${JSON.stringify(defaultFilter)};
      let page = 1;

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
      render();
    })();
  </script>`;
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

function statusBadgeHtml(status) {
  const labels = {
    working: "Working",
    broken: "Broken",
    unverified: "Recheck",
  };
  return '<span class="badge ' + escapeHtml(status || "") + '">' + escapeHtml(labels[status] || status || "Unknown") + "</span>";
}

function sourceLinkHtml(url, label = "Open page") {
  if (!/^https?:\/\//i.test(url || "")) return "";
  return '<a class="source-link" href="' + escapeHtml(url) + '" target="_blank" rel="noreferrer">' + escapeHtml(label) + "</a>";
}

function parPageStyles() {
  return [
    ":root { color-scheme: light; font-family: Arial, Helvetica, sans-serif; --bg: #f5f7f9; --panel: #ffffff; --line: #d7dfe6; --text: #17212b; --muted: #52606d; --pass: #087443; --pass-bg: #e8f7ef; --fail: #b42318; --fail-bg: #fff0ee; --warn: #8a5a00; --warn-bg: #fff5d8; --link: #005ea8; }",
    "* { box-sizing: border-box; }",
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
    ".page-nav .timeline-link { padding: 6px 9px; border: 1px solid #aebbc7; color: var(--link); font-size: 13px; font-weight: 700; }",
    ".page-nav .timeline-link.disabled { color: #7b8794; background: #f1f4f6; cursor: default; opacity: .65; }",
    ".content { max-width: 1180px; margin: 0 auto; padding: 24px; }",
    ".metrics { display: grid; grid-template-columns: repeat(4, minmax(150px, 1fr)); gap: 10px; }",
    ".metric { min-height: 94px; padding: 14px; background: var(--panel); border: 1px solid var(--line); }",
    ".metric strong { display: block; font-size: 27px; }",
    ".metric span { display: block; margin-top: 3px; font-weight: 700; }",
    ".metric small { display: block; margin-top: 5px; color: var(--muted); }",
    ".metric.pass { border-left: 4px solid var(--pass); }",
    ".metric.fail { border-left: 4px solid var(--fail); }",
    ".metric.warn { border-left: 4px solid var(--warn); }",
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
    ".result-summary:hover { background: #f8fbfd; }",
    ".item-cell, .finding-cell { display: grid; gap: 4px; min-width: 0; }",
    ".item-cell strong, .finding-cell strong { overflow-wrap: anywhere; }",
    ".item-cell small, .finding-cell small, .location-cell { color: var(--muted); font-size: 12px; line-height: 1.35; overflow-wrap: anywhere; }",
    ".result-details { display: grid; gap: 16px; padding: 18px; border-top: 1px solid var(--line); background: #fbfcfd; }",
    ".guidance-summary { display: grid; gap: 7px; padding: 13px; border: 1px solid var(--line); border-left: 4px solid var(--fail); background: #fff; }",
    ".guidance-summary p { margin: 0; line-height: 1.45; }",
    ".source-block { margin-top: 0; padding: 14px; border: 1px solid var(--line); background: #fff; }",
    ".source-block h3 { margin: 0 0 10px; font-size: 16px; }",
    ".source-block ul { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }",
    ".source-block li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 14px; align-items: start; padding-top: 10px; border-top: 1px solid #e8edf1; }",
    ".source-block li:first-child { padding-top: 0; border-top: 0; }",
    ".source-block li span { display: block; margin-top: 4px; color: var(--muted); font-size: 12px; }",
    ".source-block .source-location { color: var(--text); font-size: 13px; font-weight: 700; }",
    ".source-file, .source-excerpt { display: block; margin-top: 7px; padding: 7px; border: 1px solid var(--line); background: #f8fafb; color: var(--muted); font-size: 12px; overflow-wrap: anywhere; white-space: normal; }",
    ".source-excerpt { color: var(--text); }",
    ".source-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }",
    ".source-link { display: inline-block; padding: 7px 9px; border: 1px solid #aebbc7; background: #fff; text-decoration: none; white-space: nowrap; font-size: 13px; font-weight: 700; }",
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
    "@media (max-width: 600px) { .topbar { padding: 20px 16px; align-items: flex-start; flex-direction: column; } .page-nav { padding-inline: 16px; align-items: flex-start; flex-direction: column; } .page-nav-views, .page-nav-timeline { flex-wrap: wrap; } .content { padding: 16px 10px; } .metrics { grid-template-columns: 1fr 1fr; } .issue-section-heading, .source-block li { align-items: flex-start; grid-template-columns: 1fr; } .source-actions { justify-content: flex-start; } .fact-grid, .scan-source { grid-template-columns: 1fr; } .issue-header { flex-direction: column; } .pagination { align-items: flex-start; flex-direction: column; } }",
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
    const relative = !/^https?:\/\//i.test(value);
    const url = new URL(value, "https://livelabs.oracle.com/");
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
