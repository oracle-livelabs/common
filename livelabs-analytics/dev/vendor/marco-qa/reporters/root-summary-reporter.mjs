import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildParAuditSummary,
  parLinkGuidance,
  parScanErrorExplanation,
  parLinksPageHtml,
  parRetestListPageHtml,
  readParAudits,
  sanitizeSensitiveText,
  writeParAuditDataFiles,
} from "./par-link-report.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_REPORTS_ROOT = path.join(PROJECT_ROOT, "reports");
export const REGRESSION_REPORT_RENDERER_VERSION = "regression-table-v23";
const REVIEW_STORAGE_KEY = "livelabs-qa-review-lists:v1";
const PAR_RESOLVER_SOURCE_HOSTS = new Set([
  "livelabs.oracle.com",
  "oracle-livelabs.github.io",
]);
const RETEST_LIST_INSTRUCTIONS =
  "Rerun only the tests in the provided Retest List. Use the normal project test execution flow. Do not run the full suite unless required by the existing test runner. After execution, produce the standard test report and clearly show pass/fail status for each selected test.";
function sanitizeReportText(value) {
  let text = String(value || "");
  const projectRootVariants = new Set([
    PROJECT_ROOT,
    PROJECT_ROOT.replace(/\\/g, "/"),
    JSON.stringify(PROJECT_ROOT).slice(1, -1),
  ]);

  for (const root of projectRootVariants) {
    if (root) {
      text = text.split(root).join("<qa-automation>");
    }
  }

  return sanitizeSensitiveText(text);
}
const ISSUE_TYPE_DEFINITIONS = [
  { code: "LINK_CHECK_INCOMPLETE", label: "Some links could not be verified", description: "Authentication, rate limiting, or a network problem blocked verification. These are not confirmed broken links.", audience: "internal" },
  { code: "SOURCE_SCAN_INCOMPLETE", label: "Manifest issue (section not loading)", description: "One or more instruction source pages or manifest entries could not be read.", priority: "P1", audience: "external" },
  {
    code: "WORKSHOP_NOT_AVAILABLE",
    label: "Workshop not available",
    description: "The catalog item could not be opened or LiveLabs reported that its published route is unavailable.",
    audience: "internal",
  },
  {
    code: "AUTHENTICATION_REQUIRED",
    label: "QA sign-in required - not tested",
    description: "The QA browser reached Oracle Sign In before it could inspect the item. This is a QA session problem, not a workshop defect.",
    audience: "internal",
  },
  {
    code: "BROKEN_VISIBLE_IMAGE",
    label: "Broken visible image",
    description: "An image visible to the user did not load correctly.",
    priority: "P1",
    audience: "external",
  },
  {
    code: "OVERVIEW_STRUCTURE",
    label: "Overview structure",
    description: "The workshop overview route opened, but expected page controls or sections were missing.",
    audience: "internal",
  },
  {
    code: "BROKEN_VISIBLE_LINK",
    label: "Broken visible link",
    description: "A visible link appears broken, unreachable, or returns an error.",
    priority: "P1",
    audience: "external",
  },
  {
    code: "BROKEN_EMBEDDED_CONTENT",
    label: "Broken embedded content",
    description: "Embedded content such as an iframe or media block did not render correctly.",
    audience: "internal",
  },
  {
    code: "CONTENT_TEXT_DEFECT",
    label: "Content text defect",
    description: "The page appears to contain placeholder text, template text, TODOs, or obvious text defects.",
    priority: "P2",
    audience: "external",
  },
  {
    code: "MARKDOWN_FORMATTING",
    label: "Markdown formatting",
    description: "Markdown markers, links, headings, or code fences are formatted incorrectly in the workshop source.",
    priority: "P2",
    audience: "external",
  },
  {
    code: "WRITING_GRAMMAR",
    label: "Grammar or punctuation",
    description: "The workshop source contains a likely repeated word or punctuation-spacing error.",
    priority: "P2",
    audience: "external",
  },
  {
    code: "POSSIBLE_TYPO",
    label: "Possible typo",
    description: "A prose word in the workshop source may be misspelled and has a suggested correction.",
    priority: "P2",
    audience: "external",
  },
  {
    code: "CONTENT_RELEVANCE",
    label: "Wrong or unrelated instructions content",
    description: "The instructions page opened, but it appears blank, outdated, or connected to a different workshop.",
    audience: "internal",
  },
  {
    code: "INSTRUCTIONS_FLOW",
    label: "Full instructions not loading",
    description: "Preview or tenancy instructions did not open, render, or pass the content checks.",
    priority: "P1",
    audience: "external",
  },
  {
    code: "ASSET_ACTION_FAILED",
    label: "Asset action failed",
    description: "A LiveStack demo, asset, download, or resource action did not work as expected.",
    audience: "internal",
  },
  {
    code: "STALE_PAR_LINK",
    label: "Stale PAR link",
    description: "OCI Object Storage confirmed that a PAR link is no longer usable.",
    priority: "P1",
    audience: "external",
  },
  {
    code: "PAR_LINK_UNVERIFIED",
    label: "PAR link unverified",
    description: "The PAR check still timed out or received a temporary response after retries.",
    audience: "internal",
  },
  {
    code: "PAR_SCAN_INCOMPLETE",
    label: "PAR scan incomplete",
    description: "A workshop, LiveStack, resource, or instructions page could not be scanned for PAR links.",
    audience: "internal",
  },
  {
    code: "PAGE_TIMED_OUT",
    label: "Page timed out",
    description: "The page did not finish loading or reach the expected state before the QA time limit.",
    audience: "internal",
  },
  {
    code: "UNEXPECTED_DESTINATION",
    label: "Opened the wrong page",
    description: "The action opened a page, but it was not the LiveLabs page the check expected.",
    audience: "internal",
  },
  {
    code: "QA_SETUP_FAILED",
    label: "QA setup failed",
    description: "The browser, saved sign-in state, or test fixture failed before the LiveLabs content could be checked.",
    audience: "internal",
  },
  {
    code: "QA_CHECK_FAILED",
    label: "QA check did not complete",
    description: "The automated check stopped without enough evidence to report a workshop defect. Rerun it before changing content.",
    audience: "internal",
  },
];

const PRIORITY_DEFINITIONS = [
  { code: "P1", label: "Learner blockers", description: "A link, image, PAR resource, or instruction section is unusable." },
  { code: "P2", label: "Content review", description: "Content, formatting, grammar, or spelling needs author review." },
];

export default class RootSummaryReporter {
  constructor(options = {}) {
    this.reportsRoot = path.resolve(process.env.QA_ROOT_REPORTS_DIR || options.reportsRoot || DEFAULT_REPORTS_ROOT);
    this.landingPage = reportLandingPage(process.env.QA_REPORT_LANDING_PAGE || options.landingPage);
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
    const authorContacts = readCatalogAuthors(attachments);
    const authorEmails = authorContacts.emails;
    const authorNames = authorContacts.names;
    const parAudits = readParAudits(attachments);
    const issues = readQaIssues(attachments);
    const runContext = readRunContext(attachments);
    const failurePageState = readFailurePageState(attachments);
    const errors = result.errors.map((error) => sanitizeReportText(error.message || String(error)));
    const steps = normalizeSteps(result.steps || []);
    const failedStep = firstReportableFailedStep(steps);
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
      testId: test.id,
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
      linkCoverage: annotations["link-coverage"] || "",
      catalogItem,
      authorEmails,
      authorNames,
      parAudits,
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
    const summary = this.summary(result, endedAt, runId);

    fs.mkdirSync(runDir, { recursive: true });

    writeSummaryFiles(runDir, summary, this.reportsRoot);
    if (summary.counts.total > 0) {
      replaceLatestReportWithRun(this.reportsRoot, runDir);
      writeReportHistory(this.reportsRoot, this.landingPage);
    }
  }

  summary(result, endedAt, runId) {
    const finalResults = Array.from(this.results.reduce((latest, test) => {
      const key = test.testId || JSON.stringify([test.projectName, test.file, test.line, test.titlePath, test.title]);
      const previous = latest.get(key);
      if (!previous || (test.retry || 0) >= (previous.retry || 0)) latest.set(key, test);
      return latest;
    }, new Map()).values());
    const counts = {
      passed: 0,
      failed: 0,
      skipped: 0,
      timedOut: 0,
      interrupted: 0,
      flaky: 0,
      unexpected: 0,
      total: finalResults.length,
    };
    const sections = new Map();
    const failureCategories = new Map();
    const failures = [];
    const catalogItems = new Map();

    for (const test of finalResults) {
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
          authorEmails: new Set(),
          authorNames: new Set(),
        };

        catalogEntry.sections.add(test.section);
        for (const email of test.authorEmails || []) catalogEntry.authorEmails.add(email);
        for (const name of test.authorNames || []) catalogEntry.authorNames.add(name);
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
          retry: test.retry,
          linkCoverage: test.linkCoverage,
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
      attemptId: String(process.env.QA_RUN_ATTEMPT_ID || ""),
      scope: { label: process.env.QA_RETEST_SELECTION ? "Selected-item retest" : process.env.QA_RUN_SCOPE || "Scope not recorded" },
      reportChannel: reportChannelFromRoot(this.reportsRoot),
      runType: process.env.QA_RETEST_SELECTION ? "retest" : this.landingPage === "par-links.html" ? "par" : "regression",
      status: result.status,
      completion: {
        state:
          result.status === "interrupted" ||
          result.status === "timedout" ||
          counts.interrupted > 0 ||
          counts.timedOut > 0 ||
          counts.total < this.totalTests
            ? "incomplete"
            : "completed",
      },
      startedAt: this.startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: endedAt.getTime() - this.startedAt.getTime(),
      configuredTests: this.totalTests,
      counts,
      failureCategories: Array.from(failureCategories.entries())
        .map(([code, count]) => ({ code, count, label: classificationLabel(code) }))
        .sort(
          (left, right) =>
            issuePriorityRank(left) - issuePriorityRank(right) ||
            right.count - left.count ||
            left.code.localeCompare(right.code),
        ),
      failures,
      catalogItems: Array.from(catalogItems.values())
        .map((item) => ({
          ...item,
          sections: Array.from(item.sections).sort(),
          authorEmails: Array.from(item.authorEmails).sort(),
          authorNames: Array.from(item.authorNames).sort(),
          status: catalogEntryStatus(item),
          issueCount: item.issues.length,
        }))
        .sort(
          (left, right) =>
            catalogStatusRank(left.status) - catalogStatusRank(right.status) ||
            itemPriorityRank(left) - itemPriorityRank(right) ||
            String(left.catalogItem.title || "").localeCompare(String(right.catalogItem.title || "")),
        ),
      parAudit: buildParAuditSummary(finalResults),
      sections: Array.from(sections.values()).sort((left, right) => left.name.localeCompare(right.name)),
    };
  }
}

function reportChannelFromRoot(reportsRoot) {
  const channel = path.basename(reportsRoot).toLowerCase();
  return ["par", "regression", "retest"].includes(channel) ? channel : "local";
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

const MANUAL_LANGUAGE_REVIEW_CODES = new Set(["MARKDOWN_FORMATTING", "WRITING_GRAMMAR", "POSSIBLE_TYPO"]);

function operatorState(item) {
  const issues = item.issues || [];
  if (issues.some((issue) => issueAudience(issue) === "external" && !MANUAL_LANGUAGE_REVIEW_CODES.has(canonicalIssueCode(issue.code)))) return "failed";
  if (issues.some((issue) => MANUAL_LANGUAGE_REVIEW_CODES.has(canonicalIssueCode(issue.code)))) return "review";
  if (issues.some((issue) => issueAudience(issue) === "internal")) return "internal";
  if (issues.length || item.status === "skipped") return "unchecked";
  return item.status === "failed" ? "unchecked" : "passed";
}

const OPERATOR_STATES = {
  failed: "Issues found",
  review: "Manual language review",
  internal: "Internal QA review",
  unchecked: "Could not check",
  passed: "Passed",
};

function catalogStatusRank(status) {
  if (status === "failed") return 0;
  if (status === "skipped") return 1;
  return 2;
}

function normalizeAttachment(attachment) {
  const bodyText = attachment.body ? sanitizeReportText(attachment.body.toString("utf-8")) : "";

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
  const rawCode = typeof issue.code === "string" && issue.code.trim() ? issue.code.trim() : "QA_CHECK_FAILED";
  const code = canonicalIssueCode(rawCode);
  const definition = issueTypeDefinition(code);
  const label =
    rawCode === code && typeof issue.label === "string" && issue.label.trim() ? issue.label.trim() : definition.label;
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
    const errorMessage = sanitizeReportText(step.error?.message || "");
    const status = errorMessage || failedChild ? "failed" : "passed";

    return {
      title: sanitizeReportText(step.title || "Unnamed step"),
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

function firstReportableFailedStep(steps, parentTitles = []) {
  for (const step of steps) {
    const pathTitles = [...parentTitles, step.title];
    const childFailure = firstReportableFailedStep(step.steps || [], pathTitles);
    if (childFailure) return childFailure;

    if (step.status === "failed" && !isOptionalCookieBannerStep(step)) {
      return { ...step, path: pathTitles };
    }
  }

  return undefined;
}

function isOptionalCookieBannerStep(step) {
  const text = `${step.title || ""}\n${step.error || ""}`;
  return /(?:Decline all|Accept all)/i.test(text) && /(?:toBeVisible|getByRole)/i.test(text);
}

function matchLineValue(value, label) {
  const match = value.match(new RegExp(`^${escapeRegex(label)}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || "";
}

export function classifyResult({ status, expectedStatus, errors, finalUrl, titlePath, file, issues = [] }) {
  if (status === "skipped") {
    return { code: "SKIPPED", label: "Skipped", severity: "info" };
  }

  if (status === expectedStatus) {
    return { code: "PASSED", label: "Passed", severity: "pass" };
  }

  const primaryIssue = issues.find((issue) => issue.severity === "blocker") || issues[0];
  const primaryCode = canonicalIssueCode(primaryIssue?.code || "");
  if (primaryIssue && primaryCode !== "QA_CHECK_FAILED") {
    return {
      code: primaryCode,
      label: classificationLabel(primaryCode),
      severity: primaryIssue.severity === "blocker" ? "fail" : "warn",
    };
  }

  const text = `${errors.join("\n")}\n${finalUrl}\n${titlePath.join(" ")}\n${file}`;

  if (/signon\.oracle\.com\/signin|\.identity\.oraclecloud\.com\/|Sign in to Oracle|Welcome to My Login Profile|my_profile_security/i.test(text)) {
    return { code: "AUTHENTICATION_REQUIRED", label: "QA sign-in required - not tested", severity: "warn" };
  }
  if (/p1_invalid_workshop_id/i.test(text)) {
    return { code: "WORKSHOP_NOT_AVAILABLE", label: "Workshop not available", severity: "fail" };
  }
  if (/Could not open indexed catalog item|page\.waitForURL|Navigation failed/i.test(text)) {
    return { code: "WORKSHOP_NOT_AVAILABLE", label: "Workshop not available", severity: "fail" };
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
  if (/MARKDOWN_FORMATTING|Markdown formatting/i.test(text)) {
    return { code: "MARKDOWN_FORMATTING", label: "Markdown formatting", severity: "warn" };
  }
  if (/WRITING_GRAMMAR|Grammar or punctuation/i.test(text)) {
    return { code: "WRITING_GRAMMAR", label: "Grammar or punctuation", severity: "warn" };
  }
  if (/POSSIBLE_TYPO|Possible typo/i.test(text)) {
    return { code: "POSSIBLE_TYPO", label: "Possible typo", severity: "warn" };
  }
  if (/should stay relevant/i.test(text)) {
    return { code: "CONTENT_RELEVANCE", label: "Wrong or unrelated instructions content", severity: "fail" };
  }
  if (/Instructions content did not render|LiveLabs migration notice|preview instructions|Run on your tenancy/i.test(text)) {
    return { code: "INSTRUCTIONS_FLOW", label: "Instructions flow", severity: "fail" };
  }
  if (/asset action|download|popup/i.test(text)) {
    return { code: "ASSET_ACTION_FAILED", label: "Asset action failed", severity: "fail" };
  }
  if (/Target page, context or browser has been closed|browserType\.launch|Executable doesn['’]?t exist|storage state|fixture setup|beforeAll hook/i.test(text)) {
    return { code: "QA_SETUP_FAILED", label: "QA setup failed", severity: "warn" };
  }
  if (/Timeout|timed out/i.test(text)) {
    return { code: "PAGE_TIMED_OUT", label: "Page timed out", severity: "warn" };
  }
  if (/unexpected (?:url|destination|page)|wrong (?:url|destination|page)|did not reach the expected/i.test(text)) {
    return { code: "UNEXPECTED_DESTINATION", label: "Opened the wrong page", severity: "fail" };
  }

  if (primaryIssue) {
    return {
      code: primaryCode || "QA_CHECK_FAILED",
      label: classificationLabel(primaryCode || "QA_CHECK_FAILED"),
      severity: primaryIssue.severity === "blocker" ? "fail" : "warn",
    };
  }

  return { code: "QA_CHECK_FAILED", label: "QA check did not complete", severity: "warn" };
}

function classificationLabel(code) {
  const canonicalCode = canonicalIssueCode(code);
  return issueTypeDefinition(canonicalCode).label || canonicalCode;
}

function canonicalIssueCode(code) {
  if (code === "ROUTING_INVALID_WORKSHOP_ID" || code === "ROUTING_FAILED") return "WORKSHOP_NOT_AVAILABLE";
  if (code === "UNCLASSIFIED_FAILURE") return "QA_CHECK_FAILED";
  if (code === "TIMEOUT") return "PAGE_TIMED_OUT";
  return code;
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

export function writeSummaryFiles(outputDir, summary, reportsRoot) {
  const historyHref = summary.previewMode ? "/regression/" : reportHistoryHref(reportsRoot);
  const pageContext = {
    outputDir,
    historyHref,
    isLatest: path.basename(outputDir).toLowerCase() === "latest",
  };

  fs.writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf-8");
  fs.writeFileSync(path.join(outputDir, "results.csv"), resultsCsv(summary), "utf-8");
  fs.writeFileSync(path.join(outputDir, "finding-results.csv"), findingResultsCsv(summary), "utf-8");
  fs.writeFileSync(path.join(outputDir, "catalog-results.json"), resultsJson(summary), "utf-8");
  fs.writeFileSync(path.join(outputDir, "summary.md"), markdownSummary(summary), "utf-8");
  const withClient = (html) => html.replace("</head>", '<link rel="stylesheet" href="hub-ui.css"></head>').replace("</body>", '<script src="hub-client.js"></script></body>');
  fs.copyFileSync(new URL("../hub-ui.css", import.meta.url), path.join(outputDir, "hub-ui.css"));
  fs.copyFileSync(new URL("../hub-client.js", import.meta.url), path.join(outputDir, "hub-client.js"));
  fs.writeFileSync(path.join(outputDir, "summary.html"), withClient(htmlSummary(summary, pageContext)), "utf-8");
  fs.writeFileSync(path.join(outputDir, "retest-list.html"), withClient(reviewListPageHtml(summary, pageContext).replace('<body>', '<body class="retest-page">')), "utf-8");
  fs.rmSync(path.join(outputDir, "fix-list.html"), { force: true });
  writeParAuditDataFiles(outputDir, summary.parAudit);
}

export function replaceLatestReportWithRun(reportsRoot, runDir) {
  const channelRoot = path.resolve(reportsRoot);
  const latestDir = path.join(channelRoot, "latest");
  const resolvedRunDir = path.resolve(runDir);
  const runsRoot = `${path.join(channelRoot, "runs")}${path.sep}`;
  if (!resolvedRunDir.startsWith(runsRoot)) {
    throw new Error(`Latest report target must be inside ${runsRoot}`);
  }

  const suffix = `${process.pid}-${Date.now()}`;
  const nextLink = path.join(channelRoot, `.latest-next-${suffix}`);
  const backupPath = path.join(channelRoot, `.latest-previous-${suffix}`);
  fs.rmSync(nextLink, { recursive: true, force: true });
  fs.rmSync(backupPath, { recursive: true, force: true });

  const target = process.platform === "win32"
    ? resolvedRunDir
    : path.relative(channelRoot, resolvedRunDir);
  fs.symlinkSync(target, nextLink, process.platform === "win32" ? "junction" : "dir");

  let movedExisting = false;
  try {
    if (pathExists(latestDir)) {
      fs.renameSync(latestDir, backupPath);
      movedExisting = true;
    }
    fs.renameSync(nextLink, latestDir);
    if (movedExisting) fs.rmSync(backupPath, { recursive: true, force: true });
  } catch (error) {
    fs.rmSync(nextLink, { recursive: true, force: true });
    if (movedExisting && !pathExists(latestDir) && pathExists(backupPath)) {
      fs.renameSync(backupPath, latestDir);
    }
    throw error;
  }
}

function pathExists(candidate) {
  try {
    fs.lstatSync(candidate);
    return true;
  } catch {
    return false;
  }
}

function sectionFromFile(file) {
  if (file.includes("/generated/")) {
    if (file.includes("parLinks")) return "Generated PAR Links";
    if (file.includes("catalogIndex")) return "Generated Catalog Index";
    if (file.includes("sourceQuality")) return "Workshop Source Quality";
    if (file.includes("livestackResources")) return "Generated LiveStack Resources";
    if (file.includes("livestackOverview")) return "Generated LiveStack Overview";
    if (file.includes("sprintEventPages")) return "Generated Sprint and Event Page";
    if (file.includes("previewInstructions")) return "Generated Preview Instructions";
    if (file.includes("tenancyInstructions")) return "Generated Tenancy Instructions";
    if (file.includes("workshopOverview")) return "Generated Workshop Overview";
    return "Generated Catalog";
  }

  if (file.includes("/par/")) return "Catalog PAR Links";
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

export function resultsCsv(summary) {
  const header = [
    "run_id",
    "started_at",
    "item_type",
    "livelabs_id",
    "item_title",
    "item_status",
    "issue_category_count",
    "finding_count",
    "priorities_found",
    "has_p1",
    "has_p2",
    "issue_categories",
    "issue_codes",
    "catalog_url",
  ];
  const rows = [];

  for (const item of summary.catalogItems || []) {
    const catalogItem = item.catalogItem || {};
    const issues = item.issues || [];
    const priorities = itemPriorities(item);
    const labels = Array.from(new Set(issues.map((issue) => classificationLabel(issue.code)).filter(Boolean)));
    const codes = Array.from(new Set(issues.map((issue) => issue.code).filter(Boolean)));
    const catalogUrl = sanitizeReportText(
      catalogItem.absolute_url || catalogItem.normalized_href || catalogItem.href || "",
    );

    rows.push([
      summary.runId || "",
      summary.startedAt || "",
      catalogItem.type || "item",
      catalogItem.id || catalogItem.slug || "",
      catalogItem.title || catalogItem.slug || catalogItem.id || "",
      item.status || "",
      issues.length,
      issueFindingCount(issues),
      priorities.join("; "),
      priorities.includes("P1") ? "yes" : "",
      priorities.includes("P2") ? "yes" : "",
      labels.join("; "),
      codes.join("; "),
      catalogUrl,
    ]);
  }

  if (rows.length === 0) {
    for (const section of summary.sections || []) {
      for (const test of section.tests || []) {
        const unexpected = test.status !== test.expectedStatus && test.status !== "skipped";
        const code = unexpected ? canonicalIssueCode(test.classification?.code || "QA_CHECK_FAILED") : "";
        const priority = unexpected ? issuePriority({ code }) : "";
        rows.push([
          summary.runId || "",
          summary.startedAt || "",
          "test",
          "",
          test.title || "",
          unexpected ? "failed" : test.status || "",
          unexpected ? 1 : 0,
          unexpected ? 1 : 0,
          priority,
          priority === "P1" ? "yes" : "",
          priority === "P2" ? "yes" : "",
          unexpected ? test.classification?.label || "Test failure" : "",
          code,
          "",
        ]);
      }
    }
  }

  return [header, ...rows].map((row) => row.map(summaryCsvCell).join(",")).join("\n") + "\n";
}

export function resultsJson(summary) {
  const items = reportCatalogItems(summary.catalogItems || []);
  const payload = {
    schemaVersion: 2,
    run: {
      id: summary.runId || "",
      type: summary.runType || summary.reportChannel || "regression",
      status: summary.status || "",
      scope: sanitizeJsonValue(summary.scope || {}),
      completion: sanitizeJsonValue(summary.completion || {}),
      startedAt: summary.startedAt || "",
      endedAt: summary.endedAt || "",
      durationMs: summary.durationMs || 0,
      configuredTests: summary.configuredTests || 0,
      counts: sanitizeJsonValue(summary.counts || {}),
      failureCategories: sanitizeJsonValue(canonicalFailureCategories(summary.failureCategories || [])),
      catalogItemCount: items.length,
    },
    items: items.map((item) => {
      const catalogItem = item.catalogItem || {};
      const issues = item.issues || [];
      const tests = item.tests || [];
      return {
        key: item.key || `${catalogItem.type || "item"}:${catalogItem.id || catalogItem.slug || ""}`,
        type: catalogItem.type || "item",
        livelabsId: catalogItem.id || catalogItem.slug || "",
        title: catalogItem.title || catalogItem.slug || catalogItem.id || "",
        status: item.status || "",
        completionState: item.completionState || "",
        catalogUrl: sanitizeReportText(
          catalogItem.absolute_url || catalogItem.normalized_href || catalogItem.href || "",
        ),
        catalog: sanitizeJsonValue(catalogItem),
        counts: sanitizeJsonValue(item.counts || {}),
        sections: sanitizeJsonValue(item.sections || []),
        authorNames: sanitizeJsonValue(item.authorNames || []),
        authorEmails: sanitizeJsonValue(item.authorEmails || []),
        priorities: itemPriorities(item),
        tags: Array.from(new Set(issues.flatMap((issue) => [issueAudience(issue), issuePriority(issue)].filter(Boolean)))),
        issueCategoryCount: issues.length,
        findingCount: issueFindingCount(issues),
        issues: issues.map((issue) => issueJsonRecord(issue, item)),
        checks: tests.map((test) => sanitizeJsonValue(test)),
        evidence: (summary.failures || [])
          .filter((failure) => failure.catalogItem && (item.keys || [item.key]).includes(catalogItemKey(failure.catalogItem)))
          .map((failure) => sanitizeJsonValue({
            title: failure.title,
            titlePath: failure.titlePath,
            section: failure.section,
            file: failure.file,
            line: failure.line,
            finalUrl: failure.finalUrl,
            finalTitle: failure.finalTitle,
            classification: failure.classification,
            errors: failure.errors,
            failedStep: failure.failedStep,
            steps: failure.steps,
            bugSummary: failure.bugSummary,
            attachments: (failure.attachments || []).map((attachment) => ({
              name: attachment.name,
              contentType: attachment.contentType,
              path: attachment.path,
            })),
          })),
      };
    }),
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}

function issueJsonRecord(issue, item) {
  const details = operatorIssueDetails(issue);
  const affectedItems = details
    .map((detail, index) => operatorIssueDetail(detail, index, item, issue))
    .filter(Boolean)
    .sort((left, right) => affectedItemOrder(left, right, issue));
  return sanitizeJsonValue({
    ...issue,
    label: classificationLabel(issue.code),
    audience: issueAudience(issue),
    priority: issuePriority(issue) || null,
    tags: [issueAudience(issue), issuePriority(issue)].filter(Boolean),
    findingCount: issueFindingCount([issue]),
    problem: operatorIssueProblem(issue, item),
    reproduction: operatorIssueReproduction(issue, item),
    action: operatorIssueAction(issue, item),
    location: issueLocationForItem(issue, item),
    affectedItems,
    ...(issue.code === "STALE_PAR_LINK" || issue.code === "PAR_LINK_UNVERIFIED"
      ? { parGuidance: details.map(parLinkGuidance) }
      : {}),
  });
}

function sanitizeJsonValue(value, key = "") {
  if (value == null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (/^(?:cookie|set-cookie|authorization|proxy-authorization|x-api-key|x-auth-token|token|access_token|p_instance|session)$/i.test(key)) {
      return value ? "***" : "";
    }
    return sanitizeReportText(value);
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeJsonValue(item));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, sanitizeJsonValue(childValue, childKey)]),
    );
  }
  return sanitizeReportText(String(value));
}

function findingResultsCsv(summary) {
  const header = [
    "run_id",
    "started_at",
    "item_type",
    "item_id",
    "item_title",
    "item_status",
    "item_priority",
    "issue_count",
    "issue_code",
    "issue_label",
    "severity",
    "issue_summary",
    "catalog_url",
    "final_url",
    "test_section",
    "test_file",
    "test_line",
  ];
  const rows = [];

  for (const item of summary.catalogItems || []) {
    const catalogItem = item.catalogItem || {};
    const issues = item.issues || [];
    const base = [
      summary.runId || "",
      summary.startedAt || "",
      catalogItem.type || "item",
      catalogItem.id || catalogItem.slug || "",
      catalogItem.title || catalogItem.slug || catalogItem.id || "",
      item.status || "",
      itemPriority(item),
      issues.length,
    ];
    const catalogUrl = sanitizeReportText(
      catalogItem.absolute_url || catalogItem.normalized_href || catalogItem.href || "",
    );

    if (issues.length === 0) {
      const test = item.tests?.[0] || {};
      rows.push([
        ...base,
        "",
        "",
        "",
        "",
        catalogUrl,
        sanitizeReportText(test.finalUrl || ""),
        test.section || "",
        test.file || "",
        test.line || "",
      ]);
      continue;
    }

    for (const issue of issues) {
      const test =
        item.tests?.find((candidate) => candidate.file === issue.file && candidate.section === issue.section) ||
        item.tests?.find((candidate) => candidate.section === issue.section) ||
        item.tests?.[0] ||
        {};
      rows.push([
        ...base,
        issue.code || "",
        classificationLabel(issue.code),
        issue.severity || "",
        sanitizeReportText(issue.message || issue.summary || ""),
        catalogUrl,
        sanitizeReportText(test.finalUrl || ""),
        issue.section || test.section || "",
        issue.file || test.file || "",
        issue.line || test.line || "",
      ]);
    }
  }

  if (rows.length === 0) {
    for (const section of summary.sections || []) {
      for (const test of section.tests || []) {
        const unexpected = test.status !== test.expectedStatus && test.status !== "skipped";
        rows.push([
          summary.runId || "",
          summary.startedAt || "",
          "test",
          "",
          test.title || "",
          unexpected ? "failed" : test.status || "",
          unexpected ? issuePriority({ code: test.classification?.code || "QA_CHECK_FAILED" }) : "",
          unexpected ? 1 : 0,
          unexpected ? canonicalIssueCode(test.classification?.code || "QA_CHECK_FAILED") : "",
          unexpected ? test.classification?.label || "Test failure" : "",
          unexpected ? issueSeverityFromCode(test.classification?.code || "QA_CHECK_FAILED") : "",
          unexpected ? sanitizeReportText(test.errors?.[0] || "") : "",
          "",
          sanitizeReportText(test.finalUrl || ""),
          section.name || test.section || "",
          test.file || "",
          test.line || "",
        ]);
      }
    }
  }

  return [header, ...rows].map((row) => row.map(summaryCsvCell).join(",")).join("\n") + "\n";
}

function summaryCsvCell(value) {
  const text = sanitizeReportText(value == null ? "" : String(value));
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
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
  const catalogItems = reportCatalogItems(summary.catalogItems || []);
  const failureCategories = canonicalFailureCategories(summary.failureCategories || []).filter(
    (category) => category.code !== "CONTENT_RELEVANCE",
  );
  const failures = (summary.failures || []).filter((failure) => failure.classification?.code !== "CONTENT_RELEVANCE");
  const reviewItems = buildReviewEntries(catalogItems, summary.runId);
  const operatorCounts = Object.fromEntries(
    Object.keys(OPERATOR_STATES).map((state) => [state, catalogItems.filter((item) => operatorState(item) === state).length]),
  );
  const priorityItemCounts = Object.fromEntries(
    PRIORITY_DEFINITIONS.map((priority) => [
      priority.code,
      catalogItems.filter((item) => itemPriorities(item).includes(priority.code)).length,
    ]),
  );
  const testedItems =
    catalogItems.length > 0
      ? testedItemsHtml(catalogItems, failureCategories, summary.runId, failures, context)
      : emptyStateHtml("No generated catalog items were attached to this run.");
  const statusTone = runStatusTone(summary);
  const statusLabel = runStatusLabel(summary);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="livelabs-qa-renderer" content="${REGRESSION_REPORT_RENDERER_VERSION}" />
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
    .preview-notice {
      background: var(--info-bg);
      border: 1px solid #7dd3fc;
      border-left: 4px solid var(--info);
      border-radius: 6px;
      color: #0c4a6e;
      margin-bottom: 18px;
      padding: 12px 14px;
    }
    .preview-notice strong { display: block; margin-bottom: 3px; }
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
      margin-bottom: 12px;
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
    .priority-overview {
      align-items: center;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      display: grid;
      gap: 12px;
      grid-template-columns: minmax(220px, 1fr) repeat(2, minmax(120px, .45fr));
      margin-bottom: 20px;
      padding: 12px 14px;
    }
    .priority-overview > div:first-child strong,
    .priority-overview > div:first-child span { display: block; }
    .priority-overview > div:first-child span { color: var(--muted); font-size: 13px; margin-top: 3px; }
    .priority-count { border-left: 3px solid var(--line-strong); padding: 4px 10px; }
    .priority-count strong { display: block; font-size: 22px; }
    .priority-count span { color: var(--muted); font-size: 13px; }
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
    .results-panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      margin-bottom: 18px;
      overflow: visible;
    }
    .results-heading {
      align-items: flex-start;
      border-bottom: 1px solid var(--line);
      display: flex;
      gap: 18px;
      justify-content: space-between;
      padding: 18px;
    }
    .results-heading p {
      color: var(--muted);
      margin-top: 5px;
    }
    .download-menu {
      flex: 0 0 auto;
      margin: 0;
      position: relative;
    }
    .download-menu > summary {
      background: #ffffff;
      border: 1px solid var(--line-strong);
      color: var(--link);
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
      list-style: none;
      min-height: 38px;
      padding: 9px 12px;
    }
    .download-menu > summary::-webkit-details-marker { display: none; }
    .download-menu > summary::after { content: " v"; }
    .download-menu[open] > summary::after { content: " ^"; }
    .download-menu > div {
      background: #ffffff;
      border: 1px solid var(--line);
      box-shadow: 0 8px 24px rgba(23, 33, 43, .14);
      margin-top: 5px;
      padding: 8px;
      position: absolute;
      right: 0;
      width: 270px;
      z-index: 5;
    }
    .download-menu p {
      color: var(--muted);
      font-size: 12px;
      margin: 2px 5px 7px;
    }
    .download-menu a {
      color: var(--text);
      display: flex;
      gap: 12px;
      justify-content: space-between;
      padding: 8px;
      text-decoration: none;
    }
    .download-menu a:hover { background: #eef5fa; }
    .download-menu a span {
      color: var(--muted);
      font-size: 12px;
      white-space: nowrap;
    }
    .result-tools {
      align-items: end;
      background: #f8fafb;
      border-bottom: 1px solid var(--line);
      display: grid;
      gap: 14px;
      grid-template-columns: minmax(240px, 1fr) minmax(220px, .8fr) auto;
      padding: 14px 18px;
    }
    .result-search,
    .result-filter,
    .page-size {
      color: var(--muted);
      display: grid;
      font-size: 12px;
      font-weight: 700;
      gap: 5px;
    }
    .result-search input,
    .result-filter select,
    .page-size select {
      background: #ffffff;
      border: 1px solid var(--line-strong);
      color: var(--text);
      font: inherit;
      min-height: 38px;
      padding: 8px 10px;
    }
    .pagination button {
      background: #ffffff;
      border: 1px solid var(--line-strong);
      color: var(--text);
      cursor: pointer;
      font: inherit;
      font-weight: 700;
      min-height: 38px;
      padding: 7px 10px;
    }
    .priority-guide {
      background: #ffffff;
      border: 1px solid var(--line);
      border-radius: 6px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px 18px;
      margin: 0 18px 14px;
      padding: 10px 12px;
    }
    .priority-guide span {
      color: var(--muted);
      font-size: 12px;
    }
    .priority-guide strong { color: var(--text); }
    .priority-badge {
      border: 1px solid currentColor;
      border-radius: 999px;
      display: inline-flex;
      font-size: 11px;
      font-weight: 800;
      justify-content: center;
      line-height: 1;
      min-width: 30px;
      padding: 5px 7px;
    }
    .priority-badge.p1 { background: #fff0ed; color: #b42318; }
    .priority-badge.p2 { background: #fff7df; color: #8a5b00; }
    .priority-badge.p3 { background: #eef5fa; color: #075985; }
    .result-row[data-active-audience="external"] .operator-issue[data-issue-audience="internal"],
    .result-row[data-active-audience="internal"] .operator-issue[data-issue-audience="external"] { display: none; }
    .result-row[data-active-audience="internal"] .author-contacts,
    .result-row[data-active-audience="internal"] .result-actions .review-button { display: none; }
    .result-table { overflow-x: auto; }
    .result-table-head,
    .result-summary {
      align-items: center;
      display: grid;
      gap: 18px;
      grid-template-columns: 150px minmax(250px, 1.4fr) minmax(180px, 1fr) minmax(210px, 1.15fr);
      min-width: 930px;
    }
    .result-table-head {
      background: #eef2f5;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      padding: 10px 38px 10px 16px;
      text-transform: uppercase;
    }
    .result-row {
      background: #ffffff;
      border-top: 1px solid var(--line);
      margin: 0;
    }
    .result-row:first-child { border-top: 0; }
    .result-row[hidden] { display: none; }
    .result-row > summary {
      color: var(--text);
      cursor: pointer;
      list-style: none;
    }
    .result-row > summary::-webkit-details-marker { display: none; }
    .result-summary {
      padding: 13px 38px 13px 16px;
      position: relative;
    }
    .result-summary > span:first-child { min-width: 0; }
    .result-summary > span:first-child .pill { max-width: 100%; white-space: normal; }
    .result-summary::after {
      color: var(--muted);
      content: "+";
      font-size: 20px;
      font-weight: 700;
      position: absolute;
      right: 16px;
    }
    .result-row[open] > .result-summary::after { content: "-"; }
    .result-row[open] { box-shadow: inset 5px 0 0 var(--link); }
    .result-row[open] > .result-summary {
      background: #eaf4fb;
      color: #063b66;
    }
    .result-summary:hover { background: #f8fbfd; }
    .result-row[open] > .result-summary:hover { background: #eaf4fb; }
    .result-item,
    .result-checks,
    .result-finding {
      display: grid;
      gap: 4px;
      min-width: 0;
    }
    .result-item strong,
    .result-checks strong,
    .result-finding strong {
      overflow-wrap: anywhere;
    }
    .result-item small,
    .result-checks small,
    .result-finding small {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .result-details {
      background: #fbfcfd;
      border-top: 1px solid var(--line);
      display: grid;
      gap: 14px;
      padding: 18px;
    }
    .result-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .item-detail-heading {
      align-items: flex-start;
      display: flex;
      gap: 18px;
      justify-content: space-between;
    }
    .item-detail-heading h3 {
      font-size: 18px;
      margin: 0;
    }
    .item-detail-heading p {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
      margin: 4px 0 0;
    }
    .operator-issue-list {
      display: grid;
      gap: 18px;
    }
    .author-contacts {
      align-items: center;
      background: #ffffff;
      border: 1px solid var(--line);
      border-radius: 6px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px 14px;
      padding: 11px 14px;
    }
    .author-contacts strong { font-size: 13px; }
    .author-contacts a { font-size: 13px; font-weight: 700; }
    .author-contacts span { color: var(--muted); font-size: 13px; }
    .author-contacts small { color: var(--muted); font-size: 12px; }
    .operator-issue {
      background: #ffffff;
      border: 2px solid var(--line-strong);
      border-left: 5px solid var(--warn);
      border-radius: 6px;
      display: grid;
      gap: 8px;
      padding: 14px;
    }
    .operator-issue.blocker {
      background: var(--fail-bg);
      border-color: #ffd0c7;
      border-left-color: var(--fail);
    }
    .operator-issue-heading {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .operator-issue h4 {
      font-size: 17px;
      margin: 0;
    }
    .operator-issue p {
      font-size: 14px;
      line-height: 1.45;
      margin: 0;
    }
    .issue-guidance {
      background: var(--panel-soft);
      border-left: 4px solid var(--fail);
      display: grid;
      gap: 7px;
      padding: 11px 13px;
    }
    .issue-location-block {
      border-top: 1px solid var(--line);
      display: grid;
      gap: 10px;
      margin-top: 2px;
      padding-top: 12px;
    }
    .issue-location-heading,
    .issue-location-row,
    .par-entry-heading {
      align-items: flex-start;
      display: flex;
      gap: 14px;
      justify-content: space-between;
    }
    .issue-location-heading h5,
    .par-entry-heading h5 {
      font-size: 15px;
      margin: 0;
    }
    .issue-location-heading p,
    .par-entry-heading p,
    .issue-location-copy small {
      color: var(--muted);
      font-size: 12px;
      margin: 3px 0 0;
    }
    .issue-location-copy {
      display: grid;
      gap: 3px;
      min-width: 0;
    }
    .issue-location-copy span {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .issue-location-copy strong { overflow-wrap: anywhere; }
    .par-entry {
      background: #fbfcfd;
      border: 1px solid var(--line-strong);
      border-radius: 6px;
      display: grid;
      gap: 11px;
      padding: 14px;
    }
    .par-source-list {
      display: grid;
      gap: 8px;
    }
    .par-source-row {
      align-items: center;
      border-top: 1px solid var(--line);
      display: flex;
      gap: 14px;
      justify-content: space-between;
      padding-top: 9px;
    }
    .par-source-row:first-child { border-top: 0; padding-top: 0; }
    .par-source-copy {
      display: grid;
      gap: 3px;
      min-width: 0;
    }
    .par-source-copy strong,
    .par-source-copy span { overflow-wrap: anywhere; }
    .par-source-copy span { color: var(--muted); font-size: 12px; }
    .issue-technical {
      border-top: 1px solid var(--line);
      margin-top: 2px;
      padding-top: 10px;
    }
    .issue-technical > summary {
      color: var(--muted);
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
    }
    .par-technical-body {
      display: grid;
      gap: 10px;
      margin-top: 10px;
    }
    .par-link-value {
      align-items: stretch;
      display: grid;
      gap: 7px;
      grid-template-columns: minmax(0, 1fr) auto auto;
    }
    .par-link-value code {
      background: #f2f5f8;
      border: 1px solid var(--line);
      display: block;
      font-size: 12px;
      line-height: 1.45;
      min-width: 0;
      overflow-wrap: anywhere;
      padding: 9px;
      white-space: normal;
    }
    .par-metadata {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .par-metadata div {
      background: #f2f5f8;
      min-width: 0;
      padding: 9px;
    }
    .par-metadata span {
      color: var(--muted);
      display: block;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 3px;
      text-transform: uppercase;
    }
    .par-metadata strong { overflow-wrap: anywhere; }
    .par-link-message { color: var(--muted); font-size: 12px; min-height: 17px; }
    .affected-items {
      background: var(--panel-soft);
      border: 1px solid var(--line);
      border-radius: 5px;
      display: grid;
      gap: 8px;
      padding: 11px;
    }
    .affected-items > strong { font-size: 14px; }
    .affected-item-row {
      align-items: center;
      background: #ffffff;
      border: 1px solid var(--line);
      display: flex;
      gap: 10px;
      justify-content: space-between;
      padding: 9px 10px;
    }
    .affected-item-copy {
      display: grid;
      gap: 3px;
      min-width: 0;
    }
    .affected-item-copy span {
      color: var(--muted);
      font-size: 12px;
    }
    .affected-item-copy code {
      font-size: 12px;
      overflow-wrap: anywhere;
      white-space: normal;
    }
    .source-quality-row { align-items: flex-start; }
    .source-quality-copy {
      display: grid;
      gap: 10px;
      min-width: 0;
      width: 100%;
    }
    .source-quality-location {
      display: grid;
      gap: 2px;
    }
    .source-quality-location span,
    .source-quality-line {
      color: var(--muted);
      font-size: 12px;
    }
    .source-quality-edit {
      align-items: start;
      display: grid;
      gap: 7px;
      grid-template-columns: 92px minmax(0, 1fr);
    }
    .source-quality-edit > span {
      font-size: 12px;
      font-weight: 700;
      padding-top: 6px;
      text-transform: uppercase;
    }
    .source-quality-edit code {
      background: #f4f7fa;
      border: 1px solid var(--line);
      display: block;
      font-size: 12px;
      line-height: 1.45;
      overflow-wrap: anywhere;
      padding: 6px 8px;
      white-space: normal;
    }
    .source-quality-edit mark {
      background: #fff0a6;
      color: #111820;
      font-weight: 700;
      padding: 1px 2px;
    }
    .source-quality-fix {
      font-size: 13px;
      margin: 0;
    }
    .source-quality-row > .link-button {
      flex: 0 0 auto;
      min-width: 112px;
      text-align: center;
    }
    .operator-pass {
      align-items: center;
      background: var(--pass-bg);
      border: 1px solid #b7e4d2;
      border-left: 5px solid var(--pass);
      border-radius: 6px;
      display: flex;
      gap: 10px;
      padding: 13px;
    }
    .operator-pass strong { color: var(--pass); }
    .item-developer-details {
      background: #ffffff;
      border: 1px solid var(--line);
      border-radius: 6px;
      margin: 0;
      padding: 12px;
    }
    .item-developer-details > summary {
      color: var(--muted);
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
    }
    .item-developer-body {
      display: grid;
      gap: 12px;
      margin-top: 12px;
    }
    .developer-section,
    .developer-test {
      background: var(--panel-soft);
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 12px;
    }
    .developer-section h4 { margin: 0 0 10px; }
    .developer-test .section-heading { margin-bottom: 10px; }
    .developer-error span {
      font-family: Consolas, "Courier New", monospace;
      font-size: 12px;
      line-height: 1.45;
    }
    .copy-source { display: none; }
    .checks-details {
      background: #ffffff;
      border: 1px solid var(--line);
      margin: 0;
      padding: 12px;
    }
    .checks-details > summary {
      color: var(--link);
      font-size: 13px;
      font-weight: 700;
    }
    .checks-details .catalog-checks { margin-top: 10px; }
    .pagination {
      align-items: center;
      border-top: 1px solid var(--line);
      color: var(--muted);
      display: flex;
      font-size: 13px;
      gap: 14px;
      justify-content: space-between;
      padding: 12px 18px;
    }
    .pagination div {
      display: flex;
      gap: 7px;
    }
    .pagination button:disabled {
      cursor: default;
      opacity: .45;
    }
    .no-results {
      color: var(--muted);
      padding: 28px;
      text-align: center;
    }
    .item-meta {
      color: var(--muted);
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 13px;
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
    .par-finding-list {
      display: grid;
      gap: 8px;
      list-style: none;
      margin: 12px 0 0;
      padding: 0;
    }
    .par-finding-row {
      align-items: center;
      background: var(--panel-soft);
      border: 1px solid var(--line);
      border-left: 4px solid var(--fail);
      border-radius: 6px;
      display: grid;
      gap: 12px;
      grid-template-columns: minmax(0, 1fr) auto;
      padding: 12px;
    }
    .par-finding-copy {
      display: grid;
      gap: 5px;
      min-width: 0;
    }
    .par-finding-heading {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .par-finding-heading strong {
      color: var(--text);
      font-size: 15px;
      text-transform: none;
    }
    .par-finding-copy span {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }
    .par-finding-copy .par-location {
      color: var(--text);
      font-weight: 700;
    }
    .par-finding-actions {
      display: flex;
      justify-content: flex-end;
    }
    .par-finding-row > details {
      grid-column: 1 / -1;
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
      .priority-overview { grid-template-columns: 1fr; }
      .result-table { overflow: visible; }
      .result-table-head { display: none; }
      .result-summary { min-width: 0; grid-template-columns: minmax(0, 1fr); gap: 10px; }
      .result-summary::after { top: 12px; }
      .result-summary > * { min-width: 0; overflow-wrap: anywhere; }
      .affected-item-row { display: grid; grid-template-columns: minmax(0, 1fr); }
      .source-quality-edit { grid-template-columns: minmax(0, 1fr); }
      .source-quality-edit > span { padding-top: 0; }
      .operator-issue, .affected-items, .issue-location { min-width: 0; }
      header { padding: 22px 18px; }
      main { padding: 18px; }
      .section-heading,
      .failure-header,
      .test-card,
      .par-finding-row {
        display: grid;
        grid-template-columns: 1fr;
      }
      .test-actions { justify-content: flex-start; }
      .par-finding-actions { justify-content: flex-start; }
      .results-heading,
      .result-tools {
        display: grid;
        grid-template-columns: 1fr;
      }
      .item-detail-heading {
        display: grid;
        grid-template-columns: 1fr;
      }
      .result-actions {
        align-items: stretch;
        display: grid;
        grid-template-columns: 1fr;
      }
      .result-actions > * { text-align: center; }
      .issue-location-heading,
      .issue-location-row,
      .par-entry-heading,
      .par-source-row {
        display: grid;
        grid-template-columns: 1fr;
      }
      .par-link-value,
      .par-metadata {
        grid-template-columns: 1fr;
      }
      .issue-location-row .link-button,
      .par-source-row .link-button { text-align: center; }
      .download-menu > div {
        left: 0;
        right: auto;
      }
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
      ${reviewNavigationHtml(context.historyHref)}
    </div>
  </header>
  <main>
    ${summary.previewMode ? `<div class="preview-notice"><strong>Design preview only</strong><span>These rows demonstrate the report layout. They are not findings from a LiveLabs scan.</span></div>` : ""}
    <div class="totals">
      ${metric("Catalog items", catalogItems.length || summary.counts.total)}
      ${metric("Passed", catalogItems.length > 0 ? operatorCounts.passed : summary.counts.passed, "pass")}
      ${metric(
        "Items with issues",
        catalogItems.length > 0 ? operatorCounts.failed : summary.counts.unexpected,
        operatorCounts.failed > 0 ? "warn" : "pass",
      )}
      ${metric("Manual grammar or typo review", operatorCounts.review, "warn")}
      ${metric("Internal QA review", operatorCounts.internal, "warn")}
      ${metric("Could not check", operatorCounts.unchecked, "warn")}
    </div>
    <section class="priority-overview" aria-label="Catalog items by issue priority">
      <div><strong>Catalog items by priority</strong><span>Each catalog item counts once per priority, regardless of how many findings it contains.</span></div>
      ${PRIORITY_DEFINITIONS.map((priority) => `<div class="priority-count"><strong>${escapeHtml(String(priorityItemCounts[priority.code] || 0))}</strong><span>Items with ${escapeHtml(priority.code)}</span></div>`).join("")}
    </section>
    <p class="review-message" data-review-message></p>
    ${testedItems}
  </main>
  <script id="qa-review-items" type="application/json">${escapeScriptJson(reviewItems)}</script>
  <script>
    const REVIEW_STORAGE_KEY = "${REVIEW_STORAGE_KEY}";
    const qaReviewItems = JSON.parse(document.getElementById("qa-review-items")?.textContent || "{}");
    const filterSelect = document.querySelector("[data-item-filter]");
    const itemRows = Array.from(document.querySelectorAll("[data-item-row]"));
    const filterStatus = document.querySelector("[data-filter-status]");
    const itemSearch = document.querySelector("[data-item-search]");
    const pageSize = document.querySelector("[data-item-page-size]");
    const previousPage = document.querySelector("[data-item-previous]");
    const nextPage = document.querySelector("[data-item-next]");
    const noResults = document.querySelector("[data-item-no-results]");
    let activeFilter = "all";
    let currentPage = 1;
    function itemMatchesFilter(row) {
      if (activeFilter === "all") return true;
      const issueCodes = (row.getAttribute("data-issues") || "").split(/\\s+/).filter(Boolean);
      if (activeFilter.startsWith("priority:")) {
        const priorities = (row.getAttribute("data-priority") || "").split(/\\s+/).filter(Boolean);
        return priorities.includes(activeFilter.slice("priority:".length));
      }
      if (activeFilter.startsWith("audience:")) {
        const audiences = (row.getAttribute("data-audience") || "").split(/\\s+/).filter(Boolean);
        return audiences.includes(activeFilter.slice("audience:".length));
      }
      return (
        row.getAttribute("data-status") === activeFilter ||
        row.getAttribute("data-type") === activeFilter ||
        issueCodes.includes(activeFilter)
      );
    }
    function applyItemFilters() {
      const query = (itemSearch?.value || "").trim().toLowerCase();
      const matched = itemRows.filter((row) => {
        const haystack = (row.getAttribute("data-search") || "").toLowerCase();
        return itemMatchesFilter(row) && (!query || haystack.includes(query));
      });
      const size = Math.max(1, Number(pageSize?.value || 25));
      const pages = Math.max(1, Math.ceil(matched.length / size));
      currentPage = Math.min(currentPage, pages);
      const start = (currentPage - 1) * size;
      const visibleRows = new Set(matched.slice(start, start + size));
      for (const row of itemRows) {
        row.hidden = !visibleRows.has(row);
        if (row.hidden) row.open = false;
        const audience = activeFilter.startsWith("audience:") ? activeFilter.slice("audience:".length) : "";
        row.setAttribute("data-active-audience", audience);
        const summary = row.querySelector("[data-row-result-label]");
        const labels = row.querySelector("[data-row-issue-labels]");
        const status = row.querySelector("[data-row-status-label]");
        const heading = row.querySelector("[data-detail-heading]");
        const badge = row.querySelector("[data-row-priority-badge]");
        if (summary) summary.textContent = row.getAttribute("data-" + audience + "-summary") || row.getAttribute("data-all-summary") || "";
        if (labels) labels.textContent = row.getAttribute("data-" + audience + "-labels") || row.getAttribute("data-all-labels") || "";
        if (status) status.textContent = row.getAttribute("data-" + audience + "-status") || row.getAttribute("data-all-status") || "";
        if (heading) heading.textContent = audience ? row.getAttribute("data-" + audience + "-summary") || "" : heading.getAttribute("data-original-heading") || "";
        if (badge) badge.hidden = audience === "internal";
      }
      if (filterSelect) filterSelect.value = activeFilter;
      if (filterStatus) {
        filterStatus.innerText = matched.length
          ? "Showing " + (start + 1) + "-" + Math.min(start + size, matched.length) + " of " + matched.length
          : "Showing 0 results";
      }
      if (noResults) noResults.hidden = matched.length !== 0;
      if (previousPage) previousPage.disabled = currentPage <= 1 || matched.length === 0;
      if (nextPage) nextPage.disabled = currentPage >= pages || matched.length === 0;
    }
    if (filterSelect) {
      filterSelect.addEventListener("change", () => {
        activeFilter = filterSelect.value || "all";
        currentPage = 1;
        applyItemFilters();
      });
    }
    if (itemSearch) itemSearch.addEventListener("input", () => {
      currentPage = 1;
      applyItemFilters();
    });
    if (pageSize) pageSize.addEventListener("change", () => {
      currentPage = 1;
      applyItemFilters();
    });
    if (previousPage) previousPage.addEventListener("click", () => {
      currentPage -= 1;
      applyItemFilters();
      document.getElementById("tested-items")?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    if (nextPage) nextPage.addEventListener("click", () => {
      currentPage += 1;
      applyItemFilters();
      document.getElementById("tested-items")?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
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
    const resolvedParLinks = new Map();
    async function resolveUnifiedParLink(button) {
      const sourceUrl = button.getAttribute("data-source-url") || "";
      const fingerprint = button.getAttribute("data-fingerprint") || "";
      const key = sourceUrl + "|" + fingerprint;
      if (resolvedParLinks.has(key)) return resolvedParLinks.get(key);
      const response = await fetch("/api/par-link/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl, fingerprint }),
      });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "The full PAR link could not be retrieved.");
      resolvedParLinks.set(key, result.url);
      return result.url;
    }
    function parControlContainer(button) {
      return button.closest(".par-technical-body");
    }
    function showParControlMessage(button, message) {
      const target = parControlContainer(button)?.querySelector("[data-unified-par-message]");
      if (target) target.innerText = message;
    }
    for (const button of document.querySelectorAll("[data-unified-par-copy]")) {
      button.addEventListener("click", async () => {
        const original = button.innerText;
        button.disabled = true;
        try {
          const url = await resolveUnifiedParLink(button);
          const copied = await copyText(url);
          button.innerText = copied ? "Copied" : "Copy failed";
          showParControlMessage(button, copied ? "Full PAR link copied." : "The full link was retrieved but could not be copied.");
        } catch (error) {
          button.innerText = "Unavailable";
          showParControlMessage(button, location.protocol === "file:" ? "Full-link retrieval works on the live QA Hub." : error.message);
        } finally {
          window.setTimeout(() => { button.innerText = original; button.disabled = false; }, 1800);
        }
      });
    }
    for (const button of document.querySelectorAll("[data-unified-par-toggle]")) {
      button.addEventListener("click", async () => {
        const container = parControlContainer(button);
        const code = container?.querySelector("[data-unified-par-value]");
        const openLink = container?.querySelector("[data-unified-par-open]");
        if (!code) return;
        if (button.getAttribute("aria-pressed") === "true") {
          code.innerText = code.getAttribute("data-masked-value") || "";
          button.innerText = "Show full link";
          button.setAttribute("aria-pressed", "false");
          if (openLink) { openLink.hidden = true; openLink.removeAttribute("href"); }
          showParControlMessage(button, "Link masked again.");
          return;
        }
        button.disabled = true;
        try {
          const url = await resolveUnifiedParLink(button);
          code.innerText = url;
          button.innerText = "Hide full link";
          button.setAttribute("aria-pressed", "true");
          if (openLink) { openLink.href = url; openLink.hidden = false; }
          showParControlMessage(button, "Full link is visible only in this browser tab.");
        } catch (error) {
          showParControlMessage(button, location.protocol === "file:" ? "Full-link retrieval works on the live QA Hub." : error.message);
        } finally {
          button.disabled = false;
        }
      });
    }
    function readReviewState() {
      try {
        const parsed = JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) || "{}");
        return {
          retest: parsed && parsed.retest && typeof parsed.retest === "object" ? parsed.retest : {},
        };
      } catch {
        return { retest: {} };
      }
    }
    function writeReviewState(state) {
      window.qaHub?.sync(readReviewState(), state);
      localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify({
        retest: state.retest || {},
      }));
    }
    function updateReviewCounts() {
      const state = readReviewState();
      for (const counter of document.querySelectorAll("[data-review-count]")) {
        counter.innerText = String(Object.keys(state.retest || {}).length);
      }
      for (const button of document.querySelectorAll("[data-review-action]")) {
        const id = button.getAttribute("data-review-id") || "";
        const selected = Boolean(state.retest?.[id]);
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
        const addLabel = button.getAttribute("data-review-add-label") || "Add to Retest List";
        const selectedLabel = button.getAttribute("data-review-selected-label") || "Remove from Retest List";
        button.innerText = selected ? selectedLabel : addLabel;
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
        const id = button.getAttribute("data-review-id") || "";
        const entry = qaReviewItems[id];
        if (!entry) {
          showReviewMessage("This test has incomplete metadata and could not be added.");
          return;
        }
        const state = readReviewState();
        if (!state.retest[id]) {
          state.retest[id] = entry;
          writeReviewState(state);
          showReviewMessage(entry.testName + " was added to the Retest List.");
        } else {
          delete state.retest[id];
          writeReviewState(state);
          showReviewMessage(entry.testName + " was removed from the Retest List.");
        }
        updateReviewCounts();
      });
    }
    window.addEventListener("storage", (event) => {
      if (event.key === REVIEW_STORAGE_KEY) updateReviewCounts();
    });
    updateReviewCounts();
  </script>
  ${latestSummaryRefreshScript(summary.runId)}
</body>
</html>`;
}

function latestSummaryRefreshScript(runId) {
  return `<script>
    (() => {
      if (!/\\/latest\\/summary\\.html$/i.test(window.location.pathname)) return;
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

function reportHistoryHref(reportsRoot) {
  const channel = path.basename(path.resolve(reportsRoot)).replace(/[^a-z0-9_-]/gi, "");
  return channel ? `/${channel}/index.html` : "/regression/";
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
    itemIds: item.catalogItem.ids || [itemId],
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

function reviewNavigationHtml(historyHref = "") {
  return `<nav class="review-nav" aria-label="Report views">
    <a href="/">QA Hub home</a>
    ${historyHref ? `<a href="${escapeHtml(historyHref)}">All runs</a>` : ""}
    <a href="retest-list.html">Retest List <span class="review-count" data-review-count="retest">0</span></a>
  </nav>`;
}

function reportCatalogItems(items) {
  const normalized = items
    .map((item) => {
      const issues = (item.issues || [])
        .map((issue) => {
          const code = canonicalIssueCode(issue.code);
          const normalizedIssue = { ...issue, code, label: classificationLabel(code) };
          return operatorFacingIssueWithActionableDetails(normalizedIssue);
        })
        .filter((issue) => issue && issue.code !== "CONTENT_RELEVANCE");
      const issueCodes = new Set(issues.map((issue) => issue.code));
      let tests = (item.tests || []).map((test) => {
        const code = canonicalIssueCode(test.classification?.code || "");
        if (["MARKDOWN_FORMATTING", "WRITING_GRAMMAR", "POSSIBLE_TYPO", "BROKEN_VISIBLE_IMAGE"].includes(code) && !issueCodes.has(code)) {
          return { ...test, status: test.expectedStatus || "passed", issues: [] };
        }
        if (code !== "CONTENT_RELEVANCE") {
          return code === test.classification?.code
            ? test
            : { ...test, classification: { ...test.classification, code, label: classificationLabel(code) } };
        }
        return { ...test, status: test.expectedStatus || "passed", issues: [] };
      });
      const authenticationOnly = issues.length > 0 && issues.every((issue) => issue.code === "AUTHENTICATION_REQUIRED");
      if (authenticationOnly) {
        tests = tests.map((test) =>
          canonicalIssueCode(test.classification?.code || "") === "AUTHENTICATION_REQUIRED"
            ? { ...test, status: "skipped", expectedStatus: "skipped" }
            : test,
        );
      }
      const stillNeedsReview = issues.length > 0 || tests.some((test) => test.status !== test.expectedStatus && test.status !== "skipped");
      return {
        ...item,
        issues,
        tests,
        issueCount: issues.length,
        status: authenticationOnly ? "skipped" : item.status === "failed" && !stillNeedsReview ? "passed" : item.status,
      };
    });
  return mergeDuplicateReportItems(normalized)
    .sort(
      (left, right) =>
        catalogStatusRank(left.status) - catalogStatusRank(right.status) ||
        itemPriorityRank(left) - itemPriorityRank(right) ||
        catalogItemDisplayTitle(left.catalogItem).localeCompare(catalogItemDisplayTitle(right.catalogItem)),
    );
}

function operatorFacingIssueWithActionableDetails(issue) {
  if (issue?.code === "BROKEN_VISIBLE_IMAGE") {
    const details = operatorIssueDetails(issue).filter((detail) => !isGeneratedWorkshopOverviewIconDetail(detail));
    return details.length > 0 ? { ...issue, count: details.length, details } : null;
  }
  if (issue?.code === "MARKDOWN_FORMATTING") {
    const details = operatorIssueDetails(issue).filter((detail) => {
      const label = String(detail?.label || "");
      const marker = String(detail?.marker || "");
      const text = String(detail?.text || "");
      if (/^Heading is missing a space$/i.test(label) && /^\s*#(?:!|include\b|define\b|ifn?def\b|endif\b|else\b|elif\b|pragma\b)/i.test(text)) return false;
      if (/^Unmatched __ marker$/i.test(label) && strongMarkerCount(text, "__") % 2 === 0) return false;
      if (!/^Space (?:after opening|before closing) (?:\*\*|__)$/i.test(label) || !["**", "__"].includes(marker)) return true;
      const markerCount = strongMarkerCount(text, marker);
      return markerCount % 2 === 0;
    });
    return details.length > 0 ? { ...issue, count: details.length, details } : null;
  }
  if (!["WRITING_GRAMMAR", "POSSIBLE_TYPO"].includes(issue?.code)) return issue;
  const details = operatorIssueDetails(issue).filter((detail) => {
    const rawMarker = String(detail?.marker || "").trim();
    const rawText = String(detail?.text || "");
    const literalMarkerIndex = rawMarker ? rawText.toLowerCase().indexOf(rawMarker.toLowerCase()) : -1;
    if (literalMarkerIndex < 0) return false;
    if (
      /^space before punctuation$/i.test(String(detail?.label || "")) &&
      rawMarker.endsWith("!") &&
      rawText[literalMarkerIndex + rawMarker.length] === "["
    ) return false;
    if (
      /^missing space after punctuation$/i.test(String(detail?.label || "")) &&
      rawMarker.startsWith(";") &&
      isHtmlEntityTerminator(rawText, literalMarkerIndex)
    ) return false;
    const marker = rawMarker.replace(/\s+/g, " ").toLowerCase();
    const text = rawText.replace(/\s+/g, " ").trim().toLowerCase();
    const markerIndex = marker ? text.indexOf(marker) : -1;
    if (markerIndex < 0) return false;
    if (
      /^space before punctuation$/i.test(String(detail?.label || "")) &&
      marker.endsWith(".") &&
      /[a-z0-9]/i.test(text[markerIndex + marker.length] || "")
    ) {
      return false;
    }
    return true;
  });
  return details.length > 0 ? { ...issue, details } : null;
}

function strongMarkerCount(text, marker) {
  const pattern = marker === "**"
    ? /(?<!\\)\*\*/g
    : /(?<![\\A-Za-z0-9])__|__(?![A-Za-z0-9])/g;
  return Array.from(String(text || "").matchAll(pattern)).length;
}

function isHtmlEntityTerminator(text, semicolonIndex) {
  return /&(?:#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]+)$/i.test(String(text || "").slice(0, semicolonIndex));
}

function isGeneratedWorkshopOverviewIconDetail(detail) {
  if (!/^workshop icon$/i.test(String(detail?.alt || "").trim())) return false;
  try {
    const url = new URL(String(detail?.src || ""));
    return (
      url.hostname.toLowerCase() === "livelabs.oracle.com" &&
      /\/ords\/r\/dbpm\/livelabs\/view-workshop$/i.test(url.pathname) &&
      /^NATIVE=/i.test(url.searchParams.get("request") || "")
    );
  } catch {
    return false;
  }
}

function mergeDuplicateReportItems(items) {
  const merged = new Map();
  for (const item of items) {
    const titleKey = catalogItemDisplayTitle(item.catalogItem).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const key = titleKey || item.key;
    const existing = merged.get(key);
    if (!existing) {
      const mergedIssues = mergeDuplicateIssues(item.issues || []);
      merged.set(key, {
        ...item,
        catalogItem: { ...item.catalogItem, ids: Array.from(new Set([...(item.catalogItem?.ids || []), item.catalogItem?.id].filter(Boolean).map(String))) },
        keys: [item.key], sections: [...(item.sections || [])], tests: [...(item.tests || [])], issues: mergedIssues, issueCount: mergedIssues.length,
        authorEmails: [...(item.authorEmails || [])], authorNames: [...(item.authorNames || [])],
      });
      continue;
    }
    const allIds = [...(existing.catalogItem.ids || []), ...(item.catalogItem?.ids || []), item.catalogItem?.id].filter(Boolean).map(String);
    if ((existing.catalogItem?.type || "workshop") === "workshop" && (item.catalogItem?.type || "workshop") !== "workshop") {
      existing.catalogItem = { ...existing.catalogItem, ...item.catalogItem };
    }
    existing.catalogItem.ids = Array.from(new Set(allIds));
    existing.keys = Array.from(new Set([...(existing.keys || [existing.key]), item.key]));
    existing.sections = Array.from(new Set([...(existing.sections || []), ...(item.sections || [])])).sort();
    existing.tests = uniqueObjects([...(existing.tests || []), ...(item.tests || [])]);
    existing.issues = mergeDuplicateIssues([...(existing.issues || []), ...(item.issues || [])]);
    existing.authorEmails = Array.from(new Set([...(existing.authorEmails || []), ...(item.authorEmails || [])])).sort();
    existing.authorNames = Array.from(new Set([...(existing.authorNames || []), ...(item.authorNames || [])])).sort();
    for (const field of ["total", "passed", "failed", "skipped", "unexpected"]) existing.counts[field] = Number(existing.counts?.[field] || 0) + Number(item.counts?.[field] || 0);
    existing.status = existing.status === "failed" || item.status === "failed" ? "failed" : existing.status === "skipped" && item.status === "skipped" ? "skipped" : "passed";
    existing.issueCount = existing.issues.length;
  }
  return Array.from(merged.values());
}

function mergeDuplicateIssues(issues) {
  const merged = new Map();
  for (const issue of issues) {
    const existing = merged.get(issue.code);
    if (!existing) { merged.set(issue.code, { ...issue }); continue; }
    const details = uniqueObjects([...operatorIssueDetails(existing), ...operatorIssueDetails(issue)]);
    if (details.length) existing.details = details;
  }
  return Array.from(merged.values());
}

function uniqueObjects(values) {
  const seen = new Set();
  return values.filter((value) => { const key = JSON.stringify(value); if (seen.has(key)) return false; seen.add(key); return true; });
}

function canonicalFailureCategories(categories) {
  const counts = new Map();
  for (const category of categories || []) {
    const code = canonicalIssueCode(category.code);
    counts.set(code, (counts.get(code) || 0) + Number(category.count || 0));
  }
  return Array.from(counts.entries())
    .map(([code, count]) => ({ code, count, label: classificationLabel(code) }))
    .sort(
      (left, right) =>
        issuePriorityRank(left) - issuePriorityRank(right) ||
        right.count - left.count ||
        left.code.localeCompare(right.code),
    );
}

function readCatalogAuthors(attachments) {
  const attachment = attachments.find((item) => item.name === "catalog-authors.json" && item.bodyText);
  if (!attachment) return { emails: [], names: [] };

  try {
    const parsed = JSON.parse(attachment.bodyText);
    const emails = Array.isArray(parsed?.emails)
      ? Array.from(new Set(parsed.emails.filter((email) => typeof email === "string" && email.includes("@")))).sort()
      : [];
    const names = Array.isArray(parsed?.names)
      ? Array.from(new Set(parsed.names.filter((name) => typeof name === "string" && name.trim()))).sort()
      : [];
    return { emails, names };
  } catch {
    return { emails: [], names: [] };
  }
}

function reviewListPageHtml(summary, context = {}) {
  const title = "Retest List";
  const actionLabel = "Run Retest List";
  const instructions = RETEST_LIST_INSTRUCTIONS;
  const command = reviewActionCommand("retest");

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
        <a class="link-button" href="/">QA Hub home</a>
        ${context.historyHref ? `<a class="link-button" href="${escapeHtml(context.historyHref)}">All runs</a>` : ""}
        <a class="link-button" href="summary.html">Report</a>
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
          <button class="button primary" type="button" data-run-list aria-describedby="retest-queue-note">${escapeHtml(actionLabel)}</button>
          <button class="button" type="button" data-copy-payload hidden>Copy Payload</button>
          <button class="button danger" type="button" data-clear-list>Clear List</button>
        </div>
      </div>
      <p class="retest-queue-note" id="retest-queue-note"><strong>Full run in progress? Wait until it finishes before starting a retest.</strong> If you submit now, Jenkins queues the selected workshops behind the active run. Full runs and retests use the same engine, one run at a time; the active run is not stopped.</p>
      <div class="list" data-list></div>
    </section>
    <section class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow" data-legacy-handoff>Script handoff</p>
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
    const LIST_TYPE = "retest";
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
        };
      } catch {
        return { retest: {} };
      }
    }
    function writeState(state) {
      window.qaHub?.sync(readState(), state);
      localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify({
        retest: state.retest || {},
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
        itemId: entry.itemId || "",
        itemType: entry.itemType || "",
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
    document.querySelector("[data-run-list]").addEventListener("click", async () => {
      const payload = buildPayload();
      if (payload.tests.length === 0) {
        showMessage("Add at least one test before running this list.", true);
        return;
      }
      const button = document.querySelector("[data-run-list]");
      button.disabled = true;
      try {
        if (!window.qaHub) throw new Error("The retest service is not available.");
        await window.qaHub.flush();
        const run = await window.qaHub.start(payload);
        const current = readState();
        const cleared = { ...current, [LIST_TYPE]: {} };
        window.qaHub.sync(current, cleared);
        await window.qaHub.flush();
        localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify({ retest: {} }));
        render();
        showMessage(run.preview ? "Preview retest queued. The list is ready for the next selection." : "Retest queued in Jenkins. The list is ready for the next selection. Open Retest runs for progress.", false);
      } catch (error) { showMessage(error.message, true); }
      finally { button.disabled = false; }
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
  const isParFinding = hasParAuditIssues(issues);
  const issueCountLabel = findingSummaryLabel(issues);

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
      <p class="failure-explanation">${escapeHtml(isParFinding ? parAuditExplanation() : failureExplanation(failure))}</p>
      ${issueListHtml(issues)}
      ${isParFinding || !failure.failedStep ? "" : failedStepSummaryHtml(failure.failedStep)}
      ${
        isParFinding
          ? ""
          : `<div class="route-grid">
              ${routeCardHtml("Test tried", catalogUrl, "Original card link from the generated catalog.", "Open tried URL")}
              ${routeCardHtml("Browser ended at", failure.finalUrl, `Page title: ${failure.finalTitle || "Unknown"}`, "Open reached URL")}
            </div>`
      }
      <div class="meta-grid">
        <div class="meta-item">
          <strong>Test file</strong>
          <span><code>${escapeHtml(`${failure.file}:${failure.line}`)}</code></span>
        </div>
      </div>
      ${
        isParFinding
          ? advancedParEvidenceHtml(failure, context, index, `failure-par-steps-${index}`)
          : failureEvidenceHtml(failure.attachments, context, index) + stepsDetailsHtml(failure.steps, `failure-steps-${index}`)
      }
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

export function issueDetailHtml(issue, index) {
  const details = issueDetailsText(issue);
  const structuredDetails = structuredIssueDetailsHtml(issue);
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
      structuredDetails ||
      (details
        ? `<details>
            <summary>Issue details</summary>
            <pre>${escapeHtml(details)}</pre>
          </details>`
        : "")
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

function structuredIssueDetailsHtml(issue) {
  if (!Array.isArray(issue.details)) {
    return "";
  }

  if (issue.code === "STALE_PAR_LINK" || issue.code === "PAR_LINK_UNVERIFIED") {
    return `<ol class="par-finding-list">
      ${issue.details
        .map((detail, index) => {
          const guidance = parLinkGuidance(detail);
          const source = Array.isArray(detail.sources) ? detail.sources[0] : undefined;
          const affectedLabUrl = source?.pageUrl || "";
          const location = [
            source?.label || `PAR source ${index + 1}`,
            source?.section,
            source?.sourceLine ? `Markdown line ${source.sourceLine}` : source?.location,
          ].filter(Boolean).join(" / ");
          const target = detail.object_name || detail.bucket || detail.label || `PAR link ${index + 1}`;
          const response = detail.http_status ? `HTTP ${detail.http_status}` : guidance.shortFinding;
          return `<li class="par-finding-row">
            <div class="par-finding-copy">
              <div class="par-finding-heading">
                <strong>${escapeHtml(index + 1)}. ${escapeHtml(target)}</strong>
                <span class="pill fail">${escapeHtml(response)}</span>
              </div>
              <span>${escapeHtml(guidance.finding)}</span>
              <span class="par-location">Where: ${escapeHtml(location || "Source location not recorded")}</span>
              <span>Fix: Replace this PAR, or remove the instruction if the file is no longer required. Republish, then rerun the PAR audit.</span>
            </div>
            <div class="par-finding-actions">
              ${affectedLabUrl ? linkHtml(affectedLabUrl, "Open affected lab", "link-button") : ""}
            </div>
            <details><summary>Technical details</summary><pre>${escapeHtml(JSON.stringify(detail, null, 2))}</pre></details>
          </li>`;
        })
        .join("\n")}
    </ol>`;
  }

  if (issue.code !== "PAR_SCAN_INCOMPLETE") {
    return "";
  }

  return `<div class="route-grid">
    ${issue.details
      .map((detail, index) => {
        const sourceUrl = detail.source_file_url || detail.sourceFileUrl || detail.page_url || detail.pageUrl || "";
        const label = detail.label || `Source page ${index + 1}`;
        const error = detail.error || "This source page could not be scanned.";
        const explanation = parScanErrorExplanation(error);
        const action = /HTTP\s+404/i.test(error)
          ? `Correct the missing source path for "${label}" in the workshop manifest. If the page was intentionally removed, remove its manifest entry. Republish, then rerun the PAR audit.`
          : "Open the source below, correct its availability or access problem, then rerun the PAR audit.";
        return `<div class="route-card">
          <strong>Source page not scanned</strong>
          <p><strong>What failed:</strong> ${escapeHtml(explanation)}</p>
          <p><strong>What remained untested:</strong> PAR links inside this source page were not marked working or broken.</p>
          <p><strong>What to do:</strong> ${escapeHtml(action)}</p>
          <p><strong>Exact source:</strong> ${escapeHtml(label)}</p>
          ${sourceUrl ? `<code>${escapeHtml(sourceUrl)}</code>${linkHtml(sourceUrl, "Open failing source", "link-button")}` : ""}
          ${
            explanation === error
              ? ""
              : `<details><summary>Technical details</summary><pre>${escapeHtml(error)}</pre></details>`
          }
        </div>`;
      })
      .join("\n")}
  </div>`;
}

function hasParAuditIssues(issues) {
  return issues.some((issue) => ["STALE_PAR_LINK", "PAR_LINK_UNVERIFIED", "PAR_SCAN_INCOMPLETE"].includes(issue.code));
}

function parAuditExplanation() {
  return "The PAR checker completed on every accessible workshop source. Missing source pages and PAR link findings are listed above; workshop navigation URLs are context only.";
}

function advancedParEvidenceHtml(failure, context, index, stepsId) {
  return `<details class="workflow-summary">
    <summary>Advanced automation evidence</summary>
    <p class="step-note">Use this section only to debug the automation. The PAR findings above are the QA result.</p>
    ${failure.failedStep ? failedStepSummaryHtml(failure.failedStep) : ""}
    ${failureEvidenceHtml(failure.attachments, context, index)}
    ${stepsDetailsHtml(failure.steps, stepsId)}
  </details>`;
}
function emptyStateHtml(status) {
  const message =
    status === "passed" ? "No failures were found in this run." : status || "No unexpected failures were captured.";
  return `<section class="empty-state">${escapeHtml(message)}</section>`;
}

function testedItemsHtml(items, categories = [], runId, failures = [], context = {}) {
  const statusCounts = {
    failed: items.filter((item) => item.status === "failed").length,
    passed: items.filter((item) => item.status === "passed").length,
    skipped: items.filter((item) => item.status === "skipped").length,
  };
  const types = Array.from(new Set(items.map((item) => item.catalogItem?.type || "catalog item"))).sort();
  const priorityCounts = new Map(
    PRIORITY_DEFINITIONS.map((priority) => [
      priority.code,
      items.filter((item) => itemPriorities(item).includes(priority.code)).length,
    ]),
  );
  const audienceCounts = {
    external: items.filter((item) => (item.issues || []).some((issue) => issueAudience(issue) === "external")).length,
    internal: items.filter((item) => (item.issues || []).some((issue) => issueAudience(issue) === "internal")).length,
  };

  return `<section class="results-panel" id="tested-items">
    <div class="results-heading">
      <div>
        <h2>Overall regression results</h2>
        <p>Search or filter the tested catalog, then open one row to see its issues and checks.</p>
      </div>
      <details class="download-menu">
        <summary>Download data</summary>
        <div>
          <p>Use the catalog summary for ownership review, the detailed CSV for findings, or JSON for complete item and issue records.</p>
          <a href="results.csv" download="livelabs-qa-catalog-summary-${escapeAttribute(csvTimestamp(runId))}.csv"><strong>Catalog summary</strong><span>One row per catalog item</span></a>
          <a href="finding-results.csv" download="livelabs-qa-findings-${escapeAttribute(csvTimestamp(runId))}.csv"><strong>Detailed findings</strong><span>One row per issue category</span></a>
          <a href="catalog-results.json" download="livelabs-qa-catalog-results-${escapeAttribute(csvTimestamp(runId))}.json"><strong>Complete JSON</strong><span>Items, issues, evidence, checks, and safe URLs</span></a>
        </div>
      </details>
    </div>
    <div class="result-tools">
      <label class="result-search">
        <span>Search results</span>
        <input type="search" data-item-search placeholder="Name, type, LiveLabs ID, check, or issue" />
      </label>
      <label class="result-filter">
        <span>Filter results</span>
        <select data-item-filter aria-label="Filter overall regression results">
        ${testedItemFilterOptionHtml("all", "All results", items.length)}
        <optgroup label="Priority">
        ${PRIORITY_DEFINITIONS.map((priority) =>
          testedItemFilterOptionHtml(
            `priority:${priority.code}`,
            `${priority.code} ${priority.label}`,
            priorityCounts.get(priority.code) || 0,
          )).join("\n")}
        </optgroup>
        <optgroup label="Audience">
          ${testedItemFilterOptionHtml("audience:external", "Author-facing issues", audienceCounts.external)}
          ${testedItemFilterOptionHtml("audience:internal", "Internal QA", audienceCounts.internal)}
        </optgroup>
        <optgroup label="Issue types (findings)">
        ${categories
          .map(
            (category) =>
              testedItemFilterOptionHtml(category.code, category.label, category.count),
          )
          .join("\n")}
        </optgroup>
        <optgroup label="Status">
        ${Object.entries(OPERATOR_STATES).map(([state, label]) => testedItemFilterOptionHtml(state, label, items.filter((item) => operatorState(item) === state).length)).join("")}
        </optgroup>
        <optgroup label="Catalog type">
        ${types
          .map(
            (type) =>
              testedItemFilterOptionHtml(
                type,
                catalogItemTypeLabel(type),
                items.filter((item) => (item.catalogItem?.type || "catalog item") === type).length,
              ),
          )
          .join("\n")}
        </optgroup>
        </select>
      </label>
      <label class="page-size">
        <span>Rows per page</span>
        <select data-item-page-size>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </label>
    </div>
    <div class="priority-guide" aria-label="Issue priority guide">
      ${PRIORITY_DEFINITIONS.map((priority) => `<span><strong>${priority.code} ${priority.label}:</strong> ${escapeHtml(priority.description)}</span>`).join("\n")}
    </div>
    <div class="result-table" role="table" aria-label="Overall regression results">
      <div class="result-table-head" role="row">
        <span>Status</span>
        <span>Catalog item</span>
        <span>Checks run</span>
        <span>Result</span>
      </div>
      <div>
        ${items
          .map((item) => testedItemRowHtml(item, runId, failures, { ...context, summaryRunId: runId }))
          .join("\n")}
      </div>
      <div class="no-results" data-item-no-results hidden>No results match this search and filter.</div>
    </div>
    <div class="pagination">
      <span class="filter-status" data-filter-status>Showing tested items.</span>
      <div>
        <button type="button" data-item-previous>Previous</button>
        <button type="button" data-item-next>Next</button>
      </div>
    </div>
  </section>`;
}

function testedItemFilterOptionHtml(filter, label, count) {
  return `<option value="${escapeAttribute(filter)}">${escapeHtml(label)} (${escapeHtml(String(count || 0))})</option>`;
}

function testedItemRowHtml(item, runId, failures, context) {
  const itemId = item.catalogItem?.id || item.catalogItem?.slug || "";
  const itemType = item.catalogItem?.type || "catalog item";
  const issues = item.issues || [];
  const tests = item.tests || [];
  const sections = item.sections || [];
  const issueCodes = Array.from(new Set(issues.map((issue) => issue.code)));
  const priorities = itemPriorities(item);
  const audiences = Array.from(new Set(issues.map(issueAudience)));
  const externalIssues = issues.filter((issue) => issueAudience(issue) === "external");
  const internalIssues = issues.filter((issue) => issueAudience(issue) === "internal");
  const audienceSummary = (selected) => selected.length === 1 ? issueDisplayLabel(selected[0]) : findingSummaryLabel(selected);
  const priority = priorities[0] || "";
  const state = operatorState(item);
  const blockerCount = issues.filter((issue) => issue.severity === "blocker").length;
  const issueCount = Number(item.issueCount ?? issues.length);
  const findingCount = issueFindingCount(issues);
  const checkCount = Number(item.counts?.total ?? tests.length);
  const issueLabel =
    ["failed", "review"].includes(state)
      ? blockerCount > 0
        ? `${blockerCount} hard blocker${blockerCount === 1 ? "" : "s"}`
        : issueCount === 1
          ? `${issueDisplayLabel(issues[0])}`
          : `${issueCount} categories · ${findingCount} finding${findingCount === 1 ? "" : "s"}`
      : state === "passed"
        ? "No issues found"
        : issues.length === 1
          ? issueDisplayLabel(issues[0])
          : "Not tested";
  const statusTone = state === "failed" ? "fail" : state === "passed" ? "pass" : "warn";
  const statusLabel = OPERATOR_STATES[state];
  const searchText = [
    catalogItemDisplayTitle(item.catalogItem),
    itemId,
    item.catalogItem?.slug,
    itemType,
    item.status,
    ...sections,
    ...issueCodes,
    ...issues.map((issue) => `${issue.label} ${issue.message}`),
  ]
    .filter(Boolean)
    .join(" ");

  return `<details class="result-row ${escapeAttribute(state)}"
    id="${escapeAttribute(itemDetailId(item))}"
    data-item-row
    data-status="${escapeAttribute(state)}"
    data-type="${escapeAttribute(itemType)}"
    data-priority="${escapeAttribute(priorities.join(" "))}"
    data-audience="${escapeAttribute(audiences.join(" "))}"
    data-all-summary="${escapeAttribute(issueLabel)}"
    data-external-summary="${escapeAttribute(audienceSummary(externalIssues))}"
    data-internal-summary="${escapeAttribute(audienceSummary(internalIssues))}"
    data-all-labels="${escapeAttribute(issues.map(issueDisplayLabel).join(", ") || "All completed checks passed")}"
    data-external-labels="${escapeAttribute(externalIssues.map(issueDisplayLabel).join(", "))}"
    data-internal-labels="${escapeAttribute(internalIssues.map(issueDisplayLabel).join(", "))}"
    data-all-status="${escapeAttribute(statusLabel)}"
    data-external-status="${escapeAttribute(externalIssues.every((issue) => MANUAL_LANGUAGE_REVIEW_CODES.has(issue.code)) ? "Manual language review" : "Issues found")}"
    data-internal-status="Internal QA review"
    data-issues="${escapeAttribute(issueCodes.join(" "))}"
    data-search="${escapeAttribute(searchText)}">
    <summary class="result-summary">
      <span><span class="pill ${statusTone}" data-row-status-label>${escapeHtml(statusLabel)}</span></span>
      <span class="result-item">
        <strong>${escapeHtml(catalogItemDisplayTitle(item.catalogItem))}</strong>
        <small>${escapeHtml([catalogItemTypeLabel(itemType), catalogItemIdentifier(item.catalogItem)].filter(Boolean).join(" / "))}</small>
      </span>
      <span class="result-checks">
        <strong>${escapeHtml(String(checkCount))} check${checkCount === 1 ? "" : "s"}</strong>
        <small>${escapeHtml(sections.join(" · ") || "No section metadata")}</small>
        ${linkCoverageSummaryHtml(tests)}
      </span>
      <span class="result-finding">
        <strong>${priority ? `<span class="priority-badge ${escapeAttribute(priority.toLowerCase())}" data-row-priority-badge>${escapeHtml(priority)}</span> ` : ""}<span data-row-result-label>${escapeHtml(issueLabel)}</span></strong>
        <small data-row-issue-labels>${escapeHtml(issues.map(issueDisplayLabel).join(", ") || "All completed checks passed")}</small>
      </span>
    </summary>
    ${itemDetailHtml(item, failures, context)}
  </details>`;
}

function itemDetailHtml(item, failures, context) {
  const itemFailures = (failures || []).filter(
    (failure) => failure.catalogItem && (item.keys || [item.key]).includes(catalogItemKey(failure.catalogItem)),
  );
  const issues = item.issues || [];
  const tests = item.tests || [];
  const url = item.catalogItem.normalized_href || item.catalogItem.absolute_url || item.catalogItem.href || "";
  const reviewId = reviewEntryId(item, context.summaryRunId || "");
  const hasParIssues = hasParAuditIssues(issues);
  const authenticationOnly = issues.length > 0 && issues.every((issue) => issue.code === "AUTHENTICATION_REQUIRED");
  const state = operatorState(item);
  const issueHeading =
    state === "review" ? "Should manually check grammar or typos" : state === "internal" ? "Internal QA review" : state === "unchecked"
      ? "Could not check"
      : issues.length === 0
      ? "No issues found"
      : findingSummaryLabel(issues);

  return `<div class="result-details">
    <div class="item-detail-heading">
      <div>
        <h3 data-detail-heading data-original-heading="${escapeAttribute(issueHeading)}">${escapeHtml(issueHeading)}</h3>
        <p>${escapeHtml(
          issues.length === 0
            ? "Every completed check passed for this item."
            : authenticationOnly
              ? "The QA browser needs a fresh Oracle sign-in before this item can be checked. No workshop change is requested."
            : state === "review"
              ? "Review these language suggestions and change only confirmed mistakes; they are not counted as product issues."
            : ["internal", "unchecked"].includes(state)
              ? "The QA team must investigate these results before requesting a workshop change."
            : "Review each problem below, make the change, then add the item to the retest list.",
        )}</p>
      </div>
      <div class="result-actions">
        ${url ? `<a class="link-button" href="${escapeAttribute(stableWorkshopSourceUrl(url, url))}" target="_blank" rel="noreferrer">${escapeHtml(catalogItemOpenLabel(item.catalogItem?.type))}</a>` : ""}
        ${issues.length > 0 && state === "failed" && !hasParIssues && !authenticationOnly ? `<button class="review-button" type="button" data-review-action="retest" data-review-id="${escapeAttribute(reviewId)}">Add to Retest List</button>` : ""}
      </div>
    </div>
    ${issues.some((issue) => issueAudience(issue) === "external") ? workshopAuthorContactsHtml(item) : ""}
    ${
      issues.length > 0
        ? operatorIssueListHtml(issues, item, context)
        : `<section class="operator-pass"><strong>Passed</strong><span>No user-facing problem was found.</span></section>`
    }
    ${itemFailures.map((failure) => artifactLinksHtml((failure.attachments || []).filter((attachment) => /highlighted-issue-screenshot/i.test(attachment.name)), context)).join("")}
    <details class="item-developer-details">
      <summary>Developer evidence (optional)</summary>
      <div class="item-developer-body">
        <section class="developer-section">
          <h4>Checks run (${escapeHtml(String(tests.length))})</h4>
          <div class="catalog-checks">${tests.map(catalogCheckHtml).join("\n")}</div>
        </section>
        ${itemFailures.map((failure, index) => itemFailureDeveloperHtml(failure, index, context)).join("\n")}
      </div>
    </details>
  </div>`;
}

function workshopAuthorContactsHtml(item) {
  if (item.catalogItem?.type !== "workshop") return "";
  const names = Array.from(
    new Set((item.authorNames || []).map(normalizeWorkshopAuthorName).filter(Boolean)),
  ).slice(0, 2);
  return `<section class="author-contacts" aria-label="Workshop author contacts">
    <strong>Acknowledgements</strong>
    ${
      names.length > 0
        ? names.map((name) => `<span>${escapeHtml(name)}</span>`).join("\n")
        : "<span>No acknowledgement names were found.</span>"
    }
  </section>`;
}

function normalizeWorkshopAuthorName(value) {
  const name = String(value || "")
    .replace(/^\s*[-*]+\s*/, "")
    .replace(/\s+-\s+Oracle\b.*$/i, "")
    .trim();
  if (!name || /^livelabs team\b/i.test(name)) return "";
  const firstPart = name.split(",")[0].trim();
  return /^[A-Z][A-Za-z'\u2019.-]+(?:\s+[A-Z][A-Za-z'\u2019.-]+){1,3}$/.test(firstPart) ? firstPart : name;
}

function operatorIssueListHtml(issues, item, context) {
  return `<div class="operator-issue-list">
    ${issues.map((issue, index) => operatorIssueHtml(issue, index, item, context)).join("\n")}
  </div>`;
}

function priorityBadgeHtml(issue) {
  const priority = issuePriority(issue);
  return priority
    ? `<span class="priority-badge ${escapeAttribute(priority.toLowerCase())}" title="${escapeAttribute(priorityDefinition(priority).description)}">${escapeHtml(priority)}</span>`
    : `<span class="priority-badge p3">Internal QA</span>`;
}

function operatorIssueHtml(issue, index, item, context) {
  if (issue.code === "STALE_PAR_LINK" || issue.code === "PAR_LINK_UNVERIFIED") {
    return parOperatorIssueHtml(issue, index, item, context);
  }
  if (issue.code === "PAR_SCAN_INCOMPLETE") {
    return parScanOperatorIssueHtml(issue, index, item, context);
  }

  const severityLabel = issueAudience(issue) === "internal" ? "Internal QA" : issue.code === "AUTHENTICATION_REQUIRED"
    ? "Not tested"
    : issue.code === "QA_SETUP_FAILED" || issue.code === "QA_CHECK_FAILED" || issue.code === "PAGE_TIMED_OUT"
      ? "Run again"
      : issue.severity === "blocker"
        ? "Blocking issue"
        : "Needs fix";
  const affected = operatorIssueAffectedItemsHtml(issue, item);
  const location = issueLocationForItem(issue, item);
  const reproduction = operatorIssueReproduction(issue, item);
  const sourceQualityIssue = ["MARKDOWN_FORMATTING", "WRITING_GRAMMAR", "POSSIBLE_TYPO"].includes(issue.code);
  const showLocationFooter = !sourceQualityIssue && issue.code !== "SOURCE_SCAN_INCOMPLETE";

  return `<section class="operator-issue ${escapeAttribute(issue.severity || "major")}" data-issue-audience="${escapeAttribute(issueAudience(issue))}">
    <div class="operator-issue-heading">
      ${priorityBadgeHtml(issue)}
      <span class="pill ${issue.severity === "blocker" ? "fail" : "warn"}">${escapeHtml(severityLabel)}</span>
      <h4>${escapeHtml(index + 1)}. ${escapeHtml(issueDisplayLabel(issue))}</h4>
    </div>
    ${sourceQualityIssue ? "" : `<div class="issue-guidance">
      <p><strong>What is wrong:</strong> ${escapeHtml(operatorIssueProblem(issue, item))}</p>
      ${reproduction ? `<p><strong>How to reproduce:</strong> ${escapeHtml(reproduction)}</p>` : ""}
      <p><strong>${issueAudience(issue) === "internal" ? "What QA should check" : "What to change"}:</strong> ${escapeHtml(operatorIssueAction(issue, item))}</p>
    </div>`}
    ${affected}
    ${showLocationFooter ? `<div class="issue-location-block">
      <div class="issue-location-row">
        <div class="issue-location-copy">
          <span>${issueAudience(issue) === "internal" ? "Where to investigate" : "Where to change it"}</span>
          <strong>${escapeHtml(location.label)}</strong>
          ${location.detail ? `<small>${escapeHtml(location.detail)}</small>` : ""}
        </div>
        ${location.url ? externalActionLinkHtml(location.url, location.actionLabel || "Open this page") : ""}
      </div>
    </div>` : ""}
  </section>`;
}

function linkCoverageSummaryHtml(tests) {
  const totals = (tests || []).reduce((coverage, test) => {
    if (!test?.linkCoverage) return coverage;
    try {
      const value = JSON.parse(test.linkCoverage);
      coverage.checked += Number(value.checked) || 0;
      coverage.found += Number(value.found) || 0;
      coverage.unverified += Number(value.unverified) || 0;
    } catch {
      // Ignore malformed optional coverage metadata.
    }
    return coverage;
  }, { checked: 0, found: 0, unverified: 0 });
  if (totals.checked === 0 && totals.found === 0 && totals.unverified === 0) return "";
  return `<small>Links checked: ${escapeHtml(String(totals.checked))} of ${escapeHtml(String(totals.found))}</small>`;
}

function parOperatorIssueHtml(issue, index, item, context) {
  const details = Array.isArray(issue.details) ? issue.details : [];
  const reviewId = reviewEntryId(item, context.summaryRunId || "");
  const severityLabel = issue.code === "STALE_PAR_LINK" ? "Broken PAR" : "Check again";

  return `<section class="operator-issue ${escapeAttribute(issue.severity || "major")}" data-issue-audience="${escapeAttribute(issueAudience(issue))}">
    <div class="operator-issue-heading">
      ${priorityBadgeHtml(issue)}
      <span class="pill ${issue.code === "STALE_PAR_LINK" ? "fail" : "warn"}">${escapeHtml(severityLabel)}</span>
      <h4>${escapeHtml(index + 1)}. ${escapeHtml(issueDisplayLabel(issue))}</h4>
    </div>
    ${
      details.length > 0
        ? details.map((detail, detailIndex) => parOperatorEntryHtml(detail, detailIndex, item, reviewId)).join("\n")
        : `<div class="issue-guidance"><p><strong>Problem:</strong> ${escapeHtml(issue.message)}</p><p><strong>Next action:</strong> ${escapeHtml(operatorIssueAction(issue))}</p></div>`
    }
  </section>`;
}

function parOperatorEntryHtml(detail, detailIndex, item, reviewId) {
  const guidance = parLinkGuidance(detail);
  const objectName = detail.object_name || detail.label || detail.bucket || `PAR link ${detailIndex + 1}`;
  const sources = preferredUnifiedParSources(detail.sources);

  return `<div class="par-entry">
    <div class="par-entry-heading">
      <div>
        <h5>${escapeHtml(objectName)}</h5>
        <p>${escapeHtml(guidance.shortFinding)}</p>
      </div>
      <button class="review-button" type="button" data-review-action="retest" data-review-id="${escapeAttribute(reviewId)}" data-review-add-label="Add to PAR Retest" data-review-selected-label="Remove from PAR Retest">Add to PAR Retest</button>
    </div>
    <div class="issue-guidance">
      <p><strong>Problem:</strong> ${escapeHtml(guidance.finding)}</p>
      <p><strong>Fix:</strong> ${escapeHtml(guidance.action)}</p>
    </div>
    <div class="issue-location-block">
      <div class="issue-location-heading">
        <div><h5>Where to fix it</h5><p>${sources.length > 1 ? `${sources.length} places use this PAR link.` : "Exact lab and source section from the workshop Markdown."}</p></div>
      </div>
      <div class="par-source-list">${
        sources.length > 0
          ? sources.map((source) => unifiedParSourceHtml(source, item.catalogItem)).join("\n")
          : unifiedParFallbackSourceHtml(detail, item)
      }</div>
    </div>
    ${unifiedParTechnicalHtml(detail, sources)}
  </div>`;
}

function preferredUnifiedParSources(sources) {
  if (!Array.isArray(sources)) return [];
  const actionable = sources.filter(
    (source) => source?.pageUrl || source?.sourceFileUrl || source?.section || source?.instruction || source?.sourceLine,
  );
  const candidates = actionable.length > 0 ? actionable : sources;
  const seen = new Set();
  return candidates.filter((source) => {
    const key = [
      source?.pageUrl || "",
      source?.sourceFileUrl || "",
      source?.labNumber || "",
      source?.section || "",
      source?.instruction || "",
      source?.sourceLine || "",
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function unifiedParSourceHtml(source, catalogItem) {
  const labNumber = unifiedParLabNumber(source);
  const sourceLabel = unifiedParSourceLabel(source, catalogItem);
  const labLabel = labNumber ? `Lab ${labNumber}: ${sourceLabel}` : sourceLabel;
  const details = [
    source.section ? `Source section: ${source.section}` : "",
    source.instruction ? `Nearby instruction: ${unifiedParStepLabel(source.instruction)}` : "",
    source.sourceLine ? `Markdown line ${source.sourceLine}` : source.location || "",
  ].filter(Boolean);

  const catalogUrl = catalogItem?.normalized_href || catalogItem?.absolute_url || catalogItem?.href || "";
  const actionUrl = stableWorkshopSourceUrl(source.pageUrl || "", catalogUrl);
  const excerpt = sanitizeSensitiveText(source.sourceExcerpt || "");

  return `<div class="par-source-row">
    <div class="par-source-copy">
      <strong>${escapeHtml(labLabel || "Workshop source")}</strong>
      ${details.map((detail) => `<span>${escapeHtml(detail)}</span>`).join("")}
      ${excerpt ? `<code>${escapeHtml(excerpt)}</code>` : ""}
    </div>
    ${actionUrl ? externalActionLinkHtml(actionUrl, isExactLabSourceUrl(actionUrl) ? "Open exact lab" : catalogItemOpenLabel(catalogItem?.type)) : ""}
  </div>`;
}

function unifiedParFallbackSourceHtml(detail, item) {
  const label = detail.section || "The precise source location was not recorded.";
  const url = item.catalogItem?.normalized_href || item.catalogItem?.absolute_url || item.catalogItem?.href || "";
  return `<div class="par-source-row">
    <div class="par-source-copy"><strong>${escapeHtml(label)}</strong><span>Open the workshop and search for ${escapeHtml(detail.object_name || detail.label || "this PAR link")}.</span></div>
    ${url ? externalActionLinkHtml(url, "Open workshop") : ""}
  </div>`;
}

function unifiedParLabNumber(source) {
  const explicit = Number(source?.labNumber || 0);
  if (Number.isInteger(explicit) && explicit > 0) return explicit;
  const labelMatch = String(source?.label || "").match(/(?:^|:\s*)Lab\s+(\d+)\b/i);
  return labelMatch ? Number(labelMatch[1]) : 0;
}

function unifiedParSourceLabel(source, catalogItem) {
  const itemTitle = String(catalogItem?.title || "").trim();
  let label = String(source?.label || "").trim();
  if (itemTitle && label.startsWith(`${itemTitle}:`)) label = label.slice(itemTitle.length + 1).trim();
  label = label.replace(/^Preview instructions:\s*/i, "").replace(/^Lab\s+\d+\s*:?\s*/i, "").trim();
  return label || source?.section || "Workshop source";
}

function unifiedParStepLabel(instruction) {
  const value = String(instruction || "").trim();
  if (!value) return "";
  const numbered = value.match(/^(?:Step\s+)?(\d+)[.)]?\s*(.*)$/i);
  if (!numbered) return `Step: ${value}`;
  return `Step ${numbered[1]}${numbered[2] ? `: ${numbered[2]}` : ""}`;
}

function issueFindingCount(issues) {
  return (issues || []).reduce((count, issue) => {
    const details = operatorIssueDetails(issue);
    return count + (details.length || 1);
  }, 0);
}

function findingSummaryLabel(issues) {
  const categories = (issues || []).length;
  const findings = issueFindingCount(issues);
  return `${categories} categor${categories === 1 ? "y" : "ies"} · ${findings} finding${findings === 1 ? "" : "s"}`;
}

function csvTimestamp(runId) {
  const normalizedRunId = String(runId || "").replace(
    /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-\d{3}Z$/,
    "$1T$2:$3:$4Z",
  );
  const parsed = Date.parse(normalizedRunId);
  const date = Number.isNaN(parsed) ? new Date() : new Date(parsed);
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function unifiedParTechnicalHtml(detail, sources) {
  const maskedUrl = sanitizeSensitiveText(detail.masked_url || "");
  const resolverSource = sources
    .flatMap((source) => [source?.sourceFileUrl, source?.pageUrl])
    .find((sourceUrl) => isApprovedParResolverSource(sourceUrl));
  const canResolve = Boolean(maskedUrl && resolverSource && /^[a-f0-9]{16}$/i.test(String(detail.fingerprint || "")));
  const response = detail.http_status
    ? `HTTP ${detail.http_status}`
    : detail.error
      ? shortFailure(sanitizeSensitiveText(detail.error))
      : "No final response";

  return `<details class="issue-technical">
    <summary>Technical details for developers</summary>
    <div class="par-technical-body">
      ${
        maskedUrl
          ? `<div class="par-link-value">
              <code data-unified-par-value data-masked-value="${escapeAttribute(maskedUrl)}">${escapeHtml(maskedUrl)}</code>
              ${canResolve ? `<button class="copy-button" type="button" data-unified-par-copy data-source-url="${escapeAttribute(resolverSource)}" data-fingerprint="${escapeAttribute(detail.fingerprint)}">Copy full link</button>` : ""}
              ${canResolve ? `<button class="copy-button" type="button" data-unified-par-toggle data-source-url="${escapeAttribute(resolverSource)}" data-fingerprint="${escapeAttribute(detail.fingerprint)}">Show full link</button>` : ""}
            </div>`
          : ""
      }
      <div class="par-metadata">
        ${parMetadataHtml("Bucket", detail.bucket || "Not recorded")}
        ${parMetadataHtml("Namespace", detail.namespace || "Not recorded")}
        ${parMetadataHtml("Region", detail.region || "Not recorded")}
        ${parMetadataHtml("Response", response)}
      </div>
      ${detail.fingerprint ? `<span class="par-link-message">Technical link ID ${escapeHtml(detail.fingerprint)}. This identifies the exact PAR without storing its access token.</span>` : ""}
      <span class="par-link-message" data-unified-par-message></span>
      ${canResolve ? `<a class="link-button" data-unified-par-open hidden target="_blank" rel="noreferrer">Open full link</a>` : ""}
    </div>
  </details>`;
}

function parMetadataHtml(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function isApprovedParResolverSource(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && PAR_RESOLVER_SOURCE_HOSTS.has(url.hostname.toLowerCase()) && !url.username && !url.password && (!url.port || url.port === "443");
  } catch {
    return false;
  }
}

function parScanOperatorIssueHtml(issue, index, item, context) {
  const details = Array.isArray(issue.details) ? issue.details : [];
  const reviewId = reviewEntryId(item, context.summaryRunId || "");
  const pageCount = details.length || 1;
  return `<section class="operator-issue ${escapeAttribute(issue.severity || "major")}" data-issue-audience="${escapeAttribute(issueAudience(issue))}">
    <div class="par-entry-heading">
      <div class="operator-issue-heading">${priorityBadgeHtml(issue)}<span class="pill warn">Page not scanned</span><h4>${escapeHtml(index + 1)}. ${escapeHtml(issueDisplayLabel(issue))}</h4></div>
      <button class="review-button" type="button" data-review-action="retest" data-review-id="${escapeAttribute(reviewId)}" data-review-add-label="Add to PAR Retest" data-review-selected-label="Remove from PAR Retest">Add to PAR Retest</button>
    </div>
    <div class="issue-guidance"><p><strong>What failed:</strong> ${escapeHtml(`${pageCount} workshop page${pageCount === 1 ? " was" : "s were"} not scanned, so PAR links on ${pageCount === 1 ? "that page" : "those pages"} were not checked.`)}</p><p><strong>What QA should check:</strong> Verify the listed pages in a browser and investigate why the scan stopped before requesting a source change.</p></div>
    <div class="issue-location-block">
      <div class="issue-location-heading"><div><h5>Where scanning stopped</h5><p>PAR links on these pages were not checked.</p></div></div>
      ${details.map((detail, detailIndex) => parScanLocationHtml(detail, detailIndex, item)).join("\n") || "<p>Source page was not recorded.</p>"}
    </div>
  </section>`;
}

function parScanLocationHtml(detail, index, item) {
  const rawLabel = detail.label || detail.page_type || `Source page ${index + 1}`;
  const label = conciseManifestLocation(rawLabel);
  const sourceUrl = detail.source_file_url || detail.sourceFileUrl || (/[-_]source$/i.test(detail.page_type || "") ? detail.page_url || detail.pageUrl : "");
  const pageUrl = sourceUrl ? detail.page_url || detail.pageUrl || "" : detail.page_url || detail.pageUrl || "";
  const error = sanitizeSensitiveText(detail.error || "The page could not be scanned.");
  const fallbackUrl = item.catalogItem?.normalized_href || item.catalogItem?.absolute_url || item.catalogItem?.href || "";
  const actionPageUrl = stableWorkshopSourceUrl(pageUrl, fallbackUrl);
  const missingSource = /HTTP\s+404|returned\s+404|status\s+404/i.test(error) && /[-_]source$/i.test(detail.page_type || "");
  const finding = missingSource
    ? "This lab is listed in the workshop manifest, but its Markdown source file returned HTTP 404."
    : parScanErrorExplanation(error);
  const fix = missingSource
    ? "Restore the Markdown file, or correct its filename/path in the workshop manifest. If the lab was removed intentionally, remove that manifest entry."
    : "Restore this page or correct its configured route, then rerun the workshop.";
  return `<div class="par-source-row">
    <div class="par-source-copy"><strong>${escapeHtml(label)}</strong><span><b>What failed:</b> ${escapeHtml(finding)}</span><span><b>What to change:</b> ${escapeHtml(fix)}</span></div>
    <div class="result-actions">
      ${actionPageUrl && actionPageUrl !== sourceUrl ? externalActionLinkHtml(actionPageUrl, "Open workshop") : ""}
      ${externalActionLinkHtml(sourceUrl || actionPageUrl || fallbackUrl, sourceUrl ? "Open missing source" : "Open workshop")}
    </div>
    <details class="issue-technical"><summary>Technical details</summary><pre>${escapeHtml(error)}</pre></details>
  </div>`;
}

function conciseManifestLocation(value) {
  const label = String(value || "").trim();
  const surface = label.match(/(?:Preview instructions|Run on your (?:tenancy|environment) instructions)\s*:\s*(.+)$/i);
  return surface?.[1]?.trim() || label;
}

function issueLocationForItem(issue, item) {
  const tests = item.tests || [];
  const test = tests.find(
    (candidate) =>
      candidate.status !== candidate.expectedStatus &&
      (candidate.classification?.code === issue.code || candidate.section === issue.section || candidate.file === issue.file),
  ) || tests.find((candidate) => candidate.classification?.code === issue.code);
  const detail = primaryOperatorIssueDetail(issue);
  const section = humanIssueSection(issue.section || test?.section || detail?.section || "Workshop page");
  const locationHint = sourceLocationLabel(detail) || detail?.location || detail?.heading || "";
  const sectionKey = section.toLowerCase();
  const locationKey = String(locationHint).toLowerCase();
  const label = /^Workshop Source Quality$/i.test(section) && locationHint
    ? String(locationHint)
    : !locationHint
      ? section
      : locationKey.includes(sectionKey)
        ? String(locationHint)
        : sectionKey.includes(locationKey)
          ? section
          : `${section} / ${locationHint}`;
  const detailText = detail?.text || detail?.alt || detail?.object_name || "";
  const catalogUrl = item.catalogItem?.normalized_href || item.catalogItem?.absolute_url || item.catalogItem?.href || "";
  const url = stableWorkshopSourceUrl(
    detail?.pageUrl || detail?.page_url || issue.details?.pageUrl || issue.details?.page_url || test?.finalUrl || "",
    catalogUrl,
  );
  return {
    label,
    detail: detailText,
    url: safeExternalUrl(url),
    actionLabel: sourceLocationActionLabel(detail, item.catalogItem?.type),
  };
}

function sourceLocationLabel(detail) {
  if (!detail?.labTitle) return "";
  return [detail.labTitle, detail.section].filter(Boolean).join(" / ");
}

function sourceLocationActionLabel(detail, catalogItemType) {
  const pageUrl = detail?.pageUrl || detail?.page_url || "";
  if (detail?.labTitle && isExactLabSourceUrl(pageUrl)) return "Open exact lab";
  return catalogItemOpenLabel(catalogItemType);
}

function isExactLabSourceUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return !isSessionDependentWorkshopUrl(url) && url.searchParams.has("lab");
  } catch {
    return false;
  }
}

function stableWorkshopSourceUrl(value, fallback) {
  const candidate = safeExternalUrl(value);
  if (!candidate) return safeExternalUrl(fallback);
  try {
    const url = new URL(candidate);
    if (isSessionDependentWorkshopUrl(url)) return cleanWorkshopActionUrl(fallback);
    return cleanWorkshopActionUrl(url.toString());
  } catch {
    return cleanWorkshopActionUrl(fallback);
  }
}

function cleanWorkshopActionUrl(value) {
  const candidate = safeExternalUrl(value);
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    if (
      url.hostname.toLowerCase() === "livelabs.oracle.com" &&
      url.pathname.toLowerCase().startsWith("/ords/")
    ) {
      for (const key of ["session", "cs", "p_instance", "x01"]) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return "";
  }
}

function isSessionDependentWorkshopUrl(value) {
  try {
    const url = value instanceof URL ? value : new URL(String(value || ""));
    return (
      /\/(?:preview-sandbox-instructions|run-workshop)$/i.test(url.pathname) ||
      url.searchParams.has("session") ||
      /\*{3}/.test(url.search)
    );
  } catch {
    return false;
  }
}

function primaryOperatorIssueDetail(issue) {
  const details = operatorIssueDetails(issue);
  if (details.length > 0) return details.find((entry) => entry && typeof entry === "object") || {};
  return issue.details && typeof issue.details === "object" ? issue.details : {};
}

function humanIssueSection(value) {
  const section = String(value || "").replace(/^Generated\s+/i, "").trim();
  if (/tenancy instructions/i.test(section)) return "Run on your tenancy instructions";
  if (/preview instructions/i.test(section)) return "Preview instructions";
  if (/workshop overview/i.test(section)) return "Workshop overview";
  return section || "Workshop page";
}

function externalActionLinkHtml(url, label) {
  const safeUrl = safeExternalUrl(url);
  return safeUrl ? `<a class="link-button" href="${escapeAttribute(safeUrl)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>` : "";
}

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function operatorIssueAffectedItemsHtml(issue, item) {
  const details = operatorIssueDetails(issue);
  if (details.length === 0) {
    return "";
  }

  const entries = details
    .map((detail, index) => operatorIssueDetail(detail, index, item, issue))
    .filter(Boolean)
    .sort((left, right) => affectedItemOrder(left, right, issue));

  if (entries.length === 0) {
    return "";
  }

  return `<div class="affected-items">
    <strong>${escapeHtml(operatorIssueAffectedHeading(issue))}</strong>
    ${entries.map((entry) => entry.sourceQualityIssue
      ? sourceQualityAffectedItemHtml(entry, item)
      : `<div class="affected-item-row">
          <div class="affected-item-copy">
            <strong>${escapeHtml(entry.label)}</strong>
            ${entry.url && issue.code !== "BROKEN_VISIBLE_IMAGE" ? `<code>${escapeHtml(entry.url)}</code>` : ""}
            ${entry.detail ? `<span>${escapeHtml(entry.detail)}</span>` : ""}
          </div>
          ${entry.actionUrl ? externalActionLinkHtml(entry.actionUrl, entry.actionLabel || catalogItemOpenLabel(item?.catalogItem?.type)) : ""}
        </div>`).join("")}
  </div>`;
}

function affectedItemOrder(left, right, issue) {
  if (issue.code !== "SOURCE_SCAN_INCOMPLETE") return 0;
  const leftLab = affectedItemLabNumber(left);
  const rightLab = affectedItemLabNumber(right);
  if (leftLab !== rightLab) return leftLab - rightLab;
  return String(left.label || "").localeCompare(String(right.label || ""), undefined, { numeric: true });
}

function affectedItemLabNumber(entry) {
  if (Number(entry?.labNumber) > 0) return Number(entry.labNumber);
  const match = String(entry?.label || entry?.location || "").match(/\bLab\s+(\d+)\b/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function sourceQualityAffectedItemHtml(entry, item) {
  const labTitle = String(entry.labTitle || entry.location || "Workshop source").trim();
  const section = String(entry.section || "").trim();
  const sourceLine = Number(entry.sourceLine || 0);
  const source = sourceQualityExcerpt(entry.sourceText, sourceQualityTarget(entry));
  const correctedText = sourceQualityCorrectedText(entry);
  const corrected = correctedText ? sourceQualityExcerpt(correctedText, "") : null;
  const actionLabel = entry.labNumber > 0 && isExactLabSourceUrl(entry.actionUrl)
    ? `Open Lab ${entry.labNumber}`
    : entry.actionLabel || catalogItemOpenLabel(item?.catalogItem?.type);

  return `<div class="affected-item-row source-quality-row">
    <div class="source-quality-copy">
      <strong>${escapeHtml(entry.label)}</strong>
      <div class="source-quality-location">
        <span>WHERE</span>
        <strong>${escapeHtml(labTitle)}</strong>
        ${section && section !== labTitle ? `<span>${escapeHtml(section)}</span>` : ""}
        ${sourceLine > 0 ? `<span class="source-quality-line">Markdown line ${escapeHtml(String(sourceLine))}</span>` : ""}
      </div>
      ${source ? `<div class="source-quality-edit"><span>Find this text</span><code>${source.html}</code></div>` : ""}
      ${corrected ? `<div class="source-quality-edit"><span>Replace with</span><code>${corrected.html}</code></div>` : `<p class="source-quality-fix"><strong>Fix:</strong> ${escapeHtml(entry.suggestion || "Review and correct this source text.")}</p>`}
    </div>
    ${entry.actionUrl ? externalActionLinkHtml(entry.actionUrl, actionLabel) : ""}
  </div>`;
}

function sourceQualityTarget(entry) {
  const text = String(entry.sourceText || "");
  const marker = String(entry.marker || "");
  const label = String(entry.sourceLabel || entry.label || "");
  if (/space before closing/i.test(label)) {
    return text.match(/\s+\*\*/)?.[0] || marker;
  }
  return marker;
}

function sourceQualityCorrectedText(entry) {
  const text = String(entry.sourceText || "");
  const marker = String(entry.marker || "");
  const label = String(entry.sourceLabel || entry.label || "");
  const suggestion = String(entry.suggestion || "");
  if (!text || !marker) return "";

  if (/repeated word/i.test(label)) {
    const words = marker.trim().split(/\s+/);
    if (words.length === 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
      return replaceFirstCaseInsensitive(text, marker, words[0]);
    }
  }
  if (/space before punctuation/i.test(label)) {
    return replaceFirstCaseInsensitive(text, marker, marker.replace(/\s+([,.;!?])$/, "$1"));
  }
  if (/missing space after punctuation/i.test(label) && /^[,;:!?][A-Za-z]$/.test(marker)) {
    return replaceFirstCaseInsensitive(text, marker, `${marker[0]} ${marker[1]}`);
  }
  if (/space before closing/i.test(label)) {
    const target = text.match(/\s+\*\*/)?.[0] || "";
    return target ? text.replace(target, "**") : "";
  }
  if (/typo/i.test(label)) {
    const replacement = suggestion.match(/replace it with\s+["']([^"']+)["']/i)?.[1] || "";
    return replacement ? replaceFirstCaseInsensitive(text, marker, replacement) : "";
  }
  return "";
}

function replaceFirstCaseInsensitive(text, search, replacement) {
  const index = text.toLowerCase().indexOf(search.toLowerCase());
  if (index < 0) return "";
  return `${text.slice(0, index)}${replacement}${text.slice(index + search.length)}`;
}

function sourceQualityExcerpt(value, target, maxLength = 220) {
  const text = String(value || "").trim();
  if (!text) return null;
  const needle = String(target || "");
  const targetIndex = needle ? text.toLowerCase().indexOf(needle.toLowerCase()) : -1;
  const focus = targetIndex >= 0 ? targetIndex : 0;
  const start = text.length > maxLength ? Math.max(0, Math.min(focus - 80, text.length - maxLength)) : 0;
  const end = Math.min(text.length, start + maxLength);
  const excerpt = text.slice(start, end);
  const localIndex = needle ? excerpt.toLowerCase().indexOf(needle.toLowerCase()) : -1;
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  if (localIndex < 0) return { html: `${prefix}${escapeHtml(excerpt)}${suffix}` };
  return {
    html: `${prefix}${escapeHtml(excerpt.slice(0, localIndex))}<mark>${escapeHtml(excerpt.slice(localIndex, localIndex + needle.length))}</mark>${escapeHtml(excerpt.slice(localIndex + needle.length))}${suffix}`,
  };
}

function operatorIssueDetails(issue) {
  if (Array.isArray(issue.details)) return issue.details;
  if (!issue.details || typeof issue.details !== "object") return [];
  for (const key of ["brokenLinks", "brokenImages", "brokenEmbeds", "items"]) {
    if (Array.isArray(issue.details[key])) return issue.details[key];
  }
  return [];
}

function operatorIssueAffectedHeading(issue) {
  if (issue.code === "BROKEN_VISIBLE_LINK") return "Broken link to replace or remove";
  if (issue.code === "BROKEN_VISIBLE_IMAGE") return "Broken image to replace or remove";
  if (issue.code === "BROKEN_EMBEDDED_CONTENT") return "Broken embedded item to repair or remove";
  if (issue.code === "ASSET_ACTION_FAILED") return "Asset action that failed";
  if (issue.code === "CONTENT_TEXT_DEFECT") return "Placeholder or misspelling to replace";
  if (issue.code === "MARKDOWN_FORMATTING") return "Markdown source to correct";
  if (issue.code === "WRITING_GRAMMAR") return "Grammar or punctuation to review";
  if (issue.code === "POSSIBLE_TYPO") return "Word to review";
  return "Affected item";
}

function operatorIssueProblem(issue, item) {
  if (issue.code === "LINK_CHECK_INCOMPLETE") return issue.message;
  if (issue.code === "SOURCE_SCAN_INCOMPLETE") return issue.message || "The workshop opened, but some instruction sources could not be checked.";
  const details = operatorIssueDetails(issue);
  const issueCode = canonicalIssueCode(issue.code);
  if (issueCode === "WORKSHOP_NOT_AVAILABLE") {
    return `${catalogItemDisplayTitle(item?.catalogItem)} could not be opened from its published LiveLabs catalog route.`;
  }
  if (issueCode === "AUTHENTICATION_REQUIRED") {
    return `The QA browser reached Oracle Sign In before it could inspect ${catalogItemDisplayTitle(item?.catalogItem)}. The identity URL is the Oracle authentication page reached by the flow, not a workshop link to repair, and this does not prove that the catalog item is broken.`;
  }
  if (issueCode === "PAGE_TIMED_OUT") {
    return `The QA browser did not finish this check before the time limit. This result alone does not prove that ${catalogItemDisplayTitle(item?.catalogItem)} is broken.`;
  }
  if (issueCode === "UNEXPECTED_DESTINATION") {
    return `The action opened a page, but it was not the expected LiveLabs destination for ${catalogItemDisplayTitle(item?.catalogItem)}.`;
  }
  if (issueCode === "QA_SETUP_FAILED") {
    return `The QA browser or its saved session failed before ${catalogItemDisplayTitle(item?.catalogItem)} could be checked. This is not an owner-facing workshop defect.`;
  }
  if (issueCode === "QA_CHECK_FAILED") {
    return `The automated check stopped without enough evidence to identify a problem in ${catalogItemDisplayTitle(item?.catalogItem)}.`;
  }
  if (issue.code === "BROKEN_VISIBLE_LINK" && details.length > 0) {
    const first = details[0] || {};
    const location = sourceLocationLabel(first) || first.location || humanIssueSection(issue.section);
    const linkLabel = operatorIssueDetailLabel(first, 0) || "the listed link";
    if (details.length === 1 && isInternalPreviewContentUrl(first.url || first.href)) {
      return `In ${location}, the link "${linkLabel}" points to an internal Oracle preview address that workshop readers cannot use.`;
    }
    if (details.length === 1) {
      const result = first.status ? ` returns HTTP ${first.status}` : " does not open";
      return `In ${location}, the link "${linkLabel}"${result}.`;
    }
    return `In ${location}, ${details.length} links do not open. Each broken destination is listed below.`;
  }
  if (issue.code === "BROKEN_VISIBLE_IMAGE" && details.length > 0) {
    const first = details[0] || {};
    const location = sourceLocationLabel(first) || first.location || humanIssueSection(issue.section);
    const imageLabel = String(first.alt || "").trim() || "the listed image";
    return details.length === 1
      ? `In ${location}, the image "${imageLabel}" did not load.`
      : `In ${location}, ${details.length} images did not load. Each affected image is listed below.`;
  }
  if (issue.code === "BROKEN_EMBEDDED_CONTENT" && details.length > 0) {
    return `${details.length} embedded item${details.length === 1 ? " does" : "s do"} not load.`;
  }
  if (issue.code === "ASSET_ACTION_FAILED" && details.length > 0) {
    const label = operatorIssueDetailLabel(details[0], 0) || "The listed asset action";
    return `The LiveStack action "${label}" did not open, download, or navigate as expected.`;
  }
  if (issue.code === "CONTENT_TEXT_DEFECT" && details.length > 0) {
    const exactText = operatorIssueDetailLabel(details[0], 0) || "The listed text";
    return `The exact text "${exactText}" is unfinished placeholder or misspelled content that readers can see.`;
  }
  if (issue.code === "MARKDOWN_FORMATTING" && details.length > 0) {
    return `${details.length} Markdown formatting problem${details.length === 1 ? "" : "s"} may prevent workshop text, links, headings, or code blocks from rendering as intended.`;
  }
  if (issue.code === "WRITING_GRAMMAR" && details.length > 0) {
    return `${details.length} likely repeated-word or punctuation-spacing problem${details.length === 1 ? "" : "s"} was found in the workshop source.`;
  }
  if (issue.code === "POSSIBLE_TYPO" && details.length > 0) {
    const first = details[0] || {};
    return `The word "${first.marker || operatorIssueDetailLabel(first, 0) || "listed below"}" may be misspelled. The report includes a suggested correction and the exact source line.`;
  }
  if (issue.code === "CONTENT_RELEVANCE") {
    const detail = primaryOperatorIssueDetail(issue);
    const expectedTerms = Array.isArray(detail.expectedTerms) ? detail.expectedTerms.filter(Boolean) : [];
    const title = item?.catalogItem?.title || "this workshop";
    const expected = expectedTerms.length > 0 ? expectedTerms.join(", ") : title;
    return `The ${humanIssueSection(issue.section)} page opened, but its visible content did not match "${expected}". It may be blank, outdated, or connected to a different workshop.`;
  }
  return issue.message || issueDisplayLabel(issue);
}

function operatorIssueReproduction(issue, item) {
  const details = operatorIssueDetails(issue);
  const first = details[0] || {};
  const location = sourceLocationLabel(first) || first.location || humanIssueSection(issue.section);
  const itemTitle = catalogItemDisplayTitle(item?.catalogItem);
  switch (canonicalIssueCode(issue.code)) {
    case "WORKSHOP_NOT_AVAILABLE":
      return `Open "${itemTitle}" from LiveLabs search. The published card does not reach a usable item page.`;
    case "AUTHENTICATION_REQUIRED":
      return `Open "${itemTitle}" with the QA browser session. The run stopped at Oracle Sign In before content checks began.`;
    case "UNEXPECTED_DESTINATION":
      return `Open "${itemTitle}" from its LiveLabs catalog card and repeat the reported action; confirm which page opens.`;
    case "ASSET_ACTION_FAILED":
      return `Open ${itemTitle}, go to ${location}, and click "${operatorIssueDetailLabel(first, 0) || "the listed asset action"}".`;
    case "CONTENT_TEXT_DEFECT":
      return `Open ${itemTitle}, go to ${location}, and search for "${operatorIssueDetailLabel(first, 0) || "the listed text"}".`;
    case "MARKDOWN_FORMATTING":
    case "WRITING_GRAMMAR":
    case "POSSIBLE_TYPO":
      return `Open ${itemTitle}, go to ${location}, and review Markdown line ${first.sourceLine || "shown below"}.`;
    case "BROKEN_VISIBLE_LINK":
      return `Open ${itemTitle}, go to ${location}, and click "${operatorIssueDetailLabel(first, 0) || "the listed link"}".`;
    case "BROKEN_VISIBLE_IMAGE":
    case "BROKEN_EMBEDDED_CONTENT":
      return `Open ${itemTitle} and go to ${location}; the listed item does not render.`;
    default:
      return "";
  }
}

function operatorIssueDetail(detail, index, item, issue) {
  const label = operatorIssueDetailLabel(detail, index);
  if (!label) return null;
  if (!detail || typeof detail !== "object") return { label, url: "", detail: "", actionUrl: "" };
  const url = safeExternalUrl(detail.url || detail.href || detail.src || "");
  const internalPreview = isInternalPreviewContentUrl(url);
  const result = detail.suggestion
    ? String(detail.suggestion)
    : internalPreview
      ? "Internal preview address; replace it with a public documentation link"
      : detail.status
        ? `HTTP ${detail.status}`
        : detail.error
          ? shortFailure(detail.error)
          : "";
  const location = detail.location ? `Found in ${detail.location}` : "";
  const sourceLine = detail.sourceLine ? `Markdown line ${detail.sourceLine}` : "";
  const sourceExcerpt = detail.text && detail.marker ? `Source: ${detail.text}` : "";
  const fallbackUrl = item?.catalogItem?.normalized_href || item?.catalogItem?.absolute_url || item?.catalogItem?.href || "";
  const sourceQualityIssue = ["MARKDOWN_FORMATTING", "WRITING_GRAMMAR", "POSSIBLE_TYPO"].includes(issue?.code);
  const actionUrl = stableWorkshopSourceUrl(detail.pageUrl || detail.page_url || "", fallbackUrl);
  return {
    label,
    url,
    detail: [location, sourceLine, sourceExcerpt, result].filter(Boolean).join(" / "),
    actionUrl,
    actionLabel: sourceLocationActionLabel(detail, item?.catalogItem?.type),
    sourceQualityIssue,
    sourceLabel: detail.label || "",
    sourceText: detail.text || "",
    marker: detail.marker || "",
    suggestion: result,
    location: detail.location || "",
    labTitle: detail.labTitle || "",
    labNumber: Number(detail.labNumber || 0),
    section: detail.section || "",
    sourceLine: Number(detail.sourceLine || 0),
  };
}

function isInternalPreviewContentUrl(value) {
  try {
    return new URL(String(value || "")).hostname.toLowerCase() === "preview.content.oci.oracleiaas.com";
  } catch {
    return false;
  }
}

function operatorIssueDetailLabel(detail, index) {
  if (typeof detail === "string") {
    return shortFailure(detail);
  }
  if (!detail || typeof detail !== "object") {
    return "";
  }

  if (detail.alt) return `Image: ${detail.alt}`;
  if (detail.marker && detail.label) return `${detail.label}: ${detail.marker}`;
  if (detail.text) return String(detail.text);
  if (detail.label) return String(detail.label);
  if (detail.object_name) return `File: ${detail.object_name}`;

  const url = detail.src || detail.href || detail.url || "";
  if (url) {
    try {
      const parsed = new URL(String(url));
      const file = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || "");
      return file || parsed.hostname;
    } catch {
      return `Affected item ${index + 1}`;
    }
  }

  return "";
}

function operatorIssueAction(issue, item) {
  switch (canonicalIssueCode(issue.code)) {
    case "LINK_CHECK_INCOMPLETE":
      return "Open the listed link from its source page and retry the check. Do not replace a working link just because the checker was blocked.";
    case "SOURCE_SCAN_INCOMPLETE":
      return "Open each listed lab. If a page is blank or missing, restore its source or correct its manifest entry. A source-fetch failure alone does not prove that the rendered page is broken.";
    case "WORKSHOP_NOT_AVAILABLE":
      return "Confirm the published item route in a normal browser. If it opens, investigate the QA navigation before asking the author to change anything.";
    case "AUTHENTICATION_REQUIRED":
      return "Refresh the QA browser sign-in session and rerun this item. Do not change the workshop unless the rerun reaches it and reports a content problem.";
    case "PAGE_TIMED_OUT":
      return "Rerun this item. If it times out again, inspect the reached page and network evidence before asking the workshop owner to change content.";
    case "UNEXPECTED_DESTINATION":
      return "Confirm the destination in a normal browser and inspect the QA navigation before requesting a catalog change.";
    case "QA_SETUP_FAILED":
      return "Repair the QA browser or saved sign-in setup, then rerun this item. Do not change the workshop based on this result.";
    case "QA_CHECK_FAILED":
      return "Rerun this item and use the developer evidence if it stops again. Do not change workshop content until the report identifies a specific defect.";
    case "BROKEN_VISIBLE_IMAGE":
      return "Open the exact page listed below. Repair or remove the affected image, republish the workshop, then rerun this item.";
    case "BROKEN_VISIBLE_LINK":
      return operatorIssueDetails(issue).some((detail) => isInternalPreviewContentUrl(detail?.url || detail?.href))
        ? "Replace the internal preview address with the current public documentation URL. Republish the workshop, then rerun this item."
        : "Open the workshop page shown below, replace each listed URL with a working link or remove it, then republish and rerun this item.";
    case "BROKEN_EMBEDDED_CONTENT":
      return "Repair or remove each embedded item listed below, republish the workshop, then rerun this item.";
    case "CONTENT_TEXT_DEFECT":
      return "Replace the exact placeholder or misspelled text listed below, republish the item, and rerun this check.";
    case "MARKDOWN_FORMATTING":
      return "Correct the Markdown marker, heading, link, or code fence shown below, republish the workshop, and rerun this check.";
    case "WRITING_GRAMMAR":
      return "Review the exact source line below, correct the repeated word or punctuation spacing, republish the workshop, and rerun this check.";
    case "POSSIBLE_TYPO":
      return "Confirm the intended word using the source line below. Apply the suggested spelling when correct, republish the workshop, and rerun this check.";
    case "CONTENT_RELEVANCE":
      return `Open the ${humanIssueSection(issue.section)} page below. If it is blank or shows another workshop, correct that instructions-page configuration. If the page is correct, update the catalog title or metadata for "${item?.catalogItem?.title || "this workshop"}". Republish, then rerun this item.`;
    case "INSTRUCTIONS_FLOW":
      return "Correct the instructions route or content that did not open, republish, and rerun this item.";
    case "ASSET_ACTION_FAILED":
      return "Confirm the action with the required access, then ask the owner to repair it only if it fails for learners.";
    case "STALE_PAR_LINK":
      return "Replace the broken PAR link at every recorded source location, republish, and rerun the PAR audit.";
    case "PAR_LINK_UNVERIFIED":
      return "Run the PAR audit for this LiveLabs item again before changing its content.";
    case "PAR_SCAN_INCOMPLETE":
      return "Check whether the listed pages render for learners, then investigate the scan failure and rerun the PAR audit.";
    default:
      return "Open the item, correct the reported problem, and rerun this item.";
  }
}

function itemFailureDeveloperHtml(failure, index, context) {
  const bugId = `item-bug-${index}-${stableId(failure.titlePath.join("-"))}`;
  const catalogUrl = failure.catalogItem?.normalized_href || failure.catalogItem?.absolute_url || "";
  const issues = issuesForTest(failure);
  const primaryIssue = issues[0];
  const error = failure.errors?.[0] ? displayFailure(failure.errors[0]) : "";

  return `<section class="developer-test">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Failed check</p>
        <h3>${escapeHtml(failure.section)}</h3>
        ${primaryIssue ? `<span class="pill info">${escapeHtml(primaryIssue.code)}</span>` : ""}
      </div>
      <button class="copy-button" type="button" data-copy="${escapeAttribute(bugId)}">Copy bug report</button>
    </div>
    <div class="route-grid">
      ${routeCardHtml("Test tried", catalogUrl, "Original generated catalog URL.", "Open tried URL")}
      ${routeCardHtml("Browser ended at", failure.finalUrl, `Page title: ${failure.finalTitle || "Unknown"}`, "Open reached URL")}
    </div>
    ${artifactLinksHtml(failure.attachments, context)}
    <details class="raw-developer-evidence">
      <summary>Raw automation details</summary>
      ${failure.failedStep ? failedStepSummaryHtml(failure.failedStep) : ""}
      <div class="meta-grid">
        <div class="meta-item"><strong>Test file</strong><span><code>${escapeHtml(`${failure.file}:${failure.line}`)}</code></span></div>
        ${error ? `<div class="meta-item developer-error"><strong>Error</strong><span>${escapeHtml(error)}</span></div>` : ""}
      </div>
    </details>
    <pre id="${escapeAttribute(bugId)}" class="bug copy-source">${escapeHtml(failure.bugSummary)}</pre>
  </section>`;
}
function itemDetailId(item) {
  return `item-${stableId(item.key || catalogItemDisplayTitle(item.catalogItem))}`;
}

function issueDisplayLabel(issue) {
  if (issue?.code === "CONTENT_RELEVANCE") return "Wrong or unrelated instructions content";
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
  const statusLabel = test.status === test.expectedStatus ? test.retry > 0 ? "Passed after retry" : "Passed" : "Failed";

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

function catalogItemTypeLabel(type) {
  if (type === "livestack") return "LiveStack";
  if (type === "workshop") return "Workshop";
  if (type === "sprint") return "Sprint";
  if (type === "event") return "Event";
  return type || "Catalog item";
}

function catalogItemIdentifier(item) {
  const ids = Array.from(new Set([...(item?.ids || []), item?.id].filter(Boolean).map(String)));
  const id = ids.length > 1 ? ids.join(", ") : ids[0] || item?.slug || "";
  if (!id) return "";
  return item?.type === "livestack" ? `LiveStack ID${ids.length > 1 ? "s" : ""} ${id}` : `LiveLabs ID${ids.length > 1 ? "s" : ""} ${id}`;
}

function catalogItemOpenLabel(type) {
  if (type === "livestack") return "Open LiveStack";
  if (type === "sprint") return "Open Sprint";
  if (type === "event") return "Open event";
  return "Open workshop";
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

  const code = canonicalIssueCode(test.classification.code);
  const definition = issueTypeDefinition(code);
  return [
    {
      code,
      label: code === test.classification.code ? test.classification.label || definition.label : definition.label,
      severity: issueSeverityFromCode(code),
      message: failureExplanation(test),
      details: test.errors?.[0] ? { error: singleLine(test.errors[0]) } : undefined,
    },
  ];
}

function issueSeverityFromCode(code) {
  if (/^(?:WORKSHOP_NOT_AVAILABLE|ROUTING_)$/i.test(canonicalIssueCode(code))) {
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

  switch (canonicalIssueCode(failure.classification.code)) {
    case "WORKSHOP_NOT_AVAILABLE":
      return `The published LiveLabs catalog item did not reach a usable page after retries. The browser ended at ${finalTitle}.`;
    case "AUTHENTICATION_REQUIRED":
      return "The QA browser reached Oracle Sign In before the item could be inspected. Refresh the QA sign-in session and rerun before asking the workshop owner to change anything.";
    case "PAGE_TIMED_OUT":
      return "The page did not finish loading or reach the expected state before the QA time limit. Rerun it before treating this as a workshop defect.";
    case "UNEXPECTED_DESTINATION":
      return "The action opened a page, but it was not the LiveLabs destination expected by this check.";
    case "QA_SETUP_FAILED":
      return "The QA browser, saved sign-in state, or test fixture failed before the LiveLabs item could be inspected.";
    case "QA_CHECK_FAILED":
      return "The automated check stopped without enough evidence to identify a workshop defect. Rerun the item and review the developer evidence if it repeats.";
    case "BROKEN_VISIBLE_IMAGE":
      return "A visible image on the page did not load correctly.";
    case "BROKEN_VISIBLE_LINK":
      return "A visible link on the page appears broken or unreachable.";
    case "BROKEN_EMBEDDED_CONTENT":
      return "An embedded item, such as an iframe or media block, did not render correctly.";
    case "CONTENT_TEXT_DEFECT":
      return "The page showed content that looks unfinished, misspelled, or template-like.";
    case "MARKDOWN_FORMATTING":
      return "The workshop source contains Markdown that may not render as intended.";
    case "WRITING_GRAMMAR":
      return "The workshop source contains a likely repeated word or punctuation-spacing problem.";
    case "POSSIBLE_TYPO":
      return "The workshop source contains a word that may be misspelled and needs a quick author review.";
    case "CONTENT_RELEVANCE":
      return "The page loaded, but the visible content did not match the indexed catalog item closely enough.";
    case "INSTRUCTIONS_FLOW":
      return "The instructions path did not open or render correctly.";
    case "ASSET_ACTION_FAILED":
      return "A LiveStack asset action did not open, download, or navigate as expected.";
    default:
      return finalUrl
        ? `The test failed after the browser reached ${finalTitle}. Use the screenshot and trace for the exact page state.`
        : "The test failed before a final browser page could be captured.";
  }
}

function issueTypeDefinition(code) {
  const canonicalCode = canonicalIssueCode(code);
  return ISSUE_TYPE_DEFINITIONS.find((item) => item.code === canonicalCode) || {
    code: canonicalCode,
    label: "QA check did not complete",
    description: "The automated check stopped without enough evidence to identify a workshop defect. Rerun it before changing content.",
    audience: "internal",
  };
}

function priorityDefinition(code) {
  return PRIORITY_DEFINITIONS.find((item) => item.code === code);
}

function issuePriority(issue) {
  return issueTypeDefinition(issue?.code || "QA_CHECK_FAILED").priority || "";
}

function issueAudience(issue) {
  return issueTypeDefinition(issue?.code || "QA_CHECK_FAILED").audience || "internal";
}

function issuePriorityRank(issue) {
  return issuePriority(issue) ? Number(issuePriority(issue).slice(1)) : Number.MAX_SAFE_INTEGER;
}

function itemPriority(item) {
  return itemPriorities(item)[0] || "";
}

function itemPriorities(item) {
  return Array.from(new Set((item?.issues || []).map(issuePriority).filter(Boolean))).sort(
    (left, right) => Number(left.slice(1)) - Number(right.slice(1)),
  );
}

function itemPriorityRank(item) {
  const priority = itemPriority(item);
  return priority ? Number(priority.slice(1)) : Number.MAX_SAFE_INTEGER;
}

function issueTypeGuideHtml() {
  return `<details class="issue-guide">
    <summary>All issue types this report understands</summary>
    <div class="issue-guide-grid">
      ${ISSUE_TYPE_DEFINITIONS.map(
        (item) => `<div class="issue-guide-item">
          <strong>${item.priority ? `<span class="priority-badge ${escapeAttribute(item.priority.toLowerCase())}">${escapeHtml(item.priority)}</span>` : `<span class="priority-badge p3">Internal QA</span>`} ${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(item.description)}</span>
        </div>`,
      ).join("\n")}
    </div>
  </details>`;
}

function routeCardHtml(label, url, note, linkLabel) {
  const canReopen = url && !isSessionDependentWorkshopUrl(url);
  return `<div class="route-card">
    <strong>${escapeHtml(label)}</strong>
    ${url ? `<code>${escapeHtml(url)}</code>${canReopen ? linkHtml(url, linkLabel, "link-button") : ""}` : "<span>Not captured</span>"}
    ${url && !canReopen ? "<span class=\"route-note\">This address belonged to the completed browser session and cannot be reopened.</span>" : ""}
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
  const primary = preferredPrimaryEvidence(attachments)
    .filter((attachment) => attachment.path)
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
  const links = [
    ...preferredPrimaryEvidence(attachments),
    ...attachments.filter((attachment) => /error-context|dom-snapshot|page-state|catalog-item/i.test(attachment.name)),
  ]
    .filter((attachment) => attachment.path)
    .map((attachment) => artifactLinkHtml(attachment, context));

  return links.length > 0 ? `<div class="artifact-links">${links.join(" ")}</div>` : "";
}

function artifactLinkHtml(attachment, context = {}) {
  return linkHtml(
    reportArtifactLink(attachment.path, context.outputDir),
    artifactLabel(attachment),
    "link-button",
    artifactTitle(attachment),
    true,
  );
}

function preferredPrimaryEvidence(attachments) {
  const highlighted = attachments.filter((attachment) => /highlighted-issue-screenshot/i.test(attachment.name));
  const traces = attachments.filter((attachment) => /trace/i.test(attachment.name));
  return [...highlighted, ...traces];
}

function artifactLabel(attachment) {
  if (/highlighted-issue-screenshot/i.test(attachment.name)) return "Highlighted issue";
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
  const command = 'node ./node_modules/playwright/cli.js show-trace "<downloaded-trace.zip>"';

  return `<details class="trace-help">
    <summary>Open trace in Playwright</summary>
    <p class="error-preview">Download the Trace zip, replace the placeholder below with that downloaded file, and run this from the qa-automation directory. It uses the installed Playwright package and does not contact npm.</p>
    <pre id="${escapeAttribute(commandId)}">${escapeHtml(command)}</pre>
    <button class="copy-button" type="button" data-copy="${escapeAttribute(commandId)}">Copy trace command</button>
  </details>`;
}

function reportArtifactLink(projectRelativePath, outputDir) {
  if (!outputDir) {
    return relativeLinkFromReportOutput(projectRelativePath);
  }

  const sourcePath = path.resolve(PROJECT_ROOT, projectRelativePath);
  const evidenceDir = path.join(outputDir, "evidence");
  const safeName = path.basename(sourcePath).replace(/[^a-z0-9._-]+/gi, "-");
  const targetName = `${stableId(projectRelativePath)}-${safeName}`;
  const targetPath = path.join(evidenceDir, targetName);
  if (fs.existsSync(targetPath)) {
    return `evidence/${targetName}`;
  }

  const projectPrefix = `${PROJECT_ROOT}${path.sep}`;
  if ((!sourcePath.startsWith(projectPrefix) && sourcePath !== PROJECT_ROOT) || !fs.existsSync(sourcePath)) {
    return relativeLinkFromReportOutput(projectRelativePath, outputDir);
  }

  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
  return `evidence/${targetName}`;
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

function linkHtml(href, label, className = "", title = "", newTab = false) {
  const safeHref = /^(https?:)?\/\//i.test(href) || href.startsWith("../") || href.startsWith("./") ? href : `./${href}`;
  return `<a${className ? ` class="${escapeAttribute(className)}"` : ""}${title ? ` title="${escapeAttribute(title)}"` : ""} href="${escapeAttribute(safeHref)}"${newTab ? ' target="_blank" rel="noreferrer"' : ""}>${escapeHtml(label)}</a>`;
}

function metric(label, value, className = "") {
  return `<div class="metric ${className}"><strong>${value}</strong><span>${escapeHtml(label)}</span></div>`;
}

function runStatusLabel(summary) {
  if (
    summary.completion?.state === "incomplete" ||
    summary.status === "interrupted" ||
    summary.status === "timedout" ||
    summary.counts.interrupted > 0 ||
    summary.counts.timedOut > 0
  ) {
    return "Failed - incomplete";
  }

  if (summary.counts.unexpected > 0) {
    return "Completed with issues";
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
  if (
    summary.completion?.state === "incomplete" ||
    summary.status === "interrupted" ||
    summary.status === "timedout" ||
    summary.counts.interrupted > 0 ||
    summary.counts.timedOut > 0
  ) {
    return "fail";
  }

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

function reportLandingPage(value) {
  return value === "par-links.html" ? "par-links.html" : "summary.html";
}

function relativeReportHref(fromDir, targetFile) {
  return path.relative(fromDir, targetFile).replace(/\\/g, "/") || path.basename(targetFile);
}

export function writeReportHistory(reportsRoot, landingPage) {
  const runs = readReportHistory(reportsRoot, landingPage);
  const reportChannel = runs[0]?.reportChannel || reportChannelFromRoot(reportsRoot);
  const history = {
    schema_version: 1,
    report_channel: reportChannel,
    landing_page: landingPage,
    generated_at: new Date().toISOString(),
    runs,
  };

  fs.mkdirSync(reportsRoot, { recursive: true });
  fs.writeFileSync(path.join(reportsRoot, "history.json"), `${JSON.stringify(history, null, 2)}\n`, "utf-8");
  fs.writeFileSync(path.join(reportsRoot, "index.html"), reportHistoryPageHtml(history), "utf-8");
  writeParReportTimeline(reportsRoot, landingPage, runs);
}

function writeParReportTimeline(reportsRoot, landingPage, runs) {
  if (landingPage !== "par-links.html" || !Array.isArray(runs) || runs.length === 0) {
    return;
  }

  for (const [index, run] of runs.entries()) {
    const outputDir = path.join(reportsRoot, "runs", run.runId);
    rewriteParReportWithTimeline(outputDir, reportsRoot, {
      olderReportHref:
        index + 1 < runs.length
          ? relativeReportHref(outputDir, path.join(reportsRoot, "runs", runs[index + 1].runId, landingPage))
          : "",
      newerReportHref:
        index > 0
          ? relativeReportHref(outputDir, path.join(reportsRoot, "runs", runs[index - 1].runId, landingPage))
          : "",
    });
  }

  const latestDir = path.join(reportsRoot, "latest");
  rewriteParReportWithTimeline(latestDir, reportsRoot, {
    olderReportHref:
      runs.length > 1
        ? relativeReportHref(latestDir, path.join(reportsRoot, "runs", runs[1].runId, landingPage))
        : "",
    newerReportHref: "",
  });
}

function rewriteParReportWithTimeline(outputDir, reportsRoot, timeline) {
  const summaryFile = path.join(outputDir, "summary.json");
  if (!fs.existsSync(summaryFile)) return;

  try {
      const summary = JSON.parse(fs.readFileSync(summaryFile, "utf-8"));
    const pageContext = {
      outputDir,
      historyHref: relativeReportHref(outputDir, path.join(reportsRoot, "index.html")),
      reportType: "par",
      ...timeline,
    };
    fs.writeFileSync(path.join(outputDir, "par-links.html"), parLinksPageHtml(summary, pageContext), "utf-8");
    fs.writeFileSync(
      path.join(outputDir, "par-retest-list.html"),
      parRetestListPageHtml(summary, pageContext),
      "utf-8",
    );
  } catch {
    // A damaged historical summary must not block publishing the current report.
  }
}

function readReportHistory(reportsRoot, landingPage) {
  const runsRoot = path.join(reportsRoot, "runs");
  if (!fs.existsSync(runsRoot)) {
    return [];
  }

  return fs
    .readdirSync(runsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      try {
        const summary = JSON.parse(fs.readFileSync(path.join(runsRoot, entry.name, "summary.json"), "utf-8"));
        const runId = String(summary.runId || entry.name);
        const total = Number(summary.counts?.total || 0);
        if (total < 1 || !/^[A-Za-z0-9._-]+$/.test(runId)) {
          return null;
        }

        return {
          runId,
          attemptId: summary.attemptId || "",
          reportChannel: summary.reportChannel || reportChannelFromRoot(reportsRoot),
          runType:
            summary.runType ||
            (landingPage === "par-links.html" || summary.reportChannel === "par" ? "par" : "regression"),
          status: summary.status || "",
          completionState: summary.completion?.state || "",
          startedAt: summary.startedAt || "",
          endedAt: summary.endedAt || "",
          durationMs: Number(summary.durationMs || 0),
          itemsTested: Array.isArray(summary.catalogItems) && summary.catalogItems.length
            ? summary.catalogItems.length
            : total,
          issuesFound: (summary.failureCategories || []).reduce(
            (count, category) => count + Number(category.count || 0),
            0,
          ),
          unexpected: Number(summary.counts?.unexpected || 0),
          pagesScanned: Number(summary.parAudit?.pages_scanned || 0),
          parBroken: Number(summary.parAudit?.counts?.broken || 0),
          parUnverified: Number(summary.parAudit?.counts?.unverified || 0),
          scanProblems: Array.isArray(summary.parAudit?.scan_errors) ? summary.parAudit.scan_errors.length : 0,
          href: `runs/${encodeURIComponent(runId)}/${landingPage}`,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = Date.parse(left.startedAt) || 0;
      const rightTime = Date.parse(right.startedAt) || 0;
      return rightTime - leftTime || right.runId.localeCompare(left.runId);
    });
}

export function reportHistoryPageHtml(history) {
  const runs = Array.isArray(history?.runs) ? history.runs : [];
  const channel = history?.report_channel || runs[0]?.reportChannel || "local";
  const landingPage = reportLandingPage(history?.landing_page);
  const channelTitle = channel === "retest" ? "Retest" : channel === "par" ? "PAR audit" : channel === "regression" ? "Overall regression" : "QA";
  const latestHref = `latest/${landingPage}`;
  const options = runs
    .map((run) => {
      const state = historyRunState(run, landingPage);
      const runType = historyRunType(run, landingPage);
      const detail = runType.code === "par"
        ? `${run.pagesScanned || 0} pages scanned`
        : `${run.itemsTested || 0} items tested`;
      return `<option value="${escapeHtml(run.href)}">${escapeHtml(
        `${formatHistoryDate(run.startedAt)} - ${runType.label} - ${state.label} - ${detail}`,
      )}</option>`;
    })
    .join("\n");
  const runRows = runs
    .map((run, index) => {
      const state = historyRunState(run, landingPage);
      const runType = historyRunType(run, landingPage);
      const facts = runType.code === "par"
        ? [
            `${run.pagesScanned || 0} pages`,
            `${run.parBroken || 0} broken`,
            `${run.parUnverified || 0} to recheck`,
            `${run.scanProblems || 0} pages missed`,
          ]
        : [
            `${run.itemsTested || 0} items`,
            `${run.issuesFound || 0} issues`,
          ];
      return `<a class="run-row" href="${escapeHtml(run.href)}">
        <span class="run-copy">
          <span class="run-heading">
            <strong>${escapeHtml(formatHistoryDate(run.startedAt))}${index === 0 ? ' <span class="latest-label">Latest</span>' : ""}</strong>
            <span class="run-type">${escapeHtml(runType.label)}</span>
            <span class="run-state ${state.tone}">${escapeHtml(state.label)}</span>
          </span>
          <small>${escapeHtml(facts.join(" / "))} / ${escapeHtml(formatDuration(run.durationMs || 0))}</small>
        </span>
        <span class="open-label">Open report</span>
      </a>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LiveLabs ${escapeHtml(channelTitle)} runs</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Arial, Helvetica, sans-serif;
      --bg: #f5f7f9;
      --panel: #ffffff;
      --line: #d7dfe6;
      --text: #17212b;
      --muted: #52606d;
      --pass: #087443;
      --pass-bg: #e8f7ef;
      --fail: #b42318;
      --fail-bg: #fff0ee;
      --warn: #8a5a00;
      --warn-bg: #fff5d8;
      --link: #005ea8;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); }
    header { background: #fff; border-bottom: 1px solid var(--line); padding: 28px 24px; }
    .header-inner, main { max-width: 1040px; margin: 0 auto; }
    .eyebrow { margin: 0 0 5px; color: var(--muted); font-size: 13px; font-weight: 700; text-transform: uppercase; }
    h1 { margin: 0; font-size: 30px; letter-spacing: 0; }
    header p:not(.eyebrow) { margin: 8px 0 0; color: var(--muted); }
    .hub-link { display: inline-block; margin-top: 12px; color: var(--link); font-weight: 700; }
    main { padding: 24px; }
    .run-picker { padding: 18px; border: 1px solid var(--line); background: var(--panel); }
    .run-picker label { display: block; margin-bottom: 8px; font-weight: 700; }
    .picker-controls { display: grid; grid-template-columns: minmax(260px, 1fr) auto auto; gap: 9px; }
    select, button, .latest-button {
      min-height: 42px;
      border: 1px solid #9fb3c8;
      border-radius: 6px;
      background: #fff;
      color: var(--text);
      font: inherit;
    }
    select { width: 100%; padding: 8px 10px; }
    button, .latest-button { display: inline-flex; align-items: center; justify-content: center; padding: 9px 13px; cursor: pointer; font-weight: 700; text-decoration: none; white-space: nowrap; }
    button { border-color: var(--link); background: var(--link); color: #fff; }
    button:disabled { border-color: var(--line); background: #e7edf3; color: var(--muted); cursor: default; }
    .latest-button { color: var(--link); }
    h2 { margin: 28px 0 10px; font-size: 20px; letter-spacing: 0; }
    .run-list { display: grid; gap: 8px; }
    .run-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 14px; border: 1px solid var(--line); border-left: 5px solid #829ab1; background: var(--panel); color: var(--text); text-decoration: none; }
    .run-row:hover { border-color: #9fb3c8; }
    .run-heading { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; }
    .run-state, .run-type { display: inline-flex; justify-content: center; padding: 4px 7px; border-radius: 999px; font-size: 11px; font-weight: 800; background: #e8edf2; }
    .run-type { color: #075985; background: #e0f2fe; border: 1px solid #bae6fd; }
    .run-state.pass { color: var(--pass); background: var(--pass-bg); }
    .run-state.fail { color: var(--fail); background: var(--fail-bg); }
    .run-state.warn { color: var(--warn); background: var(--warn-bg); }
    .run-copy { min-width: 0; }
    .run-copy strong, .run-copy small { display: block; }
    .run-copy small { margin-top: 5px; color: var(--muted); }
    .latest-label { margin-left: 6px; color: var(--link); font-size: 11px; text-transform: uppercase; }
    .open-label { color: var(--link); font-size: 13px; font-weight: 700; }
    .empty { padding: 28px; border: 1px dashed #9fb3c8; background: #fff; color: var(--muted); text-align: center; }
    @media (max-width: 720px) {
      .picker-controls, .run-row { grid-template-columns: 1fr; }
      .open-label { justify-self: start; }
    }
  </style>
</head>
<body>
  <header>
    <div class="header-inner">
      <p class="eyebrow">LiveLabs QA</p>
      <h1>${escapeHtml(channelTitle)} runs</h1>
      <p>Open the latest result or review any earlier saved run.</p>
      <a class="hub-link" href="/">QA Hub home</a>
    </div>
  </header>
  <main>
    <section class="run-picker" aria-labelledby="run-picker-label">
      <label id="run-picker-label" for="run-select">Choose a saved run</label>
      <div class="picker-controls">
        <select id="run-select" ${runs.length ? "" : "disabled"}>${options || '<option value="">No saved runs</option>'}</select>
        <button id="open-run" type="button" ${runs.length ? "" : "disabled"}>Open selected run</button>
        <a class="latest-button" href="${escapeHtml(latestHref)}">Open latest</a>
      </div>
    </section>
    <h2>Previous runs</h2>
    ${runs.length ? `<div class="run-list">${runRows}</div>` : '<div class="empty">No completed reports have been saved yet.</div>'}
  </main>
  <script>
    (() => {
      const select = document.getElementById("run-select");
      const button = document.getElementById("open-run");
      if (!select || !button) return;
      button.addEventListener("click", () => {
        if (select.value) window.location.href = select.value;
      });
    })();
  </script>
</body>
</html>`;
}

function historyRunState(run, landingPage = "") {
  if (
    run.completionState === "incomplete" ||
    run.status === "interrupted" ||
    run.status === "timedout"
  ) {
    return { label: "Failed - incomplete", tone: "fail" };
  }
  if (
    Number(run.unexpected || 0) > 0 ||
    Number(run.parBroken || 0) > 0 ||
    Number(run.scanProblems || 0) > 0 ||
    Number(run.parUnverified || 0) > 0
  ) {
    return { label: "Completed with issues", tone: "warn" };
  }
  if (run.status && run.status !== "passed") {
    return { label: "Failed", tone: "fail" };
  }
  return { label: "Passed", tone: "pass" };
}

function historyRunType(run, landingPage = "") {
  if (run?.runType === "retest" || run?.reportChannel === "retest") return { code: "retest", label: "Selected-item retest" };
  const code =
    run?.runType === "par" ||
    run?.reportChannel === "par" ||
    (!run?.runType && landingPage === "par-links.html")
      ? "par"
      : "regression";
  return { code, label: code === "par" ? "PAR audit" : "Overall regression" };
}

function formatHistoryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value || "Unknown date");
  }
  return date.toISOString().replace("T", " ").slice(0, 16) + " UTC";
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
