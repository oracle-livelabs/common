#!/usr/bin/env node

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const GUI_ROOT = path.resolve(path.dirname(__filename), "..");
const APP_ROOT = path.join(GUI_ROOT, "public");
const RUNNER = path.join(GUI_ROOT, "scripts", "published-workshop-qa.mjs");
const RUNS_ROOT = path.join(GUI_ROOT, "artifacts", "runs");
const LEGACY_RUNS_ROOT = path.resolve(GUI_ROOT, "..", "artifacts", "published-workshop-qa-app");
const HISTORY_ROOTS = [RUNS_ROOT, LEGACY_RUNS_ROOT];
const DEFAULT_PORT = 8787;
const DEFAULT_HOST = "127.0.0.1";
const MAX_BODY_BYTES = 128 * 1024;
const HISTORY_LIMIT = 5;

const HELP = `Start the local Published Workshop QA app.

Usage:
  node QA_GUI/scripts/workshop-qa-app.mjs [options]
  npm run workshop:qa:app

Options:
  --host <host>      Host to bind. Default: ${DEFAULT_HOST}
  --port <port>      Port to bind. Default: ${DEFAULT_PORT}
  -h, --help         Show this help text.
`;

const runs = new Map();

function main(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      host: { type: "string" },
      port: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(HELP);
    return;
  }

  if (!fs.existsSync(RUNNER)) {
    throw new Error(`Published workshop QA runner was not found at ${RUNNER}`);
  }

  const host = values.host || DEFAULT_HOST;
  const port = parsePort(values.port || process.env.WORKSHOP_QA_APP_PORT || DEFAULT_PORT);
  fs.mkdirSync(RUNS_ROOT, { recursive: true });

  const server = http.createServer((request, response) => {
    routeRequest(request, response).catch((error) => {
      sendJson(response, error.statusCode || 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  });

  server.listen(port, host, () => {
    console.log(`Workshop QA app: http://${host}:${port}`);
    console.log("Press Ctrl+C to stop.");
  });
}

async function routeRequest(request, response) {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (request.method === "GET" && url.pathname === "/") {
    return serveStatic(response, path.join(APP_ROOT, "index.html"));
  }

  if (request.method === "GET" && url.pathname === "/favicon.ico") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && ["/app.js", "/styles.css"].includes(url.pathname)) {
    return serveStatic(response, path.join(APP_ROOT, url.pathname.slice(1)));
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    return sendJson(response, 200, {
      ok: true,
      runs: runs.size,
      defaultBrowserChannel: detectInstalledBrowserChannel(),
    });
  }

  if (request.method === "GET" && url.pathname === "/api/history") {
    return sendJson(response, 200, {
      items: listHistoryRuns(),
    });
  }

  if (request.method === "POST" && url.pathname === "/api/runs") {
    const body = await readJsonBody(request);
    const run = createRun(body);
    sendJson(response, 202, serializeRun(run));
    startRun(run);
    return;
  }

  const runMatch = url.pathname.match(/^\/api\/runs\/([a-f0-9-]+)$/);
  if (request.method === "GET" && runMatch) {
    const run = requireRun(runMatch[1]);
    return sendJson(response, 200, serializeRun(run));
  }

  const cancelMatch = url.pathname.match(/^\/api\/runs\/([a-f0-9-]+)\/cancel$/);
  if (request.method === "POST" && cancelMatch) {
    const run = requireRun(cancelMatch[1]);
    cancelRun(run);
    return sendJson(response, 200, serializeRun(run));
  }

  const eventsMatch = url.pathname.match(/^\/api\/runs\/([a-f0-9-]+)\/events$/);
  if (request.method === "GET" && eventsMatch) {
    const run = requireRun(eventsMatch[1]);
    return streamRunEvents(request, response, run);
  }

  const reportMatch = url.pathname.match(/^\/api\/runs\/([a-f0-9-]+)\/report\.(json|md)$/);
  if (request.method === "GET" && reportMatch) {
    const run = requireRun(reportMatch[1]);
    const extension = reportMatch[2];
    const reportPath = path.join(run.outputDir, `report.${extension}`);
    return serveReport(response, reportPath, extension);
  }

  return sendJson(response, 404, { error: "Not found" });
}

function createRun(body) {
  const workshopUrl = String(body?.url || "").trim();
  if (!/^https?:\/\//i.test(workshopUrl)) {
    throw new Error("Workshop URL must start with http:// or https://.");
  }

  const id = crypto.randomUUID();
  const outputDir = path.join(RUNS_ROOT, id);
  const browserChannel = normalizeBrowserChannel(body?.browserChannel);

  return {
    id,
    state: "queued",
    workshopUrl,
    createdAt: new Date().toISOString(),
    startedAt: "",
    endedAt: "",
    browserChannel,
    labFilter: String(body?.labFilter || "").trim(),
    maxLabs: parseOptionalPositiveInteger(body?.maxLabs, "maxLabs"),
    timeoutMs: parseOptionalPositiveInteger(body?.timeoutMs, "timeoutMs"),
    outputDir,
    exitCode: null,
    error: "",
    events: [],
    clients: new Set(),
    child: null,
    finalized: false,
    reportWatcher: null,
    report: null,
  };
}

function startRun(run) {
  runs.set(run.id, run);
  run.state = "running";
  run.startedAt = new Date().toISOString();
  emitRunEvent(run, "started", {
    run: serializeRun(run),
  });

  fs.mkdirSync(run.outputDir, { recursive: true });

  const args = [
    RUNNER,
    "--url",
    run.workshopUrl,
    "--output-dir",
    run.outputDir,
    "--allow-issues",
  ];

  if (run.browserChannel) {
    args.push("--browser-channel", run.browserChannel);
  }

  if (run.labFilter) {
    for (const lab of splitList(run.labFilter)) {
      args.push("--lab", lab);
    }
  }

  if (run.maxLabs) {
    args.push("--max-labs", String(run.maxLabs));
  }

  if (run.timeoutMs) {
    args.push("--timeout-ms", String(run.timeoutMs));
  }

  const child = spawn(process.execPath, args, {
    cwd: GUI_ROOT,
    env: {
      ...process.env,
      ...(run.browserChannel ? { QA_BROWSER_CHANNEL: run.browserChannel } : {}),
    },
    windowsHide: true,
  });

  run.child = child;
  run.reportWatcher = setInterval(() => {
    if (fs.existsSync(path.join(run.outputDir, "report.json"))) {
      finalizeRun(run, 0);
    }
  }, 1000);

  emitRunEvent(run, "command", {
    command: formatCommand([process.execPath, ...args.map((arg) => path.isAbsolute(arg) ? path.relative(GUI_ROOT, arg) : arg)]),
    browserChannel: run.browserChannel || "default",
  });

  wireProcessOutput(run, child.stdout, "stdout");
  wireProcessOutput(run, child.stderr, "stderr");

  child.on("error", (error) => {
    if (run.finalized) {
      return;
    }
    clearReportWatcher(run);
    run.error = error.message;
    run.state = "failed";
    run.endedAt = new Date().toISOString();
    emitRunEvent(run, "failed", serializeRun(run));
  });

  child.on("close", (code) => {
    finalizeRun(run, code);
  });
}

function finalizeRun(run, code) {
  if (run.finalized) {
    return;
  }

  run.finalized = true;
  clearReportWatcher(run);
  run.exitCode = code;
  run.endedAt = new Date().toISOString();
  readRunReport(run);

  if (run.report) {
    run.state = "completed";
    if (run.child) {
      run.child.kill();
      run.child = null;
    }
    emitRunEvent(run, "report", {
      report: run.report,
      links: reportLinks(run),
    });
    emitRunEvent(run, "completed", serializeRun(run));
    return;
  }

  run.child = null;
  run.state = code === 0 ? "completed" : "failed";
  if (code !== 0 && !run.error) {
    run.error = `Runner exited with code ${code}.`;
  }
  emitRunEvent(run, run.state === "completed" ? "completed" : "failed", serializeRun(run));
}

function wireProcessOutput(run, stream, type) {
  let buffer = "";

  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      handleRunnerLine(run, type, line);
    }
  });

  stream.on("end", () => {
    if (buffer.trim()) {
      handleRunnerLine(run, type, buffer);
    }
  });
}

function handleRunnerLine(run, streamType, line) {
  const text = line.trim();
  if (!text) {
    return;
  }

  emitRunEvent(run, streamType, { text });

  const labMatch = text.match(/^\[(\d+)\/(\d+)\]\s+(.+?)\s+\.\.\.\s+(PASS|FAIL|ERROR)(?:\s+\((.*?)\))?$/i);
  if (labMatch) {
    emitRunEvent(run, "lab", {
      current: Number(labMatch[1]),
      total: Number(labMatch[2]),
      labId: labMatch[3],
      status: labMatch[4].toLowerCase(),
      detail: labMatch[5] || "",
    });
    return;
  }

  const summaryMatch = text.match(/^Summary\s+:\s+(.+)$/i);
  if (summaryMatch) {
    emitRunEvent(run, "summary-line", {
      text: summaryMatch[1],
    });
  }
}

function cancelRun(run) {
  if (!run.child || run.state !== "running") {
    return;
  }

  clearReportWatcher(run);
  run.finalized = true;
  run.state = "cancelled";
  run.endedAt = new Date().toISOString();
  run.error = "Run cancelled by user.";
  run.child.kill();
  emitRunEvent(run, "cancelled", serializeRun(run));
}

function clearReportWatcher(run) {
  if (run.reportWatcher) {
    clearInterval(run.reportWatcher);
    run.reportWatcher = null;
  }
}

function readRunReport(run) {
  const reportPath = path.join(run.outputDir, "report.json");
  if (!fs.existsSync(reportPath)) {
    return;
  }

  try {
    run.report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
  } catch (error) {
    run.error = `Could not read report.json: ${error instanceof Error ? error.message : error}`;
  }
}

function emitRunEvent(run, type, payload) {
  const event = {
    type,
    payload,
    at: new Date().toISOString(),
  };

  run.events.push(event);
  if (run.events.length > 500) {
    run.events.splice(0, run.events.length - 500);
  }

  for (const client of run.clients) {
    writeSse(client, event);
  }
}

function streamRunEvents(request, response, run) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  response.write(": connected\n\n");
  for (const event of run.events) {
    writeSse(response, event);
  }

  run.clients.add(response);
  request.on("close", () => {
    run.clients.delete(response);
  });
}

function writeSse(response, event) {
  response.write(`event: ${event.type}\n`);
  response.write(`data: ${JSON.stringify(event.payload)}\n\n`);
}

async function readJsonBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk.toString();
    if (body.length > MAX_BODY_BYTES) {
      throw new Error("Request body is too large.");
    }
  }

  if (!body.trim()) {
    return {};
  }

  return JSON.parse(body);
}

function requireRun(id) {
  const run = runs.get(id) || loadRunFromDisk(id);
  if (!run) {
    const error = new Error(`Run not found: ${id}`);
    error.statusCode = 404;
    throw error;
  }

  runs.set(id, run);
  return run;
}

function serializeRun(run) {
  return {
    id: run.id,
    state: run.state,
    workshopUrl: run.workshopUrl,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    browserChannel: run.browserChannel,
    labFilter: run.labFilter,
    maxLabs: run.maxLabs,
    timeoutMs: run.timeoutMs,
    exitCode: run.exitCode,
    error: run.error,
    generatedAt: run.report?.generatedAt || run.endedAt || "",
    workshopTitle: run.report?.workshopTitle || "",
    summary: run.report?.summary || null,
    links: run.report ? reportLinks(run) : null,
  };
}

function listHistoryRuns() {
  const byId = new Map();

  for (const run of runs.values()) {
    if (run.report) {
      byId.set(run.id, run);
    }
  }

  for (const historyRoot of HISTORY_ROOTS) {
    if (fs.existsSync(historyRoot)) {
      for (const entry of fs.readdirSync(historyRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || byId.has(entry.name)) {
          continue;
        }

        const run = loadRunFromRoot(entry.name, historyRoot);
        if (run?.report) {
          byId.set(run.id, run);
        }
      }
    }
  }

  return [...byId.values()]
    .sort((left, right) => runTimeValue(right) - runTimeValue(left))
    .slice(0, HISTORY_LIMIT)
    .map(serializeRun);
}

function loadRunFromDisk(id) {
  for (const historyRoot of HISTORY_ROOTS) {
    const run = loadRunFromRoot(id, historyRoot);
    if (run) {
      return run;
    }
  }

  return null;
}

function loadRunFromRoot(id, runsRoot) {
  if (!/^[a-f0-9-]{8,}$/i.test(id)) {
    return null;
  }

  const root = path.resolve(runsRoot);
  const outputDir = path.resolve(runsRoot, id);
  if (!outputDir.startsWith(`${root}${path.sep}`)) {
    return null;
  }

  const reportPath = path.join(outputDir, "report.json");
  if (!fs.existsSync(reportPath) || !fs.statSync(reportPath).isFile()) {
    return null;
  }

  try {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
    const stat = fs.statSync(reportPath);
    const generatedAt = report.generatedAt || stat.mtime.toISOString();
    return {
      id,
      state: "completed",
      workshopUrl: report.workshopUrl || "",
      createdAt: generatedAt,
      startedAt: "",
      endedAt: generatedAt,
      browserChannel: "",
      labFilter: "",
      maxLabs: 0,
      timeoutMs: 0,
      outputDir,
      exitCode: 0,
      error: "",
      events: [],
      clients: new Set(),
      child: null,
      finalized: true,
      reportWatcher: null,
      report,
    };
  } catch {
    return null;
  }
}

function runTimeValue(run) {
  const value = run.report?.generatedAt || run.endedAt || run.createdAt || "";
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function reportLinks(run) {
  return {
    markdown: `/api/runs/${run.id}/report.md`,
    json: `/api/runs/${run.id}/report.json`,
  };
}

function serveStatic(response, filePath) {
  if (!filePath.startsWith(APP_ROOT) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return sendJson(response, 404, { error: "Not found" });
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType =
    extension === ".html" ? "text/html; charset=utf-8" :
    extension === ".css" ? "text/css; charset=utf-8" :
    extension === ".js" ? "text/javascript; charset=utf-8" :
    "application/octet-stream";

  response.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(response);
}

function serveReport(response, reportPath, extension) {
  if (!fs.existsSync(reportPath) || !fs.statSync(reportPath).isFile()) {
    return sendJson(response, 404, { error: "Report has not been generated yet." });
  }

  response.writeHead(200, {
    "Content-Type": extension === "json" ? "application/json; charset=utf-8" : "text/markdown; charset=utf-8",
  });
  fs.createReadStream(reportPath).pipe(response);
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(`${JSON.stringify(data)}\n`);
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }

  return port;
}

function parseOptionalPositiveInteger(value, label) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

function splitList(value) {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBrowserChannel(value) {
  const requested = String(value || "").trim();
  if (requested && requested !== "auto") {
    return requested;
  }

  return process.env.QA_BROWSER_CHANNEL?.trim() || detectInstalledBrowserChannel();
}

function detectInstalledBrowserChannel() {
  if (process.platform !== "win32") {
    return "";
  }

  const edgePaths = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  if (edgePaths.some((candidate) => fs.existsSync(candidate))) {
    return "msedge";
  }

  const chromePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];
  if (chromePaths.some((candidate) => fs.existsSync(candidate))) {
    return "chrome";
  }

  return "";
}

function formatCommand(command) {
  return command.map((part) => {
    const value = String(part);
    return /[\s"]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
  }).join(" ");
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
