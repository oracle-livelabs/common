const LAST_URL_KEY = "workshopQa:lastUrl";
const ACTIVE_RUN_KEY = "workshopQa:activeRunId";

const form = document.querySelector("#runForm");
const runButton = document.querySelector("#runButton");
const cancelButton = document.querySelector("#cancelButton");
const clearLogButton = document.querySelector("#clearLog");
const refreshHistoryButton = document.querySelector("#refreshHistory");
const runState = document.querySelector("#runState");
const progressText = document.querySelector("#progressText");
const resultsBody = document.querySelector("#resultsBody");
const detailsBody = document.querySelector("#detailsBody");
const selectedStatus = document.querySelector("#selectedStatus");
const runnerLog = document.querySelector("#runnerLog");
const markdownReport = document.querySelector("#markdownReport");
const jsonReport = document.querySelector("#jsonReport");
const workshopUrlInput = document.querySelector("#workshopUrl");
const historyBody = document.querySelector("#historyBody");
const historyCount = document.querySelector("#historyCount");
const viewTabs = [...document.querySelectorAll("[data-view-tab]")];
const viewPanels = [...document.querySelectorAll("[data-view-panel]")];

const counters = {
  pass: document.querySelector("#passCount"),
  fail: document.querySelector("#failCount"),
  error: document.querySelector("#errorCount"),
  issues: document.querySelector("#issueCount"),
};

let currentRun = null;
let eventSource = null;
let liveRows = [];
let reportResults = [];
let selectedLabId = "";
let currentLinks = null;
let streamErrorLogged = false;

const savedUrl = localStorage.getItem(LAST_URL_KEY);
if (savedUrl) {
  workshopUrlInput.value = savedUrl;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.url = String(payload.url || "").trim();

  if (!payload.url) {
    return;
  }

  localStorage.setItem(LAST_URL_KEY, payload.url);
  resetRunView("Starting");
  setActiveView("current");
  setBusy(true);
  setRunState("running", "Starting");

  try {
    const response = await fetch("/api/runs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Could not start run.");
    }

    currentRun = data;
    rememberActiveRun(data.id);
    connectEvents(data.id);
  } catch (error) {
    appendLog(error.message || String(error), "stderr");
    setRunState("error", "Error");
    setBusy(false);
  }
});

cancelButton.addEventListener("click", async () => {
  if (!currentRun) {
    return;
  }

  await fetch(`/api/runs/${currentRun.id}/cancel`, { method: "POST" });
});

clearLogButton.addEventListener("click", () => {
  runnerLog.textContent = "";
});

refreshHistoryButton.addEventListener("click", () => {
  refreshHistory();
});

historyBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-run]");
  if (!button) {
    return;
  }

  openHistoryRun(button.dataset.openRun);
});

for (const tab of viewTabs) {
  tab.addEventListener("click", () => {
    setActiveView(tab.dataset.viewTab);
    if (tab.dataset.viewTab === "history") {
      refreshHistory();
    }
  });
}

initialize();

async function initialize() {
  await refreshHistory();
  await restoreActiveRun();
}

async function restoreActiveRun() {
  const runId = localStorage.getItem(ACTIVE_RUN_KEY);
  if (!runId) {
    return;
  }

  try {
    const run = await fetchRun(runId);
    currentRun = run;

    if (run.state === "running" || run.state === "queued") {
      resetRunView("Restoring");
      setRunState("running", "Running");
      setBusy(true);
      connectEvents(run.id);
      return;
    }

    if (run.links?.json) {
      resetRunView("Restoring");
      await loadReportForRun(run, { announce: false });
      appendLog(`Restored run ${shortRunId(run.id)}.`);
      return;
    }

    if (run.error) {
      setRunState("error", "Failed");
      appendLog(run.error, "stderr");
    }
  } catch {
    localStorage.removeItem(ACTIVE_RUN_KEY);
  }
}

async function openHistoryRun(runId) {
  try {
    const run = await fetchRun(runId);
    resetRunView("Loading saved run");
    await loadReportForRun(run);
    setActiveView("current");
  } catch (error) {
    appendLog(error.message || String(error), "stderr");
    setRunState("error", "History error");
  }
}

async function fetchRun(runId) {
  const response = await fetch(`/api/runs/${encodeURIComponent(runId)}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Could not load run ${runId}.`);
  }

  return data;
}

async function loadReportForRun(run, options = {}) {
  currentRun = run;
  rememberActiveRun(run.id);

  const reportUrl = run.links?.json || `/api/runs/${encodeURIComponent(run.id)}/report.json`;
  const response = await fetch(reportUrl);
  const report = await response.json();
  if (!response.ok) {
    throw new Error(report.error || "Could not load saved report.");
  }

  currentLinks = run.links || {
    markdown: `/api/runs/${run.id}/report.md`,
    json: `/api/runs/${run.id}/report.json`,
  };
  applyReport(report, currentLinks);
  finishRun({ ...run, summary: report.summary });
  setBusy(false);

  if (options.announce !== false) {
    appendLog(`Loaded saved run ${shortRunId(run.id)}.`);
  }
}

async function refreshHistory() {
  try {
    const response = await fetch("/api/history");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Could not load history.");
    }

    renderHistory(data.items || []);
  } catch (error) {
    historyBody.innerHTML = `<p class="muted">${escapeHtml(error.message || String(error))}</p>`;
    historyCount.textContent = "0";
  }
}

function renderHistory(items) {
  historyCount.textContent = String(items.length);

  if (items.length === 0) {
    historyBody.innerHTML = `<p class="muted">No completed runs yet.</p>`;
    return;
  }

  historyBody.innerHTML = items.map((item) => {
    const summary = item.summary || {};
    const title = item.workshopTitle || readableUrlTail(item.workshopUrl) || "Workshop";
    const generatedAt = formatDate(item.generatedAt || item.endedAt || item.createdAt);
    const runId = escapeAttribute(item.id);
    const markdownHref = escapeAttribute(item.links?.markdown || "#");
    const jsonHref = escapeAttribute(item.links?.json || "#");

    return `
      <article class="history-item">
        <div class="history-main">
          <div class="history-title">
            ${statusBadge(statusFromSummary(summary))}
            <strong>${escapeHtml(title)}</strong>
          </div>
          <div class="history-meta">
            <span>${escapeHtml(generatedAt)}</span>
            <span>${escapeHtml(shortRunId(item.id))}</span>
          </div>
          <div class="history-summary">
            <span>${Number(summary.totalLabs || 0)} labs</span>
            <span>${Number(summary.passCount || 0)} pass</span>
            <span>${Number(summary.failCount || 0)} fail</span>
            <span>${Number(summary.errorCount || 0)} errors</span>
            <span>${Number(summary.totalIssues || 0)} issues</span>
          </div>
          <div class="history-url">${escapeHtml(item.workshopUrl || "")}</div>
        </div>
        <div class="history-actions">
          <button class="secondary-button" type="button" data-open-run="${runId}">Open</button>
          <a class="report-link" href="${markdownHref}" target="_blank" rel="noreferrer">Report</a>
          <a class="report-link" href="${jsonHref}" target="_blank" rel="noreferrer">JSON</a>
        </div>
      </article>
    `;
  }).join("");
}

function connectEvents(runId) {
  closeEventSource();
  streamErrorLogged = false;
  rememberActiveRun(runId);

  eventSource = new EventSource(`/api/runs/${runId}/events`);
  const eventTypes = [
    "started",
    "command",
    "stdout",
    "stderr",
    "lab",
    "summary-line",
    "report",
    "completed",
    "failed",
    "cancelled",
  ];

  for (const type of eventTypes) {
    eventSource.addEventListener(type, (event) => {
      handleEvent(type, JSON.parse(event.data));
    });
  }

  eventSource.onerror = () => {
    if (streamErrorLogged || currentRun?.state === "completed") {
      return;
    }

    streamErrorLogged = true;
    appendLog("Event stream disconnected.", "stderr");
  };
}

function handleEvent(type, payload) {
  if (type === "started") {
    setRunState("running", "Running");
    return;
  }

  if (type === "command") {
    appendLog(`> ${payload.command}`);
    if (payload.browserChannel) {
      appendLog(`Browser: ${payload.browserChannel}`);
    }
    return;
  }

  if (type === "stdout" || type === "stderr") {
    appendLog(payload.text, type);
    return;
  }

  if (type === "lab") {
    upsertLiveRow(payload);
    progressText.textContent = `${payload.current} of ${payload.total}`;
    return;
  }

  if (type === "summary-line") {
    appendLog(`Summary: ${payload.text}`);
    return;
  }

  if (type === "report") {
    applyReport(payload.report, payload.links);
    return;
  }

  if (type === "completed") {
    currentRun = payload;
    rememberActiveRun(payload.id);
    finishRun(payload);
    closeEventSource();
    refreshHistory();
    return;
  }

  if (type === "failed" || type === "cancelled") {
    currentRun = payload;
    rememberActiveRun(payload.id);
    setRunState(type === "cancelled" ? "fail" : "error", type === "cancelled" ? "Cancelled" : "Failed");
    if (payload.error) {
      appendLog(payload.error, "stderr");
    }
    setBusy(false);
    closeEventSource();
    refreshHistory();
  }
}

function upsertLiveRow(payload) {
  const existing = liveRows.find((row) => row.labId === payload.labId);
  if (existing) {
    Object.assign(existing, payload);
  } else {
    liveRows.push(payload);
  }

  renderLiveRows();
}

function renderLiveRows() {
  reportResults = [];
  resultsBody.innerHTML = "";

  for (const row of liveRows) {
    const tr = document.createElement("tr");
    tr.dataset.labId = row.labId;
    tr.innerHTML = `
      <td>${statusBadge(row.status)}</td>
      <td><span class="lab-id">${escapeHtml(row.labId)}</span></td>
      <td>${escapeHtml(row.detail || "Running")}</td>
      <td>${escapeHtml(issueCountFromDetail(row.detail))}</td>
    `;
    tr.addEventListener("click", () => {
      selectedLabId = row.labId;
      renderLiveRows();
      renderLiveDetails(row);
    });
    if (selectedLabId === row.labId) {
      tr.classList.add("selected");
    }
    resultsBody.appendChild(tr);
  }
}

function applyReport(report, links) {
  reportResults = report.results || [];
  liveRows = [];
  currentLinks = links || currentLinks;
  selectedLabId = selectedLabId || reportResults[0]?.tutorial?.labId || "";

  counters.pass.textContent = report.summary?.passCount ?? 0;
  counters.fail.textContent = report.summary?.failCount ?? 0;
  counters.error.textContent = report.summary?.errorCount ?? 0;
  counters.issues.textContent = report.summary?.totalIssues ?? 0;
  progressText.textContent = `${report.summary?.totalLabs ?? reportResults.length} labs checked`;

  if (currentLinks?.markdown) {
    markdownReport.href = currentLinks.markdown;
    markdownReport.classList.remove("disabled");
  }
  if (currentLinks?.json) {
    jsonReport.href = currentLinks.json;
    jsonReport.classList.remove("disabled");
  }

  renderReportRows();
}

function renderReportRows() {
  resultsBody.innerHTML = "";

  if (reportResults.length === 0) {
    resultsBody.innerHTML = `<tr class="empty-row"><td colspan="4">No results returned.</td></tr>`;
    return;
  }

  for (const result of reportResults) {
    const tr = document.createElement("tr");
    const labId = result.tutorial?.labId || "";
    tr.dataset.labId = labId;
    tr.innerHTML = `
      <td>${statusBadge(result.status)}</td>
      <td><span class="lab-id">${escapeHtml(labId)}</span></td>
      <td>${escapeHtml(result.tutorial?.title || "")}</td>
      <td>${result.issueCount ?? 0}</td>
    `;
    tr.addEventListener("click", () => {
      selectedLabId = labId;
      renderReportRows();
      renderReportDetails(result);
    });
    if (selectedLabId === labId) {
      tr.classList.add("selected");
    }
    resultsBody.appendChild(tr);
  }

  const selected = reportResults.find((result) => result.tutorial?.labId === selectedLabId) || reportResults[0];
  if (selected) {
    selectedLabId = selected.tutorial?.labId || "";
    renderReportDetails(selected);
  }
}

function renderLiveDetails(row) {
  selectedStatus.textContent = row.status.toUpperCase();
  detailsBody.innerHTML = `
    <div class="details-title">
      <strong>${escapeHtml(row.labId)}</strong>
      <p class="muted">${escapeHtml(row.detail || "Running")}</p>
    </div>
  `;
}

function renderReportDetails(result) {
  selectedStatus.textContent = result.status.toUpperCase();
  const issues = result.issues || [];
  const issueMarkup = issues.length
    ? `<ul class="issue-list">${issues.map((issue) => `<li>${escapeHtml(issue.text)}</li>`).join("")}</ul>`
    : `<p class="muted">No QA issues.</p>`;
  const warningMarkup = (result.loadWarnings || []).map((warning) => `<li>${escapeHtml(warning)}</li>`).join("");
  const errorMarkup = result.error ? `<li>${escapeHtml(result.error)}</li>` : "";

  detailsBody.innerHTML = `
    <div class="details-title">
      <strong>${escapeHtml(result.tutorial?.title || result.tutorial?.labId || "Lab")}</strong>
      <span class="lab-id">${escapeHtml(result.tutorial?.labId || "")}</span>
      <a href="${escapeAttribute(result.qaUrl || "#")}" target="_blank" rel="noreferrer">${escapeHtml(result.qaUrl || "")}</a>
    </div>
    ${issueMarkup}
    ${warningMarkup || errorMarkup ? `<ul class="issue-list">${warningMarkup}${errorMarkup}</ul>` : ""}
  `;
}

function finishRun(run) {
  const summary = run.summary || {};
  const hasErrors = Number(summary.errorCount || 0) > 0;
  const hasIssues = Number(summary.totalIssues || 0) > 0;
  if (hasErrors) {
    setRunState("error", "Errors");
  } else if (hasIssues) {
    setRunState("fail", "Issues found");
  } else {
    setRunState("pass", "Passed");
  }
  setBusy(false);
}

function resetRunView(progressLabel = "Starting") {
  liveRows = [];
  reportResults = [];
  selectedLabId = "";
  currentLinks = null;
  runnerLog.textContent = "";
  resultsBody.innerHTML = `<tr class="empty-row"><td colspan="4">Run in progress.</td></tr>`;
  detailsBody.innerHTML = `<p class="muted">No lab selected.</p>`;
  selectedStatus.textContent = "Waiting";
  progressText.textContent = progressLabel;
  counters.pass.textContent = "0";
  counters.fail.textContent = "0";
  counters.error.textContent = "0";
  counters.issues.textContent = "0";
  markdownReport.href = "#";
  jsonReport.href = "#";
  markdownReport.classList.add("disabled");
  jsonReport.classList.add("disabled");
}

function setBusy(isBusy) {
  runButton.disabled = isBusy;
  cancelButton.disabled = !isBusy;
}

function setRunState(kind, label) {
  const dotClass =
    kind === "running" ? "running" :
    kind === "pass" ? "pass" :
    kind === "fail" ? "fail" :
    kind === "error" ? "error" :
    "idle";

  runState.innerHTML = `<span class="state-dot ${dotClass}"></span><span>${escapeHtml(label)}</span>`;
}

function setActiveView(viewName) {
  for (const tab of viewTabs) {
    const isActive = tab.dataset.viewTab === viewName;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  }

  for (const panel of viewPanels) {
    panel.hidden = panel.dataset.viewPanel !== viewName;
  }
}

function appendLog(text, type = "stdout") {
  const prefix = type === "stderr" ? "! " : "";
  runnerLog.textContent += `${prefix}${text}\n`;
  runnerLog.scrollTop = runnerLog.scrollHeight;
}

function closeEventSource() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

function rememberActiveRun(runId) {
  if (runId) {
    localStorage.setItem(ACTIVE_RUN_KEY, runId);
  }
}

function statusBadge(status) {
  const normalized = String(status || "running").toLowerCase();
  const label = normalized === "pass" ? "Pass" :
    normalized === "fail" ? "Fail" :
    normalized === "error" ? "Error" :
    "Running";

  return `<span class="status-badge status-${escapeAttribute(normalized)}">${label}</span>`;
}

function statusFromSummary(summary) {
  if (Number(summary.errorCount || 0) > 0) {
    return "error";
  }

  if (Number(summary.totalIssues || 0) > 0 || Number(summary.failCount || 0) > 0) {
    return "fail";
  }

  return "pass";
}

function issueCountFromDetail(detail) {
  const match = String(detail || "").match(/(\d+)\s+issue/i);
  return match ? match[1] : "";
}

function shortRunId(runId) {
  return String(runId || "").slice(0, 8);
}

function readableUrlTail(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.slice(-3).join(" / ");
  } catch {
    return "";
  }
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
