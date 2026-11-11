#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(__filename), "..");
const QA_RUNNER = path.join(PROJECT_ROOT, "scripts", "qa.mjs");
const REVIEW_OUTPUT_ROOT = path.join(PROJECT_ROOT, "artifacts", "review-lists");
const FIX_INSTRUCTIONS =
  "Investigate the failures for only the tests in the provided Fix List. Identify and fix the relevant code errors. After applying fixes, rerun only the selected tests using the normal project test execution flow. Produce the standard test report and clearly show whether each selected test now passes. If any test still fails, include updated failure details.";

const HELP = `Run a report review list payload.

Usage:
  node ./scripts/report-review-action.mjs retest --payload <payload.json> [--dry-run]
  node ./scripts/report-review-action.mjs fix --payload <payload.json> [--dry-run]

The static report pages create the payloads. This script validates them and
hands them to the normal QA runner or to Codex repair instructions.
`;

export function normalizePayload(rawPayload, expectedType) {
  if (!rawPayload || typeof rawPayload !== "object") {
    throw new Error("Payload must be a JSON object.");
  }

  const type = String(rawPayload.type || "").trim();
  if (!["retest", "fix"].includes(type)) {
    throw new Error('Payload type must be "retest" or "fix".');
  }

  if (expectedType && type !== expectedType) {
    throw new Error(`Payload type "${type}" does not match requested action "${expectedType}".`);
  }

  const tests = Array.isArray(rawPayload.tests) ? rawPayload.tests : [];
  if (tests.length === 0) {
    throw new Error(`The ${type === "fix" ? "Fix List" : "Retest List"} is empty.`);
  }

  return {
    type,
    sourceExecutionId: String(rawPayload.sourceExecutionId || "").trim(),
    createdAt: String(rawPayload.createdAt || "").trim(),
    instructions: String(rawPayload.instructions || "").trim(),
    tests: tests.map(normalizePayloadTest),
  };
}

export function selectedChecksFromPayload(payload) {
  const selected = [];
  const seen = new Set();

  for (const test of payload.tests || []) {
    const checks = Array.isArray(test.checks) && test.checks.length > 0 ? test.checks : [test];
    for (const check of checks) {
      const testPath = String(check.testPath || test.testPath || "").replace(/\\/g, "/");
      const testName = String(check.testName || test.testName || "").trim();
      if (!testPath || !testName) {
        continue;
      }

      const key = `${testPath}\n${testName}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      selected.push({
        testId: String(check.testId || test.testId || key),
        testName,
        testPath,
        suiteName: String(check.suiteName || test.suiteName || ""),
        lastStatus: String(check.lastStatus || test.lastStatus || ""),
        failureReason: String(check.failureReason || test.failureReason || ""),
        stackTrace: String(check.stackTrace || test.stackTrace || ""),
      });
    }
  }

  if (selected.length === 0) {
    throw new Error("No runnable tests were found in the payload. Each selected item needs a test name and test file path.");
  }

  return selected;
}

export function buildRetestPlan(payload, options = {}) {
  const checks = selectedChecksFromPayload(payload);
  const paths = Array.from(new Set(checks.map((check) => check.testPath))).sort();
  const missingPaths = paths.filter((testPath) => !fs.existsSync(path.join(PROJECT_ROOT, testPath)));
  if (missingPaths.length > 0) {
    throw new Error(`One or more selected tests no longer exist:\n${missingPaths.map((item) => `- ${item}`).join("\n")}`);
  }

  const outputDir = path.relative(
    PROJECT_ROOT,
    options.outputDir ||
      path.join(REVIEW_OUTPUT_ROOT, `retest-${safePathSegment(payload.sourceExecutionId || "selected")}-${runIdentifier(new Date())}`),
  ).replace(/\\/g, "/");
  const grep = checks.map((check) => escapeRegex(check.testName)).join("|");
  const jsonFile = path.posix.join(outputDir, "results.json");
  const junitFile = path.posix.join(outputDir, "junit.xml");

  return {
    checks,
    command: [
      process.execPath,
      QA_RUNNER,
      "run",
      ...paths,
      "--marker",
      grep,
      "--output",
      outputDir,
      "--json",
      "on",
      "--json-file",
      jsonFile,
      "--junit",
      "on",
      "--junit-file",
      junitFile,
    ],
    outputDir,
  };
}

export function buildFixPrompt(payload) {
  const checks = selectedChecksFromPayload(payload);
  const lines = [
    "# Fix Selected LiveLabs QA Tests",
    "",
    FIX_INSTRUCTIONS,
    "",
    `Source execution id: ${payload.sourceExecutionId || "unknown"}`,
    "",
    "## Selected Tests",
    "",
  ];

  for (const check of checks) {
    lines.push(`### ${check.testName}`);
    lines.push("");
    lines.push(`- Test path: ${check.testPath}`);
    lines.push(`- Suite: ${check.suiteName || "unknown"}`);
    lines.push(`- Latest status: ${check.lastStatus || "unknown"}`);
    if (check.failureReason) {
      lines.push("- Failure reason:");
      lines.push("");
      lines.push("```text");
      lines.push(check.failureReason);
      lines.push("```");
    }
    if (check.stackTrace) {
      lines.push("- Stack trace or location:");
      lines.push("");
      lines.push("```text");
      lines.push(check.stackTrace);
      lines.push("```");
    }
    lines.push("");
  }

  lines.push("## Required Follow-up");
  lines.push("");
  lines.push("After fixing, rerun only the selected tests through:");
  lines.push("");
  lines.push("```powershell");
  lines.push("node ./scripts/report-review-action.mjs retest --payload <same-payload-or-updated-payload.json>");
  lines.push("```");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

export function writeFixHandoff(payload, outputRoot = REVIEW_OUTPUT_ROOT) {
  const runDir = path.join(outputRoot, `fix-${safePathSegment(payload.sourceExecutionId || "selected")}-${runIdentifier(new Date())}`);
  fs.mkdirSync(runDir, { recursive: true });
  const payloadFile = path.join(runDir, "fix-list-payload.json");
  const promptFile = path.join(runDir, "codex-fix-prompt.md");
  fs.writeFileSync(payloadFile, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  fs.writeFileSync(promptFile, buildFixPrompt(payload), "utf-8");
  return { runDir, payloadFile, promptFile };
}

function normalizePayloadTest(test) {
  if (!test || typeof test !== "object") {
    return {};
  }

  return {
    testId: String(test.testId || ""),
    testName: String(test.testName || ""),
    testPath: String(test.testPath || ""),
    suiteName: String(test.suiteName || ""),
    lastStatus: String(test.lastStatus || test.latestStatus || ""),
    failureReason: String(test.failureReason || ""),
    stackTrace: String(test.stackTrace || ""),
    executionId: String(test.executionId || ""),
    rerunCommand: String(test.rerunCommand || ""),
    catalogUrl: String(test.catalogUrl || ""),
    finalUrl: String(test.finalUrl || ""),
    checks: Array.isArray(test.checks) ? test.checks.map(normalizePayloadTest) : [],
  };
}

function parseCliArgs(argv) {
  const action = argv[0];
  if (!action || action === "-h" || action === "--help") {
    return { help: true };
  }

  const { values } = parseArgs({
    args: argv.slice(1),
    options: {
      payload: { type: "string" },
      "dry-run": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  return {
    action,
    payload: values.payload,
    dryRun: values["dry-run"] === true,
    help: values.help === true,
  };
}

function readPayloadFile(payloadPath) {
  if (!payloadPath) {
    throw new Error("Missing --payload <payload.json>.");
  }

  const resolved = path.resolve(PROJECT_ROOT, payloadPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Payload file was not found: ${resolved}`);
  }

  return JSON.parse(fs.readFileSync(resolved, "utf-8"));
}

function runRetest(payload, dryRun) {
  const plan = buildRetestPlan(payload);
  console.log(`Selected tests: ${plan.checks.length}`);
  console.log(`Output: ${plan.outputDir}`);
  console.log(`> ${formatCommand(plan.command)}`);

  if (dryRun) {
    return 0;
  }

  const completed = spawnSync(plan.command[0], plan.command.slice(1), {
    cwd: PROJECT_ROOT,
    env: process.env,
    stdio: "inherit",
  });

  return typeof completed.status === "number" ? completed.status : 1;
}

function runFix(payload, dryRun) {
  const handoff = writeFixHandoff(payload);
  console.log(`Fix payload: ${path.relative(PROJECT_ROOT, handoff.payloadFile).replace(/\\/g, "/")}`);
  console.log(`Codex prompt: ${path.relative(PROJECT_ROOT, handoff.promptFile).replace(/\\/g, "/")}`);
  console.log("Open the prompt with Codex, apply the fixes, then rerun the selected tests with the retest action.");

  if (dryRun) {
    return 0;
  }

  return 0;
}

function formatCommand(command) {
  return command.map((part) => quoteArgument(String(part))).join(" ");
}

function quoteArgument(value) {
  if (!/[ \t"]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safePathSegment(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "selected";
}

function runIdentifier(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function main(rawArgv) {
  try {
    const options = parseCliArgs(rawArgv);
    if (options.help) {
      console.log(HELP);
      return 0;
    }

    if (!["retest", "fix"].includes(options.action)) {
      throw new Error('Action must be "retest" or "fix".');
    }

    const payload = normalizePayload(readPayloadFile(options.payload), options.action);
    return options.action === "retest" ? runRetest(payload, options.dryRun) : runFix(payload, options.dryRun);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  process.exitCode = main(process.argv.slice(2));
}
