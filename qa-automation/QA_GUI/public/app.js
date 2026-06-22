const form = document.querySelector("#runForm");
const runButton = document.querySelector("#runButton");
const cancelButton = document.querySelector("#cancelButton");
const clearLogButton = document.querySelector("#clearLog");
const runState = document.querySelector("#runState");
const progressText = document.querySelector("#progressText");
const resultsBody = document.querySelector("#resultsBody");
const detailsBody = document.querySelector("#detailsBody");
const selectedStatus = document.querySelector("#selectedStatus");
const runnerLog = document.querySelector("#runnerLog");
const markdownReport = document.querySelector("#markdownReport");
const jsonReport = document.querySelector("#jsonReport");
const workshopUrlInput = document.querySelector("#workshopUrl");

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

const savedUrl = localStorage.getItem("workshopQa:lastUrl");
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

  localStorage.setItem("workshopQa:lastUrl", payload.url);
  resetRunView();
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

function connectEvents(runId) {
  if (eventSource) {
    eventSource.close();
  }

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
    finishRun(payload);
    return;
  }

  if (type === "failed" || type === "cancelled") {
    currentRun = payload;
    setRunState(type === "cancelled" ? "fail" : "error", type === "cancelled" ? "Cancelled" : "Failed");
    if (payload.error) {
      appendLog(payload.error, "stderr");
    }
    setBusy(false);
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
  selectedLabId = selectedLabId || reportResults[0]?.tutorial?.labId || "";

  counters.pass.textContent = report.summary?.passCount ?? 0;
  counters.fail.textContent = report.summary?.failCount ?? 0;
  counters.error.textContent = report.summary?.errorCount ?? 0;
  counters.issues.textContent = report.summary?.totalIssues ?? 0;
  progressText.textContent = `${report.summary?.totalLabs ?? reportResults.length} labs checked`;

  if (links?.markdown) {
    markdownReport.href = links.markdown;
    markdownReport.classList.remove("disabled");
  }
  if (links?.json) {
    jsonReport.href = links.json;
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

function resetRunView() {
  liveRows = [];
  reportResults = [];
  selectedLabId = "";
  runnerLog.textContent = "";
  resultsBody.innerHTML = `<tr class="empty-row"><td colspan="4">Run in progress.</td></tr>`;
  detailsBody.innerHTML = `<p class="muted">No lab selected.</p>`;
  selectedStatus.textContent = "Waiting";
  progressText.textContent = "Starting";
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

function appendLog(text, type = "stdout") {
  const prefix = type === "stderr" ? "! " : "";
  runnerLog.textContent += `${prefix}${text}\n`;
  runnerLog.scrollTop = runnerLog.scrollHeight;
}

function statusBadge(status) {
  const normalized = String(status || "running").toLowerCase();
  const label = normalized === "pass" ? "Pass" :
    normalized === "fail" ? "Fail" :
    normalized === "error" ? "Error" :
    "Running";

  return `<span class="status-badge status-${escapeAttribute(normalized)}">${label}</span>`;
}

function issueCountFromDetail(detail) {
  const match = String(detail || "").match(/(\d+)\s+issue/i);
  return match ? match[1] : "";
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
