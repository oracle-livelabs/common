#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  REGRESSION_REPORT_RENDERER_VERSION,
  writeReportHistory,
  writeSummaryFiles,
} from "./root-summary-reporter.mjs";
import { PAR_REPORT_RENDERER_VERSION } from "./par-link-report.mjs";

const CHANNELS = {
  par: { landingPage: "par-links.html" },
  regression: { landingPage: "summary.html" },
};
const SAFE_RUN_ID = /^[A-Za-z0-9._:-]+$/;

export function rebuildSavedReports(reportsBase, options = {}) {
  const channels = options.channels || Object.keys(CHANNELS);
  return channels.map((channel) => rebuildReportChannel(reportsBase, channel, options));
}

export function rebuildReportChannel(reportsBase, channel, options = {}) {
  const definition = CHANNELS[channel];
  if (!definition) {
    throw new Error(`Unsupported report channel: ${channel}`);
  }

  const log = typeof options.log === "function" ? options.log : () => {};
  const channelRoot = path.resolve(reportsBase, channel);
  const runsRoot = path.join(channelRoot, "runs");
  const latestDir = path.join(channelRoot, "latest");
  fs.mkdirSync(runsRoot, { recursive: true });

  const latestSummary = readSummary(path.join(latestDir, "summary.json"));
  let restoredLatestRun = false;
  if (isUsableSummary(latestSummary)) {
    const immutableRun = path.join(runsRoot, latestSummary.runId);
    if (!fs.existsSync(path.join(immutableRun, "summary.json"))) {
      fs.cpSync(latestDir, immutableRun, { recursive: true });
      restoredLatestRun = true;
    }
  }

  const runs = readRuns(runsRoot);
  let rebuiltRunCount = 0;
  for (const run of runs) {
    if (!reportIsCurrent(run.outputDir, channel)) {
      writeSummaryFiles(run.outputDir, run.summary, channelRoot);
      rebuiltRunCount += 1;
    }
  }

  if (runs.length === 0) {
    writeReportHistory(channelRoot, definition.landingPage);
    log(`No saved ${channel} report data was found.`);
    return {
      channel,
      runCount: 0,
      rebuiltRunCount: 0,
      restoredLatestRun: false,
      latestRunId: "",
    };
  }

  runs.sort(compareRunsNewestFirst);
  const newest = runs[0];
  const currentLatest = readSummary(path.join(latestDir, "summary.json"));
  if (
    currentLatest?.runId !== newest.summary.runId ||
    !reportIsCurrent(latestDir, channel)
  ) {
    replaceDirectory(newest.outputDir, latestDir);
    writeSummaryFiles(latestDir, newest.summary, channelRoot);
  }
  writeReportHistory(channelRoot, definition.landingPage);
  log(
    `Prepared ${runs.length} saved ${channel} report${runs.length === 1 ? "" : "s"}; latest is ${newest.summary.runId}.`,
  );

  return {
    channel,
    runCount: runs.length,
    rebuiltRunCount,
    restoredLatestRun,
    latestRunId: newest.summary.runId,
  };
}

function reportIsCurrent(outputDir, channel) {
  const landingPage = CHANNELS[channel].landingPage;
  const reportPath = path.join(outputDir, landingPage);
  if (!fs.existsSync(reportPath)) {
    return false;
  }
  const html = fs.readFileSync(reportPath, "utf-8");
  if (channel === "par") {
    return (
      html.includes(
        `name="livelabs-qa-par-renderer" content="${PAR_REPORT_RENDERER_VERSION}"`,
      ) &&
      fs.existsSync(path.join(outputDir, "par-retest-list.html"))
    );
  }
  return html.includes(
    `name="livelabs-qa-renderer" content="${REGRESSION_REPORT_RENDERER_VERSION}"`,
  );
}

function readRuns(runsRoot) {
  return fs
    .readdirSync(runsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && SAFE_RUN_ID.test(entry.name))
    .flatMap((entry) => {
      const outputDir = path.join(runsRoot, entry.name);
      const summary = readSummary(path.join(outputDir, "summary.json"));
      if (!isUsableSummary(summary) || summary.runId !== entry.name) {
        return [];
      }
      return [{ outputDir, summary }];
    });
}

function readSummary(summaryPath) {
  if (!fs.existsSync(summaryPath)) {
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
  } catch {
    return undefined;
  }
}

function isUsableSummary(summary) {
  return Boolean(summary && SAFE_RUN_ID.test(String(summary.runId || "")));
}

function compareRunsNewestFirst(left, right) {
  const leftTime = Date.parse(left.summary.startedAt || left.summary.runId) || 0;
  const rightTime = Date.parse(right.summary.startedAt || right.summary.runId) || 0;
  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }
  return String(right.summary.runId).localeCompare(String(left.summary.runId));
}

function replaceDirectory(sourceDir, targetDir) {
  const parentDir = path.dirname(targetDir);
  const temporaryDir = path.join(parentDir, `.latest-rebuild-${process.pid}-${Date.now()}`);
  const backupDir = path.join(parentDir, `.latest-backup-${process.pid}-${Date.now()}`);
  fs.rmSync(temporaryDir, { recursive: true, force: true });
  fs.rmSync(backupDir, { recursive: true, force: true });
  fs.cpSync(sourceDir, temporaryDir, { recursive: true });

  let movedExisting = false;
  try {
    if (fs.existsSync(targetDir)) {
      fs.renameSync(targetDir, backupDir);
      movedExisting = true;
    }
    fs.renameSync(temporaryDir, targetDir);
    fs.rmSync(backupDir, { recursive: true, force: true });
  } catch (error) {
    fs.rmSync(temporaryDir, { recursive: true, force: true });
    if (movedExisting && !fs.existsSync(targetDir) && fs.existsSync(backupDir)) {
      fs.renameSync(backupDir, targetDir);
    }
    throw error;
  }
}

function parseArguments(argv) {
  let reportsBase = process.env.QA_ROOT_REPORTS_BASE || "/var/qa-reports";
  const channels = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--reports-base") {
      reportsBase = argv[index + 1] || reportsBase;
      index += 1;
    } else if (argument === "--channel") {
      channels.push(argv[index + 1]);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return {
    reportsBase,
    channels: channels.length > 0 ? channels : Object.keys(CHANNELS),
  };
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  try {
    const options = parseArguments(process.argv.slice(2));
    rebuildSavedReports(options.reportsBase, {
      channels: options.channels,
      log: (message) => console.log(message),
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
