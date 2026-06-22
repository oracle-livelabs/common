#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

import { chromium, request } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const GUI_ROOT = path.resolve(path.dirname(__filename), "..");
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_SETTLE_MS = 2_000;
const DEFAULT_REPORT_ROOT = path.join(GUI_ROOT, "artifacts", "published-workshop-qa");
const USER_AGENT = "LiveLabs QA Automation published-workshop-qa/1.0";

const HELP = `Run the built-in LiveLabs ?qa=true checker against every lab in a published workshop.

Usage:
  node QA_GUI/scripts/published-workshop-qa.mjs --url <workshop-index-url> [options]
  npm run workshop:qa -- <workshop-index-url> [options]

Examples:
  npm run workshop:qa -- "https://oracle-livelabs.github.io/oic/oic-gen3/cookbooks/erp-cloud/bulk-extract/workshops/tenancy/index.html"
  npm run workshop:qa -- "https://oracle-livelabs.github.io/oic/path/workshops/tenancy/index.html?lab=cloud-login" --lab cloud-login

Options:
  --url <url>                 Published workshop index URL. Can also be the first positional argument.
  --manifest <url-or-path>    Optional manifest override, matching the framework's manifest query parameter.
  --lab <id-or-title>         Only scan selected labs. Repeat or comma-separate values.
  --max-labs <n>              Scan only the first n labs after filtering.
  --output-dir <dir>          Directory for report.md and report.json.
  --timeout-ms <n>            Per-lab navigation and QA widget timeout. Default: ${DEFAULT_TIMEOUT_MS}.
  --settle-ms <n>             How long the QA issue list must stay unchanged before capture. Default: ${DEFAULT_SETTLE_MS}.
  --browser-channel <name>    Use an installed browser channel such as chrome or msedge.
  --headed                    Show the browser.
  --allow-issues              Exit 0 when QA issues are found. Load errors still exit non-zero.
  -h, --help                  Show this help text.
`;

async function main(rawArgv) {
  const options = parseCli(rawArgv);

  if (options.help) {
    console.log(HELP);
    return 0;
  }

  if (!options.url) {
    throw new Error("Missing workshop URL. Pass --url <url> or put the URL after --.");
  }

  const workshopUrl = normalizeWorkshopUrl(options.url);
  const manifestUrl = resolveManifestUrl(workshopUrl, options.manifest);
  const manifest = await fetchManifest(manifestUrl, options.timeoutMs);
  const tutorials = selectTutorials(normalizeTutorials(manifest), options);

  if (tutorials.length === 0) {
    throw new Error("No tutorials matched the requested filter.");
  }

  const reportSlug = slugForReport(workshopUrl, manifest.workshoptitle);
  const outputDir = options.outputDir || path.join(DEFAULT_REPORT_ROOT, `${reportSlug}-${timestampForPath()}`);

  console.log(`Workshop : ${manifest.workshoptitle || "(untitled workshop)"}`);
  console.log(`Manifest : ${manifestUrl}`);
  console.log(`Labs     : ${tutorials.length}`);

  const browser = await chromium.launch({
    headless: !options.headed,
    ...(options.browserChannel ? { channel: options.browserChannel } : {}),
    ...(resolveProxySetting() ? { proxy: resolveProxySetting() } : {}),
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: USER_AGENT,
    viewport: { width: 1440, height: 1000 },
  });
  context.setDefaultTimeout(options.timeoutMs);
  context.setDefaultNavigationTimeout(options.timeoutMs);

  const results = [];

  try {
    for (const [index, tutorial] of tutorials.entries()) {
      const qaUrl = buildQaUrl(workshopUrl, tutorial.labId, options.manifest);
      process.stdout.write(`[${index + 1}/${tutorials.length}] ${tutorial.labId} ... `);
      const result = await scanLab(context, tutorial, qaUrl, options);
      results.push(result);
      console.log(formatConsoleStatus(result));
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const report = buildReport({
    workshopUrl: workshopUrl.href,
    manifestUrl,
    manifest,
    results,
  });
  const written = writeReports(report, outputDir);

  console.log(`Markdown : ${written.markdownPath}`);
  console.log(`JSON     : ${written.jsonPath}`);
  console.log(
    `Summary  : ${report.summary.passCount} pass, ${report.summary.failCount} fail, ${report.summary.errorCount} error, ${report.summary.totalIssues} issue(s)`,
  );

  if (report.summary.errorCount > 0) {
    return 1;
  }

  if (report.summary.totalIssues > 0 && !options.allowIssues) {
    return 1;
  }

  return 0;
}

function parseCli(argv) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    args: argv,
    options: {
      url: { type: "string" },
      manifest: { type: "string" },
      lab: { type: "string", multiple: true },
      "max-labs": { type: "string" },
      "output-dir": { type: "string" },
      "timeout-ms": { type: "string" },
      "settle-ms": { type: "string" },
      "browser-channel": { type: "string" },
      headed: { type: "boolean" },
      "allow-issues": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  return {
    url: values.url || positionals[0] || "",
    manifest: values.manifest || "",
    labs: normalizeMultiValue(values.lab),
    maxLabs: parseOptionalPositiveInteger(values["max-labs"], "--max-labs"),
    outputDir: values["output-dir"] ? path.resolve(String(values["output-dir"])) : "",
    timeoutMs: parsePositiveInteger(values["timeout-ms"], DEFAULT_TIMEOUT_MS, "--timeout-ms"),
    settleMs: parsePositiveInteger(values["settle-ms"], DEFAULT_SETTLE_MS, "--settle-ms"),
    browserChannel: values["browser-channel"] || process.env.QA_BROWSER_CHANNEL || "",
    headed: values.headed === true,
    allowIssues: values["allow-issues"] === true,
    help: values.help === true,
  };
}

function normalizeWorkshopUrl(rawUrl) {
  const cleaned = String(rawUrl).trim().replace(/\s+/g, "");
  if (!/^https?:\/\//i.test(cleaned)) {
    throw new Error(`Workshop URL must start with http:// or https://. Received: ${rawUrl}`);
  }

  const url = new URL(cleaned);
  url.hash = "";
  return url;
}

function resolveManifestUrl(workshopUrl, explicitManifest) {
  if (explicitManifest) {
    return new URL(explicitManifest, workshopUrl).href;
  }

  const manifestParam = workshopUrl.searchParams.get("manifest");
  if (manifestParam) {
    return new URL(manifestParam, workshopUrl).href;
  }

  return new URL("manifest.json", workshopUrl).href;
}

async function fetchManifest(manifestUrl, timeoutMs) {
  const requestContext = await request.newContext({
    ignoreHTTPSErrors: true,
    userAgent: USER_AGENT,
    ...(resolveProxySetting() ? { proxy: resolveProxySetting() } : {}),
  });

  try {
    const response = await requestContext.get(manifestUrl, {
      failOnStatusCode: false,
      timeout: timeoutMs,
    });

    if (!response.ok()) {
      throw new Error(`Could not fetch manifest ${manifestUrl}. HTTP ${response.status()} ${response.statusText()}`);
    }

    const body = await response.text();
    try {
      return JSON.parse(body);
    } catch (error) {
      throw new Error(`Manifest is not valid JSON: ${manifestUrl}. ${error instanceof Error ? error.message : error}`);
    }
  } finally {
    await requestContext.dispose();
  }
}

function normalizeTutorials(manifest) {
  if (!Array.isArray(manifest?.tutorials)) {
    throw new Error("Manifest does not contain a tutorials array.");
  }

  return manifest.tutorials.map((tutorial, index) => {
    const filename = String(tutorial?.filename || "").trim();
    return {
      index,
      title: String(tutorial?.title || `Lab ${index + 1}`).trim(),
      description: String(tutorial?.description || "").trim(),
      filename,
      labId: filename ? labIdFromFilename(filename) : `tutorial-${index + 1}`,
      manifestEntry: tutorial,
      hasFilename: Boolean(filename),
    };
  });
}

function selectTutorials(tutorials, options) {
  let selected = tutorials;

  if (options.labs.length > 0) {
    const requested = new Set(options.labs.map(normalizeFilterValue));
    selected = selected.filter((tutorial) => {
      return requested.has(normalizeFilterValue(tutorial.labId)) || requested.has(normalizeFilterValue(tutorial.title));
    });
  }

  if (options.maxLabs) {
    selected = selected.slice(0, options.maxLabs);
  }

  return selected;
}

function labIdFromFilename(filename) {
  const withoutQueryHash = filename.split(/[?#]/)[0];
  const parts = withoutQueryHash.split("/").filter(Boolean);
  const basename = parts[parts.length - 1] || withoutQueryHash;
  return decodeURIComponent(basename).replace(/\.md$/i, "");
}

function buildQaUrl(workshopUrl, labId, explicitManifest) {
  const url = new URL(workshopUrl.href);
  url.hash = "";
  url.searchParams.delete("qa");
  url.searchParams.delete("lab");

  if (explicitManifest) {
    url.searchParams.set("manifest", explicitManifest);
  }

  url.searchParams.set("qa", "true");
  url.searchParams.set("lab", labId);
  return url.href;
}

async function scanLab(context, tutorial, qaUrl, options) {
  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];
  const startedAt = new Date().toISOString();

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push({
        type: message.type(),
        text: message.text(),
      });
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  try {
    if (!tutorial.hasFilename) {
      throw new Error(`Manifest tutorial "${tutorial.title}" does not have a filename.`);
    }

    const response = await page.goto(qaUrl, {
      waitUntil: "domcontentloaded",
      timeout: options.timeoutMs,
    });
    const httpStatus = response?.status() || null;

    await page.locator("#qa-report").waitFor({
      state: "attached",
      timeout: options.timeoutMs,
    });

    try {
      await page.waitForLoadState("networkidle", {
        timeout: Math.min(10_000, options.timeoutMs),
      });
    } catch {
      // Some analytics or embedded resources keep the page busy. The QA panel
      // stability check below is the source of truth for report capture.
    }

    const qaReport = await waitForStableQaReport(page, options.timeoutMs, options.settleMs);
    const pageTitle = await safePageText(page, "title");
    const heading = await safeLocatorText(page, "main h1, #module-content h1, h1");
    const loadWarnings = [];

    if (httpStatus && httpStatus >= 400) {
      loadWarnings.push(`HTTP ${httpStatus} while loading lab page.`);
    }

    return {
      status: qaReport.totalIssues > 0 || loadWarnings.length > 0 ? "fail" : "pass",
      startedAt,
      endedAt: new Date().toISOString(),
      tutorial,
      qaUrl,
      finalUrl: page.url(),
      httpStatus,
      pageTitle,
      heading,
      issueCount: qaReport.totalIssues,
      issues: qaReport.issues,
      loadWarnings,
      consoleMessages,
      pageErrors,
    };
  } catch (error) {
    return {
      status: "error",
      startedAt,
      endedAt: new Date().toISOString(),
      tutorial,
      qaUrl,
      finalUrl: page.url(),
      httpStatus: null,
      pageTitle: "",
      heading: "",
      issueCount: 0,
      issues: [],
      loadWarnings: [],
      consoleMessages,
      pageErrors,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await page.close();
  }
}

async function waitForStableQaReport(page, timeoutMs, settleMs) {
  const deadline = Date.now() + timeoutMs;
  let lastSignature = "";
  let stableSince = Date.now();
  let latestReport = null;

  while (Date.now() < deadline) {
    latestReport = await readQaReport(page);
    const signature = JSON.stringify({
      headerText: latestReport.headerText,
      issues: latestReport.issues.map((issue) => `${issue.classes}:${issue.text}`),
    });

    if (signature === lastSignature) {
      if (Date.now() - stableSince >= settleMs) {
        return latestReport;
      }
    } else {
      lastSignature = signature;
      stableSince = Date.now();
    }

    await page.waitForTimeout(250);
  }

  return latestReport || readQaReport(page);
}

async function readQaReport(page) {
  return page.locator("#qa-report").evaluate((report) => {
    const header = report.querySelector("#qa-reportheader");
    const issueElements = Array.from(report.querySelectorAll("#qa-reportbody li"));
    const issues = issueElements.map((issue, index) => {
      const classes = issue.getAttribute("class") || "";
      const textClone = issue.cloneNode(true);
      textClone.querySelectorAll("small").forEach((helper) => helper.remove());
      let severity = "issue";
      if (classes.includes("major-error")) {
        severity = "major";
      } else if (classes.includes("minor-error")) {
        severity = "minor";
      }

      return {
        index: index + 1,
        severity,
        classes,
        text: (textClone.textContent || "").replace(/\s+/g, " ").trim(),
        html: issue.innerHTML,
      };
    });

    const headerText = (header?.textContent || "").replace(/\s+/g, " ").trim();
    const totalMatch = headerText.match(/Total Issues:\s*(\d+)/i);

    return {
      headerText,
      totalIssues: totalMatch ? Number(totalMatch[1]) : issues.length,
      issues,
    };
  });
}

async function safePageText(page, selector) {
  try {
    return await page.locator(selector).first().textContent({ timeout: 1_000 }) || "";
  } catch {
    return "";
  }
}

async function safeLocatorText(page, selector) {
  try {
    return (await page.locator(selector).first().innerText({ timeout: 2_000 })).trim();
  } catch {
    return "";
  }
}

function buildReport({ workshopUrl, manifestUrl, manifest, results }) {
  const passCount = results.filter((result) => result.status === "pass").length;
  const failCount = results.filter((result) => result.status === "fail").length;
  const errorCount = results.filter((result) => result.status === "error").length;
  const totalIssues = results.reduce((sum, result) => sum + result.issueCount, 0);

  return {
    generatedAt: new Date().toISOString(),
    workshopUrl,
    manifestUrl,
    workshopTitle: manifest.workshoptitle || "",
    help: manifest.help || "",
    summary: {
      totalLabs: results.length,
      passCount,
      failCount,
      errorCount,
      totalIssues,
    },
    results,
  };
}

function writeReports(report, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, "report.json");
  const markdownPath = path.join(outputDir, "report.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  fs.writeFileSync(markdownPath, renderMarkdownReport(report), "utf-8");

  return { jsonPath, markdownPath };
}

function renderMarkdownReport(report) {
  const lines = [
    "# Published Workshop QA Report",
    "",
    `- Generated: ${report.generatedAt}`,
    `- Workshop: ${report.workshopTitle || "(untitled workshop)"}`,
    `- Source URL: ${report.workshopUrl}`,
    `- Manifest: ${report.manifestUrl}`,
    `- Labs checked: ${report.summary.totalLabs}`,
    `- Result: ${report.summary.passCount} pass, ${report.summary.failCount} fail, ${report.summary.errorCount} error`,
    `- Total QA issues: ${report.summary.totalIssues}`,
    "",
    "## Summary",
    "",
    "| Status | Lab | Title | Issues | Checked URL |",
    "| --- | --- | --- | ---: | --- |",
  ];

  for (const result of report.results) {
    lines.push(
      `| ${escapeTable(result.status.toUpperCase())} | ${escapeTable(result.tutorial.labId)} | ${escapeTable(result.tutorial.title)} | ${result.issueCount} | [open](${result.qaUrl}) |`,
    );
  }

  lines.push("", "## Details", "");

  for (const result of report.results) {
    lines.push(`### ${result.status.toUpperCase()}: ${result.tutorial.title} (${result.tutorial.labId})`, "");
    lines.push(`- Checked URL: ${result.qaUrl}`);
    if (result.finalUrl && result.finalUrl !== result.qaUrl) {
      lines.push(`- Final URL: ${result.finalUrl}`);
    }
    if (result.httpStatus) {
      lines.push(`- HTTP status: ${result.httpStatus}`);
    }
    if (result.heading) {
      lines.push(`- Rendered heading: ${result.heading}`);
    }
    if (result.error) {
      lines.push(`- Load error: ${result.error}`);
    }
    for (const warning of result.loadWarnings || []) {
      lines.push(`- Warning: ${warning}`);
    }

    if (result.issues.length === 0) {
      lines.push("- QA issues: none");
    } else {
      lines.push("- QA issues:");
      for (const issue of result.issues) {
        lines.push(`  - ${issue.severity}: ${issue.text}`);
      }
    }

    if (result.pageErrors.length > 0) {
      lines.push("- Page errors:");
      for (const error of result.pageErrors) {
        lines.push(`  - ${error}`);
      }
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function parsePositiveInteger(value, fallback, label) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer. Received: ${value}`);
  }

  return Math.trunc(parsed);
}

function parseOptionalPositiveInteger(value, label) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  return parsePositiveInteger(value, 0, label);
}

function normalizeMultiValue(values) {
  const normalized = [];
  const entries = Array.isArray(values) ? values : values ? [values] : [];

  for (const value of entries) {
    for (const part of String(value).split(",")) {
      const trimmed = part.trim();
      if (trimmed) {
        normalized.push(trimmed);
      }
    }
  }

  return normalized;
}

function normalizeFilterValue(value) {
  return String(value).trim().toLowerCase();
}

function resolveProxySetting() {
  const server =
    process.env.QA_PROXY_SERVER?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.https_proxy?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.http_proxy?.trim();

  if (!server) {
    return undefined;
  }

  const bypass = process.env.QA_PROXY_BYPASS?.trim() || process.env.NO_PROXY?.trim() || process.env.no_proxy?.trim();
  return {
    server,
    ...(bypass ? { bypass } : {}),
  };
}

function slugForReport(workshopUrl, workshopTitle) {
  const source = workshopTitle || workshopUrl.pathname.replace(/\/index\.html$/i, "");
  const slug = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "published-workshop";
}

function timestampForPath() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function escapeTable(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function formatConsoleStatus(result) {
  if (result.status === "error") {
    return `ERROR (${result.error})`;
  }

  if (result.issueCount > 0) {
    return `FAIL (${result.issueCount} issue${result.issueCount === 1 ? "" : "s"})`;
  }

  return "PASS";
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
