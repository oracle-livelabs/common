import { test as base, expect } from "@playwright/test";

import {
  defaultEnvironmentName,
  defaultSearchTerm,
  parseBooleanFlag,
  parseIntegerFlag,
  resolveBaseUrl,
  resolveEnvironmentConfig,
  runnerDefaults,
  type EnvironmentConfig,
} from "../../config/projectConfig.js";
import { HomePage } from "../../pages/platform/homePage.js";
import { HeaderRegion } from "../../pages/platform/components/headerRegion.js";
import { EventCodeRequestPage } from "../../pages/platform/events/eventCodeRequestPage.js";
import { WorkshopCardsPage } from "../../pages/platform/workshopCardsPage.js";
import { LiveStackLandingPage } from "../../pages/platform/liveStackLandingPage.js";
import { WorkshopLandingPage } from "../../pages/platform/workshopLandingPage.js";
import { WorkshopLaunchOptionsDialog } from "../../pages/platform/workshopLaunchOptionsDialog.js";
import { ReservationsPage } from "../../pages/platform/reservations/reservationsPage.js";
import { resolveAuthRuntimeConfig, type AuthRuntimeConfig } from "./authRuntime.js";
import { createDiagnosticsSession } from "./diagnostics.js";

// Keep worker-scoped runtime values separate from per-test page objects so the
// suite can reuse environment setup without recreating page models unnecessarily.
type QAWorkerFixtures = {
  targetEnvironment: string;
  environmentConfig: EnvironmentConfig;
  authRuntime: AuthRuntimeConfig;
  livelabsSearchTerm: string;
};

type QATestFixtures = {
  homePage: HomePage;
  headerRegion: HeaderRegion;
  eventCodeRequestPage: EventCodeRequestPage;
  workshopCardsPage: WorkshopCardsPage;
  liveStackLandingPage: LiveStackLandingPage;
  workshopLandingPage: WorkshopLandingPage;
  workshopLaunchOptionsDialog: WorkshopLaunchOptionsDialog;
  reservationsPage: ReservationsPage;
  diagnostics: void;
};

// This file exposes the suite's canonical `test` object. Any custom fixture or
// future shared setup belongs here so every spec imports the same runtime shape.
const defaults = runnerDefaults();

export const test = base.extend<QATestFixtures, QAWorkerFixtures>({
  targetEnvironment: [
    async ({}, use) => {
      await use((process.env.QA_ENVIRONMENT ?? defaultEnvironmentName()).trim());
    },
    { scope: "worker" },
  ],

  environmentConfig: [
    async ({ targetEnvironment }, use) => {
      const resolvedEnvironment = resolveEnvironmentConfig(targetEnvironment);

      // The wrapper allows `--base-url` to redirect a run without mutating the
      // JSON config, so the shared fixture must honor the same override.
      await use({
        ...resolvedEnvironment,
        base_url: resolveBaseUrl(targetEnvironment, process.env.QA_BASE_URL),
      });
    },
    { scope: "worker" },
  ],

  authRuntime: [
    async ({}, use) => {
      await use(resolveAuthRuntimeConfig());
    },
    { scope: "worker" },
  ],

  livelabsSearchTerm: [
    async ({}, use) => {
      await use((process.env.QA_SEARCH_TERM ?? defaultSearchTerm()).trim());
    },
    { scope: "worker" },
  ],

  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  headerRegion: async ({ page }, use) => {
    await use(new HeaderRegion(page));
  },

  eventCodeRequestPage: async ({ page }, use) => {
    await use(new EventCodeRequestPage(page));
  },

  workshopCardsPage: async ({ page }, use) => {
    await use(new WorkshopCardsPage(page));
  },

  liveStackLandingPage: async ({ page }, use) => {
    await use(new LiveStackLandingPage(page));
  },

  workshopLandingPage: async ({ page }, use) => {
    await use(new WorkshopLandingPage(page));
  },

  workshopLaunchOptionsDialog: async ({ page }, use) => {
    await use(new WorkshopLaunchOptionsDialog(page));
  },

  reservationsPage: async ({ page }, use) => {
    await use(new ReservationsPage(page));
  },

  diagnostics: [
    async ({ page, browserName, targetEnvironment, environmentConfig, livelabsSearchTerm }, use, testInfo) => {
      // The diagnostics fixture is automatic so every spec gets the same log,
      // screenshot, and page-state attachments without opting in test by test.
      const diagnostics = createDiagnosticsSession(page, testInfo, {
        environmentName: targetEnvironment,
        environmentConfig,
        livelabsSearchTerm,
        browserName,
        captureConsole: parseBooleanFlag(process.env.QA_CAPTURE_CONSOLE, defaults.capture_console),
        capturePageErrors: parseBooleanFlag(process.env.QA_CAPTURE_PAGE_ERRORS, defaults.capture_page_errors),
        captureRequestFailures: parseBooleanFlag(process.env.QA_CAPTURE_REQUEST_FAILURES, defaults.capture_request_failures),
        captureResponseErrors: parseBooleanFlag(process.env.QA_CAPTURE_RESPONSE_ERRORS, defaults.capture_response_errors),
        responseErrorStatus: parseIntegerFlag(process.env.QA_RESPONSE_ERROR_STATUS, defaults.response_error_status),
        attachDomSnapshotOnFailure: parseBooleanFlag(
          process.env.QA_ATTACH_DOM_SNAPSHOT_ON_FAILURE,
          defaults.attach_dom_snapshot_on_failure,
        ),
        fullPageScreenshots: parseBooleanFlag(process.env.QA_FULL_PAGE_SCREENSHOT, defaults.full_page_screenshot),
      });

      await use(undefined);
      await diagnostics.finalize();
    },
    { auto: true },
  ],
});

export { expect };
