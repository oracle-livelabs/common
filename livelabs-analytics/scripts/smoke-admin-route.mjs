#!/usr/bin/env node

import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const baseUrl = (process.env.DASHBOARD_URL || "http://127.0.0.1:4175").replace(/\/$/, "");
const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9345);
const profileDir = resolve(process.cwd(), ".chrome-admin-smoke-profile");

function findChrome() {
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
  ].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("Chrome or Edge executable not found for admin smoke test.");
  return found;
}

async function waitForJson(url, attempts = 80) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 125));
    }
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class Cdp {
  constructor(wsUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.ws = new WebSocket(wsUrl);
    this.keepAlive = null;
  }
  async open() {
    await new Promise((resolveOpen, rejectOpen) => {
      this.ws.addEventListener("open", resolveOpen, { once: true });
      this.ws.addEventListener("error", rejectOpen, { once: true });
    });
    this.ws.addEventListener("message", async (event) => {
      const payloadText = await messageDataToText(event.data);
      const payload = JSON.parse(payloadText);
      if (!payload.id || !this.pending.has(payload.id)) return;
      const pending = this.pending.get(payload.id);
      clearTimeout(pending.timer);
      this.pending.delete(payload.id);
      payload.error ? pending.rejectPending(new Error(payload.error.message)) : pending.resolvePending(payload.result);
    });
    this.keepAlive = setInterval(() => {}, 1000);
  }
  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolvePending, rejectPending) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rejectPending(new Error(`Timed out waiting for ${method}`));
      }, 10000);
      this.pending.set(id, { resolvePending, rejectPending, timer });
    });
  }
  close() {
    if (this.keepAlive) clearInterval(this.keepAlive);
    for (const pending of this.pending.values()) clearTimeout(pending.timer);
    this.pending.clear();
    this.ws.close();
  }
}

async function messageDataToText(data) {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  if (ArrayBuffer.isView(data)) return new TextDecoder().decode(data);
  if (typeof data?.text === "function") return data.text();
  return String(data);
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser evaluation failed.");
  return result.result.value;
}

async function waitFor(client, expression, label) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await evaluate(client, expression)) return;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function expectHead(pathname, expected = 200) {
  const response = await fetch(`${baseUrl}${pathname}`, { method: "HEAD" });
  if (response.status !== expected) {
    throw new Error(`Expected ${pathname} to return ${expected}, got ${response.status}`);
  }
}

await rm(profileDir, { recursive: true, force: true });

const chrome = spawn(findChrome(), [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profileDir}`,
  "about:blank"
], { stdio: "ignore" });

let client;

try {
  await expectHead("/");
  await expectHead("/admin/");
  await expectHead("/admin/index.html");
  await expectHead("/login.html");
  await expectHead("/admin.html");
  const candidateData = await fetch(`${baseUrl}/data/top_retire_candidates_workshops_top_50.json`).then((response) => response.json());
  const candidateRows = Array.isArray(candidateData) ? candidateData : candidateData.rows || candidateData.items || [];
  const candidate = candidateRows.find((row) => row?.wms_id && row?.livelabs_id && row?.title);
  if (!candidate) throw new Error("No at-risk candidate row available for admin override smoke test.");

  await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
  const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${baseUrl}/admin/`, { method: "PUT" }).then((response) => response.json());
  client = new Cdp(target.webSocketDebuggerUrl);
  await client.open();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Page.navigate", { url: `${baseUrl}/admin/` });
  await waitFor(client, 'document.readyState === "complete" && Boolean(document.querySelector("#login-form"))', "admin login form");
  await evaluate(client, "localStorage.clear(); true");
  await client.send("Page.reload");
  await waitFor(client, 'document.readyState === "complete" && document.body.classList.contains("auth-blocked")', "blocked admin state");
  await evaluate(client, `(() => {
    document.querySelector("#email").value = "livelabs-admin";
    document.querySelector("#password").value = "LiveLabsAdmin#2026!";
    document.querySelector("#keep-logged-in").checked = false;
    document.querySelector("#login-form").requestSubmit();
    return true;
  })()`);
  await waitFor(client, 'Boolean(document.querySelector(".admin-layout")) && !document.body.classList.contains("auth-blocked")', "admin panel");
  const adminUrlOk = await evaluate(client, 'window.location.pathname.endsWith("/admin/") || window.location.pathname.endsWith("/admin/index.html")');
  if (!adminUrlOk) throw new Error("Admin panel did not stay under the /admin path.");
  const qaDefaultsOff = await evaluate(client, `(() => {
    const saved = JSON.parse(localStorage.getItem("livelabsAnalyticsAdminState") || "{}");
    return !document.querySelector("#qa-tag-enabled")
      && document.querySelector("#qa-exclusion-enabled").checked === false
      && document.querySelector("#qa-exclusion-enabled").disabled === true
      && document.querySelector("#rules")?.hidden === true
      && !document.querySelector('.admin-nav a[href="#rules"]')
      && saved.qaExceptionTagEnabled !== true
      && saved.qaExceptionExclusionEnabled !== true;
  })()`);
  if (!qaDefaultsOff) throw new Error("QA tag/exclusion defaults should be off in a clean static browser.");

  await evaluate(client, `(() => {
    localStorage.setItem("livelabsAnalyticsAdminState", JSON.stringify({
      schemaVersion: 2,
      contentMode: "analyst",
      detailExpansionEnabled: true,
      qaExceptionExclusionEnabled: true,
      qaExceptionRules: [{
        criteria: { contentTypes: ["workshop", "sprint"], minAgeMonths: 0, minScore: 0, minStaleMonths: 0, minViews12m: 0, minViews90d: 0 },
        enabled: true,
        id: "smoke-active-paused-rule",
        label: "Smoke active paused rule",
        note: "Should not affect dashboard while criteria rules are paused.",
        status: "active",
        type: "criteria",
        value: ""
      }],
      qaExceptionTagEnabled: true,
      rowOverrides: [],
      sectionVisibility: {}
    }));
    return true;
  })()`);
  await client.send("Page.navigate", { url: `${baseUrl}/index.html` });
  await waitFor(client, 'document.readyState === "complete"', "dashboard after active criteria rule injection");
  const criteriaRulesPaused = await evaluate(client, `(() => {
    return !document.querySelector("[data-qa-exception-rule-id]")
      && !document.querySelector("[data-qa-analytics-excluded='true']");
  })()`);
  if (!criteriaRulesPaused) throw new Error("Paused criteria rules should not mark or exclude dashboard rows.");

  await client.send("Page.navigate", { url: `${baseUrl}/admin/` });
  await waitFor(client, 'Boolean(document.querySelector(".admin-layout")) && !document.body.classList.contains("auth-blocked")', "admin panel after paused-rule check");

  await waitFor(client, 'document.querySelector("#row-search-status")?.textContent.includes("unique dashboard rows loaded")', "dashboard rows loaded in admin");
  await evaluate(client, `(() => {
    document.querySelector("#row-search-query").value = ${JSON.stringify(String(candidate.title))};
    document.querySelector("#row-search-button").click();
    return true;
  })()`);
  await waitFor(client, 'Boolean(document.querySelector("[data-record-key]"))', "row search result");
  await evaluate(client, `(() => {
    document.querySelector("[data-record-key]").click();
    return true;
  })()`);
  await waitFor(client, `(() => {
    return document.querySelectorAll("#selected-row-editor .row-editor-section").length >= 4
      && document.querySelector("#edit-override-value")?.value.trim().length > 0
      && document.querySelector("#selected-row-field-editor input[data-row-field-edit]")?.value.trim().length > 0;
  })()`, "structured row editor with populated values");
  await evaluate(client, `(() => {
    document.querySelector("#edit-override-status").value = "manager_review";
    document.querySelector("#edit-override-qa-excluded").checked = true;
    document.querySelector("#edit-override-note").value = "Smoke test QA exclusion override.";
    document.querySelector("#save-row-override").click();
    return true;
  })()`);
  await waitFor(client, `(() => {
    const state = JSON.parse(localStorage.getItem("livelabsAnalyticsAdminState") || "{}");
    return state.schemaVersion === 2
      && Array.isArray(state.rowOverrides)
      && state.rowOverrides.some((override) => override.qaExcluded === true && String(override.value) === ${JSON.stringify(String(candidate.livelabs_id))});
  })()`, "saved QA excluded override");

  await evaluate(client, `(() => {
    document.querySelector("#content-mode").value = "executive";
    document.querySelector('[data-section-key="topPerformers"]').checked = false;
    document.querySelector("#save-settings").click();
    return true;
  })()`);
  await waitFor(client, 'JSON.parse(localStorage.getItem("livelabsAnalyticsAdminState")).contentMode === "analyst"', "saved admin state");
  await client.send("Page.navigate", { url: `${baseUrl}/index.html` });
  await waitFor(client, 'document.readyState === "complete" && document.body.dataset.dashboardMode === "analyst"', "dashboard mode from saved state");
  await waitFor(client, 'Boolean(document.querySelector("#top-performers")?.hidden)', "hidden top performers persisted");
  await waitFor(client, `(() => {
    const rows = Array.from(document.querySelectorAll("tr[data-filter-row='true']"));
    return rows.some((row) => row.dataset.adminQaExcluded === "true"
      && row.dataset.qaAnalyticsExcluded !== "true"
      && row.textContent.includes(${JSON.stringify(String(candidate.wms_id))})
      && row.textContent.includes(${JSON.stringify(String(candidate.livelabs_id))}));
  })()`, "dashboard reflects QA excluded badge-only row override");
  await client.send("Page.reload");
  await waitFor(client, 'document.readyState === "complete" && document.body.dataset.dashboardMode === "analyst" && Boolean(document.querySelector("#top-performers")?.hidden)', "persisted state after reload");
  const publicLinkHidden = await evaluate(client, 'Boolean(document.querySelector("[data-admin-link]")?.hidden)');
  if (!publicLinkHidden) throw new Error("Dashboard admin entry link should stay hidden; access is through /admin/.");

  console.log(`Analytics admin smoke passed for ${baseUrl}/admin/`);
} finally {
  client?.close();
  chrome.kill();
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  await rm(profileDir, { recursive: true, force: true }).catch(() => {});
}
