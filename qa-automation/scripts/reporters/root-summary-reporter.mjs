import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_REPORTS_ROOT = path.join(PROJECT_ROOT, "reports");

export default class RootSummaryReporter {
  constructor(options = {}) {
    this.reportsRoot = path.resolve(process.env.QA_ROOT_REPORTS_DIR || options.reportsRoot || DEFAULT_REPORTS_ROOT);
    this.results = [];
    this.startedAt = new Date();
  }

  onBegin(config, suite) {
    this.config = config;
    this.totalTests = suite.allTests().length;
  }

  onTestEnd(test, result) {
    const file = path.relative(PROJECT_ROOT, test.location.file).replace(/\\/g, "/");
    const section = sectionFromFile(file);
    const titlePath = test.titlePath().filter(Boolean);
    const annotations = Object.fromEntries(test.annotations.map((annotation) => [annotation.type, annotation.description || ""]));
    const attachments = result.attachments.map(normalizeAttachment);
    const catalogItem = readCatalogItem(attachments);
    const runContext = readRunContext(attachments);
    const failurePageState = readFailurePageState(attachments);
    const errors = result.errors.map((error) => error.message || String(error));
    const finalUrl = runContext.finalPageUrl || failurePageState.url || "";
    const finalTitle = runContext.finalPageTitle || failurePageState.title || "";
    const classification = classifyResult({
      status: result.status,
      expectedStatus: test.expectedStatus,
      errors,
      finalUrl,
      titlePath,
      file,
    });

    this.results.push({
      title: test.title,
      titlePath,
      file,
      line: test.location.line,
      section,
      status: result.status,
      expectedStatus: test.expectedStatus,
      durationMs: result.duration,
      retry: result.retry,
      projectName: test.parent.project()?.name || "",
      catalogItem,
      catalogItemAnnotation: annotations["catalog-item"] || "",
      environment: annotations.environment || "",
      finalUrl,
      finalTitle,
      classification,
      bugSummary: buildBugSummary({
        titlePath,
        file,
        line: test.location.line,
        errors,
        finalUrl,
        finalTitle,
        classification,
        catalogItem,
      }),
      errors,
      attachments,
    });
  }

  async onEnd(result) {
    const endedAt = new Date();
    const runId = runIdentifier(this.startedAt);
    const runDir = path.join(this.reportsRoot, "runs", runId);
    const latestDir = path.join(this.reportsRoot, "latest");
    const summary = this.summary(result, endedAt, runId);

    fs.mkdirSync(runDir, { recursive: true });
    fs.mkdirSync(latestDir, { recursive: true });

    writeSummaryFiles(runDir, summary);
    writeSummaryFiles(latestDir, summary);
    fs.writeFileSync(path.join(this.reportsRoot, "index.html"), redirectHtml("latest/summary.html"), "utf-8");
  }

  summary(result, endedAt, runId) {
    const counts = {
      passed: 0,
      failed: 0,
      skipped: 0,
      timedOut: 0,
      interrupted: 0,
      flaky: 0,
      unexpected: 0,
      total: this.results.length,
    };
    const sections = new Map();
    const failureCategories = new Map();
    const failures = [];

    for (const test of this.results) {
      counts[test.status] = (counts[test.status] || 0) + 1;
      if (test.status !== test.expectedStatus && test.status !== "skipped") {
        counts.unexpected += 1;
        failures.push(test);
        failureCategories.set(test.classification.code, (failureCategories.get(test.classification.code) || 0) + 1);
      }
      if (test.retry > 0 && test.status === "passed") {
        counts.flaky += 1;
      }

      const section = sections.get(test.section) || {
        name: test.section,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        timedOut: 0,
        interrupted: 0,
        unexpected: 0,
        tests: [],
      };

      section.total += 1;
      section[test.status] = (section[test.status] || 0) + 1;
      if (test.status !== test.expectedStatus && test.status !== "skipped") {
        section.unexpected += 1;
      }
      section.tests.push(test);
      sections.set(test.section, section);
    }

    return {
      runId,
      status: result.status,
      startedAt: this.startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: endedAt.getTime() - this.startedAt.getTime(),
      configuredTests: this.totalTests,
      counts,
      failureCategories: Array.from(failureCategories.entries())
        .map(([code, count]) => ({ code, count, label: classificationLabel(code) }))
        .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code)),
      failures,
      sections: Array.from(sections.values()).sort((left, right) => left.name.localeCompare(right.name)),
    };
  }
}

function normalizeAttachment(attachment) {
  const bodyText = attachment.body ? attachment.body.toString("utf-8") : "";

  return {
    name: attachment.name,
    contentType: attachment.contentType,
    path: attachment.path ? path.relative(PROJECT_ROOT, attachment.path).replace(/\\/g, "/") : "",
    bodyText,
  };
}

function readCatalogItem(attachments) {
  const attachment = attachments.find((item) => item.name === "catalog-item.json" && item.bodyText);
  if (!attachment) {
    return undefined;
  }

  try {
    return JSON.parse(attachment.bodyText);
  } catch {
    return undefined;
  }
}

function readRunContext(attachments) {
  const attachment = attachments.find((item) => item.name === "qa-run-context" && item.bodyText);
  if (!attachment) {
    return {};
  }

  try {
    return JSON.parse(attachment.bodyText);
  } catch {
    return {};
  }
}

function readFailurePageState(attachments) {
  const attachment = attachments.find((item) => item.name === "failure-page-state" && item.bodyText);
  if (!attachment) {
    return {};
  }

  return {
    url: matchLineValue(attachment.bodyText, "URL"),
    title: matchLineValue(attachment.bodyText, "Title"),
  };
}

function matchLineValue(value, label) {
  const match = value.match(new RegExp(`^${escapeRegex(label)}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || "";
}

function classifyResult({ status, expectedStatus, errors, finalUrl, titlePath, file }) {
  if (status === "skipped") {
    return { code: "SKIPPED", label: "Skipped", severity: "info" };
  }

  if (status === expectedStatus) {
    return { code: "PASSED", label: "Passed", severity: "pass" };
  }

  const text = `${errors.join("\n")}\n${finalUrl}\n${titlePath.join(" ")}\n${file}`;

  if (/p1_invalid_workshop_id/i.test(text)) {
    return { code: "ROUTING_INVALID_WORKSHOP_ID", label: "Invalid workshop route", severity: "fail" };
  }
  if (/Could not open indexed catalog item|page\.waitForURL|Navigation failed/i.test(text)) {
    return { code: "ROUTING_FAILED", label: "Routing failed", severity: "fail" };
  }
  if (/should not show broken visible images/i.test(text)) {
    return { code: "BROKEN_VISIBLE_IMAGE", label: "Broken visible image", severity: "fail" };
  }
  if (/should not expose broken visible links/i.test(text)) {
    return { code: "BROKEN_VISIBLE_LINK", label: "Broken visible link", severity: "fail" };
  }
  if (/should not show broken visible embedded content/i.test(text)) {
    return { code: "BROKEN_EMBEDDED_CONTENT", label: "Broken embedded content", severity: "fail" };
  }
  if (/placeholder text|misspellings|TODO|TBD|FIXME|template token/i.test(text)) {
    return { code: "CONTENT_TEXT_DEFECT", label: "Content text defect", severity: "fail" };
  }
  if (/should stay relevant/i.test(text)) {
    return { code: "CONTENT_RELEVANCE", label: "Content relevance", severity: "fail" };
  }
  if (/Instructions content did not render|LiveLabs migration notice|preview instructions|Run on your tenancy/i.test(text)) {
    return { code: "INSTRUCTIONS_FLOW", label: "Instructions flow", severity: "fail" };
  }
  if (/asset action|download|popup/i.test(text)) {
    return { code: "ASSET_ACTION_FAILED", label: "Asset action failed", severity: "fail" };
  }
  if (/Timeout|timed out/i.test(text)) {
    return { code: "TIMEOUT", label: "Timeout", severity: "fail" };
  }

  return { code: "UNCLASSIFIED_FAILURE", label: "Unclassified failure", severity: "fail" };
}

function classificationLabel(code) {
  const labels = {
    ASSET_ACTION_FAILED: "Asset action failed",
    BROKEN_EMBEDDED_CONTENT: "Broken embedded content",
    BROKEN_VISIBLE_IMAGE: "Broken visible image",
    BROKEN_VISIBLE_LINK: "Broken visible link",
    CONTENT_RELEVANCE: "Content relevance",
    CONTENT_TEXT_DEFECT: "Content text defect",
    INSTRUCTIONS_FLOW: "Instructions flow",
    ROUTING_FAILED: "Routing failed",
    ROUTING_INVALID_WORKSHOP_ID: "Invalid workshop route",
    TIMEOUT: "Timeout",
    UNCLASSIFIED_FAILURE: "Unclassified failure",
  };

  return labels[code] || code;
}

function buildBugSummary({ titlePath, file, line, errors, finalUrl, finalTitle, classification, catalogItem }) {
  if (classification.code === "PASSED" || classification.code === "SKIPPED") {
    return "";
  }

  const catalogTitle = catalogItem?.title || "";
  const catalogId = catalogItem?.id || catalogItem?.slug || "";
  const catalogUrl = catalogItem?.normalized_href || catalogItem?.absolute_url || "";
  const lines = [
    `${classification.code}: ${classification.label}`,
    `Test: ${titlePath.join(" > ")}`,
    catalogTitle ? `Catalog item: ${catalogTitle}${catalogId ? ` (${catalogId})` : ""}` : "",
    catalogUrl ? `Catalog URL: ${catalogUrl}` : "",
    finalUrl ? `Final URL: ${finalUrl}` : "",
    finalTitle ? `Final page title: ${finalTitle}` : "",
    `Spec: ${file}:${line}`,
    errors[0] ? `Failure: ${singleLine(errors[0])}` : "",
  ];

  return lines.filter(Boolean).join("\n");
}

function writeSummaryFiles(outputDir, summary) {
  fs.writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf-8");
  fs.writeFileSync(path.join(outputDir, "summary.md"), markdownSummary(summary), "utf-8");
  fs.writeFileSync(path.join(outputDir, "summary.html"), htmlSummary(summary), "utf-8");
}

function sectionFromFile(file) {
  if (file.includes("/generated/")) {
    if (file.includes("catalogIndex")) return "Generated Catalog Index";
    if (file.includes("livestackResources")) return "Generated LiveStack Resources";
    if (file.includes("livestackOverview")) return "Generated LiveStack Overview";
    if (file.includes("previewInstructions")) return "Generated Preview Instructions";
    if (file.includes("tenancyInstructions")) return "Generated Tenancy Instructions";
    if (file.includes("workshopOverview")) return "Generated Workshop Overview";
    return "Generated Catalog";
  }

  if (file.includes("/homepage/")) return "Homepage";
  if (file.includes("/search/")) return "Search";
  if (file.includes("/catalog/filters/")) return "Catalog Filters";
  if (file.includes("/catalog/search/")) return "Catalog Search";
  if (file.includes("/overview/")) return "Overview";
  if (file.includes("/instructions/")) return "Instructions";
  if (file.includes("/livestack-resources/")) return "LiveStack Resources";
  if (file.includes("/workshop/launch-options/")) return "Workshop Launch Options";
  if (file.includes("/auth/")) return "Authenticated";
  if (file.includes("/smoke/")) return "Smoke";
  if (file.includes("/regression/")) return "Regression";

  return "Other";
}

function markdownSummary(summary) {
  const lines = [
    `# LiveLabs QA Run ${summary.runId}`,
    "",
    `Status: **${summary.status}**`,
    `Started: ${summary.startedAt}`,
    `Ended: ${summary.endedAt}`,
    `Duration: ${formatDuration(summary.durationMs)}`,
    "",
    "## Totals",
    "",
    "| Total | Passed | Failed | Skipped | Timed out | Interrupted | Unexpected | Flaky |",
    "| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    `| ${summary.counts.total} | ${summary.counts.passed} | ${summary.counts.failed} | ${summary.counts.skipped} | ${summary.counts.timedOut} | ${summary.counts.interrupted} | ${summary.counts.unexpected} | ${summary.counts.flaky} |`,
    "",
  ];

  if (summary.failures.length > 0) {
    lines.push("## Failures to Review");
    lines.push("");
    lines.push("| Category | Item | Final URL | Spec |");
    lines.push("| --- | --- | --- | --- |");

    for (const failure of summary.failures) {
      lines.push(
        `| ${failure.classification.code} | ${escapeMarkdown(catalogItemLabel(failure) || failure.title)} | ${escapeMarkdown(failure.finalUrl || "")} | ${escapeMarkdown(`${failure.file}:${failure.line}`)} |`,
      );
    }

    lines.push("");
    lines.push("## Bug Summaries");
    lines.push("");

    for (const failure of summary.failures) {
      lines.push("```text");
      lines.push(failure.bugSummary);
      lines.push("```");
      lines.push("");
    }
  }

  lines.push("## Failure Categories");
  lines.push("");
  lines.push("| Category | Count |");
  lines.push("| --- | ---: |");
  for (const category of summary.failureCategories) {
    lines.push(`| ${category.code} - ${category.label} | ${category.count} |`);
  }
  if (summary.failureCategories.length === 0) {
    lines.push("| None | 0 |");
  }
  lines.push("");
  lines.push("## Sections");
  lines.push("");

  for (const section of summary.sections) {
    lines.push(`### ${section.name}`);
    lines.push("");
    lines.push(
      `Total: ${section.total} | Passed: ${section.passed || 0} | Failed: ${section.failed || 0} | Skipped: ${section.skipped || 0} | Unexpected: ${section.unexpected || 0}`,
    );
    lines.push("");

    for (const test of section.tests) {
      const marker = test.status === "passed" ? "PASS" : test.status === "skipped" ? "SKIP" : "FAIL";
      lines.push(`- **${marker}** ${test.classification.code} - ${test.titlePath.join(" > ")} (${test.file}:${test.line})`);
      if (catalogItemLabel(test)) lines.push(`  Catalog item: ${catalogItemLabel(test)}`);
      if (test.finalUrl) lines.push(`  Final URL: ${test.finalUrl}`);
      if (test.errors.length > 0) lines.push(`  Error: ${singleLine(test.errors[0])}`);
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function htmlSummary(summary) {
  const failures = summary.failures.length > 0 ? failureReviewHtml(summary.failures) : "";
  const categories = summary.failureCategories.length > 0 ? failureCategoriesHtml(summary.failureCategories) : "";
  const sectionCards = summary.sections
    .map(
      (section) => `
        <section class="section">
          <h2>${escapeHtml(section.name)}</h2>
          <div class="chips">
            <span>Total ${section.total}</span>
            <span class="pass">Passed ${section.passed || 0}</span>
            <span class="fail">Failed ${section.failed || 0}</span>
            <span>Skipped ${section.skipped || 0}</span>
            <span class="warn">Unexpected ${section.unexpected || 0}</span>
          </div>
          <table>
            <thead>
              <tr><th>Status</th><th>Category</th><th>Test</th><th>Final URL</th><th>Artifacts</th><th>Failure</th></tr>
            </thead>
            <tbody>
              ${section.tests.map(testRow).join("\n")}
            </tbody>
          </table>
        </section>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LiveLabs QA Summary ${escapeHtml(summary.runId)}</title>
  <style>
    :root { color-scheme: light; font-family: Arial, Helvetica, sans-serif; }
    body { margin: 0; background: #f7f8fa; color: #1f2933; }
    header { background: #fff; border-bottom: 1px solid #d8dee8; padding: 24px 32px; }
    main { padding: 24px 32px 48px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    h2 { margin: 0 0 14px; font-size: 20px; }
    .meta { color: #52606d; display: flex; flex-wrap: wrap; gap: 14px; font-size: 14px; }
    .totals { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin: 20px 0 24px; }
    .metric { background: #fff; border: 1px solid #d8dee8; border-radius: 6px; padding: 14px; }
    .metric strong { display: block; font-size: 24px; }
    .metric span { color: #52606d; font-size: 13px; }
    .section { background: #fff; border: 1px solid #d8dee8; border-radius: 6px; margin-bottom: 18px; padding: 18px; overflow-x: auto; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .chips span { background: #eef2f7; border-radius: 999px; padding: 5px 10px; font-size: 13px; }
    .pass { color: #0e6245; }
    .fail { color: #b42318; }
    .warn { color: #8a5a00; }
    table { border-collapse: collapse; width: 100%; min-width: 900px; font-size: 14px; }
    th, td { border-top: 1px solid #e5e9f0; padding: 10px; text-align: left; vertical-align: top; }
    th { color: #52606d; font-weight: 600; }
    code { background: #eef2f7; border-radius: 4px; padding: 2px 4px; }
    .status { font-weight: 700; white-space: nowrap; }
    .status.passed { color: #0e6245; }
    .status.failed, .status.timedOut, .status.interrupted { color: #b42318; }
    .status.skipped { color: #52606d; }
    .category { font-weight: 700; white-space: nowrap; }
    .error { max-width: 520px; white-space: normal; }
    .bug { background: #f8fafc; border: 1px solid #d8dee8; border-radius: 6px; padding: 12px; white-space: pre-wrap; }
    .artifact-links { display: flex; flex-wrap: wrap; gap: 6px; }
    .artifact-links a { color: #005ea8; }
    .url { max-width: 260px; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <header>
    <h1>LiveLabs QA Summary</h1>
    <div class="meta">
      <span>Status: <strong>${escapeHtml(summary.status)}</strong></span>
      <span>Run: <code>${escapeHtml(summary.runId)}</code></span>
      <span>Duration: ${formatDuration(summary.durationMs)}</span>
      <span>Started: ${escapeHtml(summary.startedAt)}</span>
    </div>
  </header>
  <main>
    <div class="totals">
      ${metric("Total", summary.counts.total)}
      ${metric("Passed", summary.counts.passed, "pass")}
      ${metric("Failed", summary.counts.failed, "fail")}
      ${metric("Skipped", summary.counts.skipped)}
      ${metric("Unexpected", summary.counts.unexpected, "warn")}
      ${metric("Flaky", summary.counts.flaky, "warn")}
    </div>
    ${categories}
    ${failures}
    ${sectionCards}
  </main>
</body>
</html>`;
}

function testRow(test) {
  const statusClass = test.status.replace(/\s+/g, "");
  return `<tr>
    <td class="status ${escapeHtml(statusClass)}">${escapeHtml(test.status)}</td>
    <td class="category">${escapeHtml(test.classification.code)}</td>
    <td>${escapeHtml(test.titlePath.join(" > "))}${catalogItemLabel(test) ? `<br><small>${escapeHtml(catalogItemLabel(test))}</small>` : ""}<br><code>${escapeHtml(`${test.file}:${test.line}`)}</code></td>
    <td class="url">${test.finalUrl ? linkHtml(test.finalUrl, test.finalUrl) : ""}</td>
    <td>${artifactLinksHtml(test.attachments)}</td>
    <td class="error">${test.errors.length > 0 ? escapeHtml(singleLine(test.errors[0])) : ""}</td>
  </tr>`;
}

function failureCategoriesHtml(categories) {
  return `<section class="section">
    <h2>Failure Categories</h2>
    <div class="chips">
      ${categories.map((category) => `<span class="fail">${escapeHtml(category.code)} ${category.count}</span>`).join("\n")}
    </div>
  </section>`;
}

function failureReviewHtml(failures) {
  return `<section class="section">
    <h2>Failures to Review</h2>
    <table>
      <thead>
        <tr><th>Category</th><th>Item</th><th>Final URL</th><th>Bug Summary</th><th>Artifacts</th></tr>
      </thead>
      <tbody>
        ${failures
          .map(
            (failure) => `<tr>
              <td class="category">${escapeHtml(failure.classification.code)}</td>
              <td>${escapeHtml(catalogItemLabel(failure) || failure.title)}<br><code>${escapeHtml(`${failure.file}:${failure.line}`)}</code></td>
              <td class="url">${failure.finalUrl ? linkHtml(failure.finalUrl, failure.finalUrl) : ""}</td>
              <td><div class="bug">${escapeHtml(failure.bugSummary)}</div></td>
              <td>${artifactLinksHtml(failure.attachments)}</td>
            </tr>`,
          )
          .join("\n")}
      </tbody>
    </table>
  </section>`;
}

function catalogItemLabel(test) {
  const item = test.catalogItem;
  if (!item) {
    return test.catalogItemAnnotation || "";
  }

  const id = item.id || item.slug || "";
  const type = item.type ? `${item.type}: ` : "";
  const title = item.title || "";

  return `${type}${title}${id ? ` (${id})` : ""}`.trim();
}

function artifactLinksHtml(attachments) {
  const links = attachments
    .filter((attachment) => attachment.path)
    .filter((attachment) => /screenshot|trace|video|error-context|dom-snapshot|page-state|catalog-item/i.test(attachment.name))
    .map((attachment) => linkHtml(relativeLinkFromReports(attachment.path), shortArtifactName(attachment.name)));

  return links.length > 0 ? `<div class="artifact-links">${links.join(" ")}</div>` : "";
}

function relativeLinkFromReports(projectRelativePath) {
  const absolutePath = path.join(PROJECT_ROOT, projectRelativePath);
  return path.relative(path.join(PROJECT_ROOT, "reports", "latest"), absolutePath).replace(/\\/g, "/");
}

function shortArtifactName(name) {
  return name
    .replace(/^qa-/, "")
    .replace(/\.(log|json|zip|webm|png|html|md)$/i, "")
    .replace(/-/g, " ");
}

function linkHtml(href, label) {
  const safeHref = /^(https?:)?\/\//i.test(href) || href.startsWith("../") || href.startsWith("./") ? href : `./${href}`;
  return `<a href="${escapeAttribute(safeHref)}">${escapeHtml(label)}</a>`;
}

function metric(label, value, className = "") {
  return `<div class="metric ${className}"><strong>${value}</strong><span>${escapeHtml(label)}</span></div>`;
}

function runIdentifier(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function redirectHtml(target) {
  return `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${target}"><a href="${target}">Open latest QA summary</a>`;
}

function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function singleLine(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function escapeMarkdown(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
