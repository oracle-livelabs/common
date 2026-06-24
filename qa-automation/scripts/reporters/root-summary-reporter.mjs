import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_REPORTS_ROOT = path.join(PROJECT_ROOT, "reports");
const REVIEW_STORAGE_KEY = "livelabs-qa-review-lists:v1";
const FIX_LIST_INSTRUCTIONS =
  "Fix the code errors related to these tests, then rerun only this selected test list using the normal test execution flow and produce a report.";
const RETEST_LIST_INSTRUCTIONS =
  "Rerun only the tests in the provided Retest List. Use the normal project test execution flow. Do not run the full suite unless required by the existing test runner. After execution, produce the standard test report and clearly show pass/fail status for each selected test.";
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
    code: "OVERVIEW_STRUCTURE",
    label: "Overview structure",
    description: "The workshop overview route opened, but expected page controls or sections were missing.",
  },
  {
    code: "BROKEN_VISIBLE_LINK",
    label: "Broken visible link",
    description: "A visible link appears broken, unreachable, or returns an error.",
  },
  {
    code: "BROKEN_EMBEDDED_CONTENT",
    label: "Broken embedded content",
    description: "Embedded content such as an iframe or media block did not render correctly.",
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
    const issues = readQaIssues(attachments);
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
      issues,
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
      issues,
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
        issues,
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
    const catalogItems = new Map();

    for (const test of this.results) {
      const unexpected = test.status !== test.expectedStatus && test.status !== "skipped";
      const testIssues = unexpected ? issuesForTest(test) : [];

      counts[test.status] = (counts[test.status] || 0) + 1;
      if (unexpected) {
        counts.unexpected += 1;
        failures.push(test);
        for (const issue of testIssues) {
          failureCategories.set(issue.code, (failureCategories.get(issue.code) || 0) + 1);
        }
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
      if (unexpected) {
        section.unexpected += 1;
      }
      section.tests.push(test);
      sections.set(test.section, section);

      if (test.catalogItem) {
        const catalogKey = catalogItemKey(test.catalogItem);
        const catalogEntry = catalogItems.get(catalogKey) || {
          key: catalogKey,
          catalogItem: test.catalogItem,
          sections: new Set(),
          counts: {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            unexpected: 0,
          },
          tests: [],
          issues: [],
        };

        catalogEntry.sections.add(test.section);
        catalogEntry.counts.total += 1;
        catalogEntry.counts[test.status] = (catalogEntry.counts[test.status] || 0) + 1;
        if (unexpected) {
          catalogEntry.counts.unexpected += 1;
          catalogEntry.issues.push(
            ...testIssues.map((issue) => ({
              ...issue,
              section: test.section,
              testTitle: test.title,
              file: test.file,
              line: test.line,
            })),
          );
        }
        catalogEntry.tests.push({
          title: test.title,
          section: test.section,
          status: test.status,
          expectedStatus: test.expectedStatus,
          durationMs: test.durationMs,
          finalUrl: test.finalUrl,
          finalTitle: test.finalTitle,
          classification: test.classification,
          file: test.file,
          line: test.line,
        });
        catalogItems.set(catalogKey, catalogEntry);
      }
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
      catalogItems: Array.from(catalogItems.values())
        .map((item) => ({
          ...item,
          sections: Array.from(item.sections).sort(),
          status: catalogEntryStatus(item),
          issueCount: item.issues.length,
        }))
        .sort(
          (left, right) =>
            catalogStatusRank(left.status) - catalogStatusRank(right.status) ||
            String(left.catalogItem.title || "").localeCompare(String(right.catalogItem.title || "")),
        ),
      sections: Array.from(sections.values()).sort((left, right) => left.name.localeCompare(right.name)),
    };
  }
}

function catalogItemKey(item) {
  return `${item.type || "item"}:${item.id || item.slug || item.normalized_href || item.title}`;
}

function catalogEntryStatus(item) {
  if (item.counts.unexpected > 0) {
    return "failed";
  }

  if (item.counts.skipped === item.counts.total) {
    return "skipped";
  }

  return "passed";
}

function catalogStatusRank(status) {
  if (status === "failed") return 0;
  if (status === "skipped") return 1;
  return 2;
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

function readQaIssues(attachments) {
  const attachment = attachments.find((item) => item.name === "qa-issues.json" && item.bodyText);
  if (!attachment) {
    return [];
  }

  try {
    const parsed = JSON.parse(attachment.bodyText);
    const issues = Array.isArray(parsed?.issues) ? parsed.issues : [];

    return issues
      .filter((issue) => issue && typeof issue === "object")
      .map((issue) => normalizeQaIssue(issue))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeQaIssue(issue) {
  const code = typeof issue.code === "string" && issue.code.trim() ? issue.code.trim() : "UNCLASSIFIED_FAILURE";
  const definition = issueTypeDefinition(code);
  const label = typeof issue.label === "string" && issue.label.trim() ? issue.label.trim() : definition.label;
  const message =
    typeof issue.message === "string" && issue.message.trim() ? issue.message.trim() : definition.description;
  const severity =
    typeof issue.severity === "string" && issue.severity.trim() ? issue.severity.trim() : issueSeverityFromCode(code);

  return {
    code,
    label,
    message,
    severity,
    count: Number.isFinite(issue.count) ? issue.count : undefined,
    details: issue.details,
  };
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

function classifyResult({ status, expectedStatus, errors, finalUrl, titlePath, file, issues = [] }) {
  if (status === "skipped") {
    return { code: "SKIPPED", label: "Skipped", severity: "info" };
  }

  if (status === expectedStatus) {
    return { code: "PASSED", label: "Passed", severity: "pass" };
  }

  if (issues.length > 0) {
    const primaryIssue = issues.find((issue) => issue.severity === "blocker") || issues[0];
    return {
      code: primaryIssue.code,
      label: primaryIssue.label,
      severity: primaryIssue.severity === "blocker" ? "fail" : "warn",
    };
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
  if (/OVERVIEW_STRUCTURE|overview page was missing expected controls or sections/i.test(text)) {
    return { code: "OVERVIEW_STRUCTURE", label: "Overview structure", severity: "fail" };
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

function buildBugSummary({
  titlePath,
  file,
  line,
  errors,
  finalUrl,
  finalTitle,
  classification,
  catalogItem,
  steps,
  failedStep,
  issues = [],
}) {
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
    issues.length ? `Issues found: ${issues.length}` : "",
    ...issues.map((issue, index) => `${index + 1}. ${issue.code}: ${issue.message}`),
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
  fs.writeFileSync(path.join(outputDir, "retest-list.html"), reviewListPageHtml("retest", summary, { outputDir }), "utf-8");
  fs.writeFileSync(path.join(outputDir, "fix-list.html"), reviewListPageHtml("fix", summary, { outputDir }), "utf-8");
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
  const catalogItems = summary.catalogItems || [];
  const reviewItems = buildReviewEntries(catalogItems, summary.runId);
  const itemCounts = {
    passed: catalogItems.filter((item) => item.status === "passed").length,
    failed: catalogItems.filter((item) => item.status === "failed").length,
    skipped: catalogItems.filter((item) => item.status === "skipped").length,
  };
  const testedItems =
    catalogItems.length > 0
      ? testedItemsHtml(catalogItems, summary.failureCategories, summary.runId)
      : emptyStateHtml("No generated catalog items were attached to this run.");
  const itemDetails =
    catalogItems.length > 0 ? itemDetailsHtml(catalogItems, summary.failures, { ...context, summaryRunId: summary.runId }) : "";
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
    .muted { color: var(--muted); }
    .filter-bar {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .filter-button,
    .copy-button,
    .review-button,
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
    .review-button:hover,
    .link-button:hover {
      border-color: var(--link);
      color: var(--link);
    }
    .review-button.selected {
      background: var(--pass-bg);
      border-color: #b7ebc6;
      color: var(--pass);
    }
    .review-nav {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }
    .review-nav a {
      align-items: center;
      background: #ffffff;
      border: 1px solid var(--line-strong);
      border-radius: 6px;
      color: var(--text);
      display: inline-flex;
      font-size: 13px;
      font-weight: 700;
      gap: 7px;
      line-height: 1;
      padding: 8px 10px;
      text-decoration: none;
    }
    .review-nav a:hover {
      border-color: var(--link);
      color: var(--link);
    }
    .review-count {
      background: var(--info-bg);
      border: 1px solid #bae6fd;
      border-radius: 999px;
      color: var(--info);
      display: inline-flex;
      min-width: 24px;
      padding: 4px 7px;
      justify-content: center;
    }
    .review-message {
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
      min-height: 20px;
      margin: -6px 0 14px;
    }
    .filter-panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      display: grid;
      gap: 12px;
      margin-bottom: 18px;
      padding: 16px;
    }
    .filter-row {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .search-input {
      border: 1px solid var(--line-strong);
      border-radius: 6px;
      color: var(--text);
      font: inherit;
      min-width: min(100%, 320px);
      padding: 9px 10px;
    }
    .item-list {
      display: grid;
      gap: 10px;
    }
    .item-row {
      align-items: center;
      background: var(--panel);
      border: 1px solid var(--line);
      border-left: 5px solid var(--pass);
      border-radius: 8px;
      color: var(--text);
      display: grid;
      gap: 12px;
      grid-template-columns: minmax(0, 1fr) auto;
      padding: 13px 14px;
      text-decoration: none;
    }
    .item-row.failed {
      border-left-color: var(--fail);
    }
    .item-row.skipped {
      border-left-color: var(--warn);
    }
    .item-row:hover {
      border-color: var(--link);
      box-shadow: 0 1px 4px rgba(0, 94, 168, 0.16);
    }
    .item-row[hidden] { display: none; }
    .item-title {
      display: grid;
      gap: 6px;
      min-width: 0;
    }
    .item-title h3 {
      overflow-wrap: anywhere;
    }
    .item-meta {
      color: var(--muted);
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 13px;
    }
    .item-problem {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.35;
      text-align: right;
    }
    .item-actions {
      align-items: flex-end;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }
    .item-details-link {
      color: var(--link);
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      white-space: nowrap;
    }
    .item-details-link:hover {
      text-decoration: underline;
    }
    .item-detail {
      display: none;
      scroll-margin-top: 18px;
    }
    .item-detail:target {
      display: block;
    }
    .detail-header {
      align-items: flex-start;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .detail-grid {
      display: grid;
      gap: 14px;
    }
    .detail-test {
      background: #ffffff;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
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
    .issue-list {
      display: grid;
      gap: 10px;
      margin: 12px 0;
    }
    .issue-detail {
      background: #ffffff;
      border: 1px solid var(--line);
      border-left: 5px solid var(--fail);
      border-radius: 8px;
      padding: 12px;
    }
    .issue-detail.blocker {
      background: var(--fail-bg);
      border-color: #ffd0c7;
      border-left-color: var(--fail);
    }
    .issue-detail.major {
      border-left-color: var(--warn);
    }
    .issue-detail-header {
      align-items: flex-start;
      display: flex;
      gap: 10px;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .issue-detail-title {
      display: grid;
      gap: 5px;
    }
    .issue-detail h4 {
      font-size: 17px;
      margin: 0;
    }
    .issue-detail p {
      color: var(--text);
      font-size: 14px;
      line-height: 1.45;
    }
    .issue-detail details summary {
      color: var(--muted);
      font-size: 13px;
    }
    .catalog-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    }
    .catalog-card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-left: 5px solid var(--pass);
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
      overflow: hidden;
    }
    .catalog-card.failed {
      border-left-color: var(--fail);
    }
    .catalog-card.skipped {
      border-left-color: var(--warn);
    }
    .catalog-card > summary {
      cursor: pointer;
      display: grid;
      gap: 10px;
      list-style: none;
      padding: 14px;
    }
    .catalog-card > summary::-webkit-details-marker {
      display: none;
    }
    .catalog-card-title {
      display: grid;
      gap: 8px;
      min-width: 0;
    }
    .catalog-card-title h3 {
      overflow-wrap: anywhere;
    }
    .catalog-card-meta {
      color: var(--muted);
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 13px;
    }
    .catalog-card-body {
      border-top: 1px solid var(--line);
      display: grid;
      gap: 14px;
      padding: 14px;
    }
    .catalog-checks {
      display: grid;
      gap: 8px;
    }
    .catalog-check {
      background: var(--panel-soft);
      border: 1px solid var(--line);
      border-radius: 8px;
      display: grid;
      gap: 6px;
      padding: 10px;
    }
    .catalog-check strong {
      display: block;
    }
    .catalog-check span {
      color: var(--muted);
      font-size: 13px;
    }
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
    .failure-card.blocker {
      border-left-color: var(--fail);
      box-shadow: inset 0 0 0 1px #ffd0c7;
    }
    .failure-card > summary {
      cursor: pointer;
      list-style: none;
    }
    .failure-card > summary::-webkit-details-marker {
      display: none;
    }
    .failure-card > summary::before {
      color: var(--link);
      content: "Open details";
      font-size: 13px;
      font-weight: 700;
      margin-right: 8px;
    }
    .failure-card[open] > summary::before {
      content: "Close details";
    }
    .failure-body {
      margin-top: 12px;
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
      ${reviewNavigationHtml()}
    </div>
  </header>
  <main>
    <div class="totals">
      ${metric("Items tested", catalogItems.length || summary.counts.total)}
      ${metric("Passed", catalogItems.length > 0 ? itemCounts.passed : summary.counts.passed, "pass")}
      ${metric(
        "Need review",
        catalogItems.length > 0 ? itemCounts.failed : summary.counts.unexpected,
        summary.counts.unexpected > 0 ? "warn" : "pass",
      )}
      ${metric("Skipped", catalogItems.length > 0 ? itemCounts.skipped : summary.counts.skipped)}
      ${metric("Issues found", summary.failureCategories.reduce((total, category) => total + category.count, 0), "warn")}
    </div>
    <p class="review-message" data-review-message></p>
    ${testedItems}
    ${itemDetails}
  </main>
  <script id="qa-review-items" type="application/json">${escapeScriptJson(reviewItems)}</script>
  <script>
    const REVIEW_STORAGE_KEY = "${REVIEW_STORAGE_KEY}";
    const qaReviewItems = JSON.parse(document.getElementById("qa-review-items")?.textContent || "{}");
    const filterButtons = Array.from(document.querySelectorAll("[data-filter-value]"));
    const itemRows = Array.from(document.querySelectorAll("[data-item-row]"));
    const filterStatus = document.querySelector("[data-filter-status]");
    const itemSearch = document.querySelector("[data-item-search]");
    let activeFilter = "all";
    function applyItemFilters() {
      const query = (itemSearch?.value || "").trim().toLowerCase();
      let visibleCount = 0;
      for (const row of itemRows) {
        const haystack = (row.getAttribute("data-search") || "").toLowerCase();
        const issueCodes = (row.getAttribute("data-issues") || "").split(/\\s+/).filter(Boolean);
        const status = row.getAttribute("data-status") || "";
        const type = row.getAttribute("data-type") || "";
        const filterMatch =
          activeFilter === "all" ||
          activeFilter === status ||
          activeFilter === type ||
          issueCodes.includes(activeFilter);
        const searchMatch = !query || haystack.includes(query);
        const visible = filterMatch && searchMatch;
        row.hidden = !visible;
        if (visible) visibleCount += 1;
      }
      if (filterStatus) {
        filterStatus.innerText = "Showing " + visibleCount + " of " + itemRows.length + " tested item(s).";
      }
    }
    for (const button of filterButtons) {
      button.addEventListener("click", () => {
        activeFilter = button.getAttribute("data-filter-value") || "all";
        for (const item of filterButtons) item.classList.toggle("active", item === button);
        applyItemFilters();
      });
    }
    if (itemSearch) itemSearch.addEventListener("input", applyItemFilters);
    applyItemFilters();
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
    function readReviewState() {
      try {
        const parsed = JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) || "{}");
        return {
          retest: parsed && parsed.retest && typeof parsed.retest === "object" ? parsed.retest : {},
          fix: parsed && parsed.fix && typeof parsed.fix === "object" ? parsed.fix : {},
        };
      } catch {
        return { retest: {}, fix: {} };
      }
    }
    function writeReviewState(state) {
      localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify({
        retest: state.retest || {},
        fix: state.fix || {},
      }));
    }
    function reviewListName(type) {
      return type === "fix" ? "Fix List" : "Retest List";
    }
    function updateReviewCounts() {
      const state = readReviewState();
      for (const counter of document.querySelectorAll("[data-review-count]")) {
        const type = counter.getAttribute("data-review-count") === "fix" ? "fix" : "retest";
        counter.innerText = String(Object.keys(state[type] || {}).length);
      }
      for (const button of document.querySelectorAll("[data-review-action]")) {
        const type = button.getAttribute("data-review-action") === "fix" ? "fix" : "retest";
        const id = button.getAttribute("data-review-id") || "";
        const selected = Boolean(state[type]?.[id]);
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
        button.innerText = selected
          ? (type === "fix" ? "In Fix List" : "In Retest List")
          : (type === "fix" ? "Add To Fix List" : "Add to Retest List");
      }
    }
    function showReviewMessage(message) {
      const target = document.querySelector("[data-review-message]");
      if (!target) return;
      target.innerText = message;
      window.clearTimeout(showReviewMessage.timer);
      showReviewMessage.timer = window.setTimeout(() => { target.innerText = ""; }, 3200);
    }
    for (const button of document.querySelectorAll("[data-review-action]")) {
      button.addEventListener("click", () => {
        const type = button.getAttribute("data-review-action") === "fix" ? "fix" : "retest";
        const id = button.getAttribute("data-review-id") || "";
        const entry = qaReviewItems[id];
        if (!entry) {
          showReviewMessage("This test has incomplete metadata and could not be added.");
          return;
        }
        const state = readReviewState();
        if (!state[type][id]) {
          state[type][id] = entry;
          writeReviewState(state);
          showReviewMessage(entry.testName + " was added to the " + reviewListName(type) + ".");
        } else {
          showReviewMessage(entry.testName + " is already in the " + reviewListName(type) + ".");
        }
        updateReviewCounts();
      });
    }
    window.addEventListener("storage", (event) => {
      if (event.key === REVIEW_STORAGE_KEY) updateReviewCounts();
    });
    updateReviewCounts();
  </script>
</body>
</html>`;
}

function buildReviewEntries(items, runId) {
  return Object.fromEntries(items.map((item) => [reviewEntryId(item, runId), reviewEntryForItem(item, runId)]));
}

function reviewEntryId(item, runId) {
  return `${runId}:${item.key || catalogItemDisplayTitle(item.catalogItem)}`;
}

function reviewEntryForItem(item, runId) {
  const title = catalogItemDisplayTitle(item.catalogItem);
  const itemId = item.catalogItem.id || item.catalogItem.slug || "";
  const itemType = item.catalogItem.type || "catalog item";
  const issueCodes = Array.from(new Set((item.issues || []).map((issue) => issue.code)));
  const tests = item.tests || [];
  const firstTest = tests[0] || {};
  const catalogUrl = item.catalogItem.normalized_href || item.catalogItem.absolute_url || item.catalogItem.href || "";

  return {
    testId: reviewEntryId(item, runId),
    testName: title,
    testPath: firstTest.file || "",
    suiteName: item.sections.join(", "),
    latestStatus: item.status,
    failureReason: issueSummaryForEntry(item.issues || []),
    stackTrace: tests
      .map((test) => (test.file ? `${test.file}${test.line ? `:${test.line}` : ""}` : ""))
      .filter(Boolean)
      .join("\n"),
    executionId: runId,
    rerunCommand: reviewActionCommand("retest"),
    itemType,
    itemId,
    catalogUrl,
    finalUrl: firstTest.finalUrl || "",
    finalTitle: firstTest.finalTitle || "",
    issueCodes,
    issueCount: item.issueCount || 0,
    checks: tests.map((test) => reviewCheckEntry(test, item, runId)),
  };
}

function reviewCheckEntry(test, item, runId) {
  const failed = test.status !== test.expectedStatus && test.status !== "skipped";
  return {
    testId: `${reviewEntryId(item, runId)}:${test.section}:${test.file}:${test.line || ""}`,
    testName: test.title || test.section,
    testPath: test.file || "",
    suiteName: test.section || "",
    lastStatus: test.status || "",
    failureReason: failed ? issueSummaryForEntry(item.issues || []) || test.classification?.code || "" : "",
    stackTrace: test.file ? `${test.file}${test.line ? `:${test.line}` : ""}` : "",
    finalUrl: test.finalUrl || "",
    finalTitle: test.finalTitle || "",
  };
}

function issueSummaryForEntry(issues) {
  return (issues || [])
    .map((issue) => `${issue.label || issue.code}: ${issue.message || issue.code}`)
    .filter(Boolean)
    .join("\n");
}

function reviewActionCommand(type) {
  return `node ./scripts/report-review-action.mjs ${type} --payload <payload.json>`;
}

function reviewNavigationHtml() {
  return `<nav class="review-nav" aria-label="Review lists">
    <a href="retest-list.html">Retest List <span class="review-count" data-review-count="retest">0</span></a>
    <a href="fix-list.html">Fix List <span class="review-count" data-review-count="fix">0</span></a>
  </nav>`;
}

function reviewListPageHtml(type, summary) {
  const isFix = type === "fix";
  const title = isFix ? "Fix List" : "Retest List";
  const actionLabel = isFix ? "Fix Selected Tests" : "Run Retest List";
  const instructions = isFix ? FIX_LIST_INSTRUCTIONS : RETEST_LIST_INSTRUCTIONS;
  const command = reviewActionCommand(type);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} ${escapeHtml(summary.runId)}</title>
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
      background: #ffffff;
      border-bottom: 1px solid var(--line);
      padding: 28px 32px 22px;
    }
    main { max-width: 1160px; margin: 0 auto; padding: 24px 28px 48px; }
    h1 { margin: 0 0 8px; font-size: 30px; line-height: 1.15; letter-spacing: 0; }
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
      background: #0f172a;
      border-radius: 8px;
      color: #e5e7eb;
      padding: 12px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .page-title { max-width: 1160px; margin: 0 auto; }
    .meta { color: var(--muted); display: flex; flex-wrap: wrap; gap: 10px; font-size: 14px; }
    .nav-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
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
      color: #829ab1;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .08em;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .pill {
      background: #eef2f7;
      border: 1px solid #dbe4ee;
      border-radius: 999px;
      display: inline-flex;
      font-size: 13px;
      font-weight: 700;
      line-height: 1;
      padding: 7px 10px;
      white-space: nowrap;
    }
    .pill.fail { background: var(--fail-bg); border-color: #ffd0c7; color: var(--fail); }
    .pill.pass { background: var(--pass-bg); border-color: #b7ebc6; color: var(--pass); }
    .pill.info { background: var(--info-bg); border-color: #bae6fd; color: var(--info); }
    .button,
    .link-button {
      appearance: none;
      background: #ffffff;
      border: 1px solid var(--line-strong);
      border-radius: 6px;
      color: var(--text);
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      line-height: 1;
      padding: 9px 11px;
      text-decoration: none;
      white-space: nowrap;
    }
    .button.primary {
      background: var(--link);
      border-color: var(--link);
      color: #ffffff;
    }
    .button.danger {
      color: var(--fail);
    }
    .button:hover,
    .link-button:hover {
      border-color: var(--link);
      color: var(--link);
    }
    .button.primary:hover {
      color: #ffffff;
      filter: brightness(.95);
    }
    .toolbar {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .toolbar-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .list {
      display: grid;
      gap: 10px;
    }
    .review-item {
      background: var(--panel);
      border: 1px solid var(--line);
      border-left: 5px solid var(--info);
      border-radius: 8px;
      display: grid;
      gap: 10px;
      padding: 13px 14px;
    }
    .review-item.failed {
      border-left-color: var(--fail);
    }
    .review-item.passed {
      border-left-color: var(--pass);
    }
    .item-header {
      align-items: flex-start;
      display: flex;
      gap: 12px;
      justify-content: space-between;
    }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .item-title { display: grid; gap: 7px; min-width: 0; }
    .item-meta {
      color: var(--muted);
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 13px;
    }
    .item-reason {
      background: var(--panel-soft);
      border: 1px solid var(--line);
      border-radius: 6px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
      padding: 10px;
      white-space: pre-wrap;
    }
    .empty-state {
      border: 1px dashed var(--line-strong);
      border-radius: 8px;
      color: var(--muted);
      padding: 22px;
      text-align: center;
    }
    .message {
      color: var(--muted);
      font-size: 14px;
      font-weight: 700;
      margin-top: 10px;
      min-height: 20px;
    }
    .message.error { color: var(--fail); }
    @media (max-width: 720px) {
      header { padding: 22px 18px; }
      main { padding: 18px; }
      .section-heading,
      .item-header,
      .toolbar {
        display: grid;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="page-title">
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">
        <span>Source run <code>${escapeHtml(summary.runId)}</code></span>
        <span>${escapeHtml(summary.startedAt)}</span>
      </div>
      <div class="nav-actions">
        <a class="link-button" href="summary.html">Back to execution report</a>
        <a class="link-button" href="${isFix ? "retest-list.html" : "fix-list.html"}">${escapeHtml(isFix ? "Open Retest List" : "Open Fix List")}</a>
      </div>
    </div>
  </header>
  <main>
    <section class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Selected tests</p>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <span class="pill info"><span data-list-count>0</span> selected</span>
      </div>
      <div class="toolbar">
        <p class="message" data-message></p>
        <div class="toolbar-actions">
          <button class="button primary" type="button" data-run-list>${escapeHtml(actionLabel)}</button>
          <button class="button" type="button" data-copy-payload>Copy Payload</button>
          <button class="button danger" type="button" data-clear-list>Clear List</button>
        </div>
      </div>
      <div class="list" data-list></div>
    </section>
    <section class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Script handoff</p>
          <h2>Run this list through the QA scripts</h2>
        </div>
      </div>
      <p class="item-reason">${escapeHtml(instructions)}</p>
      <pre data-command>${escapeHtml(command)}</pre>
      <button class="button" type="button" data-copy-command>Copy Command</button>
      <pre data-payload-preview hidden></pre>
    </section>
  </main>
  <script>
    const REVIEW_STORAGE_KEY = "${REVIEW_STORAGE_KEY}";
    const LIST_TYPE = "${type}";
    const LIST_TITLE = "${escapeScriptString(title)}";
    const ACTION_COMMAND = "${escapeScriptString(command)}";
    const INSTRUCTIONS = "${escapeScriptString(instructions)}";
    const listContainer = document.querySelector("[data-list]");
    const listCount = document.querySelector("[data-list-count]");
    const message = document.querySelector("[data-message]");
    const payloadPreview = document.querySelector("[data-payload-preview]");
    const commandPreview = document.querySelector("[data-command]");
    function escapeText(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }
    function readState() {
      try {
        const parsed = JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) || "{}");
        return {
          retest: parsed && parsed.retest && typeof parsed.retest === "object" ? parsed.retest : {},
          fix: parsed && parsed.fix && typeof parsed.fix === "object" ? parsed.fix : {},
        };
      } catch {
        return { retest: {}, fix: {} };
      }
    }
    function writeState(state) {
      localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify({
        retest: state.retest || {},
        fix: state.fix || {},
      }));
    }
    function selectedEntries() {
      return Object.values(readState()[LIST_TYPE] || {});
    }
    function statusTone(status) {
      if (status === "passed") return "pass";
      if (status === "failed" || status === "timedOut" || status === "interrupted") return "fail";
      return "info";
    }
    function showMessage(text, isError) {
      message.innerText = text;
      message.classList.toggle("error", Boolean(isError));
    }
    function payloadForEntry(entry) {
      return {
        testId: entry.testId || "",
        testName: entry.testName || "",
        testPath: entry.testPath || "",
        suiteName: entry.suiteName || "",
        lastStatus: entry.latestStatus || "",
        failureReason: entry.failureReason || "",
        stackTrace: entry.stackTrace || "",
        executionId: entry.executionId || "",
        rerunCommand: entry.rerunCommand || ACTION_COMMAND,
        catalogUrl: entry.catalogUrl || "",
        finalUrl: entry.finalUrl || "",
        checks: Array.isArray(entry.checks) ? entry.checks : [],
      };
    }
    function buildPayload() {
      const entries = selectedEntries();
      const sourceExecutionId = entries.find((entry) => entry.executionId)?.executionId || "";
      const payload = {
        type: LIST_TYPE,
        sourceExecutionId,
        createdAt: new Date().toISOString(),
        tests: entries.map(payloadForEntry),
      };
      payload.instructions = INSTRUCTIONS;
      return payload;
    }
    async function copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
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
    function downloadPayload(payload) {
      const source = payload.sourceExecutionId || "selected";
      const blob = new Blob([JSON.stringify(payload, null, 2) + "\\n"], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = LIST_TYPE + "-list-" + source + ".json";
      document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(link.href);
      document.body.removeChild(link);
    }
    function render() {
      const state = readState();
      const entries = Object.values(state[LIST_TYPE] || {});
      listCount.innerText = String(entries.length);
      commandPreview.innerText = ACTION_COMMAND;
      if (entries.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No tests have been added to this list yet. Go back to the execution report and add the rows you want.</div>';
        payloadPreview.hidden = true;
        return;
      }
      listContainer.innerHTML = entries.map((entry) => {
        const issues = Array.isArray(entry.issueCodes) ? entry.issueCodes : [];
        const checkCount = Array.isArray(entry.checks) ? entry.checks.length : 0;
        const tone = statusTone(entry.latestStatus);
        return '<article class="review-item ' + escapeText(entry.latestStatus || "") + '">' +
          '<div class="item-header">' +
            '<div class="item-title">' +
              '<div class="chips">' +
                '<span class="pill ' + tone + '">' + escapeText(entry.latestStatus || "unknown") + '</span>' +
                '<span class="pill info">' + escapeText(entry.itemType || "test") + '</span>' +
                (entry.itemId ? '<span class="pill info">' + escapeText(entry.itemId) + '</span>' : '') +
                issues.slice(0, 3).map((code) => '<span class="pill info">' + escapeText(code) + '</span>').join("") +
              '</div>' +
              '<h3>' + escapeText(entry.testName || "Unnamed test") + '</h3>' +
              '<div class="item-meta">' +
                '<span>' + escapeText(entry.suiteName || "Unknown suite") + '</span>' +
                '<span>' + checkCount + ' check' + (checkCount === 1 ? '' : 's') + '</span>' +
                '<span>Run ' + escapeText(entry.executionId || "unknown") + '</span>' +
              '</div>' +
            '</div>' +
            '<button class="button danger" type="button" data-remove-id="' + escapeText(entry.testId || "") + '">Remove</button>' +
          '</div>' +
          (entry.failureReason ? '<div class="item-reason">' + escapeText(entry.failureReason) + '</div>' : '') +
        '</article>';
      }).join("");
      payloadPreview.hidden = false;
      payloadPreview.innerText = JSON.stringify(buildPayload(), null, 2);
      for (const button of document.querySelectorAll("[data-remove-id]")) {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-remove-id") || "";
          const current = readState();
          delete current[LIST_TYPE][id];
          writeState(current);
          showMessage("Removed from " + LIST_TITLE + ".", false);
          render();
        });
      }
    }
    document.querySelector("[data-clear-list]").addEventListener("click", () => {
      const state = readState();
      state[LIST_TYPE] = {};
      writeState(state);
      showMessage(LIST_TITLE + " cleared.", false);
      render();
    });
    document.querySelector("[data-run-list]").addEventListener("click", () => {
      const payload = buildPayload();
      if (payload.tests.length === 0) {
        showMessage("Add at least one test before running this list.", true);
        return;
      }
      downloadPayload(payload);
      payloadPreview.hidden = false;
      payloadPreview.innerText = JSON.stringify(payload, null, 2);
      showMessage("Payload downloaded. Run the command below with the downloaded payload path.", false);
    });
    document.querySelector("[data-copy-payload]").addEventListener("click", async () => {
      const payload = buildPayload();
      if (payload.tests.length === 0) {
        showMessage("Add at least one test before copying a payload.", true);
        return;
      }
      const copied = await copyText(JSON.stringify(payload, null, 2));
      showMessage(copied ? "Payload copied." : "Payload copy failed.", !copied);
    });
    document.querySelector("[data-copy-command]").addEventListener("click", async () => {
      const copied = await copyText(ACTION_COMMAND);
      showMessage(copied ? "Command copied." : "Command copy failed.", !copied);
    });
    window.addEventListener("storage", (event) => {
      if (event.key === REVIEW_STORAGE_KEY) render();
    });
    render();
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
  const issues = issuesForTest(failure);
  const issueCodes = Array.from(new Set(issues.map((issue) => issue.code)));
  const isBlocker = issues.some((issue) => issue.severity === "blocker");
  const issueCountLabel = `${issues.length} issue${issues.length === 1 ? "" : "s"} found`;

  return `<details class="failure-card ${isBlocker ? "blocker" : ""}" data-category="${escapeAttribute(issueCodes.join(" "))}">
    <summary class="failure-header">
      <div class="failure-title">
        <div class="chips">
          <span class="pill ${isBlocker ? "fail" : "warn"}">${escapeHtml(issueCountLabel)}</span>
          ${issueCodes.map((code) => `<span class="pill info">${escapeHtml(code)}</span>`).join("\n")}
        </div>
        <h3>${escapeHtml(catalogItemLabel(failure) || failure.title)}</h3>
      </div>
      <button class="copy-button" type="button" data-copy="${escapeAttribute(bugId)}">Copy bug report</button>
    </summary>
    <div class="failure-body">
      <p class="failure-explanation">${escapeHtml(failureExplanation(failure))}</p>
      ${issueListHtml(issues)}
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
    </div>
  </details>`;
}

function issueListHtml(issues) {
  if (issues.length === 0) {
    return "";
  }

  return `<div class="issue-list">
    ${issues.map((issue, index) => issueDetailHtml(issue, index)).join("\n")}
  </div>`;
}

function issueDetailHtml(issue, index) {
  const details = issueDetailsText(issue);
  const severityLabel = issue.severity === "blocker" ? "Hard blocker" : issue.severity === "major" ? "Needs fix" : "Review";

  return `<section class="issue-detail ${escapeAttribute(issue.severity || "major")}">
    <div class="issue-detail-header">
      <div class="issue-detail-title">
        <div class="chips">
          <span class="pill ${issue.severity === "blocker" ? "fail" : "warn"}">${escapeHtml(severityLabel)}</span>
          <span class="pill info">${escapeHtml(issue.code)}</span>
          ${issue.count ? `<span class="pill info">${escapeHtml(String(issue.count))} item${issue.count === 1 ? "" : "s"}</span>` : ""}
        </div>
        <h4>${escapeHtml(index + 1)}. ${escapeHtml(issue.label)}</h4>
      </div>
    </div>
    <p>${escapeHtml(issue.message)}</p>
    ${
      details
        ? `<details>
            <summary>Issue details</summary>
            <pre>${escapeHtml(details)}</pre>
          </details>`
        : ""
    }
  </section>`;
}

function issueDetailsText(issue) {
  if (issue.details === undefined || issue.details === null) {
    return "";
  }

  if (typeof issue.details === "string") {
    return issue.details;
  }

  return JSON.stringify(issue.details, null, 2);
}

function emptyStateHtml(status) {
  const message =
    status === "passed" ? "No failures were found in this run." : status || "No unexpected failures were captured.";
  return `<section class="empty-state">${escapeHtml(message)}</section>`;
}

function testedItemsHtml(items, categories, runId) {
  const statusCounts = {
    failed: items.filter((item) => item.status === "failed").length,
    passed: items.filter((item) => item.status === "passed").length,
    skipped: items.filter((item) => item.status === "skipped").length,
  };
  const types = Array.from(new Set(items.map((item) => item.catalogItem?.type || "catalog item"))).sort();

  return `<section class="section" id="tested-items">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Tested items</p>
        <h2>Workshops, LiveStacks, and Sprints</h2>
      </div>
      <div class="chips">
        <span class="pill ${statusCounts.failed > 0 ? "fail" : "pass"}">${escapeHtml(String(statusCounts.failed))} need review</span>
        <span class="pill pass">${escapeHtml(String(statusCounts.passed))} passed</span>
        ${statusCounts.skipped > 0 ? `<span class="pill warn">${escapeHtml(String(statusCounts.skipped))} skipped</span>` : ""}
      </div>
    </div>
    <div class="filter-panel">
      <div class="filter-row">
        <input class="search-input" type="search" data-item-search placeholder="Filter by name, type, ID, or issue" />
      </div>
      <div class="filter-row" aria-label="Tested item filters">
        <button class="filter-button active" type="button" data-filter-value="all">All</button>
        <button class="filter-button" type="button" data-filter-value="failed">Need review</button>
        <button class="filter-button" type="button" data-filter-value="passed">Passed</button>
        ${statusCounts.skipped > 0 ? `<button class="filter-button" type="button" data-filter-value="skipped">Skipped</button>` : ""}
        ${types
          .map((type) => `<button class="filter-button" type="button" data-filter-value="${escapeAttribute(type)}">${escapeHtml(type)}</button>`)
          .join("\n")}
        ${categories
          .map(
            (category) =>
              `<button class="filter-button" type="button" data-filter-value="${escapeAttribute(category.code)}">${escapeHtml(category.label)} (${category.count})</button>`,
          )
          .join("\n")}
      </div>
      <p class="filter-status" data-filter-status>Showing all tested items.</p>
    </div>
    <div class="item-list">
      ${items.map((item) => testedItemRowHtml(item, runId)).join("\n")}
    </div>
  </section>`;
}

function testedItemRowHtml(item, runId) {
  const itemId = item.catalogItem.id || item.catalogItem.slug || "";
  const itemType = item.catalogItem.type || "catalog item";
  const issues = item.issues || [];
  const issueCodes = Array.from(new Set(issues.map((issue) => issue.code)));
  const blockerCount = issues.filter((issue) => issue.severity === "blocker").length;
  const issueLabel =
    item.status === "failed"
      ? blockerCount > 0
        ? `${blockerCount} hard blocker${blockerCount === 1 ? "" : "s"}`
        : item.issueCount === 1
          ? `${issueDisplayLabel(issues[0])}`
          : `${item.issueCount} separate issues`
      : item.status === "passed"
        ? "No issues found"
        : "Skipped";
  const statusTone = item.status === "failed" ? "fail" : item.status === "skipped" ? "warn" : "pass";
  const searchText = [
    catalogItemDisplayTitle(item.catalogItem),
    itemId,
    item.catalogItem.slug,
    itemType,
    item.status,
    ...issueCodes,
    ...issues.map((issue) => `${issue.label} ${issue.message}`),
  ]
    .filter(Boolean)
    .join(" ");
  const reviewId = reviewEntryId(item, runId);

  return `<article class="item-row ${escapeAttribute(item.status)}"
    data-item-row
    data-status="${escapeAttribute(item.status)}"
    data-type="${escapeAttribute(itemType)}"
    data-issues="${escapeAttribute(issueCodes.join(" "))}"
    data-search="${escapeAttribute(searchText)}">
    <div class="item-title">
      <div class="chips">
        <span class="pill ${statusTone}">${escapeHtml(item.status === "failed" ? "Need review" : item.status)}</span>
        <span class="pill info">${escapeHtml(itemType)}</span>
        ${itemId ? `<span class="pill info">${escapeHtml(itemId)}</span>` : ""}
        ${issueCodes.slice(0, 3).map((code) => `<span class="pill info">${escapeHtml(code)}</span>`).join("\n")}
      </div>
      <h3>${escapeHtml(catalogItemDisplayTitle(item.catalogItem))}</h3>
      <div class="item-meta">
        <span>${escapeHtml(item.counts.total)} check${item.counts.total === 1 ? "" : "s"} run</span>
        <span>${escapeHtml(item.sections.join(", "))}</span>
      </div>
    </div>
    <div class="item-problem">
      <strong>${escapeHtml(issueLabel)}</strong>
      <div class="item-actions">
        <a class="item-details-link" href="#${escapeAttribute(itemDetailId(item))}">Open details</a>
        <button class="review-button" type="button" data-review-action="retest" data-review-id="${escapeAttribute(reviewId)}">Add to Retest List</button>
        <button class="review-button" type="button" data-review-action="fix" data-review-id="${escapeAttribute(reviewId)}">Add To Fix List</button>
      </div>
    </div>
  </article>`;
}

function itemDetailsHtml(items, failures, context) {
  return items.map((item) => itemDetailHtml(item, failures, context)).join("\n");
}

function itemDetailHtml(item, failures, context) {
  const itemFailures = failures.filter(
    (failure) => failure.catalogItem && catalogItemKey(failure.catalogItem) === item.key,
  );
  const issues = item.issues || [];
  const issueCodes = Array.from(new Set(issues.map((issue) => issue.code)));
  const itemId = item.catalogItem.id || item.catalogItem.slug || "";
  const itemType = item.catalogItem.type || "catalog item";
  const statusTone = item.status === "failed" ? "fail" : item.status === "skipped" ? "warn" : "pass";
  const url = item.catalogItem.normalized_href || item.catalogItem.absolute_url || item.catalogItem.href || "";
  const reviewId = reviewEntryId(item, context.summaryRunId || "");

  return `<section class="section item-detail" id="${escapeAttribute(itemDetailId(item))}">
    <div class="detail-header">
      <div>
        <p class="eyebrow">Item details</p>
        <h2>${escapeHtml(catalogItemDisplayTitle(item.catalogItem))}</h2>
        <div class="item-meta">
          <span>${escapeHtml(itemType)}</span>
          ${itemId ? `<span>ID ${escapeHtml(itemId)}</span>` : ""}
          <span>${escapeHtml(item.sections.join(", "))}</span>
        </div>
      </div>
      <div class="chips">
        <span class="pill ${statusTone}">${escapeHtml(item.status === "failed" ? `${item.issueCount} issue${item.issueCount === 1 ? "" : "s"} found` : item.status)}</span>
        ${issueCodes.map((code) => `<span class="pill info">${escapeHtml(code)}</span>`).join("\n")}
      </div>
    </div>
    <div class="detail-grid">
      ${
        issues.length > 0
          ? issueListHtml(issues)
          : `<section class="issue-detail"><h4>No issues found</h4><p>This item passed the checks that ran in this report.</p></section>`
      }
      <div class="catalog-checks">
        ${item.tests.map(catalogCheckHtml).join("\n")}
      </div>
      <div class="artifact-links">
        <a class="link-button" href="#tested-items">Back to tested items</a>
        ${url ? `<a class="link-button" href="${escapeAttribute(url)}">Open item in LiveLabs</a>` : ""}
        <button class="review-button" type="button" data-review-action="retest" data-review-id="${escapeAttribute(reviewId)}">Add to Retest List</button>
        <button class="review-button" type="button" data-review-action="fix" data-review-id="${escapeAttribute(reviewId)}">Add To Fix List</button>
      </div>
      ${itemFailures.map((failure, index) => itemFailureDetailHtml(failure, index, context)).join("\n")}
    </div>
  </section>`;
}

function itemFailureDetailHtml(failure, index, context) {
  const bugId = `item-bug-${index}-${stableId(failure.titlePath.join("-"))}`;
  const catalogUrl = failure.catalogItem?.normalized_href || failure.catalogItem?.absolute_url || "";

  return `<section class="detail-test">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Failure evidence</p>
        <h3>${escapeHtml(failure.section)}</h3>
      </div>
      <button class="copy-button" type="button" data-copy="${escapeAttribute(bugId)}">Copy bug report</button>
    </div>
    <p class="failure-explanation">${escapeHtml(failureExplanation(failure))}</p>
    ${failure.failedStep ? failedStepSummaryHtml(failure.failedStep) : ""}
    <div class="route-grid">
      ${routeCardHtml("Test tried", catalogUrl, "Original generated catalog URL.", "Open tried URL")}
      ${routeCardHtml("Browser ended at", failure.finalUrl, `Page title: ${failure.finalTitle || "Unknown"}`, "Open reached URL")}
    </div>
    ${failureEvidenceHtml(failure.attachments, context, index)}
    ${stepsDetailsHtml(failure.steps, `item-failure-steps-${index}-${stableId(failure.titlePath.join("-"))}`)}
    <details>
      <summary>Bug report details</summary>
      <pre id="${escapeAttribute(bugId)}" class="bug">${escapeHtml(failure.bugSummary)}</pre>
    </details>
  </section>`;
}

function itemDetailId(item) {
  return `item-${stableId(item.key || catalogItemDisplayTitle(item.catalogItem))}`;
}

function issueDisplayLabel(issue) {
  return issue?.label || issue?.code || "Issue found";
}

function catalogOverviewHtml(items) {
  const failed = items.filter((item) => item.status === "failed").length;
  const passed = items.filter((item) => item.status === "passed").length;
  const skipped = items.filter((item) => item.status === "skipped").length;

  return `<section class="section">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Catalog results</p>
        <h2>Workshop Cards Tested</h2>
      </div>
      <div class="chips">
        <span class="pill ${failed > 0 ? "fail" : "pass"}">${escapeHtml(String(failed))} need review</span>
        <span class="pill pass">${escapeHtml(String(passed))} passed</span>
        ${skipped > 0 ? `<span class="pill warn">${escapeHtml(String(skipped))} skipped</span>` : ""}
      </div>
    </div>
    <div class="catalog-grid">
      ${items.map(catalogOverviewCardHtml).join("\n")}
    </div>
  </section>`;
}

function catalogOverviewCardHtml(item) {
  const statusLabel =
    item.status === "failed" ? `${item.issueCount} issue${item.issueCount === 1 ? "" : "s"} found` : item.status;
  const statusTone = item.status === "failed" ? "fail" : item.status === "skipped" ? "warn" : "pass";
  const title = catalogItemDisplayTitle(item.catalogItem);
  const itemId = item.catalogItem.id || item.catalogItem.slug || "";
  const itemType = item.catalogItem.type || "catalog item";
  const url = item.catalogItem.normalized_href || item.catalogItem.absolute_url || item.catalogItem.href || "";
  const open = item.status === "failed" ? " open" : "";

  return `<details class="catalog-card ${escapeAttribute(item.status)}"${open}>
    <summary>
      <div class="catalog-card-title">
        <div class="chips">
          <span class="pill ${statusTone}">${escapeHtml(statusLabel)}</span>
          <span class="pill info">${escapeHtml(itemType)}</span>
          ${itemId ? `<span class="pill info">${escapeHtml(itemId)}</span>` : ""}
        </div>
        <h3>${escapeHtml(title)}</h3>
        <div class="catalog-card-meta">
          <span>${escapeHtml(item.sections.join(", "))}</span>
          <span>${escapeHtml(item.counts.total)} check${item.counts.total === 1 ? "" : "s"}</span>
        </div>
      </div>
    </summary>
    <div class="catalog-card-body">
      ${
        item.issues.length > 0
          ? issueListHtml(item.issues)
          : `<p class="muted">No issues were found for this workshop card in this run.</p>`
      }
      <div class="catalog-checks">
        ${item.tests.map(catalogCheckHtml).join("\n")}
      </div>
      ${url ? `<a class="link-button" href="${escapeAttribute(url)}">Open workshop</a>` : ""}
    </div>
  </details>`;
}

function catalogCheckHtml(test) {
  const statusTone = test.status === test.expectedStatus ? "pass" : "fail";
  const statusLabel = test.status === test.expectedStatus ? "Passed" : "Failed";

  return `<div class="catalog-check">
    <strong>${escapeHtml(test.section)}</strong>
    <span><span class="${statusTone}">${escapeHtml(statusLabel)}</span> in ${formatDuration(test.durationMs)}</span>
    ${test.finalTitle ? `<span>Ended at: ${escapeHtml(test.finalTitle)}</span>` : ""}
  </div>`;
}

function catalogItemDisplayTitle(item) {
  if (!item) {
    return "Catalog item";
  }

  return item.title || item.slug || item.id || "Catalog item";
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

function issuesForTest(test) {
  if (Array.isArray(test.issues) && test.issues.length > 0) {
    return test.issues;
  }

  if (test.classification.code === "PASSED" || test.classification.code === "SKIPPED") {
    return [];
  }

  const definition = issueTypeDefinition(test.classification.code);
  return [
    {
      code: test.classification.code,
      label: test.classification.label || definition.label,
      severity: issueSeverityFromCode(test.classification.code),
      message: failureExplanation(test),
      details: test.errors?.[0] ? { error: singleLine(test.errors[0]) } : undefined,
    },
  ];
}

function issueSeverityFromCode(code) {
  if (/^ROUTING_|TIMEOUT$/i.test(code)) {
    return "blocker";
  }

  return "major";
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
  const structuredIssues = Array.isArray(failure.issues) ? failure.issues : [];

  if (structuredIssues.length > 1) {
    return `The workshop route opened, and the test found ${structuredIssues.length} separate issues on this page. Review each issue block below; they belong to the same workshop card.`;
  }

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
        ? `The test failed after the browser reached ${finalTitle}. Use the screenshot and trace for the exact page state.`
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
    .filter((attachment) => /screenshot|trace/i.test(attachment.name))
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
            <p>DOM snapshot means the saved HTML of the page at the failure moment. It is mainly for developers when screenshot or trace is not enough.</p>
            <div class="artifact-links">${advanced.join(" ")}</div>
          </details>`
        : ""
    }
  </div>`;
}

function artifactLinksHtml(attachments, context = {}) {
  const links = attachments
    .filter((attachment) => attachment.path)
    .filter((attachment) => /screenshot|trace|error-context|dom-snapshot|page-state|catalog-item/i.test(attachment.name))
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

function escapeScriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function escapeScriptString(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
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
