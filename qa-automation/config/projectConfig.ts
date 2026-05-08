import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// This module is the single place where the project resolves environment names,
// base URLs, and the JSON-backed defaults consumed by both the runner and tests.
export interface EnvironmentConfig {
  base_url: string;
  api_base_url?: string;
}

export type TraceMode =
  | "on"
  | "off"
  | "on-first-retry"
  | "on-all-retries"
  | "retain-on-failure"
  | "retain-on-first-failure"
  | "retain-on-failure-and-retries";
export type VideoMode = "on" | "off" | "retain-on-failure" | "on-first-retry";
export type ScreenshotMode = "on" | "off" | "only-on-failure" | "on-first-failure";

export interface RunnerDefaults {
  browsers: string[];
  headed: boolean;
  workers: string;
  retries: string;
  test_timeout_ms: number;
  expect_timeout_ms: number;
  action_timeout_ms: number;
  navigation_timeout_ms: number;
  page_ready_timeout_ms: number;
  optional_load_timeout_ms: number;
  cookie_timeout_ms: number;
  navigation_retries: number;
  tracing: TraceMode;
  video: VideoMode;
  screenshot: ScreenshotMode;
  full_page_screenshot: boolean;
  livelabs_search_term: string;
  artifacts_dir: string;
  junit: "on" | "off";
  json_report: "on" | "off";
  capture_console: boolean;
  capture_page_errors: boolean;
  capture_request_failures: boolean;
  capture_response_errors: boolean;
  response_error_status: number;
  attach_dom_snapshot_on_failure: boolean;
}

export type ChromiumChannel = "msedge" | "chrome";

export interface ProjectSettings {
  default_environment: string;
  environments: Record<string, EnvironmentConfig>;
  defaults: RunnerDefaults;
}

const __filename = fileURLToPath(import.meta.url);
export const PROJECT_ROOT = path.resolve(path.dirname(__filename), "..");
export const SETTINGS_FILE = path.join(PROJECT_ROOT, "config", "project_settings.json");

let cachedSettings: ProjectSettings | undefined;

export function loadProjectSettings(): ProjectSettings {
  // The settings file is tiny and effectively static during a test run, so a
  // one-time read keeps the code simple while avoiding repeated disk access.
  if (!cachedSettings) {
    cachedSettings = JSON.parse(readFileSync(SETTINGS_FILE, "utf-8")) as ProjectSettings;
  }

  return cachedSettings;
}

export function runnerDefaults(): RunnerDefaults {
  return { ...loadProjectSettings().defaults };
}

export function defaultEnvironmentName(): string {
  return String(loadProjectSettings().default_environment);
}

export function resolveEnvironmentName(name?: string): string {
  const environmentName = (name ?? defaultEnvironmentName()).trim();
  const available = loadProjectSettings().environments;
  if (!(environmentName in available)) {
    throw new Error(
      `Unknown environment "${environmentName}". Available environments: ${Object.keys(available).sort().join(", ")}.`,
    );
  }

  return environmentName;
}

export function resolveEnvironmentConfig(name?: string): EnvironmentConfig {
  const environmentName = resolveEnvironmentName(name);
  return { ...loadProjectSettings().environments[environmentName] };
}

export function defaultSearchTerm(): string {
  return String(runnerDefaults().livelabs_search_term).trim();
}

export function parseBooleanFlag(value: string | boolean | undefined, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

export function parseIntegerFlag(value: string | number | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function resolveBaseUrl(environmentName?: string, explicitBaseUrl?: string): string {
  if (explicitBaseUrl?.trim()) {
    return explicitBaseUrl.trim().replace(/\/+$/, "");
  }

  return String(resolveEnvironmentConfig(environmentName).base_url).replace(/\/+$/, "");
}

export function resolveApiBaseUrl(environmentName?: string, explicitApiBaseUrl?: string): string {
  if (explicitApiBaseUrl?.trim()) {
    return explicitApiBaseUrl.trim().replace(/\/+$/, "");
  }

  const environmentConfig = resolveEnvironmentConfig(environmentName);
  return String(environmentConfig.api_base_url ?? environmentConfig.base_url).replace(/\/+$/, "");
}

export function resolveChromiumChannel(explicitChannel?: string): ChromiumChannel | undefined {
  if (explicitChannel?.trim()) {
    const normalized = explicitChannel.trim().toLowerCase();
    if (normalized === "msedge" || normalized === "chrome") {
      return normalized;
    }

    throw new Error(`Unsupported Chromium channel "${explicitChannel}". Use "msedge" or "chrome".`);
  }

  if (process.platform !== "win32") {
    return undefined;
  }

  // Corporate networks often block Playwright's browser downloads. Prefer a
  // locally installed Edge/Chrome channel on Windows so the wrapper still runs
  // with the same simple commands from VS Code terminals.
  const candidates: Array<{ channel: ChromiumChannel; executablePath: string }> = [
    {
      channel: "msedge",
      executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    },
    {
      channel: "msedge",
      executablePath: "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    },
    {
      channel: "chrome",
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    },
    {
      channel: "chrome",
      executablePath: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    },
  ];

  return candidates.find((candidate) => existsSync(candidate.executablePath))?.channel;
}
