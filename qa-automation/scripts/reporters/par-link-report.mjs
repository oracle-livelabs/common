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

  fs.writeFileSync(path.join(outputDir, "par-catalog-not-working.csv"), parLinksCsv(catalogBroken), "utf-8");
  fs.writeFileSync(path.join(outputDir, "par-unverified.csv"), parLinksCsv(unverified), "utf-8");
  fs.writeFileSync(path.join(outputDir, "par-scan-incomplete.csv"), scanErrorsCsv(audit.scan_errors), "utf-8");
}

export function parLinksPageHtml(summary) {
  const audit = summary.parAudit || buildParAuditSummary([]);
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
    '    <a href="summary.html">Tested items</a>',
    '    <a class="active" href="par-links.html">PAR Links</a>',
    "  </nav>",
    '  <main class="content">',
    audit.has_data ? parOverviewHtml(audit) : parEmptyHtml(),
    "  </main>",
    "</body>",
    "</html>",
  ].join("\n");
}

function parOverviewHtml(audit) {
  const catalogProblems = audit.catalog.links.filter((link) => link.status === "broken");
  const recheck = audit.catalog.links.filter((link) => link.status === "unverified");
  const working = audit.catalog.links.filter((link) => link.status === "working");
  const attentionCount = catalogProblems.length + recheck.length + audit.scan_errors.length;

  return [
    '    <section class="metrics" aria-label="PAR audit totals">',
    metricHtml("Broken", audit.counts.broken, "Confirmed unusable", audit.counts.broken ? "fail" : ""),
    metricHtml("Recheck", audit.counts.unverified, "Temporary or no response", audit.counts.unverified ? "warn" : ""),
    metricHtml("Working", audit.counts.working, "Confirmed with HTTP 2xx", "pass"),
    metricHtml("Pages missed", audit.scan_errors.length, "Could not be fully scanned", audit.scan_errors.length ? "fail" : ""),
    "    </section>",
    '    <section class="security-note">PAR tokens are hidden because the URL itself grants access. The report shows the storage location and every source page needed to replace it.</section>',
    attentionCount === 0
      ? '    <section class="all-clear"><strong>Nothing needs fixing.</strong><span>All discovered PAR links worked and every requested page was scanned.</span></section>'
      : '    <h2 class="attention-title">Needs attention</h2>',
    parIssueSectionHtml(
      "Broken links in workshops and LiveStacks",
      "Open the recorded source page and replace the stale PAR in that catalog item.",
      catalogProblems,
      "par-catalog-not-working.csv",
    ),
    parIssueSectionHtml(
      "Recheck before changing anything",
      "These checks were inconclusive after retries. They are not confirmed broken.",
      recheck,
      "par-unverified.csv",
    ),
    parScanProblemsHtml(audit.scan_errors),
    parWorkingLinksHtml(working),
  ]
    .filter(Boolean)
    .join("\n");
}

function parIssueSectionHtml(title, description, links, downloadFile) {
  if (links.length === 0) return "";

  return [
    '    <section class="issue-section">',
    '      <div class="issue-section-heading">',
    "        <div><h2>" + escapeHtml(title) + "</h2><p>" + escapeHtml(description) + "</p></div>",
    '        <div class="issue-section-meta"><strong>' + links.length + "</strong><a href=\"" + escapeHtml(downloadFile) + '\">Download CSV</a></div>',
    "      </div>",
    '      <div class="issue-list">',
    links.map(parIssueCardHtml).join("\n"),
    "      </div>",
    "    </section>",
  ].join("\n");
}

function parIssueCardHtml(link) {
  const catalogItem = link.catalog_item || {};
  const itemName = catalogItem.title || link.source_name || "Catalog item";
  const itemMeta = [catalogItem.type, catalogItem.id ? "WMS " + catalogItem.id : catalogItem.slug]
    .filter(Boolean)
    .join(" / ");
  const response = link.http_status
    ? "HTTP " + link.http_status + (link.method ? " via " + link.method : "")
    : "No final response";

  return [
    '        <article class="par-issue ' + escapeHtml(link.status || "") + '">',
    '          <header class="issue-header">',
    "            " + statusBadgeHtml(link.status),
    "            <div><h3>" + escapeHtml(link.object_name || link.label || "PAR link") + "</h3><p>" + escapeHtml(itemName) + (itemMeta ? " <span>" + escapeHtml(itemMeta) + "</span>" : "") + "</p></div>",
    "          </header>",
    '          <div class="fact-grid">',
    factHtml("Bucket", link.bucket || "Not available"),
    factHtml("Namespace", link.namespace || "Not available"),
    factHtml("Region", link.region || link.host || "Not available"),
    factHtml("Response", response),
    "          </div>",
    link.masked_url
      ? '          <div class="link-location"><span>PAR location (access token hidden)</span><code>' + escapeHtml(link.masked_url) + "</code></div>"
      : "",
    link.fingerprint
      ? '          <p class="fingerprint">Fingerprint <code>' + escapeHtml(link.fingerprint) + "</code></p>"
      : "",
    link.error ? '          <p class="issue-error">' + escapeHtml(link.error) + "</p>" : "",
    sourceLocationsHtml(link.sources || []),
    "        </article>",
  ]
    .filter(Boolean)
    .join("\n");
}

function factHtml(label, value) {
  return '<div><span>' + escapeHtml(label) + "</span><strong>" + escapeHtml(value) + "</strong></div>";
}

function sourceLocationsHtml(sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return '          <div class="source-block"><h4>Found in</h4><p>Source page was not recorded.</p></div>';
  }

  const rows = sources
    .map((source) => {
      const location = source.section
        ? "Section: " + source.section
        : source.location || source.pageType || "Source page";
      const findText = [
        source.instruction ? "Step: " + source.instruction : "",
        source.sourceLine ? "Markdown line " + source.sourceLine : "",
        source.searchText ? 'Search for "' + source.searchText + '"' : "",
      ]
        .filter(Boolean)
        .join(" / ");
      const sourceFile = source.sourceFileUrl
        ? '<code class="source-file">' + escapeHtml(source.sourceFileUrl) + "</code>"
        : "";
      return '<li><div><strong>' + escapeHtml(source.label || "Source page") + "</strong>" +
        '<span class="source-location">' + escapeHtml(location) + "</span>" +
        (findText ? '<span>' + escapeHtml(findText) + "</span>" : "") +
        sourceFile +
        "</div>" + sourceLinkHtml(source.pageUrl || "", "Open exact lab") + "</li>";
    })
    .join("\n");

  return '          <div class="source-block"><h4>Found in</h4><ul>' + rows + "</ul></div>";
}

function parScanProblemsHtml(scanErrors) {
  if (!scanErrors.length) return "";

  const cards = scanErrors
    .map((error) => {
      const item = error.catalog_item || {};
      return [
        '        <article class="par-issue scan-error">',
        '          <header class="issue-header"><span class="badge unverified">Not scanned</span><div><h3>' + escapeHtml(error.label || error.page_type || "Page") + "</h3><p>" + escapeHtml(item.title || error.source_name || "PAR scan") + (item.id ? " <span>WMS " + escapeHtml(item.id) + "</span>" : "") + "</p></div></header>",
        '          <p class="issue-error">' + escapeHtml(error.error || "The page could not be scanned.") + "</p>",
        error.page_url ? '          <div class="source-block">' + sourceLinkHtml(error.page_url) + "</div>" : "",
        "        </article>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    '    <section class="issue-section">',
    '      <div class="issue-section-heading"><div><h2>Pages not fully scanned</h2><p>Fix or rerun these pages so a missing PAR is not mistaken for a clean result.</p></div><div class="issue-section-meta"><strong>' + scanErrors.length + '</strong><a href="par-scan-incomplete.csv">Download CSV</a></div></div>',
    '      <div class="issue-list">' + cards + "</div>",
    "    </section>",
  ].join("\n");
}

function parWorkingLinksHtml(links) {
  if (!links.length) return "";

  const rows = links
    .map((link) => {
      const item = link.catalog_item || {};
      const sourceName = item.title || link.source_name || link.label || "Catalog item";
      return [
        '<li class="working-row">',
        "<div><strong>" + escapeHtml(link.object_name || link.label || "PAR link") + "</strong><span>" + escapeHtml([link.bucket, link.region].filter(Boolean).join(" / ")) + "</span></div>",
        "<span>" + escapeHtml(sourceName) + "</span>",
        "<strong>HTTP " + escapeHtml(link.http_status || "2xx") + "</strong>",
        "</li>",
      ].join("");
    })
    .join("\n");

  return [
    '    <details class="working-panel">',
    '      <summary><span>Working links</span><strong>' + links.length + " confirmed</strong></summary>",
    '      <ul class="working-list">' + rows + "</ul>",
    "    </details>",
  ].join("\n");
}

function parEmptyHtml() {
  return [
    '    <section class="empty-state">',
    "      <h2>No PAR audit data in this run</h2>",
    "      <p>Run the PAR audit profile or the PAR test command.</p>",
    "    </section>",
  ].join("\n");
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
    ".page-nav { display: flex; gap: 14px; padding: 9px max(24px, calc((100vw - 1180px) / 2)); background: #fff; border-bottom: 1px solid var(--line); }",
    ".page-nav a { padding: 7px 2px; color: var(--muted); text-decoration: none; border-bottom: 2px solid transparent; }",
    ".page-nav a.active { color: var(--text); border-color: #c74634; font-weight: 700; }",
    ".content { max-width: 1180px; margin: 0 auto; padding: 24px; }",
    ".metrics { display: grid; grid-template-columns: repeat(4, minmax(150px, 1fr)); gap: 10px; }",
    ".metric { min-height: 94px; padding: 14px; background: var(--panel); border: 1px solid var(--line); }",
    ".metric strong { display: block; font-size: 27px; }",
    ".metric span { display: block; margin-top: 3px; font-weight: 700; }",
    ".metric small { display: block; margin-top: 5px; color: var(--muted); }",
    ".metric.pass { border-left: 4px solid var(--pass); }",
    ".metric.fail { border-left: 4px solid var(--fail); }",
    ".metric.warn { border-left: 4px solid var(--warn); }",
    ".security-note { margin-top: 12px; color: var(--muted); font-size: 13px; line-height: 1.45; }",
    ".all-clear { display: flex; gap: 8px; align-items: baseline; margin-top: 22px; padding: 16px; border-left: 4px solid var(--pass); background: var(--pass-bg); }",
    ".all-clear span { color: var(--muted); }",
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
    ".source-block { margin-top: 15px; }",
    ".source-block h4 { margin: 0 0 7px; font-size: 14px; }",
    ".source-block ul { display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }",
    ".source-block li { display: flex; justify-content: space-between; gap: 16px; align-items: center; padding-top: 7px; border-top: 1px solid #e8edf1; }",
    ".source-block li:first-child { border-top: 0; padding-top: 0; }",
    ".source-block li span { display: block; margin-top: 3px; color: var(--muted); font-size: 12px; }",
    ".source-block .source-location { color: var(--text); font-size: 13px; font-weight: 700; }",
    ".source-file { display: block; margin-top: 5px; color: var(--muted); font-size: 12px; overflow-wrap: anywhere; white-space: normal; }",
    ".source-link { white-space: nowrap; font-size: 13px; }",
    ".working-panel { margin-top: 26px; border: 1px solid var(--line); background: var(--panel); }",
    ".working-panel summary { display: flex; justify-content: space-between; gap: 14px; padding: 14px 16px; cursor: pointer; font-weight: 700; }",
    ".working-panel summary strong { color: var(--pass); }",
    ".working-list { margin: 0; padding: 0 16px 12px; list-style: none; }",
    ".working-row { display: grid; grid-template-columns: minmax(260px, 1.3fr) minmax(220px, 1fr) 90px; gap: 14px; padding: 10px 0; border-top: 1px solid #e6ebef; align-items: center; }",
    ".working-row span { color: var(--muted); font-size: 13px; }",
    ".working-row div span { display: block; margin-top: 3px; }",
    ".working-row > strong { color: var(--pass); text-align: right; }",
    ".empty-state { margin-top: 18px; padding: 28px; background: #fff; border: 1px solid var(--line); text-align: center; }",
    ".empty-state h2 { margin-top: 0; }",
    "@media (max-width: 820px) { .metrics, .fact-grid { grid-template-columns: repeat(2, minmax(140px, 1fr)); } .working-row { grid-template-columns: 1fr; } .working-row > strong { text-align: left; } }",
    "@media (max-width: 600px) { .topbar { padding: 20px 16px; align-items: flex-start; flex-direction: column; } .page-nav { padding-inline: 16px; } .content { padding: 16px 10px; } .metrics { grid-template-columns: 1fr 1fr; } .issue-section-heading, .source-block li { align-items: flex-start; flex-direction: column; } .fact-grid { grid-template-columns: 1fr; } .issue-header { flex-direction: column; } }",
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
