import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_REPORTS_ROOT = path.join(PROJECT_ROOT, "reports");
const ISSUE_TYPE_DEFINITIONS = [
  {
    code: "ROUTING_INVALID_WORKSHOP_ID",
    label: "Invalid workshop route",
    description: "The catalog card points to a workshop route that LiveLabs rejects or redirects away from.",
  },
  {
    code: "ROUTING_FAILED",
    label: "Routing failed",
    description: "The browser could not finish opening the indexed catalog item.",
  },
  {
    code: "BROKEN_VISIBLE_IMAGE",
    label: "Broken visible image",
    description: "An image visible to the user did not load correctly.",
  },
  {
    code: "BROKEN_VISIBLE_LINK",
    label: "Broken visible link",
    description: "A visible link appears broken, unreachable, or returns an error.",
  },
  {
    code: "BROKEN_EMBEDDED_CONTENT",
    label: "Broken embedded content",
    description: "Embedded content such as iframe, video, or media did not render correctly.",
  },
  {
    code: "CONTENT_TEXT_DEFECT",
    label: "Content text defect",
    description: "The page appears to contain placeholder text, template text, TODOs, or obvious text defects.",
  },
  {
    code: "CONTENT_RELEVANCE",
    label: "Content relevance",
    description: "The page loaded, but the visible content did not match the indexed workshop or LiveStack.",
  },
  {
    code: "INSTRUCTIONS_FLOW",
    label: "Instructions flow",
    description: "Preview or tenancy instructions did not open, render, or pass the content checks.",
  },
  {
    code: "ASSET_ACTION_FAILED",
    label: "Asset action failed",
    description: "A LiveStack demo, asset, download, or resource action did not work as expected.",
  },
  {
    code: "TIMEOUT",
    label: "Timeout",
    description: "The page or expected state did not arrive before the configured test timeout.",
  },
  {
    code: "UNCLASSIFIED_FAILURE",
    label: "Unclassified failure",
    description: "The test failed, but the report does not yet have a more specific category for it.",
  },
];

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
    const steps = normalizeSteps(result.steps || []);
    const failedStep = firstFailedStep(steps);
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
      steps,
      failedStep,
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
        steps,
        failedStep,
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
    if (summary.counts.total > 0) {
      writeSummaryFiles(latestDir, summary);
      fs.writeFileSync(path.join(this.reportsRoot, "index.html"), redirectHtml("latest/summary.html"), "utf-8");
    }
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

function normalizeSteps(steps, depth = 0) {
  return steps.map((step) => {
    const childSteps = normalizeSteps(step.steps || [], depth + 1);
    const failedChild = firstFailedStep(childSteps);
    const errorMessage = step.error?.message || "";
    const status = errorMessage || failedChild ? "failed" : "passed";

    return {
      title: step.title || "Unnamed step",
      category: step.category || "",
      durationMs: step.duration || 0,
      status,
      error: errorMessage,
      location: step.location
        ? {
            file: path.relative(PROJECT_ROOT, step.location.file).replace(/\\/g, "/"),
            line: step.location.line,
            column: step.location.column,
          }
        : undefined,
      depth,
      steps: childSteps,
    };
  });
}

function firstFailedStep(steps, parentTitles = []) {
  for (const step of steps) {
    const pathTitles = [...parentTitles, step.title];

    if (step.status === "failed") {
      const childFailure = firstFailedStep(step.steps || [], pathTitles);
      return childFailure || { ...step, path: pathTitles };
    }

    const childFailure = firstFailedStep(step.steps || [], pathTitles);
    if (childFailure) {
      return childFailure;
    }
  }

  return undefined;
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
  return issueTypeDefinition(code).label || code;
}

function buildBugSummary({ titlePath, file, line, errors, finalUrl, finalTitle, classification, catalogItem, steps, failedStep }) {
  if (classification.code === "PASSED" || classification.code === "SKIPPED") {
    return "";
  }

  const catalogTitle = catalogItem?.title || "";
  const catalogId = catalogItem?.id || catalogItem?.slug || "";
  const catalogUrl = catalogItem?.normalized_href || catalogItem?.absolute_url || "";
  const conciseSteps = reviewSteps(steps || []);
  const lines = [
    `${classification.code}: ${classification.label}`,
    `Test: ${titlePath.join(" > ")}`,
    catalogTitle ? `Catalog item: ${catalogTitle}${catalogId ? ` (${catalogId})` : ""}` : "",
    catalogUrl ? `Test tried URL: ${catalogUrl}` : "",
    finalUrl ? `Browser ended at: ${finalUrl}` : "",
    finalTitle ? `Reached page title: ${finalTitle}` : "",
    `Spec: ${file}:${line}`,
    failedStep ? `Failed step: ${friendlyStepPath(failedStep.path?.join(" > ") || failedStep.title)}` : "",
    conciseSteps.length ? `Steps: ${conciseSteps.map((step) => friendlyStepTitle(step.title)).join(" > ")}` : "",
    errors[0] ? `Failure: ${singleLine(errors[0])}` : "",
  ];

  return lines.filter(Boolean).join("\n");
}

function writeSummaryFiles(outputDir, summary) {
  fs.writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf-8");
  fs.writeFileSync(path.join(outputDir, "summary.md"), markdownSummary(summary), "utf-8");
  fs.writeFileSync(path.join(outputDir, "summary.html"), htmlSummary(summary, { outputDir }), "utf-8");
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
    lines.push("| Category | Item | Browser ended at | Spec |");
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
      if (test.finalUrl) lines.push(`  Browser ended at: ${test.finalUrl}`);
      if (test.failedStep) lines.push(`  Failed step: ${test.failedStep.path?.join(" > ") || test.failedStep.title}`);
      if (test.errors.length > 0) lines.push(`  Error: ${singleLine(test.errors[0])}`);
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function htmlSummary(summary, context = {}) {
  const failures = summary.failures.length > 0 ? failureReviewHtml(summary.failures, context) : emptyStateHtml(summary.status);
  const categories = summary.failureCategories.length > 0 ? failureCategoriesHtml(summary.failureCategories) : "";
  const sectionCards = summary.sections.map((section) => sectionCard(section, context)).join("\n");
  const statusTone = runStatusTone(summary);
  const statusLabel = runStatusLabel(summary);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LiveLabs QA Summary ${escapeHtml(summary.runId)}</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Arial, Helvetica, sans-serif;
      --bg: #f5f7fb;
      --panel: #ffffff;
      --panel-soft: #f9fbfd;
      --line: #d9e2ec;
      --line-strong: #bcccdc;
      --text: #1f2933;
      --muted: #52606d;
      --muted-soft: #829ab1;
      --pass: #0e6245;
      --pass-bg: #e3fcec;
      --fail: #b42318;
      --fail-bg: #ffebe6;
      --warn: #8a5a00;
      --warn-bg: #fff4d6;
      --info: #075985;
      --info-bg: #e0f2fe;
      --link: #005ea8;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); }
    header {
      background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
      border-bottom: 1px solid var(--line);
      padding: 28px 32px 22px;
    }
    main { max-width: 1280px; margin: 0 auto; padding: 24px 28px 48px; }
    h1 { margin: 0 0 10px; font-size: 30px; line-height: 1.15; letter-spacing: 0; }
    h2 { margin: 0; font-size: 20px; line-height: 1.25; letter-spacing: 0; }
    h3 { margin: 0; font-size: 17px; line-height: 1.3; letter-spacing: 0; }
    p { margin: 0; }
    a { color: var(--link); }
    code {
      background: #eef2f7;
      border: 1px solid #dbe4ee;
      border-radius: 5px;
      padding: 2px 5px;
      word-break: break-word;
    }
    pre {
      margin: 10px 0 0;
      white-space: pre-wrap;
      word-break: break-word;
      font: 13px/1.45 Consolas, "Courier New", monospace;
    }
    details { margin-top: 12px; }
    summary { cursor: pointer; color: var(--link); font-weight: 700; }
    .page-title { max-width: 1280px; margin: 0 auto; }
    .meta { color: var(--muted); display: flex; flex-wrap: wrap; gap: 10px; font-size: 14px; }
    .run-pill {
      align-items: center;
      border-radius: 999px;
      display: inline-flex;
      gap: 6px;
      font-weight: 700;
      padding: 6px 10px;
      text-transform: capitalize;
    }
    .run-pill.pass { background: var(--pass-bg); color: var(--pass); }
    .run-pill.fail { background: var(--fail-bg); color: var(--fail); }
    .run-pill.warn { background: var(--warn-bg); color: var(--warn); }
    .totals {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .metric {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 15px;
    }
    .metric strong { display: block; font-size: 26px; line-height: 1; }
    .metric span { color: var(--muted); display: block; font-size: 13px; margin-top: 6px; }
    .metric.pass { border-left: 4px solid var(--pass); }
    .metric.fail { border-left: 4px solid var(--fail); }
    .metric.warn { border-left: 4px solid var(--warn); }
    .section {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      margin-bottom: 18px;
      padding: 18px;
    }
    .section-heading {
      align-items: flex-start;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .eyebrow {
      color: var(--muted-soft);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .08em;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chips span,
    .pill {
      background: #eef2f7;
      border: 1px solid #dbe4ee;
      border-radius: 999px;
      display: inline-flex;
      font-size: 13px;
      font-weight: 700;
      gap: 6px;
      line-height: 1;
      padding: 7px 10px;
      white-space: nowrap;
    }
    .pass { color: var(--pass); }
    .fail { color: var(--fail); }
    .warn { color: var(--warn); }
    .pill.pass { background: var(--pass-bg); border-color: #b7ebc6; }
    .pill.fail { background: var(--fail-bg); border-color: #ffd0c7; }
    .pill.warn { background: var(--warn-bg); border-color: #f7d070; }
    .pill.info { background: var(--info-bg); border-color: #bae6fd; color: var(--info); }
    .filter-bar {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .filter-button,
    .copy-button,
    .link-button {
      appearance: none;
      background: #ffffff;
      border: 1px solid var(--line-strong);
      border-radius: 6px;
      color: var(--text);
      cursor: pointer;
      display: inline-flex;
      font-size: 13px;
      font-weight: 700;
      line-height: 1;
      padding: 8px 10px;
      text-decoration: none;
      white-space: nowrap;
    }
    .filter-button.active,
    .filter-button:hover,
    .copy-button:hover,
    .link-button:hover {
      border-color: var(--link);
      color: var(--link);
    }
    .failure-grid {
      display: grid;
      gap: 14px;
    }
    .issue-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      margin-top: 12px;
    }
    .issue-card {
      background: var(--panel-soft);
      border: 1px solid #e5e9f0;
      border-left: 4px solid var(--fail);
      border-radius: 8px;
      display: grid;
      gap: 6px;
      padding: 12px;
    }
    .issue-card strong { font-size: 15px; }
    .issue-card span { color: var(--muted); font-size: 13px; line-height: 1.4; }
    .issue-card code { width: fit-content; }
    .issue-guide summary {
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
    }
    .issue-guide-grid {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      margin-top: 10px;
    }
    .issue-guide-item {
      background: var(--panel-soft);
      border: 1px solid #e5e9f0;
      border-radius: 6px;
      padding: 10px;
    }
    .issue-guide-item strong { display: block; font-size: 13px; margin-bottom: 4px; }
    .issue-guide-item span { color: var(--muted); font-size: 13px; line-height: 1.4; }
    .failure-card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-left: 5px solid var(--fail);
      border-radius: 8px;
      padding: 16px;
    }
    .failure-card[hidden] { display: none; }
    .filter-status {
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
      margin-top: 10px;
    }
    .failure-header {
      align-items: flex-start;
      display: flex;
      gap: 12px;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .failure-title {
      display: grid;
      gap: 8px;
      min-width: 0;
    }
    .failure-explanation {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 6px;
      color: #7c2d12;
      font-size: 15px;
      line-height: 1.45;
      margin: 10px 0 12px;
      padding: 10px 12px;
    }
    .meta-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      margin: 12px 0;
    }
    .meta-item {
      background: var(--panel-soft);
      border: 1px solid #e5e9f0;
      border-radius: 6px;
      min-width: 0;
      padding: 10px;
    }
    .meta-item strong {
      color: var(--muted);
      display: block;
      font-size: 12px;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    .meta-item span {
      display: block;
      overflow-wrap: anywhere;
    }
    .route-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      margin: 12px 0;
    }
    .route-card {
      background: var(--panel-soft);
      border: 1px solid #e5e9f0;
      border-radius: 6px;
      display: grid;
      gap: 7px;
      min-width: 0;
      padding: 10px;
    }
    .route-card strong {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
    }
    .route-card code {
      display: block;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .route-note {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.4;
    }
    .artifact-links,
    .evidence-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .artifact-links a { text-decoration: none; }
    .evidence {
      background: #ffffff;
      border: 1px solid var(--line);
      border-radius: 8px;
      margin: 12px 0;
      padding: 12px;
    }
    .evidence-heading {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .evidence-heading strong { font-size: 14px; }
    .trace-help {
      background: var(--panel-soft);
      border: 1px solid #e5e9f0;
      border-radius: 6px;
      margin-top: 10px;
      padding: 10px;
    }
    .step-summary {
      background: #ffffff;
      border: 1px solid var(--line);
      border-radius: 6px;
      margin-top: 10px;
      padding: 10px;
    }
    .step-summary strong { color: var(--fail); }
    .step-list {
      display: grid;
      gap: 8px;
      margin-top: 10px;
    }
    .step-item {
      align-items: flex-start;
      background: var(--panel-soft);
      border: 1px solid #e5e9f0;
      border-left: 4px solid var(--pass);
      border-radius: 6px;
      display: grid;
      gap: 4px;
      padding: 10px 12px;
    }
    .step-item.failed { border-left-color: var(--fail); background: #fffafa; }
    .step-badge {
      border-radius: 999px;
      display: inline-flex;
      font-size: 12px;
      font-weight: 700;
      line-height: 1;
      padding: 5px 7px;
    }
    .step-badge.done { background: var(--pass-bg); color: var(--pass); }
    .step-badge.failed { background: var(--fail-bg); color: var(--fail); }
    .step-meta {
      color: var(--muted);
      font-size: 12px;
    }
    .step-note {
      color: var(--muted);
      font-size: 13px;
      margin-top: 8px;
    }
    .step-title {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .workflow-summary {
      background: #ffffff;
      border: 1px solid var(--line);
      border-radius: 8px;
      margin-top: 12px;
      padding: 12px;
    }
    .workflow-summary > summary {
      color: var(--link);
      font-size: 14px;
      font-weight: 700;
    }
    .workflow-body {
      margin-top: 10px;
    }
    .action-list {
      display: grid;
      gap: 8px;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .action-list li {
      background: var(--panel-soft);
      border: 1px solid #e5e9f0;
      border-radius: 6px;
      line-height: 1.45;
      padding: 10px;
    }
    .action-list strong { display: block; margin-bottom: 3px; }
    .action-list span { color: var(--muted); display: block; }
    .developer-steps summary,
    .step-debug summary,
    .advanced-evidence summary {
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
    }
    .advanced-evidence {
      margin-top: 10px;
    }
    .advanced-evidence p {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
      margin: 8px 0;
    }
    .bug {
      background: #0f172a;
      border-radius: 6px;
      color: #e5e7eb;
      padding: 12px;
    }
    .error-preview {
      color: var(--muted);
      font-size: 14px;
      line-height: 1.45;
      margin-top: 8px;
    }
    .test-list { display: grid; gap: 10px; }
    .test-card {
      align-items: flex-start;
      background: var(--panel-soft);
      border: 1px solid #e5e9f0;
      border-radius: 8px;
      display: grid;
      gap: 10px;
      grid-template-columns: minmax(0, 1fr) auto;
      padding: 12px;
    }
    .test-title { display: grid; gap: 6px; min-width: 0; }
    .test-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
    .test-steps { grid-column: 1 / -1; }
    .empty-state {
      background: var(--panel);
      border: 1px dashed var(--line-strong);
      border-radius: 8px;
      color: var(--muted);
      padding: 22px;
      text-align: center;
    }
    @media (max-width: 720px) {
      header { padding: 22px 18px; }
      main { padding: 18px; }
      .section-heading,
      .failure-header,
      .test-card {
        display: grid;
      }
      .test-actions { justify-content: flex-start; }
    }
  </style>
</head>
<body>
  <header>
    <div class="page-title">
      <h1>LiveLabs QA Summary</h1>
      <div class="meta">
        <span class="run-pill ${statusTone}">${escapeHtml(statusLabel)}</span>
        <span>Run <code>${escapeHtml(summary.runId)}</code></span>
        <span>Duration ${formatDuration(summary.durationMs)}</span>
        <span>Started ${escapeHtml(summary.startedAt)}</span>
      </div>
    </div>
  </header>
  <main>
    <div class="totals">
      ${metric("Tests run", summary.counts.total)}
      ${metric("Passed", summary.counts.passed, "pass")}
      ${metric("Need review", summary.counts.unexpected, summary.counts.unexpected > 0 ? "warn" : "pass")}
      ${metric("Skipped", summary.counts.skipped)}
      ${metric("Flaky", summary.counts.flaky, "warn")}
    </div>
    ${categories}
    ${failures}
    ${sectionCards}
  </main>
  <script>
    const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
    const failureCards = Array.from(document.querySelectorAll("[data-category]"));
    const filterStatus = document.querySelector("[data-filter-status]");
    for (const button of filterButtons) {
      button.addEventListener("click", () => {
        const category = button.getAttribute("data-filter");
        for (const item of filterButtons) item.classList.toggle("active", item === button);
        let visibleCount = 0;
        for (const card of failureCards) {
          const visible = category === "all" || card.getAttribute("data-category") === category;
          card.hidden = !visible;
          if (visible) visibleCount += 1;
        }
        if (filterStatus) {
          filterStatus.innerText = category === "all"
            ? "Showing all " + visibleCount + " failure(s)."
            : "Showing " + visibleCount + " failure(s) for " + button.innerText + ".";
        }
      });
    }
    async function copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          // Fall back for file:// reports and restricted Jenkins artifact pages.
        }
      }

      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(field);
      return copied;
    }
    for (const button of document.querySelectorAll("[data-copy]")) {
      button.addEventListener("click", async () => {
        const target = document.getElementById(button.getAttribute("data-copy"));
        if (!target) return;
        const original = button.innerText;
        const copied = await copyText(target.innerText);
        button.innerText = copied ? "Copied" : "Copy failed";
        window.setTimeout(() => { button.innerText = original; }, 1400);
      });
    }
  </script>
</body>
</html>`;
}

function testCard(test, context) {
  const tone = statusTone(test.status);
  const finalUrl = test.finalUrl && test.finalUrl !== "about:blank" ? test.finalUrl : "";
  return `<article class="test-card">
    <div class="test-title">
      <div class="chips">
        <span class="pill ${tone}">${escapeHtml(test.status)}</span>
        <span class="pill info">${escapeHtml(test.classification.code)}</span>
      </div>
      <h3>${escapeHtml(test.titlePath.join(" > "))}</h3>
      ${catalogItemLabel(test) ? `<p class="error-preview">${escapeHtml(catalogItemLabel(test))}</p>` : ""}
      <code>${escapeHtml(`${test.file}:${test.line}`)}</code>
      ${test.errors.length > 0 ? `<p class="error-preview">${escapeHtml(shortFailure(test.errors[0]))}</p>` : ""}
      ${test.failedStep ? failedStepSummaryHtml(test.failedStep) : ""}
    </div>
    <div class="test-actions">
      ${finalUrl ? linkHtml(finalUrl, "Reached URL", "link-button") : ""}
      ${artifactLinksHtml(test.attachments, context)}
    </div>
    ${stepsDetailsHtml(test.steps, `test-steps-${stableId(test.titlePath.join("-"))}`, "test-steps")}
  </article>`;
}

function sectionCard(section, context) {
  const reviewTests = section.tests.filter(testNeedsReview);
  const passedTests = section.tests.filter((test) => test.status === "passed").length;

  return `<section class="section">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Test section</p>
        <h2>${escapeHtml(section.name)}</h2>
      </div>
      <div class="chips">
        <span>Total ${section.total}</span>
        <span class="pass">Passed ${passedTests}</span>
        <span class="warn">Need review ${reviewTests.length}</span>
        <span>Skipped ${section.skipped || 0}</span>
      </div>
    </div>
    ${
      reviewTests.length > 0
        ? `<div class="test-list">${reviewTests.map((test) => testCard(test, context)).join("\n")}</div>`
        : `<p class="step-note">No issues found in this section.</p>`
    }
    ${
      section.tests.length > reviewTests.length
        ? `<details>
            <summary>Show all ${section.tests.length} test${section.tests.length === 1 ? "" : "s"} in this section</summary>
            <div class="test-list">${section.tests.map((test) => testCard(test, context)).join("\n")}</div>
          </details>`
        : ""
    }
  </section>`;
}

function testNeedsReview(test) {
  return test.status !== test.expectedStatus && test.status !== "skipped";
}

function failureCategoriesHtml(categories) {
  return `<section class="section">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Issue grouping</p>
        <h2>Issues by Type</h2>
      </div>
      <div class="chips">
        ${categories.map((category) => `<span class="pill fail">${escapeHtml(category.label)} ${category.count}</span>`).join("\n")}
      </div>
    </div>
    <div class="issue-grid">
      ${categories
        .map((category) => {
          const detail = issueTypeDefinition(category.code);
          return `<div class="issue-card">
            <strong>${escapeHtml(category.label)}</strong>
            <code>${escapeHtml(category.code)}</code>
            <span>${escapeHtml(needsReviewText(category.count))}.</span>
            <span>${escapeHtml(detail.description)}</span>
          </div>`;
        })
        .join("\n")}
    </div>
    <div class="filter-bar" aria-label="Failure category filters">
      <button class="filter-button active" type="button" data-filter="all">All failures</button>
      ${categories
        .map(
          (category) =>
            `<button class="filter-button" type="button" data-filter="${escapeAttribute(category.code)}">${escapeHtml(category.label)} (${category.count})</button>`,
        )
        .join("\n")}
    </div>
    <p class="filter-status" data-filter-status>Showing all failures.</p>
    ${issueTypeGuideHtml()}
  </section>`;
}

function failureReviewHtml(failures, context) {
  return `<section class="section">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Action list</p>
        <h2>Failures to Review</h2>
      </div>
      <div class="chips">
        <span class="pill fail">${escapeHtml(needsReviewText(failures.length))}</span>
      </div>
    </div>
    <div class="failure-grid">
      ${failures.map((failure, index) => failureCard(failure, index, context)).join("\n")}
    </div>
  </section>`;
}

function failureCard(failure, index, context) {
  const bugId = `bug-summary-${index}`;
  const catalogUrl = failure.catalogItem?.normalized_href || failure.catalogItem?.absolute_url || "";
  return `<article class="failure-card" data-category="${escapeAttribute(failure.classification.code)}">
    <div class="failure-header">
      <div class="failure-title">
        <div class="chips">
          <span class="pill fail">${escapeHtml(failure.classification.label)}</span>
          <span class="pill info">${escapeHtml(failure.classification.code)}</span>
        </div>
        <h3>${escapeHtml(catalogItemLabel(failure) || failure.title)}</h3>
      </div>
      <button class="copy-button" type="button" data-copy="${escapeAttribute(bugId)}">Copy bug report</button>
    </div>
    <p class="failure-explanation">${escapeHtml(failureExplanation(failure))}</p>
    ${failure.failedStep ? failedStepSummaryHtml(failure.failedStep) : ""}
    <div class="route-grid">
      ${routeCardHtml("Test tried", catalogUrl, "Original card link from the generated catalog.", "Open tried URL")}
      ${routeCardHtml("Browser ended at", failure.finalUrl, `Page title: ${failure.finalTitle || "Unknown"}`, "Open reached URL")}
    </div>
    <div class="meta-grid">
      <div class="meta-item">
        <strong>Test file</strong>
        <span><code>${escapeHtml(`${failure.file}:${failure.line}`)}</code></span>
      </div>
    </div>
    ${failureEvidenceHtml(failure.attachments, context, index)}
    ${stepsDetailsHtml(failure.steps, `failure-steps-${index}`)}
    <details>
      <summary>Bug report details</summary>
      <pre id="${escapeAttribute(bugId)}" class="bug">${escapeHtml(failure.bugSummary)}</pre>
    </details>
  </article>`;
}

function emptyStateHtml(status) {
  const message = status === "passed" ? "No failures were found in this run." : "No unexpected failures were captured.";
  return `<section class="empty-state">${escapeHtml(message)}</section>`;
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

function failedStepSummaryHtml(step) {
  const stepPath = step.path?.join(" > ") || step.title;
  const location = stepLocationLabel(step);

  return `<div class="step-summary">
    <strong>Failed at</strong>
    <p>${escapeHtml(friendlyStepPath(stepPath))}</p>
    ${location ? `<p class="step-meta">${escapeHtml(location)}</p>` : ""}
    ${step.error ? `<p class="error-preview">${escapeHtml(displayFailure(step.error))}</p>` : ""}
  </div>`;
}

function stepsDetailsHtml(steps, id, className = "") {
  const flatSteps = flattenSteps(steps || []);
  const visibleSteps = reviewSteps(steps || []);
  if (visibleSteps.length === 0) {
    return "";
  }

  return `<details class="workflow-summary ${escapeAttribute(className)}">
    <summary>What the test did (${visibleSteps.length} browser steps)</summary>
    <div class="workflow-body">
    ${workflowSummaryHtml(visibleSteps)}
    <details class="developer-steps">
      <summary>Developer step log (${visibleSteps.length} browser steps, ${flatSteps.length} total Playwright steps)</summary>
      <p class="step-note">This is the technical step log for debugging the automation itself. The plain summary above is the QA triage view.</p>
      <div id="${escapeAttribute(id)}" class="step-list">
        ${stepRowsHtml(visibleSteps)}
      </div>
    </details>
    </div>
  </details>`;
}

function stepRowsHtml(steps) {
  return (steps || [])
    .map((step) => {
      const details = [step.category, formatStepDuration(step.durationMs), stepLocationLabel(step)].filter(Boolean);
      const depth = Math.min(step.depth || 0, 5);
      const showStepError = step.error && !hasFailedDescendant(step);

      return `<div class="step-item ${step.status === "failed" ? "failed" : ""}" style="margin-left: ${depth * 14}px;">
        <div class="step-title">
          <span class="step-badge ${step.status === "failed" ? "failed" : "done"}">${escapeHtml(stepStatusLabel(step))}</span>
          <span>${escapeHtml(friendlyStepTitle(step.title))}</span>
        </div>
        ${showStepError ? `<p class="error-preview">${escapeHtml(displayFailure(step.error))}</p>` : ""}
        ${details.length ? `<details class="step-debug"><summary>Technical details</summary><span class="step-meta">${escapeHtml(details.join(" | "))}</span></details>` : ""}
      </div>`;
    })
    .join("\n");
}

function reviewSteps(steps) {
  return flattenSteps(steps).filter(isReviewStep);
}

function isReviewStep(step) {
  if (step.status === "failed") {
    return true;
  }

  const title = step.title || "";
  if (
    /^(Before Hooks|After Hooks|Worker Cleanup)$/i.test(title) ||
    /^Fixture\b/i.test(title) ||
    /^Attach\b/i.test(title) ||
    /^(Create context|Create page|Close context|Get content)$/i.test(title)
  ) {
    return false;
  }

  return step.category === "test.step" || step.category === "pw:api";
}

function hasFailedDescendant(step) {
  return (step.steps || []).some((child) => child.status === "failed" || hasFailedDescendant(child));
}

function workflowSummaryHtml(steps) {
  const attempts = navigationAttempts(steps);
  if (attempts.length > 0) {
    return `<ol class="action-list">
      ${attempts
        .map(
          (attempt, index) => `<li>
            <strong>Attempt ${index + 1}</strong>
            <span>${escapeHtml(navigationAttemptSentence(attempt))}</span>
          </li>`,
        )
        .join("\n")}
    </ol>`;
  }

  return `<ol class="action-list">
    ${steps
      .map(
        (step) => `<li>
          <strong>${escapeHtml(step.status === "failed" ? "Problem step" : "Action")}</strong>
          <span>${escapeHtml(friendlyStepTitle(step.title))}${step.error ? ` - ${escapeHtml(displayFailure(step.error))}` : ""}</span>
        </li>`,
      )
      .join("\n")}
  </ol>`;
}

function navigationAttempts(steps) {
  const attempts = [];
  let current;

  for (const step of steps) {
    const navigateMatch = String(step.title || "").match(/^Navigate to "(.+)"$/);
    if (navigateMatch) {
      current = {
        url: navigateMatch[1],
        htmlLoaded: false,
        expectedRoute: "not checked",
        waitDurationMs: 0,
        error: "",
      };
      attempts.push(current);
      continue;
    }

    if (!current) {
      continue;
    }

    if (/^Wait for load state "domcontentloaded"$/i.test(step.title)) {
      current.htmlLoaded = step.status !== "failed";
    }

    if (/^Wait for navigation$/i.test(step.title)) {
      current.expectedRoute = step.status === "failed" ? "failed" : "passed";
      current.waitDurationMs = step.durationMs || 0;
      current.error = step.error || "";
    }
  }

  return attempts;
}

function navigationAttemptSentence(attempt) {
  const pieces = [`Opened ${attempt.url}.`];

  pieces.push(attempt.htmlLoaded ? "The page HTML loaded." : "The page HTML did not clearly finish loading.");

  if (attempt.expectedRoute === "failed") {
    const duration = attempt.waitDurationMs ? ` within ${formatStepDuration(attempt.waitDurationMs)}` : "";
    pieces.push(`The expected workshop route did not appear${duration}.`);
  } else if (attempt.expectedRoute === "passed") {
    pieces.push("The expected workshop route appeared.");
  } else {
    pieces.push("The route check did not run.");
  }

  return pieces.join(" ");
}

function failureExplanation(failure) {
  const finalUrl = failure.finalUrl || "";
  const finalTitle = failure.finalTitle || "unknown page";

  switch (failure.classification.code) {
    case "ROUTING_INVALID_WORKSHOP_ID":
      return `The test opened the indexed catalog link, but LiveLabs redirected to ${finalTitle} with an invalid workshop route. This is a user-facing routing issue for this catalog item.`;
    case "ROUTING_FAILED":
      return "The test could not finish opening the indexed catalog item. Review the reached URL, screenshot, and trace to see whether the page hung, redirected, or failed to load.";
    case "BROKEN_VISIBLE_IMAGE":
      return "A visible image on the page did not load correctly.";
    case "BROKEN_VISIBLE_LINK":
      return "A visible link on the page appears broken or unreachable.";
    case "BROKEN_EMBEDDED_CONTENT":
      return "An embedded item, such as an iframe or media block, did not render correctly.";
    case "CONTENT_TEXT_DEFECT":
      return "The page showed content that looks unfinished, misspelled, or template-like.";
    case "CONTENT_RELEVANCE":
      return "The page loaded, but the visible content did not match the indexed catalog item closely enough.";
    case "INSTRUCTIONS_FLOW":
      return "The instructions path did not open or render correctly.";
    case "ASSET_ACTION_FAILED":
      return "A LiveStack asset action did not open, download, or navigate as expected.";
    case "TIMEOUT":
      return "The page did not reach the expected state before the test timeout.";
    default:
      return finalUrl
        ? `The test failed after the browser reached ${finalTitle}. Use the screenshot, video, and trace for the exact page state.`
        : "The test failed before a final browser page could be captured.";
  }
}

function issueTypeDefinition(code) {
  return ISSUE_TYPE_DEFINITIONS.find((item) => item.code === code) || {
    code,
    label: code,
    description: "The report could not map this failure to a more specific known issue type yet.",
  };
}

function issueTypeGuideHtml() {
  return `<details class="issue-guide">
    <summary>All issue types this report understands</summary>
    <div class="issue-guide-grid">
      ${ISSUE_TYPE_DEFINITIONS.map(
        (item) => `<div class="issue-guide-item">
          <strong>${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(item.description)}</span>
        </div>`,
      ).join("\n")}
    </div>
  </details>`;
}

function routeCardHtml(label, url, note, linkLabel) {
  return `<div class="route-card">
    <strong>${escapeHtml(label)}</strong>
    ${url ? `<code>${escapeHtml(url)}</code>${linkHtml(url, linkLabel, "link-button")}` : "<span>Not captured</span>"}
    ${note ? `<span class="route-note">${escapeHtml(note)}</span>` : ""}
  </div>`;
}

function flattenSteps(steps) {
  const flatSteps = [];
  for (const step of steps || []) {
    flatSteps.push(step);
    flatSteps.push(...flattenSteps(step.steps || []));
  }
  return flatSteps;
}

function stepStatusLabel(step) {
  return step.status === "failed" ? "Failed" : "Done";
}

function stepLocationLabel(step) {
  if (!step.location?.file) {
    return "";
  }

  const column = step.location.column ? `:${step.location.column}` : "";
  return `${step.location.file}:${step.location.line}${column}`;
}

function failureEvidenceHtml(attachments, context = {}, index = 0) {
  const primary = attachments
    .filter((attachment) => attachment.path)
    .filter((attachment) => /screenshot|video|trace/i.test(attachment.name))
    .map((attachment) => artifactLinkHtml(attachment, context));
  const advanced = attachments
    .filter((attachment) => attachment.path)
    .filter((attachment) => /error-context|dom-snapshot|page-state|catalog-item/i.test(attachment.name))
    .map((attachment) => artifactLinkHtml(attachment, context));

  if (primary.length === 0 && advanced.length === 0) {
    return "";
  }

  return `<div class="evidence">
    <div class="evidence-heading">
      <strong>Evidence</strong>
      <div class="evidence-actions">${primary.join(" ")}</div>
    </div>
    ${traceHelpHtml(attachments, index)}
    ${
      advanced.length
        ? `<details class="advanced-evidence">
            <summary>Advanced evidence files</summary>
            <p>DOM snapshot means the saved HTML of the page at the failure moment. It is mainly for developers when screenshot or video is not enough.</p>
            <div class="artifact-links">${advanced.join(" ")}</div>
          </details>`
        : ""
    }
  </div>`;
}

function artifactLinksHtml(attachments, context = {}) {
  const links = attachments
    .filter((attachment) => attachment.path)
    .filter((attachment) => /screenshot|trace|video|error-context|dom-snapshot|page-state|catalog-item/i.test(attachment.name))
    .map((attachment) => artifactLinkHtml(attachment, context));

  return links.length > 0 ? `<div class="artifact-links">${links.join(" ")}</div>` : "";
}

function artifactLinkHtml(attachment, context = {}) {
  return linkHtml(
    relativeLinkFromReportOutput(attachment.path, context.outputDir),
    artifactLabel(attachment),
    "link-button",
    artifactTitle(attachment),
  );
}

function artifactLabel(attachment) {
  if (/screenshot/i.test(attachment.name)) return "Screenshot";
  if (/video/i.test(attachment.name)) return "Video";
  if (/trace/i.test(attachment.name)) return "Trace zip";
  if (/dom-snapshot/i.test(attachment.name)) return "DOM snapshot";
  if (/error-context/i.test(attachment.name)) return "Error context";
  if (/page-state/i.test(attachment.name)) return "Page state";
  if (/catalog-item/i.test(attachment.name)) return "Catalog item JSON";
  return shortArtifactName(attachment.name);
}

function artifactTitle(attachment) {
  if (/trace/i.test(attachment.name)) {
    return "Download the trace zip, then open it with the Playwright command shown below.";
  }
  if (/dom-snapshot/i.test(attachment.name)) {
    return "Saved HTML of the page when the test failed.";
  }
  return "";
}

function traceHelpHtml(attachments, index) {
  const trace = attachments.find((attachment) => attachment.name === "trace" && attachment.path);
  if (!trace) {
    return "";
  }

  const commandId = `trace-command-${index}`;
  const command = traceViewerCommand(trace.path);

  return `<details class="trace-help">
    <summary>Open trace in Playwright</summary>
    <p class="error-preview">Run this from the qa-automation directory. It uses the Playwright installed in this project, so it should not try to download anything from npm:</p>
    <pre id="${escapeAttribute(commandId)}">${escapeHtml(command)}</pre>
    <button class="copy-button" type="button" data-copy="${escapeAttribute(commandId)}">Copy trace command</button>
  </details>`;
}

function traceViewerCommand(projectRelativeTracePath) {
  if (process.platform === "win32") {
    return `.\\node_modules\\.bin\\playwright.cmd show-trace "${escapePowerShell(projectRelativeTracePath.replace(/\//g, "\\"))}"`;
  }

  return `./node_modules/.bin/playwright show-trace ${shellQuote(projectRelativeTracePath)}`;
}

function relativeLinkFromReportOutput(projectRelativePath, outputDir = path.join(PROJECT_ROOT, "reports", "latest")) {
  const absolutePath = path.join(PROJECT_ROOT, projectRelativePath);
  return path.relative(outputDir, absolutePath).replace(/\\/g, "/");
}

function shortArtifactName(name) {
  return name
    .replace(/^qa-/, "")
    .replace(/\.(log|json|zip|webm|png|html|md)$/i, "")
    .replace(/-/g, " ");
}

function friendlyStepPath(value) {
  return String(value)
    .split(" > ")
    .map((item) => friendlyStepTitle(item))
    .join(" > ");
}

function friendlyStepTitle(value) {
  const title = String(value);
  const navigateMatch = title.match(/^Navigate to "(.+)"$/);
  if (navigateMatch) {
    return `Open ${navigateMatch[1]}`;
  }

  if (/^Wait for load state "domcontentloaded"$/i.test(title)) {
    return "Wait for page HTML to load";
  }

  if (/^Wait for navigation$/i.test(title)) {
    return "Wait for expected route";
  }

  return title;
}

function linkHtml(href, label, className = "", title = "") {
  const safeHref = /^(https?:)?\/\//i.test(href) || href.startsWith("../") || href.startsWith("./") ? href : `./${href}`;
  return `<a${className ? ` class="${escapeAttribute(className)}"` : ""}${title ? ` title="${escapeAttribute(title)}"` : ""} href="${escapeAttribute(safeHref)}">${escapeHtml(label)}</a>`;
}

function metric(label, value, className = "") {
  return `<div class="metric ${className}"><strong>${value}</strong><span>${escapeHtml(label)}</span></div>`;
}

function runStatusLabel(summary) {
  if (summary.counts.unexpected > 0) {
    return "Needs review";
  }

  if (summary.status === "passed") {
    return "Passed";
  }

  if (summary.status === "interrupted") {
    return "Interrupted";
  }

  return summary.status;
}

function runStatusTone(summary) {
  if (summary.counts.unexpected > 0) {
    return "warn";
  }

  return summary.status === "passed" ? "pass" : "fail";
}

function needsReviewText(count) {
  return `${count} test${count === 1 ? "" : "s"} need${count === 1 ? "s" : ""} review`;
}

function statusTone(status) {
  if (status === "passed") return "pass";
  if (status === "failed" || status === "timedOut" || status === "interrupted") return "fail";
  if (status === "skipped") return "info";
  return "warn";
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

function formatStepDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "";
  }

  return ms < 1000 ? `${Math.round(ms)}ms` : formatDuration(ms);
}

function stableId(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function singleLine(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function shortFailure(value) {
  const text = singleLine(value);
  return text.length > 260 ? `${text.slice(0, 257)}...` : text;
}

function displayFailure(value) {
  const text = singleLine(value)
    .replace(/=+ logs =+.*$/i, "")
    .replace(/^TimeoutError:\s*/i, "")
    .replace(/^Error:\s*/i, "");

  return text.length > 190 ? `${text.slice(0, 187)}...` : text;
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

function escapePowerShell(value) {
  return String(value).replace(/`/g, "``").replace(/"/g, '`"');
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}
