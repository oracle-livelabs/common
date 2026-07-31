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

async function expectHead(pathname, expected = 200) {
  const response = await fetch(`${baseUrl}${pathname}`, { method: "HEAD" });
  if (response.status !== expected) {
    throw new Error(`Expected ${pathname} to return ${expected}, got ${response.status}`);
  }
}

async function waitFor(page, expression, label, timeout = 15000) {
  try {
    await page.waitForFunction(expression, { timeout });
  } catch (error) {
    throw new Error(`Timed out waiting for ${label}: ${error.message}`);
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

  context = await chromium.launchPersistentContext(profileDir, {
    executablePath: findChrome(),
    headless: true,
    args: ["--disable-gpu", "--no-first-run", "--no-default-browser-check"]
  });
  const page = context.pages()[0] || await context.newPage();

  await page.goto(`${baseUrl}/admin/`, { waitUntil: "commit", timeout: 60000 });
  await waitFor(page, 'document.readyState === "complete" && Boolean(document.querySelector("#login-form"))', "admin login form");
  await page.evaluate(() => {
    localStorage.setItem("livelabsAnalyticsSession", JSON.stringify({
      authVersion: 3,
      role: "admin",
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    }));
    sessionStorage.setItem("livelabsAnalyticsSession", JSON.stringify({
      authVersion: 3,
      role: "admin",
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    }));
  });
  await page.reload({ waitUntil: "commit", timeout: 60000 });
  await waitFor(page, 'document.readyState === "complete" && document.body.classList.contains("auth-blocked")', "blocked admin state");

  const initialBlock = await page.evaluate(() => ({
    blocked: document.body.classList.contains("auth-blocked"),
    message: document.querySelector("#login-message")?.textContent || "",
    adminVisible: Boolean(document.querySelector(".admin-layout")) && getComputedStyle(document.querySelector(".admin-layout")).display !== "none",
    localSession: localStorage.getItem("livelabsAnalyticsSession"),
    sessionSession: sessionStorage.getItem("livelabsAnalyticsSession")
  }));
  if (!initialBlock.blocked || initialBlock.adminVisible) {
    throw new Error("Static admin route should remain blocked.");
  }
  if (!initialBlock.message.includes("Static admin is disabled")) {
    throw new Error("Static admin disabled message was not shown.");
  }
  if (initialBlock.localSession || initialBlock.sessionSession) {
    throw new Error("Static admin should clear stale browser sessions.");
  }

  await page.evaluate(() => {
    document.querySelector("#email").value = "livelabs-admin";
    document.querySelector("#password").value = "not-a-real-secret";
    document.querySelector("#login-form").requestSubmit();
  });
  await waitFor(page, 'document.querySelector("#login-message")?.textContent.includes("Static admin is disabled")', "static admin blocked submit");
  const stillBlocked = await page.evaluate(() => document.body.classList.contains("auth-blocked"));
  if (!stillBlocked) throw new Error("Static admin login submission should not open the admin panel.");

  console.log(`Analytics static admin route is blocked as expected for ${baseUrl}/admin/`);
} finally {
  await context?.close().catch(() => {});
  await rm(profileDir, { recursive: true, force: true }).catch(() => {});
}
