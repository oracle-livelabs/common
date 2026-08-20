import type { Page } from "@playwright/test";

import { LiveStackLandingPage, type LiveStackActionRecord } from "../../../pages/platform/liveStackLandingPage.js";
import { WorkshopLandingPage } from "../../../pages/platform/workshopLandingPage.js";
import { WorkshopLaunchOptionsDialog } from "../../../pages/platform/workshopLaunchOptionsDialog.js";
import { signInIfRequired } from "../../support/authenticatedNavigation.js";
import {
  attachCatalogItem,
  catalogIndexItems,
  catalogItemTestTitle,
  loadCatalogIndex,
  type CatalogIndexItem,
} from "../../support/catalogIndex.js";
import { openIndexedCatalogItem } from "../../support/indexedCatalogNavigation.js";
import {
  assertParAuditPassed,
  attachParAudit,
  auditParCandidatesIsolated,
  buildParAuditAttachment,
  isParUrl,
  mergeParCandidates,
  sanitizeDiagnosticMessage,
  sanitizeSourceUrl,
  type ParCandidate,
  type ParSource,
} from "../../support/parAudit.js";
import {
  captureParCandidatesDuringAction,
  collectParCandidatesFromPage,
  collectWorkshopInstructionParCandidates,
  type ParScanError,
} from "../../support/parDiscovery.js";
import { test } from "../../support/test.js";
import type { AuthRuntimeConfig } from "../../support/authRuntime.js";

const PAR_CATALOG_TAGS = ["@par", "@catalog", "@scheduled", "@workshop", "@livestack"];
const loadResult = loadCatalogIndex();
const catalogItems = catalogIndexItems();
test.use({ trace: "off", video: "off", screenshot: "off" });

test.describe("Generated catalog PAR link audit", { tag: PAR_CATALOG_TAGS }, () => {
  test.describe.configure({ mode: "parallel", timeout: 1_200_000 });

  if (loadResult.status === "missing") {
    test("catalog index is not generated", async () => {
      test.skip(true, loadResult.message);
    });
  } else if (catalogItems.length === 0) {
    test("catalog index has no entries in the current slice", async () => {
      test.skip(true, "The generated catalog index does not contain any items for this run.");
    });
  } else {
    for (const item of catalogItems) {
      test("audits PAR links for indexed " + catalogItemTestTitle(item), async (
        { authRuntime, environmentConfig, liveStackLandingPage, page },
        testInfo,
      ) => {
        await attachCatalogItem(testInfo, item);

        const candidates: ParCandidate[] = [];
        const scanErrors: ParScanError[] = [];
        const seenSourceFiles = new Set<string>();
        let pagesScanned = 0;


        const scanCurrentPage = async (targetPage: Page, source: ParSource) => {
          candidates.push(...(await collectParCandidatesFromPage(targetPage, source)));
          pagesScanned += 1;
        };

        const openCatalogItem = async (
          contextName: string,
          targetPage: Page = page,
        ) => {
          await openIndexedCatalogItem(
            targetPage,
            authRuntime,
            environmentConfig.base_url,
            item,
            contextName,
            item.type === "workshop"
              ? { expectedPaths: ["/view-workshop", "/run-workshop"] }
              : undefined,
          );
          if (item.type === "workshop") {
            if (!isDirectWorkshopInstructions(targetPage)) {
              await new WorkshopLandingPage(targetPage).startButton.waitFor({ state: "visible", timeout: 20_000 });
            }
          } else {
            await new LiveStackLandingPage(targetPage).assertLoaded(item.title);
          }
        };

        const opened = await runScanStage(
          scanErrors,
          item.type + "-overview",
          item.title,
          page,
          () => openCatalogItem("PAR audit: " + item.title),
        );

        if (opened) {
          if (item.type === "workshop" && isDirectWorkshopInstructions(page)) {
            await runScanStage(scanErrors, "direct-instructions", item.title, page, async () => {
              const discovery = await collectWorkshopInstructionParCandidates(
                page,
                authRuntime,
                {
                  pageType: "direct-instructions",
                  pageUrl: sanitizeSourceUrl(page.url()),
                  label: item.title,
                },
                seenSourceFiles,
              );
              candidates.push(...discovery.candidates);
              scanErrors.push(...discovery.scanErrors);
              pagesScanned += discovery.pagesScanned;
            });
          } else {
            await runScanStage(scanErrors, item.type + "-overview", item.title, page, async () => {
              await scanCurrentPage(page, {
                pageType: item.type + "-overview",
                pageUrl: sanitizeSourceUrl(page.url()),
                label: item.title,
              });
            });
          }

          if (item.type === "workshop" && !isDirectWorkshopInstructions(page)) {
            await scanWorkshopLaunchSurfaces({
              page,
              authRuntime,
              label: item.title,
              openWorkshop: () => openCatalogItem("PAR audit workshop reset: " + item.title),
              openWorkshopOnPage: (targetPage) =>
                openCatalogItem("PAR audit workshop reset: " + item.title, targetPage),
              reuseCurrentPageForFirstOption: true,
              candidates,
              scanErrors,
              seenSourceFiles,
              incrementPages: (count) => {
                pagesScanned += count;
              },
            });
          } else if (item.type === "livestack") {
            await scanLiveStackSurfaces({
              page,
              authRuntime,
              item,
              liveStackLandingPage,
              openLiveStack: () => openCatalogItem("PAR audit LiveStack reset: " + item.title),
              candidates,
              scanErrors,
              seenSourceFiles,
              incrementPages: (count) => {
                pagesScanned += count;
              },
            });
          }
        }

        const links = await auditParCandidatesIsolated("catalog", mergeParCandidates(candidates));
        const audit = buildParAuditAttachment("catalog", item.title, links, {
          pagesScanned,
          scanErrors,
        });
        await attachParAudit(testInfo, audit);
        assertParAuditPassed(audit);
      });
    }
  }
});

interface WorkshopSurfaceOptions {
  page: Page;
  authRuntime: AuthRuntimeConfig;
  label: string;
  openWorkshop: () => Promise<void>;
  openWorkshopOnPage?: (page: Page) => Promise<void>;
  reuseCurrentPageForFirstOption?: boolean;
  candidates: ParCandidate[];
  scanErrors: ParScanError[];
  seenSourceFiles: Set<string>;
  incrementPages: (count: number) => void;
}

async function scanWorkshopLaunchSurfaces(options: WorkshopSurfaceOptions): Promise<void> {
  const tenancyPagePromise = options.openWorkshopOnPage
    ? preloadWorkshopOverview(options.page, options.openWorkshopOnPage)
    : Promise.resolve(undefined);

  await scanInstructionOption(options, "preview", !options.reuseCurrentPageForFirstOption);
  const tenancyPage = await tenancyPagePromise;
  if (tenancyPage) {
    try {
      await scanInstructionOption(
        {
          ...options,
          page: tenancyPage,
          openWorkshop: async () => {},
          openWorkshopOnPage: undefined,
        },
        "tenancy",
        false,
      );
    } finally {
      if (!tenancyPage.isClosed()) await tenancyPage.close();
    }
    return;
  }

  if (!isWorkshopOverviewPage(options.page)) {
    await restoreWorkshopOverviewFromHistory(options.page);
  }
  const resetNeeded = !isWorkshopOverviewPage(options.page);
  if (!resetNeeded || !options.openWorkshopOnPage) {
    await scanInstructionOption(options, "tenancy", resetNeeded);
    return;
  }

  const freshPage = await options.page.context().newPage();
  try {
    await scanInstructionOption(
      {
        ...options,
        page: freshPage,
        openWorkshop: () => options.openWorkshopOnPage!(freshPage),
        openWorkshopOnPage: undefined,
      },
      "tenancy",
      true,
    );
  } finally {
    if (!freshPage.isClosed()) await freshPage.close();
  }
}

async function preloadWorkshopOverview(
  sourcePage: Page,
  openWorkshopOnPage: (page: Page) => Promise<void>,
): Promise<Page | undefined> {
  const candidatePage = await sourcePage.context().newPage();
  try {
    await openWorkshopOnPage(candidatePage);
    return candidatePage;
  } catch {
    await candidatePage.close();
    return undefined;
  }
}

async function restoreWorkshopOverviewFromHistory(page: Page): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await page.goBack({
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      if (!response) return false;
      if (isWorkshopOverviewPage(page)) return true;
    } catch {
      return false;
    }
  }
  return false;
}

async function scanInstructionOption(
  options: WorkshopSurfaceOptions,
  option: "preview" | "tenancy",
  openWorkshopFirst = true,
): Promise<void> {
  const pageType = option === "preview" ? "preview-instructions" : "tenancy-instructions";
  const optionLabel = option === "preview" ? "Preview instructions" : "Run on your tenancy instructions";

  await runScanStage(options.scanErrors, pageType, options.label + ": " + optionLabel, options.page, async () => {
    if (openWorkshopFirst) await options.openWorkshop();

    const landingPage = new WorkshopLandingPage(options.page);
    const dialog = new WorkshopLaunchOptionsDialog(options.page);
    if (!(await dialog.dialog.isVisible().catch(() => false))) {
      await landingPage.openLaunchOptions();
    }
    await dialog.assertOpened();

    const isAvailable =
      option === "preview"
        ? await dialog.hasPreviewInstructions()
        : await dialog.hasRunOnYourEnvironmentInstructions();
    if (!isAvailable) return;

    const instructionsPage =
      option === "preview"
        ? await dialog.openPreviewInstructions()
        : await dialog.openRunOnYourEnvironmentInstructions();

    try {
      await signInIfRequired(instructionsPage, options.authRuntime, options.label + ": " + optionLabel);
      const discovery = await collectWorkshopInstructionParCandidates(
        instructionsPage,
        options.authRuntime,
        {
          pageType,
          pageUrl: sanitizeSourceUrl(instructionsPage.url()),
          label: options.label + ": " + optionLabel,
        },
        options.seenSourceFiles,
      );
      options.candidates.push(...discovery.candidates);
      options.scanErrors.push(...discovery.scanErrors);
      options.incrementPages(discovery.pagesScanned);
    } finally {
      if (instructionsPage !== options.page && !instructionsPage.isClosed()) {
        await instructionsPage.close();
      }
    }
  });
}

interface LiveStackSurfaceOptions {
  page: Page;
  authRuntime: AuthRuntimeConfig;
  item: CatalogIndexItem;
  liveStackLandingPage: LiveStackLandingPage;
  openLiveStack: () => Promise<void>;
  candidates: ParCandidate[];
  scanErrors: ParScanError[];
  seenSourceFiles: Set<string>;
  incrementPages: (count: number) => void;
}

async function scanLiveStackSurfaces(options: LiveStackSurfaceOptions): Promise<void> {
  let resources: LiveStackActionRecord[] = [];
  let assets: LiveStackActionRecord[] = [];

  await runScanStage(options.scanErrors, "livestack-resources", options.item.title, options.page, async () => {
    resources = await options.liveStackLandingPage.workshopResourceRecords();
    assets = await options.liveStackLandingPage.assetActionRecords();
  });

  for (const resource of resources) {
    const openResource = async () => {
      await options.openLiveStack();
      await options.liveStackLandingPage.openWorkshopResource(resource);
      await signInIfRequired(options.page, options.authRuntime, options.item.title + ": " + resource.title);
      await new WorkshopLandingPage(options.page).assertLoaded();
    };

    const resourceOpened = await runScanStage(
      options.scanErrors,
      "livestack-workshop-overview",
      options.item.title + ": " + resource.title,
      options.page,
      openResource,
    );

    if (resourceOpened) {
      await runScanStage(
        options.scanErrors,
        "livestack-workshop-overview",
        options.item.title + ": " + resource.title,
        options.page,
        async () => {
          options.candidates.push(
            ...(await collectParCandidatesFromPage(options.page, {
              pageType: "livestack-workshop-overview",
              pageUrl: sanitizeSourceUrl(options.page.url()),
              label: options.item.title + ": " + resource.title,
            })),
          );
          options.incrementPages(1);
        },
      );

      await scanWorkshopLaunchSurfaces({
        page: options.page,
        authRuntime: options.authRuntime,
        label: options.item.title + ": " + resource.title,
        openWorkshop: openResource,
        reuseCurrentPageForFirstOption: true,
        candidates: options.candidates,
        scanErrors: options.scanErrors,
        seenSourceFiles: options.seenSourceFiles,
        incrementPages: options.incrementPages,
      });
    }
  }

  for (const asset of assets) {
    if (asset.href && isParUrl(resolveHref(options.page, asset.href))) continue;

    await runScanStage(
      options.scanErrors,
      "livestack-asset",
      options.item.title + ": " + asset.title,
      options.page,
      async () => {
        await options.openLiveStack();
        const currentAssets = await options.liveStackLandingPage.assetActionRecords();
        const currentAsset = findMatchingAction(currentAssets, asset);
        if (!currentAsset) throw new Error("Asset action could not be found after reopening the LiveStack.");

        options.candidates.push(
          ...(await captureParCandidatesDuringAction(
            options.page,
            {
              pageType: "livestack-asset",
              pageUrl: sanitizeSourceUrl(options.page.url()),
              label: options.item.title + ": " + asset.title,
            },
            () => options.liveStackLandingPage.clickAssetAction(currentAsset),
          )),
        );
        options.incrementPages(1);
      },
    );
  }
}

async function runScanStage(
  scanErrors: ParScanError[],
  pageType: string,
  label: string,
  page: Page,
  action: () => Promise<void>,
): Promise<boolean> {
  try {
    await action();
    return true;
  } catch (error) {
    scanErrors.push({
      page_type: pageType,
      page_url: sanitizeSourceUrl(page.url()),
      label,
      error: safeError(error),
    });
    return false;
  }
}

function findMatchingAction(
  currentActions: LiveStackActionRecord[],
  original: LiveStackActionRecord,
): LiveStackActionRecord | undefined {
  return (
    currentActions.find(
      (candidate) =>
        candidate.title === original.title &&
        candidate.tagName === original.tagName &&
        (candidate.href || "") === (original.href || ""),
    ) || currentActions[original.index]
  );
}

function resolveHref(page: Page, href: string): string {
  try {
    return new URL(href, page.url()).toString();
  } catch {
    return href;
  }
}

function isDirectWorkshopInstructions(page: Page): boolean {
  try {
    return new URL(page.url()).pathname.includes("/run-workshop");
  } catch {
    return page.url().includes("/run-workshop");
  }
}

function isWorkshopOverviewPage(page: Page): boolean {
  try {
    return new URL(page.url()).pathname.includes("/view-workshop");
  } catch {
    return page.url().includes("/view-workshop");
  }
}

function safeError(error: unknown): string {
  return sanitizeDiagnosticMessage(error instanceof Error ? error.message : String(error));
}
