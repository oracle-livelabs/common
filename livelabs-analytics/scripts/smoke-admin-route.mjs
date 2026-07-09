#!/usr/bin/env node

import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const baseUrl = (process.env.DASHBOARD_URL || "http://127.0.0.1:4175").replace(/\/$/, "");
const profileDir = resolve(process.cwd(), ".chrome-admin-smoke-profile");
const qaAutomationRequire = createRequire(new URL("../../qa-automation/package.json", import.meta.url));
const { chromium } = qaAutomationRequire("playwright");

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

async function waitFor(page, expression, label, timeout = 15000) {
  try {
    await page.waitForFunction(expression, { timeout });
  } catch (error) {
    throw new Error(`Timed out waiting for ${label}: ${error.message}`);
  }
}

async function expectHead(pathname, expected = 200) {
  const response = await fetch(`${baseUrl}${pathname}`, { method: "HEAD" });
  if (response.status !== expected) {
    throw new Error(`Expected ${pathname} to return ${expected}, got ${response.status}`);
  }
}

await rm(profileDir, { recursive: true, force: true });
let context;

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

  // Reuse the repo's pinned Playwright install instead of maintaining custom CDP transport code here.
  context = await chromium.launchPersistentContext(profileDir, {
    executablePath: findChrome(),
    headless: true,
    args: ["--disable-gpu", "--no-first-run", "--no-default-browser-check"]
  });
  const page = context.pages()[0] || await context.newPage();

  await page.goto(`${baseUrl}/admin/`, { waitUntil: "commit", timeout: 60000 });
  await waitFor(page, 'document.readyState === "complete" && Boolean(document.querySelector("#login-form"))', "admin login form");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "commit", timeout: 60000 });
  await waitFor(page, 'document.readyState === "complete" && document.body.classList.contains("auth-blocked")', "blocked admin state");
  await page.evaluate(`(() => {
    document.querySelector("#email").value = "livelabs-admin";
    document.querySelector("#password").value = "LiveLabsAdmin#2026!";
    document.querySelector("#keep-logged-in").checked = false;
    document.querySelector("#login-form").requestSubmit();
    return true;
  })()`);
  await waitFor(page, 'Boolean(document.querySelector(".admin-layout")) && !document.body.classList.contains("auth-blocked")', "admin panel");
  const adminUrlOk = await page.evaluate('window.location.pathname.endsWith("/admin/") || window.location.pathname.endsWith("/admin/index.html")');
  if (!adminUrlOk) throw new Error("Admin panel did not stay under the /admin path.");
  const qaDefaultsOff = await page.evaluate(`(() => {
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

  await page.evaluate(`(() => {
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
  await page.goto(`${baseUrl}/index.html`, { waitUntil: "commit", timeout: 60000 });
  await waitFor(page, 'document.readyState === "complete"', "dashboard after active criteria rule injection");
  const criteriaRulesPaused = await page.evaluate(`(() => {
    return !document.querySelector("[data-qa-exception-rule-id]")
      && !document.querySelector("[data-qa-analytics-excluded='true']");
  })()`);
  if (!criteriaRulesPaused) throw new Error("Paused criteria rules should not mark or exclude dashboard rows.");

  await page.goto(`${baseUrl}/admin/`, { waitUntil: "commit", timeout: 60000 });
  await waitFor(page, 'Boolean(document.querySelector(".admin-layout")) && !document.body.classList.contains("auth-blocked")', "admin panel after paused-rule check");

  await waitFor(page, 'document.querySelector("#row-search-status")?.textContent.includes("unique dashboard rows loaded")', "dashboard rows loaded in admin");
  await page.locator("#row-search-query").fill(String(candidate.title));
  await page.locator("#row-search-button").click();
  await waitFor(page, 'Boolean(document.querySelector("[data-record-key]"))', "row search result");
  await page.locator("[data-record-key]").first().click();
  await waitFor(page, `(() => {
    return document.querySelectorAll("#selected-row-editor .row-editor-section").length >= 4
      && document.querySelector("#edit-override-value")?.value.trim().length > 0
      && document.querySelector("#selected-row-field-editor input[data-row-field-edit]")?.value.trim().length > 0;
  })()`, "structured row editor with populated values");
  await page.locator("#edit-override-status").selectOption("manager_review");
  await page.locator("#edit-override-qa-excluded").check();
  await page.locator("#edit-override-note").fill("Smoke test QA exclusion override.");
  await page.locator("#save-row-override").click();
  await waitFor(page, `(() => {
    const state = JSON.parse(localStorage.getItem("livelabsAnalyticsAdminState") || "{}");
    return state.schemaVersion === 2
      && Array.isArray(state.rowOverrides)
      && state.rowOverrides.some((override) => override.qaExcluded === true && String(override.value) === ${JSON.stringify(String(candidate.livelabs_id))});
  })()`, "saved QA excluded override");

  await page.evaluate(`(() => {
    document.querySelector("#content-mode").value = "executive";
    document.querySelector('[data-section-key="topPerformers"]').checked = false;
    document.querySelector("#save-settings").click();
    return true;
  })()`);
  await waitFor(page, 'JSON.parse(localStorage.getItem("livelabsAnalyticsAdminState")).contentMode === "analyst"', "saved admin state");
  await page.goto(`${baseUrl}/index.html`, { waitUntil: "commit", timeout: 60000 });
  await waitFor(page, 'document.readyState === "complete" && document.body.dataset.dashboardMode === "analyst"', "dashboard mode from saved state");
  await waitFor(page, 'Boolean(document.querySelector("#top-performers")?.hidden)', "hidden top performers persisted");
  await waitFor(page, `(() => {
    const rows = Array.from(document.querySelectorAll("tr[data-filter-row='true']"));
    return rows.some((row) => row.dataset.qaAnalyticsExcluded !== "true"
      && row.textContent.includes(${JSON.stringify(String(candidate.wms_id))})
      && row.textContent.includes(${JSON.stringify(String(candidate.livelabs_id))}))
      && !rows.some((row) => row.dataset.adminQaExcluded === "true");
  })()`, "dashboard keeps admin QA override internal while leaving the row visible");
  await page.reload({ waitUntil: "commit", timeout: 60000 });
  await waitFor(page, 'document.readyState === "complete" && document.body.dataset.dashboardMode === "analyst" && Boolean(document.querySelector("#top-performers")?.hidden)', "persisted state after reload");
  const publicLinkHidden = await page.evaluate('Boolean(document.querySelector("[data-admin-link]")?.hidden)');
  if (!publicLinkHidden) throw new Error("Dashboard admin entry link should stay hidden; access is through /admin/.");

  console.log(`Analytics admin smoke passed for ${baseUrl}/admin/`);
} finally {
  await context?.close().catch(() => {});
  await rm(profileDir, { recursive: true, force: true }).catch(() => {});
}
