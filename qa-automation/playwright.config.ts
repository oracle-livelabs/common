import path from "node:path";

import { defineConfig, devices, type PlaywrightTestOptions, type ReporterDescription } from "@playwright/test";

import {
  defaultEnvironmentName,
  parseBooleanFlag,
  parseIntegerFlag,
  resolveBaseUrl,
  resolveChromiumChannel,
  runnerDefaults,
  type ScreenshotMode,
  type TraceMode,
  type VideoMode,
} from "./config/projectConfig.js";

// This config stays intentionally thin: the wrapper computes environment values,
// then Playwright applies them consistently to every spec run.
type BrowserName = "chromium" | "firefox" | "webkit";
type ScreenshotSetting = ScreenshotMode | { mode: ScreenshotMode; fullPage?: boolean };

// The Playwright config is entirely environment-driven so the thin `run` wrapper
// can preserve the simple command surface from the Python project.
const defaults = runnerDefaults();
const configuredEnvironment = (process.env.QA_ENVIRONMENT ?? defaultEnvironmentName()).trim();
const configuredBaseUrl = resolveBaseUrl(configuredEnvironment, process.env.QA_BASE_URL);
const configuredOutputDir = path.resolve(process.env.QA_OUTPUT_DIR ?? defaults.artifacts_dir);
const configuredHtmlReportDir = path.resolve(
  process.env.QA_HTML_REPORT_DIR ?? path.join(path.dirname(configuredOutputDir), "html-report"),
);
const configuredJunitFile = process.env.QA_JUNIT_FILE?.trim()
  ? path.resolve(process.env.QA_JUNIT_FILE)
  : undefined;
const configuredJsonFile = process.env.QA_JSON_FILE?.trim()
  ? path.resolve(process.env.QA_JSON_FILE)
  : undefined;
const configuredTrace = (process.env.QA_TRACE ?? defaults.tracing) as TraceMode;
const configuredVideo = (process.env.QA_VIDEO ?? defaults.video) as VideoMode;
const configuredScreenshotMode = (process.env.QA_SCREENSHOT ?? defaults.screenshot) as ScreenshotMode;
const configuredFullPageScreenshot = parseBooleanFlag(process.env.QA_FULL_PAGE_SCREENSHOT, defaults.full_page_screenshot);
const configuredTestTimeout = parseIntegerFlag(process.env.QA_TEST_TIMEOUT_MS, defaults.test_timeout_ms);
const configuredExpectTimeout = parseIntegerFlag(process.env.QA_EXPECT_TIMEOUT_MS, defaults.expect_timeout_ms);
const configuredActionTimeout = parseIntegerFlag(process.env.QA_ACTION_TIMEOUT_MS, defaults.action_timeout_ms);
const configuredNavigationTimeout = parseIntegerFlag(process.env.QA_NAVIGATION_TIMEOUT_MS, defaults.navigation_timeout_ms);
const configuredStorageState = process.env.QA_STORAGE_STATE?.trim()
  ? path.resolve(process.env.QA_STORAGE_STATE)
  : undefined;
const configuredScreenshot: ScreenshotSetting = configuredFullPageScreenshot
  ? { mode: configuredScreenshotMode, fullPage: true }
  : configuredScreenshotMode;
const configuredWorkers = (process.env.QA_WORKERS ?? defaults.workers).trim().toLowerCase();
const configuredRetries = parseIntegerFlag(process.env.QA_RETRIES, parseIntegerFlag(defaults.retries, 0));
const configuredChromiumChannel = resolveChromiumChannel(process.env.QA_BROWSER_CHANNEL);
const configuredHeaded = ["1", "true", "yes", "on"].includes(
  (process.env.QA_HEADED ?? String(defaults.headed)).trim().toLowerCase(),
);

function resolveWorkers(): number | string | undefined {
  // The legacy runner used 0/1/off/none to mean "do not parallelize".
  // Playwright uses 1 worker for the same behavior.
  if (["0", "1", "off", "none"].includes(configuredWorkers)) {
    return 1;
  }

  if (configuredWorkers === "auto" || configuredWorkers === "") {
    return undefined;
  }

  const numericValue = Number(configuredWorkers);
  if (Number.isFinite(numericValue) && numericValue > 1) {
    return numericValue;
  }

  return configuredWorkers;
}

function resolveReporters(): ReporterDescription[] {
  const reporters: ReporterDescription[] = [
    ["list"],
    ["html", { open: "never", outputFolder: configuredHtmlReportDir }],
  ];

  if (configuredJunitFile) {
    reporters.push(["junit", { outputFile: configuredJunitFile }]);
  }

  if (configuredJsonFile) {
    reporters.push(["json", { outputFile: configuredJsonFile }]);
  }

  return reporters;
}

// All three browser projects are always declared so the runner can select one or
// several of them with `--project` while still defaulting to the configured set.
const browserProjects: Array<{ name: BrowserName; use: Partial<PlaywrightTestOptions> }> = [
  {
    name: "chromium",
    use: {
      ...devices["Desktop Chrome"],
      ...(configuredChromiumChannel ? { channel: configuredChromiumChannel } : {}),
    },
  },
  {
    name: "firefox",
    use: {
      ...devices["Desktop Firefox"],
    },
  },
  {
    name: "webkit",
    use: {
      ...devices["Desktop Safari"],
    },
  },
];

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts$/,
  testIgnore: ["**/support/**"],
  timeout: configuredTestTimeout,
  expect: {
    timeout: configuredExpectTimeout,
  },
  forbidOnly: !!process.env.CI,
  fullyParallel: false,
  outputDir: configuredOutputDir,
  retries: configuredRetries,
  reporter: resolveReporters(),
  workers: resolveWorkers(),
  use: {
    // Centralize all runtime defaults here so every test gets the same
    // navigation behavior and artifact policy without repeating options.
    baseURL: configuredBaseUrl,
    headless: !configuredHeaded,
    trace: configuredTrace,
    video: configuredVideo,
    screenshot: configuredScreenshot,
    storageState: configuredStorageState,
    actionTimeout: configuredActionTimeout,
    navigationTimeout: configuredNavigationTimeout,
  },
  projects: browserProjects,
});
