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

        const openCatalogItem = async (contextName: string) => {
          await openIndexedCatalogItem(page, authRuntime, environmentConfig.base_url, item, contextName);
          if (item.type === "workshop") {
            await new WorkshopLandingPage(page).startButton.waitFor({ state: "visible", timeout: 20_000 });
          } else {
            await new LiveStackLandingPage(page).assertLoaded(item.title);
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
          await runScanStage(scanErrors, item.type + "-overview", item.title, page, async () => {
            await scanCurrentPage(page, {
              pageType: item.type + "-overview",
              pageUrl: sanitizeSourceUrl(page.url()),
              label: item.title,
            });
          });

          if (item.type === "workshop") {
            await scanWorkshopLaunchSurfaces({
              page,
              authRuntime,
              label: item.title,
              openWorkshop: () => openCatalogItem("PAR audit workshop reset: " + item.title),
              candidates,
              scanErrors,
              seenSourceFiles,
              incrementPages: (count) => {
                pagesScanned += count;
              },
            });
          } else {
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
  candidates: ParCandidate[];
  scanErrors: ParScanError[];
  seenSourceFiles: Set<string>;
  incrementPages: (count: number) => void;
}

async function scanWorkshopLaunchSurfaces(options: WorkshopSurfaceOptions): Promise<void> {
  await scanInstructionOption(options, "preview");
  await scanInstructionOption(options, "tenancy");
}

async function scanInstructionOption(
  options: WorkshopSurfaceOptions,
  option: "preview" | "tenancy",
): Promise<void> {
  const pageType = option === "preview" ? "preview-instructions" : "tenancy-instructions";
  const optionLabel = option === "preview" ? "Preview instructions" : "Run on your tenancy instructions";

  await runScanStage(options.scanErrors, pageType, options.label + ": " + optionLabel, options.page, async () => {
    await options.openWorkshop();

    const landingPage = new WorkshopLandingPage(options.page);
    await landingPage.openLaunchOptions();

    const dialog = new WorkshopLaunchOptionsDialog(options.page);
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

function safeError(error: unknown): string {
  return sanitizeDiagnosticMessage(error instanceof Error ? error.message : String(error));
}
