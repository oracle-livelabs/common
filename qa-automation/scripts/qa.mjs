#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(__filename), "..");
const SETTINGS_FILE = path.join(PROJECT_ROOT, "config", "project_settings.json");
const PLAYWRIGHT_CLI = path.join(PROJECT_ROOT, "node_modules", "playwright", "cli.js");
const PLAYWRIGHT_CONFIG = path.join(PROJECT_ROOT, "playwright.config.ts");
const WINDOWS_SHELL = process.env.ComSpec || "cmd.exe";
const ARTIFACTS_ROOT = path.join(PROJECT_ROOT, "artifacts");

const ROOT_HELP = `Stable project runner for LiveLabs QA automation (JavaScript/TypeScript edition).

Usage:
  node scripts/qa.mjs run [paths...] [options]
  node scripts/qa.mjs install [--upgrade] [--skip-browsers]
  node scripts/qa.mjs playwright [args...]
  node scripts/qa.mjs report [lane|reportDir]
  node scripts/qa.mjs trace [trace.zip|test-results-dir]
  node scripts/qa.mjs codegen [url-or-path] [options]
  node scripts/qa.mjs doctor

Notes:
  When scripts/qa.mjs is called without an explicit subcommand, it defaults to "run".
  The project runs native Playwright specs under tests/... directly.
`;

const RUN_HELP = `Run options:
  --tag <value>               Convenience tag filter. Repeat or comma-separate values.
  -m, --marker <regex>        Raw Playwright grep regex applied on top of any tags.
  -k, --keyword <text>        Plain-text title filter. Internally converted to grep.
  --browser <name>            Browser list, repeat or comma-separate values.
  --headed / --headless       Force headed or headless browser mode.
  --ui                        Launch Playwright UI mode.
  --debug                     Launch Playwright debug mode.
  -n, --workers <value>       Worker count. Use 0/1/off/none for serial mode.
  --trace <mode>              on, off, on-first-retry, or retain-on-failure.
  --video <mode>              on, off, on-first-retry, or retain-on-failure.
  --screenshot <mode>         on, off, or only-on-failure.
  --full-page-screenshot <on|off>
                              Save Playwright's automatic screenshots as full-page images.
  --environment <name>        Target environment from config/project_settings.json.
  --base-url <url>            Override the environment base URL.
  --api-base-url <url>        Override the future API base URL for shared fixtures/helpers.
  --search-term <term>        Override the LiveLabs search term fixture.
  --storage-state <file>      Use a Playwright storage-state file for future authenticated runs.
  --output <dir>              Artifact output directory for Playwright test results.
  --retries <n>               Retry count passed to Playwright config.
  --junit <on|off>            Enable or disable JUnit XML output.
  --junit-file <file>         Override the JUnit XML output file path.
  --json <on|off>             Enable or disable the JSON execution report.
  --json-file <file>          Override the JSON report output file path.
  --maxfail <n>               Stop after this many failures.
  --collect-only              List matching tests without executing them.
  --dry-run                   Print the resolved Playwright command and exit.
  -h, --help                  Show this help text.
`;

const REPORT_HELP = `Report options:
  report                     Open the most recently updated HTML report under artifacts/.
  report smoke               Open artifacts/platform/smoke/html-report.
  report regression          Open artifacts/platform/regression/html-report.
  report adhoc               Open artifacts/platform/adhoc/html-report.
  report <path>              Open a specific HTML report directory or index.html path.
`;

const TRACE_HELP = `Trace options:
  trace                      Open the most recently updated trace.zip under artifacts/.
  trace <path>               Open a specific trace.zip file or a test-results directory.
`;

const CODEGEN_HELP = `Codegen options:
  codegen                    Launch Playwright codegen against the configured base URL.
  codegen /home              Launch codegen against a path relative to the base URL.
  codegen https://...        Launch codegen against an explicit URL.
  --browser <name>           Browser to use for codegen (default: first configured browser).
  --environment <name>       Environment from config/project_settings.json.
  --base-url <url>           Override the environment base URL.
  -h, --help                 Show this help text.
`;

let cachedSettings;

function loadProjectSettings() {
  if (!cachedSettings) {
    cachedSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
  }

  return cachedSettings;
}

function runnerDefaults() {
  return { ...loadProjectSettings().defaults };
}

function defaultEnvironmentName() {
  return String(loadProjectSettings().default_environment);
}

function resolveBooleanString(value, fallback) {
  const normalized = String(value ?? fallback).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return "true";
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return "false";
  }

  return fallback ? "true" : "false";
}

function resolveBaseUrl(environmentName, explicitBaseUrl) {
  if (explicitBaseUrl?.trim()) {
    return explicitBaseUrl.trim().replace(/\/+$/, "");
  }

  const resolvedEnvironment = environmentName || defaultEnvironmentName();
  const environments = loadProjectSettings().environments;
  if (!(resolvedEnvironment in environments)) {
    throw new Error(
      `Unknown environment "${resolvedEnvironment}". Available environments: ${Object.keys(environments).sort().join(", ")}.`,
    );
  }

  return String(environments[resolvedEnvironment].base_url).replace(/\/+$/, "");
}

function resolveApiBaseUrl(environmentName, explicitApiBaseUrl) {
  if (explicitApiBaseUrl?.trim()) {
    return explicitApiBaseUrl.trim().replace(/\/+$/, "");
  }

  const resolvedEnvironment = environmentName || defaultEnvironmentName();
  const environments = loadProjectSettings().environments;
  if (!(resolvedEnvironment in environments)) {
    throw new Error(
      `Unknown environment "${resolvedEnvironment}". Available environments: ${Object.keys(environments).sort().join(", ")}.`,
    );
  }

  return String(environments[resolvedEnvironment].api_base_url || environments[resolvedEnvironment].base_url).replace(
    /\/+$/,
    "",
  );
}

function normalizeMultiValue(values) {
  const normalized = [];
  const entries = Array.isArray(values) ? values : values ? [values] : [];

  for (const value of entries) {
    for (const part of String(value).split(",")) {
      const item = part.trim();
      if (item) {
        normalized.push(item);
      }
    }
  }

  return normalized;
}

function normalizeTags(values) {
  return normalizeMultiValue(values).map((value) => value.replace(/^@+/, "").toLowerCase());
}

function normalizeRunPaths(paths) {
  return (paths.length > 0 ? paths : ["tests"]).map((entry) => String(entry).replace(/\\/g, "/").toLowerCase());
}

function escapeRegexLiteral(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function quoteArgument(value) {
  if (!/[ \t"]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

function formatCommand(command) {
  return command.map((part) => quoteArgument(String(part))).join(" ");
}

function runCommand(command, env) {
  console.log(`> ${formatCommand(command)}`);
  const completed = spawnSync(command[0], command.slice(1), {
    cwd: PROJECT_ROOT,
    env,
    stdio: "inherit",
  });

  if (typeof completed.status === "number") {
    return completed.status;
  }

  return 1;
}

function buildNpmCommand(args) {
  // npm is a shell script on Unix and a batch wrapper on Windows. Building the
  // exact command here keeps the wrapper stable regardless of the parent shell.
  if (process.platform === "win32") {
    return [WINDOWS_SHELL, "/d", "/s", "/c", "npm.cmd", ...args];
  }

  return ["npm", ...args];
}

function looksLikeUrl(value) {
  return /^https?:\/\//i.test(String(value));
}

function walkFiles(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const files = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentPath = stack.pop();
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      files.push(entryPath);
    }
  }

  return files;
}

function findMostRecentFile(rootDir, predicate) {
  let winner = "";
  let winnerTime = -1;

  for (const candidate of walkFiles(rootDir)) {
    if (!predicate(candidate)) {
      continue;
    }

    const modifiedTime = fs.statSync(candidate).mtimeMs;
    if (modifiedTime > winnerTime) {
      winner = candidate;
      winnerTime = modifiedTime;
    }
  }

  return winner;
}

function isHtmlReportIndex(candidate) {
  return (
    path.basename(candidate).toLowerCase() === "index.html" &&
    path.basename(path.dirname(candidate)).toLowerCase() === "html-report"
  );
}

function readCommandStdout(command) {
  const completed = spawnSync(command[0], command.slice(1), {
    cwd: PROJECT_ROOT,
    encoding: "utf-8",
  });

  if (completed.error || completed.status !== 0) {
    return "";
  }

  return (completed.stdout || "").trim();
}

function ensureDependenciesInstalled() {
  if (!fs.existsSync(PLAYWRIGHT_CLI)) {
    throw new Error(
      `Project dependencies are not installed. Expected Playwright CLI at ${PLAYWRIGHT_CLI}. Run "node scripts/qa.mjs install" first.`,
    );
  }

  if (!fs.existsSync(PLAYWRIGHT_CONFIG)) {
    throw new Error(`Playwright config was not found at ${PLAYWRIGHT_CONFIG}.`);
  }
}

function toProjectRelative(targetPath) {
  return path.relative(PROJECT_ROOT, targetPath).replace(/\\/g, "/");
}

function resolveRequestedPaths(paths) {
  const resolvedPaths = [];
  const seenPaths = new Set();
  const requestedPaths = paths.length > 0 ? paths : ["tests"];

  for (const rawPath of requestedPaths) {
    const normalizedRawPath = rawPath.replace(/\\/g, "/");

    if (normalizedRawPath.toLowerCase().endsWith(".feature")) {
      throw new Error(`Feature files are not part of this framework anymore. Run the matching spec under tests/... instead.`);
    }

    const candidate = path.resolve(PROJECT_ROOT, rawPath);
    if (fs.existsSync(candidate)) {
      const relativePath = toProjectRelative(candidate);
      if (!seenPaths.has(relativePath)) {
        resolvedPaths.push(relativePath);
        seenPaths.add(relativePath);
      }
      continue;
    }

    if (!seenPaths.has(normalizedRawPath)) {
      resolvedPaths.push(normalizedRawPath);
      seenPaths.add(normalizedRawPath);
    }
  }

  return resolvedPaths;
}

function detectRunLane(options) {
  const tags = new Set(normalizeTags(options.tag));
  const paths = normalizeRunPaths(options.paths);

  if (paths.some((entry) => entry.includes("tests/platform/regression")) || (tags.has("platform") && tags.has("regression"))) {
    return ["platform", "regression"];
  }

  if (paths.some((entry) => entry.includes("tests/platform/smoke")) || (tags.has("platform") && tags.has("smoke"))) {
    return ["platform", "smoke"];
  }

  if (tags.has("regression") || paths.some((entry) => entry.includes("/regression/") || entry.endsWith("/regression"))) {
    return ["platform", "regression"];
  }

  if (tags.has("smoke") || paths.some((entry) => entry.includes("/smoke/") || entry.endsWith("/smoke"))) {
    return ["platform", "smoke"];
  }

  if (paths.some((entry) => entry.includes("tests/platform"))) {
    return ["platform", "adhoc"];
  }

  return ["platform", "adhoc"];
}

function resolveTestOutputDir(options) {
  if (options.output) {
    return path.resolve(PROJECT_ROOT, options.output);
  }

  const [primaryLane, secondaryLane] = detectRunLane(options);
  return path.join(PROJECT_ROOT, "artifacts", primaryLane, secondaryLane, "test-results");
}

function resolveHtmlReportDir(outputDir) {
  if (path.basename(outputDir).toLowerCase() === "test-results") {
    return path.join(path.dirname(outputDir), "html-report");
  }

  return path.join(outputDir, "html-report");
}

function resolveJunitFile(options, outputDir) {
  const defaults = runnerDefaults();
  const junitMode = String(options.junit || defaults.junit).trim().toLowerCase();
  if (options.collectOnly || junitMode === "off") {
    return "";
  }

  if (options.junitFile) {
    return path.resolve(PROJECT_ROOT, options.junitFile);
  }

  if (path.basename(outputDir).toLowerCase() === "test-results") {
    return path.join(path.dirname(outputDir), "junit.xml");
  }

  return path.join(outputDir, "junit.xml");
}

function resolveJsonFile(options, outputDir) {
  const defaults = runnerDefaults();
  const jsonMode = String(options.json || defaults.json_report).trim().toLowerCase();
  if (options.collectOnly || jsonMode === "off") {
    return "";
  }

  if (options.jsonFile) {
    return path.resolve(PROJECT_ROOT, options.jsonFile);
  }

  if (path.basename(outputDir).toLowerCase() === "test-results") {
    return path.join(path.dirname(outputDir), "results.json");
  }

  return path.join(outputDir, "results.json");
}

function resolveBrowsers(options) {
  const defaults = runnerDefaults();
  const requested = normalizeMultiValue(options.browser);
  if (requested.length > 0) {
    return requested;
  }

  return [...defaults.browsers];
}

function resolveWorkerCount(options) {
  const defaults = runnerDefaults();
  const rawValue = String(options.workers || defaults.workers).trim().toLowerCase();

  // Playwright's serial mode is 1 worker. The old runner used 0/1/off/none
  // for the same intent, so the wrapper keeps that old command vocabulary.
  if (["0", "1", "off", "none", ""].includes(rawValue)) {
    return "1";
  }

  if (rawValue === "auto") {
    return "";
  }

  return rawValue;
}

function resolveRetries(options) {
  const defaults = runnerDefaults();
  const rawValue = String(options.retries || defaults.retries).trim();
  if (!rawValue) {
    return "0";
  }

  const numericValue = Number(rawValue);
  if (Number.isFinite(numericValue) && numericValue >= 0) {
    return String(Math.trunc(numericValue));
  }

  return "0";
}

function resolveHeaded(options) {
  const defaults = runnerDefaults();
  if (options.headed === true) {
    return true;
  }

  if (options.headless === true) {
    return false;
  }

  return Boolean(defaults.headed);
}

function buildGrepExpression(options) {
  const lookaheads = [];

  for (const tag of normalizeTags(options.tag)) {
    lookaheads.push(`(?=.*${escapeRegexLiteral(`@${tag}`)})`);
  }

  if (options.keyword) {
    lookaheads.push(`(?=.*${escapeRegexLiteral(String(options.keyword))})`);
  }

  if (options.marker) {
    lookaheads.push(`(?=.*(?:${String(options.marker)}))`);
  }

  if (lookaheads.length === 0) {
    return "";
  }

  return `${lookaheads.join("")}.*`;
}

function resolveReportDir(selector) {
  const normalizedSelector = String(selector || "").trim().toLowerCase();
  const laneDirectories = {
    smoke: path.join(ARTIFACTS_ROOT, "platform", "smoke", "html-report"),
    regression: path.join(ARTIFACTS_ROOT, "platform", "regression", "html-report"),
    adhoc: path.join(ARTIFACTS_ROOT, "platform", "adhoc", "html-report"),
  };

  if (!normalizedSelector) {
    const latestReport = findMostRecentFile(ARTIFACTS_ROOT, isHtmlReportIndex);
    if (!latestReport) {
      throw new Error(`No HTML report was found under ${ARTIFACTS_ROOT}. Run a test first.`);
    }

    return path.dirname(latestReport);
  }

  if (normalizedSelector in laneDirectories) {
    return laneDirectories[normalizedSelector];
  }

  const candidate = path.resolve(PROJECT_ROOT, selector);
  if (!fs.existsSync(candidate)) {
    throw new Error(`HTML report path was not found: ${candidate}`);
  }

  if (fs.statSync(candidate).isDirectory()) {
    return candidate;
  }

  if (path.basename(candidate).toLowerCase() === "index.html") {
    return path.dirname(candidate);
  }

  throw new Error(`Report selector must point to a report directory or index.html file: ${candidate}`);
}

function resolveTraceFile(selector) {
  const normalizedSelector = String(selector || "").trim();

  if (!normalizedSelector) {
    const latestTrace = findMostRecentFile(
      ARTIFACTS_ROOT,
      (candidate) => path.basename(candidate).toLowerCase() === "trace.zip",
    );
    if (!latestTrace) {
      throw new Error(`No trace.zip file was found under ${ARTIFACTS_ROOT}. Run a test with tracing enabled first.`);
    }

    return latestTrace;
  }

  const candidate = path.resolve(PROJECT_ROOT, selector);
  if (!fs.existsSync(candidate)) {
    throw new Error(`Trace path was not found: ${candidate}`);
  }

  if (fs.statSync(candidate).isDirectory()) {
    const nestedTrace = findMostRecentFile(candidate, (entry) => path.basename(entry).toLowerCase() === "trace.zip");
    if (!nestedTrace) {
      throw new Error(`No trace.zip file was found under ${candidate}.`);
    }

    return nestedTrace;
  }

  return candidate;
}

function resolveCodegenUrl(selector, environmentName, explicitBaseUrl) {
  const baseUrl = resolveBaseUrl(environmentName || defaultEnvironmentName(), explicitBaseUrl);
  if (!selector) {
    return baseUrl;
  }

  const normalizedSelector = String(selector).trim();
  if (looksLikeUrl(normalizedSelector)) {
    return normalizedSelector;
  }

  if (normalizedSelector.startsWith("/")) {
    return `${baseUrl}${normalizedSelector}`;
  }

  return `${baseUrl}/${normalizedSelector.replace(/^\/+/, "")}`;
}

function buildRuntimeEnv(options, outputDir, junitFile, jsonFile) {
  const defaults = runnerDefaults();
  return {
    ...process.env,
    QA_PROJECT_ROOT: PROJECT_ROOT,
    QA_ENVIRONMENT: options.environment || defaultEnvironmentName(),
    QA_BASE_URL: resolveBaseUrl(options.environment || defaultEnvironmentName(), options.baseUrl || process.env.QA_BASE_URL),
    QA_API_BASE_URL: resolveApiBaseUrl(
      options.environment || defaultEnvironmentName(),
      options.apiBaseUrl || process.env.QA_API_BASE_URL,
    ),
    QA_SEARCH_TERM: options.searchTerm || process.env.QA_SEARCH_TERM || String(defaults.livelabs_search_term),
    QA_STORAGE_STATE: options.storageState
      ? path.resolve(PROJECT_ROOT, options.storageState)
      : String(process.env.QA_STORAGE_STATE || ""),
    QA_HEADED: String(resolveHeaded(options)),
    QA_TRACE: options.trace || String(defaults.tracing),
    QA_VIDEO: options.video || String(defaults.video),
    QA_SCREENSHOT: options.screenshot || String(defaults.screenshot),
    QA_FULL_PAGE_SCREENSHOT: resolveBooleanString(options.fullPageScreenshot, defaults.full_page_screenshot),
    QA_TEST_TIMEOUT_MS: String(process.env.QA_TEST_TIMEOUT_MS || defaults.test_timeout_ms),
    QA_EXPECT_TIMEOUT_MS: String(process.env.QA_EXPECT_TIMEOUT_MS || defaults.expect_timeout_ms),
    QA_ACTION_TIMEOUT_MS: String(process.env.QA_ACTION_TIMEOUT_MS || defaults.action_timeout_ms),
    QA_NAVIGATION_TIMEOUT_MS: String(process.env.QA_NAVIGATION_TIMEOUT_MS || defaults.navigation_timeout_ms),
    QA_PAGE_READY_TIMEOUT_MS: String(process.env.QA_PAGE_READY_TIMEOUT_MS || defaults.page_ready_timeout_ms),
    QA_OPTIONAL_LOAD_TIMEOUT_MS: String(process.env.QA_OPTIONAL_LOAD_TIMEOUT_MS || defaults.optional_load_timeout_ms),
    QA_COOKIE_TIMEOUT_MS: String(process.env.QA_COOKIE_TIMEOUT_MS || defaults.cookie_timeout_ms),
    QA_NAVIGATION_RETRIES: String(process.env.QA_NAVIGATION_RETRIES || defaults.navigation_retries),
    QA_OUTPUT_DIR: outputDir,
    QA_HTML_REPORT_DIR: resolveHtmlReportDir(outputDir),
    QA_JUNIT_FILE: junitFile,
    QA_JSON_FILE: jsonFile,
    QA_WORKERS: resolveWorkerCount(options),
    QA_RETRIES: resolveRetries(options),
    QA_CAPTURE_CONSOLE: resolveBooleanString(process.env.QA_CAPTURE_CONSOLE, defaults.capture_console),
    QA_CAPTURE_PAGE_ERRORS: resolveBooleanString(process.env.QA_CAPTURE_PAGE_ERRORS, defaults.capture_page_errors),
    QA_CAPTURE_REQUEST_FAILURES: resolveBooleanString(
      process.env.QA_CAPTURE_REQUEST_FAILURES,
      defaults.capture_request_failures,
    ),
    QA_CAPTURE_RESPONSE_ERRORS: resolveBooleanString(
      process.env.QA_CAPTURE_RESPONSE_ERRORS,
      defaults.capture_response_errors,
    ),
    QA_RESPONSE_ERROR_STATUS: String(process.env.QA_RESPONSE_ERROR_STATUS || defaults.response_error_status),
    QA_ATTACH_DOM_SNAPSHOT_ON_FAILURE: resolveBooleanString(
      process.env.QA_ATTACH_DOM_SNAPSHOT_ON_FAILURE,
      defaults.attach_dom_snapshot_on_failure,
    ),
  };
}

function buildPlaywrightCommand(options, resolvedPaths, passthroughArgs) {
  const command = [
    process.execPath,
    PLAYWRIGHT_CLI,
    "test",
    "--config",
    PLAYWRIGHT_CONFIG,
  ];

  if (resolvedPaths.length > 0) {
    command.push(...resolvedPaths);
  }

  const grepExpression = buildGrepExpression(options);
  if (grepExpression) {
    command.push("--grep", grepExpression);
  }

  for (const browserName of resolveBrowsers(options)) {
    command.push("--project", browserName);
  }

  const workerCount = resolveWorkerCount(options);
  if (workerCount) {
    command.push("--workers", workerCount);
  }

  if (resolveHeaded(options)) {
    command.push("--headed");
  }

  if (options.ui) {
    command.push("--ui");
  }

  if (options.debug) {
    command.push("--debug");
  }

  if (options.collectOnly) {
    command.push("--list");
  }

  if (options.maxfail) {
    command.push("--max-failures", String(options.maxfail));
  }

  if (options.output) {
    command.push("--output", path.resolve(PROJECT_ROOT, options.output));
  }

  if (options.quiet) {
    command.push("--quiet");
  }

  command.push(...passthroughArgs);
  return command;
}

function printCollection(resolvedPaths, requestedPaths) {
  console.log("Requested paths:");
  for (const requestedPath of requestedPaths.length > 0 ? requestedPaths : ["tests"]) {
    console.log(`  - ${requestedPath}`);
  }

  console.log("Resolved Playwright paths:");
  for (const resolvedPath of resolvedPaths) {
    console.log(`  - ${resolvedPath}`);
  }
}

function commandRun(options, passthroughArgs) {
  ensureDependenciesInstalled();
  const resolvedPaths = resolveRequestedPaths(options.paths);
  const outputDir = resolveTestOutputDir(options);
  const junitFile = resolveJunitFile(options, outputDir);
  const jsonFile = resolveJsonFile(options, outputDir);
  const env = buildRuntimeEnv(options, outputDir, junitFile, jsonFile);
  const command = buildPlaywrightCommand(options, resolvedPaths, passthroughArgs);

  if (options.collectOnly) {
    printCollection(resolvedPaths, options.paths);
  }

  if (options.dryRun) {
    console.log(`Output : ${outputDir}`);
    console.log(`HTML   : ${env.QA_HTML_REPORT_DIR}`);
    if (junitFile) {
      console.log(`JUnit  : ${junitFile}`);
    }
    if (jsonFile) {
      console.log(`JSON   : ${jsonFile}`);
    }
    console.log(
      `Env    : QA_ENVIRONMENT=${env.QA_ENVIRONMENT} QA_HEADED=${env.QA_HEADED} QA_API_BASE_URL=${env.QA_API_BASE_URL}`,
    );
    if (env.QA_STORAGE_STATE) {
      console.log(`State  : ${env.QA_STORAGE_STATE}`);
    }
    console.log(formatCommand(command));
    return 0;
  }

  fs.mkdirSync(outputDir, { recursive: true });
  if (junitFile) {
    fs.mkdirSync(path.dirname(junitFile), { recursive: true });
  }
  if (jsonFile) {
    fs.mkdirSync(path.dirname(jsonFile), { recursive: true });
  }
  fs.mkdirSync(env.QA_HTML_REPORT_DIR, { recursive: true });

  return runCommand(command, env);
}

function commandInstall(options) {
  let result = runCommand(buildNpmCommand(["install"]), { ...process.env });
  if (result !== 0) {
    return result;
  }

  if (options.upgrade) {
    result = runCommand(buildNpmCommand(["update"]), { ...process.env });
    if (result !== 0) {
      return result;
    }
  }

  if (options.skipBrowsers) {
    return 0;
  }

  return runCommand([process.execPath, PLAYWRIGHT_CLI, "install"], { ...process.env });
}

function commandPlaywright(args) {
  ensureDependenciesInstalled();
  return runCommand([process.execPath, PLAYWRIGHT_CLI, ...args], { ...process.env });
}

function commandReport(options) {
  ensureDependenciesInstalled();
  const reportDir = resolveReportDir(options.path);
  return runCommand([process.execPath, PLAYWRIGHT_CLI, "show-report", reportDir], { ...process.env });
}

function commandTrace(options) {
  ensureDependenciesInstalled();
  const traceFile = resolveTraceFile(options.path);
  return runCommand([process.execPath, PLAYWRIGHT_CLI, "show-trace", traceFile], { ...process.env });
}

function commandCodegen(options) {
  ensureDependenciesInstalled();
  const browserName = resolveBrowsers({ browser: options.browser })[0] || "chromium";
  const targetUrl = resolveCodegenUrl(options.path, options.environment, options.baseUrl);
  return runCommand(
    [process.execPath, PLAYWRIGHT_CLI, "codegen", "--target", "playwright-test", "--browser", browserName, targetUrl],
    { ...process.env },
  );
}

function commandDoctor() {
  const defaults = runnerDefaults();
  const npmVersion = readCommandStdout(buildNpmCommand(["--version"]));

  console.log(`Project root          : ${PROJECT_ROOT}`);
  console.log(`Settings file         : ${SETTINGS_FILE}`);
  console.log(`Playwright config     : ${PLAYWRIGHT_CONFIG}`);
  console.log(`Node executable       : ${process.execPath}`);
  console.log(`Node version          : ${process.version}`);
  console.log(`npm version           : ${npmVersion || "unknown"}`);
  console.log(`Playwright CLI        : ${PLAYWRIGHT_CLI}`);
  console.log(`Default environment   : ${defaultEnvironmentName()}`);
  console.log(`Resolved base URL     : ${resolveBaseUrl(defaultEnvironmentName(), null)}`);
  console.log(`Resolved API base URL : ${resolveApiBaseUrl(defaultEnvironmentName(), null)}`);
  console.log(`Default browsers      : ${defaults.browsers.join(", ")}`);
  console.log(`Default workers       : ${defaults.workers} (mapped to 1 worker for serial Playwright runs)`);
  console.log(`Default retries       : ${defaults.retries}`);
  console.log(`Test timeout          : ${defaults.test_timeout_ms}ms`);
  console.log(`Expect timeout        : ${defaults.expect_timeout_ms}ms`);
  console.log(`Action timeout        : ${defaults.action_timeout_ms}ms`);
  console.log(`Navigation timeout    : ${defaults.navigation_timeout_ms}ms`);
  console.log(`Navigation retries    : ${defaults.navigation_retries}`);
  console.log(`Default trace mode    : ${defaults.tracing}`);
  console.log(`Default video mode    : ${defaults.video}`);
  console.log(`Default screenshot    : ${defaults.screenshot} (full-page: ${defaults.full_page_screenshot})`);
  console.log(`Default JUnit mode    : ${defaults.junit}`);
  console.log(`Default JSON mode     : ${defaults.json_report}`);
  console.log(`Response log threshold: HTTP ${defaults.response_error_status}+`);
  console.log(`Default test artifacts: ${defaults.artifacts_dir}`);
  console.log("Runner note           : scripts/qa.mjs plus the run wrappers drive Playwright Test directly");
  return 0;
}

function parseRunArgs(argv) {
  const separatorIndex = argv.indexOf("--");
  const passthroughArgs = separatorIndex >= 0 ? argv.slice(separatorIndex + 1) : [];
  const parseableArgs = separatorIndex >= 0 ? argv.slice(0, separatorIndex) : argv;

  const { values, positionals } = parseArgs({
    allowPositionals: true,
    args: parseableArgs,
    options: {
      tag: { type: "string", multiple: true },
      marker: { type: "string", short: "m" },
      keyword: { type: "string", short: "k" },
      browser: { type: "string", multiple: true },
      headed: { type: "boolean" },
      headless: { type: "boolean" },
      ui: { type: "boolean" },
      debug: { type: "boolean" },
      workers: { type: "string", short: "n" },
      trace: { type: "string" },
      video: { type: "string" },
      screenshot: { type: "string" },
      "full-page-screenshot": { type: "string" },
      environment: { type: "string" },
      "base-url": { type: "string" },
      "api-base-url": { type: "string" },
      "search-term": { type: "string" },
      "storage-state": { type: "string" },
      output: { type: "string" },
      retries: { type: "string" },
      junit: { type: "string" },
      "junit-file": { type: "string" },
      json: { type: "string" },
      "json-file": { type: "string" },
      maxfail: { type: "string" },
      "collect-only": { type: "boolean" },
      "dry-run": { type: "boolean" },
      quiet: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    strict: false,
  });

  return {
    options: {
      tag: values.tag,
      marker: values.marker,
      keyword: values.keyword,
      browser: values.browser,
      headed: values.headed,
      headless: values.headless,
      ui: values.ui === true,
      debug: values.debug === true,
      workers: values.workers,
      trace: values.trace,
      video: values.video,
      screenshot: values.screenshot,
      fullPageScreenshot: values["full-page-screenshot"],
      environment: values.environment || defaultEnvironmentName(),
      baseUrl: values["base-url"],
      apiBaseUrl: values["api-base-url"],
      searchTerm: values["search-term"],
      storageState: values["storage-state"],
      output: values.output,
      retries: values.retries,
      junit: values.junit,
      junitFile: values["junit-file"],
      json: values.json,
      jsonFile: values["json-file"],
      maxfail: values.maxfail,
      collectOnly: values["collect-only"] === true,
      dryRun: values["dry-run"] === true,
      quiet: values.quiet === true,
      help: values.help === true,
      paths: positionals,
    },
    passthroughArgs,
  };
}

function parseInstallArgs(argv) {
  const { values } = parseArgs({
    allowPositionals: true,
    args: argv,
    options: {
      upgrade: { type: "boolean" },
      "skip-browsers": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    strict: false,
  });

  return {
    upgrade: values.upgrade === true,
    skipBrowsers: values["skip-browsers"] === true,
    help: values.help === true,
  };
}

function parseReportArgs(argv) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    args: argv,
    options: {
      help: { type: "boolean", short: "h" },
    },
    strict: false,
  });

  return {
    help: values.help === true,
    path: positionals[0],
  };
}

function parseTraceArgs(argv) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    args: argv,
    options: {
      help: { type: "boolean", short: "h" },
    },
    strict: false,
  });

  return {
    help: values.help === true,
    path: positionals[0],
  };
}

function parseCodegenArgs(argv) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    args: argv,
    options: {
      browser: { type: "string", multiple: true },
      environment: { type: "string" },
      "base-url": { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    strict: false,
  });

  return {
    help: values.help === true,
    browser: values.browser,
    environment: values.environment || defaultEnvironmentName(),
    baseUrl: values["base-url"],
    path: positionals[0],
  };
}

function normalizeArgv(rawArgv) {
  if (rawArgv.length === 0) {
    return ["run"];
  }

  if (rawArgv[0] === "-h" || rawArgv[0] === "--help") {
    return rawArgv;
  }

  if (["run", "install", "playwright", "report", "trace", "codegen", "doctor"].includes(rawArgv[0])) {
    return rawArgv;
  }

  if (rawArgv[0].startsWith("-")) {
    return ["run", ...rawArgv];
  }

  return ["run", ...rawArgv];
}

function main(rawArgv) {
  try {
    const argv = normalizeArgv(rawArgv);
    const command = argv[0];

    if (command === "-h" || command === "--help") {
      console.log(ROOT_HELP);
      return 0;
    }

    if (command === "run") {
      const { options, passthroughArgs } = parseRunArgs(argv.slice(1));
      if (options.help) {
        console.log(RUN_HELP);
        return 0;
      }
      return commandRun(options, passthroughArgs);
    }

    if (command === "install") {
      const options = parseInstallArgs(argv.slice(1));
      if (options.help) {
        console.log("Install options:\n  --upgrade\n  --skip-browsers\n");
        return 0;
      }
      return commandInstall(options);
    }

    if (command === "playwright") {
      return commandPlaywright(argv.slice(1));
    }

    if (command === "report") {
      const options = parseReportArgs(argv.slice(1));
      if (options.help) {
        console.log(REPORT_HELP);
        return 0;
      }
      return commandReport(options);
    }

    if (command === "trace") {
      const options = parseTraceArgs(argv.slice(1));
      if (options.help) {
        console.log(TRACE_HELP);
        return 0;
      }
      return commandTrace(options);
    }

    if (command === "codegen") {
      const options = parseCodegenArgs(argv.slice(1));
      if (options.help) {
        console.log(CODEGEN_HELP);
        return 0;
      }
      return commandCodegen(options);
    }

    if (command === "doctor") {
      return commandDoctor();
    }

    console.log(ROOT_HELP);
    return 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

process.exitCode = main(process.argv.slice(2));
