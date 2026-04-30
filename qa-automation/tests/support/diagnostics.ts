import { writeFile } from "node:fs/promises";

import type { ConsoleMessage, Page, Request, Response, TestInfo } from "@playwright/test";

import type { EnvironmentConfig } from "../../config/projectConfig.js";

export interface CheckpointOptions {
  fullPage?: boolean;
  attachPageState?: boolean;
}

export interface QAArtifacts {
  captureCheckpoint(name: string, options?: CheckpointOptions): Promise<void>;
  addNote(title: string, content: string): void;
}

export interface QADiagnosticsOptions {
  environmentName: string;
  environmentConfig: EnvironmentConfig;
  livelabsSearchTerm: string;
  browserName: string;
  captureConsole: boolean;
  capturePageErrors: boolean;
  captureRequestFailures: boolean;
  captureResponseErrors: boolean;
  responseErrorStatus: number;
  attachDomSnapshotOnFailure: boolean;
  fullPageScreenshots: boolean;
}

interface LogBuffers {
  consoleMessages: string[];
  pageErrors: string[];
  requestFailures: string[];
  responseErrors: string[];
  notes: string[];
}

interface DiagnosticsSession {
  api: QAArtifacts;
  finalize(): Promise<void>;
}

function timestamp(): string {
  return new Date().toISOString();
}

function sanitizeAttachmentName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "artifact";
}

function formatLocation(message: ConsoleMessage): string {
  const location = message.location();
  if (!location.url) {
    return "";
  }

  return ` (${location.url}:${location.lineNumber}:${location.columnNumber})`;
}

function formatConsoleMessage(message: ConsoleMessage): string {
  return `[${timestamp()}] [${message.type()}] ${message.text()}${formatLocation(message)}`;
}

function formatRequestFailure(request: Request): string {
  const failure = request.failure();
  const method = request.method();
  const url = request.url();
  const errorText = failure?.errorText ?? "request failed";
  return `[${timestamp()}] [requestfailed] ${method} ${url} -> ${errorText}`;
}

function formatResponseFailure(response: Response): string {
  const request = response.request();
  return `[${timestamp()}] [http-${response.status()}] ${request.method()} ${response.url()} -> ${response.statusText()}`;
}

async function writeAttachment(testInfo: TestInfo, name: string, content: string, contentType: string): Promise<void> {
  if (!content.trim()) {
    return;
  }

  await testInfo.attach(name, {
    body: Buffer.from(content, "utf-8"),
    contentType,
  });
}

async function capturePageState(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const pageUrl = page.isClosed() ? "page-closed" : page.url();
  const pageTitle = page.isClosed()
    ? "page-closed"
    : await page
        .title()
        .catch(() => "unavailable");

  await writeAttachment(
    testInfo,
    `${name}-page-state`,
    `URL: ${pageUrl}\nTitle: ${pageTitle}\nCaptured: ${timestamp()}\n`,
    "text/plain",
  );
}

async function captureDomSnapshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  if (page.isClosed()) {
    return;
  }

  const snapshotFile = testInfo.outputPath(`${sanitizeAttachmentName(name)}.html`);
  const html = await page.content().catch(() => "");
  if (!html) {
    return;
  }

  await writeFile(snapshotFile, html, "utf-8");
  await testInfo.attach(name, {
    path: snapshotFile,
    contentType: "text/html",
  });
}

async function captureScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
  fullPage: boolean,
): Promise<void> {
  if (page.isClosed()) {
    return;
  }

  const screenshotFile = testInfo.outputPath(`${sanitizeAttachmentName(name)}.png`);
  await page.screenshot({
    path: screenshotFile,
    fullPage,
    timeout: 5_000,
  });
  await testInfo.attach(name, {
    path: screenshotFile,
    contentType: "image/png",
  });
}

function buildRunContext(
  page: Page,
  testInfo: TestInfo,
  options: QADiagnosticsOptions,
  sessionStartedAt: string,
): Promise<Record<string, unknown>> {
  const resolveTitle = async (): Promise<string> => {
    if (page.isClosed()) {
      return "page-closed";
    }

    return page.title().catch(() => "unavailable");
  };

  return resolveTitle().then((pageTitle) => ({
    testTitle: testInfo.title,
    file: testInfo.file,
    project: testInfo.project.name,
    browser: options.browserName,
    environment: options.environmentName,
    baseUrl: options.environmentConfig.base_url,
    configuredSearchTerm: options.livelabsSearchTerm,
    retry: testInfo.retry,
    expectedStatus: testInfo.expectedStatus,
    observedStatus: testInfo.status,
    startedAt: sessionStartedAt,
    finishedAt: timestamp(),
    finalPageUrl: page.isClosed() ? "page-closed" : page.url(),
    finalPageTitle: pageTitle,
    artifactPolicy: {
      console: options.captureConsole,
      pageErrors: options.capturePageErrors,
      requestFailures: options.captureRequestFailures,
      responseErrors: options.captureResponseErrors,
      responseErrorStatus: options.responseErrorStatus,
      domSnapshotOnFailure: options.attachDomSnapshotOnFailure,
      fullPageScreenshots: options.fullPageScreenshots,
    },
    annotations: testInfo.annotations,
  }));
}

export function createDiagnosticsSession(
  page: Page,
  testInfo: TestInfo,
  options: QADiagnosticsOptions,
): DiagnosticsSession {
  const buffers: LogBuffers = {
    consoleMessages: [],
    pageErrors: [],
    requestFailures: [],
    responseErrors: [],
    notes: [],
  };
  const sessionStartedAt = timestamp();

  // All listeners are registered in one place so every spec inherits the same
  // debug surface without repeating page event plumbing in test files.
  const onConsole = (message: ConsoleMessage): void => {
    if (!options.captureConsole) {
      return;
    }

    buffers.consoleMessages.push(formatConsoleMessage(message));
  };

  const onPageError = (error: Error): void => {
    if (!options.capturePageErrors) {
      return;
    }

    buffers.pageErrors.push(`[${timestamp()}] ${error.stack || error.message}`);
  };

  const onRequestFailed = (request: Request): void => {
    if (!options.captureRequestFailures) {
      return;
    }

    buffers.requestFailures.push(formatRequestFailure(request));
  };

  const onResponse = (response: Response): void => {
    if (!options.captureResponseErrors || response.status() < options.responseErrorStatus) {
      return;
    }

    buffers.responseErrors.push(formatResponseFailure(response));
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  const api: QAArtifacts = {
    async captureCheckpoint(name, checkpointOptions) {
      const fullPage = checkpointOptions?.fullPage ?? options.fullPageScreenshots;
      const attachmentName = `checkpoint-${sanitizeAttachmentName(name)}`;

      // Manual checkpoints are the intentional escape hatch for tests that want
      // a named screenshot before the runner's automatic failure artifacts kick in.
      await captureScreenshot(page, testInfo, attachmentName, fullPage);

      if (checkpointOptions?.attachPageState ?? true) {
        await capturePageState(page, testInfo, attachmentName);
      }
    },

    addNote(title, content) {
      const normalizedTitle = title.trim() || "note";
      buffers.notes.push(`[${timestamp()}] ${normalizedTitle}\n${content.trim()}`.trim());
    },
  };

  async function finalize(): Promise<void> {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("requestfailed", onRequestFailed);
    page.off("response", onResponse);

    const artifactErrors: string[] = [];
    const safeFinalizeStep = async (label: string, operation: () => Promise<void>): Promise<void> => {
      try {
        await operation();
      } catch (error) {
        const message = error instanceof Error ? error.stack || error.message : String(error);
        artifactErrors.push(`[${timestamp()}] ${label}\n${message}`);
      }
    };

    await safeFinalizeStep("qa-run-context", async () => {
      const runContext = await buildRunContext(page, testInfo, options, sessionStartedAt);
      await testInfo.attach("qa-run-context", {
        body: Buffer.from(JSON.stringify(runContext, null, 2), "utf-8"),
        contentType: "application/json",
      });
    });

    await safeFinalizeStep("qa-console.log", async () => {
      await writeAttachment(testInfo, "qa-console.log", buffers.consoleMessages.join("\n"), "text/plain");
    });
    await safeFinalizeStep("qa-page-errors.log", async () => {
      await writeAttachment(testInfo, "qa-page-errors.log", buffers.pageErrors.join("\n\n"), "text/plain");
    });
    await safeFinalizeStep("qa-request-failures.log", async () => {
      await writeAttachment(testInfo, "qa-request-failures.log", buffers.requestFailures.join("\n"), "text/plain");
    });
    await safeFinalizeStep("qa-response-errors.log", async () => {
      await writeAttachment(testInfo, "qa-response-errors.log", buffers.responseErrors.join("\n"), "text/plain");
    });

    // The HTML snapshot gives maintainers a readable DOM state even when a
    // full trace/video is disabled or when they want a quick diffable artifact.
    // Playwright itself already saves the configured failure screenshot.
    if (testInfo.status !== testInfo.expectedStatus) {
      await safeFinalizeStep("failure-page-state", async () => {
        await capturePageState(page, testInfo, "failure");
      });

      if (options.attachDomSnapshotOnFailure) {
        await safeFinalizeStep("failure-dom-snapshot", async () => {
          await captureDomSnapshot(page, testInfo, "failure-dom-snapshot");
        });
      }
    }

    const noteContent = [...buffers.notes, ...artifactErrors].join("\n\n");
    if (!noteContent.trim()) {
      return;
    }

    try {
      await writeAttachment(testInfo, "qa-notes.log", noteContent, "text/plain");
    } catch {
      // Artifact attachment failures must never change the test outcome.
    }
  }

  return { api, finalize };
}
