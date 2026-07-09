#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(__filename), "..");
const SETTINGS_FILE = path.join(PROJECT_ROOT, "config", "project_settings.json");
const ENV_FILE = path.join(PROJECT_ROOT, ".env");
const DEFAULT_STORAGE_STATE_FILE = path.join(PROJECT_ROOT, ".auth", "livelabs-storage-state.json");
const SIGN_IN_TIMEOUT_MS = 90_000;

const HELP = `Create a reusable Playwright storage-state file for authenticated LiveLabs QA runs.

Usage:
  node scripts/auth-storage-state.mjs --target-url <private-url> [options]

Options:
  --target-url <url>         Private LiveLabs URL that redirects to Oracle Sign In.
                             Defaults to QA_AUTH_TARGET_URL.
  --environment <name>       Environment from config/project_settings.json.
  --base-url <url>           Override the configured LiveLabs base URL.
  --output <file>            Storage-state output. Defaults to QA_STORAGE_STATE or .auth/livelabs-storage-state.json.
  --headed                   Show the browser while signing in.
  --browser-channel <name>   Chromium channel, usually msedge or chrome.
  --help                     Show this help text.

Credentials are read from QA_LIVELABS_USERNAME and QA_LIVELABS_PASSWORD.
Keep those values in qa-automation/.env or CI secrets; never commit them.
`;

loadDotEnv();

function loadDotEnv() {
  if (!fs.existsSync(ENV_FILE)) {
    return;
  }

  for (const line of fs.readFileSync(ENV_FILE, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = stripQuotes(trimmed.slice(separatorIndex + 1).trim());

    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function stripQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

function loadSettings() {
  return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
}

function resolveBaseUrl(environmentName, explicitBaseUrl) {
  if (explicitBaseUrl?.trim()) {
    return explicitBaseUrl.trim().replace(/\/+$/, "");
  }

  const settings = loadSettings();
  const resolvedEnvironment = environmentName || settings.default_environment;
  const environment = settings.environments[resolvedEnvironment];

  if (!environment) {
    throw new Error(
      `Unknown environment "${resolvedEnvironment}". Available environments: ${Object.keys(settings.environments)
        .sort()
        .join(", ")}.`,
    );
  }

  return String(environment.base_url).replace(/\/+$/, "");
}

function resolveChromiumChannel(explicitChannel) {
  if (explicitChannel?.trim()) {
    return explicitChannel.trim();
  }

  if (process.platform !== "win32") {
    return undefined;
  }

  const candidates = [
    { channel: "msedge", executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" },
    { channel: "msedge", executablePath: "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe" },
    { channel: "chrome", executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" },
    { channel: "chrome", executablePath: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" },
  ];

  return candidates.find((candidate) => fs.existsSync(candidate.executablePath))?.channel;
}

function normalizeSecret(value, name) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`Missing ${name}. Add it to qa-automation/.env or set it as an environment variable.`);
  }

  return normalized;
}

function isOracleSignInUrl(urlValue) {
  try {
    const url = new URL(urlValue);
    return url.hostname === "signon.oracle.com" && url.pathname.includes("/signin");
  } catch {
    return String(urlValue).includes("signon.oracle.com");
  }
}

function parseCliArgs(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      "target-url": { type: "string" },
      environment: { type: "string" },
      "base-url": { type: "string" },
      output: { type: "string" },
      headed: { type: "boolean" },
      "browser-channel": { type: "string" },
      help: { type: "boolean" },
    },
    strict: true,
  });

  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }

  const baseUrl = resolveBaseUrl(values.environment, values["base-url"] || process.env.QA_BASE_URL);
  const targetUrl = values["target-url"] || process.env.QA_AUTH_TARGET_URL;

  if (!targetUrl?.trim()) {
    throw new Error("Missing --target-url or QA_AUTH_TARGET_URL. Use a private LiveLabs page that redirects to Oracle Sign In.");
  }

  return {
    baseUrl,
    targetUrl: new URL(targetUrl, `${baseUrl}/`).toString(),
    outputFile: path.resolve(PROJECT_ROOT, values.output || process.env.QA_STORAGE_STATE || DEFAULT_STORAGE_STATE_FILE),
    username: normalizeSecret(process.env.QA_LIVELABS_USERNAME, "QA_LIVELABS_USERNAME"),
    livelabsCredential: normalizeSecret(process.env.QA_LIVELABS_PASSWORD, "QA_LIVELABS_PASSWORD"),
    headed: values.headed === true || ["1", "true", "yes", "on"].includes(String(process.env.QA_HEADED ?? "").toLowerCase()),
    browserChannel: values["browser-channel"],
  };
}

async function signIn(page, username, livelabsCredential) {
  await page.locator("body").waitFor({ state: "visible", timeout: SIGN_IN_TIMEOUT_MS });

  const usernameInput = page
    .locator(
      [
        'input[type="email"]:visible',
        'input[name*="user" i]:visible',
        'input[id*="user" i]:visible',
        'input[aria-label*="user" i]:visible',
        'input[aria-label*="email" i]:visible',
        'input[type="text"]:visible',
      ].join(", "),
    )
    .first();
  const credentialInput = page.locator('input[type="password"]:visible, input[name*="password" i]:visible').first();
  const nextButton = page.getByRole("button", { name: /^Next$/i }).first();
  const submitButton = page.getByRole("button", { name: /sign in|verify|continue|next/i }).first();

  await usernameInput.fill(username, { timeout: SIGN_IN_TIMEOUT_MS });
  await nextButton.click({ timeout: SIGN_IN_TIMEOUT_MS });
  await credentialInput.fill(livelabsCredential, { timeout: SIGN_IN_TIMEOUT_MS });
  await submitButton.click({ timeout: SIGN_IN_TIMEOUT_MS });
  await page.waitForURL((url) => !isOracleSignInUrl(url.toString()), {
    timeout: SIGN_IN_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const channel = resolveChromiumChannel(options.browserChannel || process.env.QA_BROWSER_CHANNEL);
  const browser = await chromium.launch({
    headless: !options.headed,
    ...(channel ? { channel } : {}),
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`Target : ${options.targetUrl}`);
    console.log(`Output : ${options.outputFile}`);
    await page.goto(options.targetUrl, { waitUntil: "domcontentloaded", timeout: SIGN_IN_TIMEOUT_MS });

    if (isOracleSignInUrl(page.url())) {
      await signIn(page, options.username, options.livelabsCredential);
    } else {
      console.warn("Warning: target did not route to Oracle Sign In. Saving the current browser state.");
    }

    await page.waitForLoadState("domcontentloaded", { timeout: SIGN_IN_TIMEOUT_MS }).catch(() => undefined);
    fs.mkdirSync(path.dirname(options.outputFile), { recursive: true });
    await context.storageState({ path: options.outputFile });
    console.log("Saved authenticated storage state.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
