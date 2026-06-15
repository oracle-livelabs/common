import { expect, type Page } from "@playwright/test";

import { WorkshopInstructionsPage } from "../../../../../pages/platform/workshopInstructionsPage.js";
import type { LiveStackActionRecord } from "../../../../../pages/platform/liveStackLandingPage.js";
import { assertContentQuality } from "../../../../support/contentQuality.js";
import { signInIfRequired } from "../../../../support/authenticatedNavigation.js";
import { openCatalogSearch } from "../../../../support/overviewFlows.js";
import { getLiveStackResourceTargets } from "../../../../support/overviewTargets.js";
import { test } from "../../../../support/test.js";

const LIVESTACK_RESOURCE_TAGS = [
  "@regression",
  "@platform",
  "@livestack",
  "@resources",
  "@assets",
  "@instructions",
  "@ui",
];

test.describe("LiveLabs LiveStack resources and assets", { tag: LIVESTACK_RESOURCE_TAGS }, () => {
  test.describe.configure({ timeout: 480_000 });

  for (const target of getLiveStackResourceTargets()) {
    test(`validates resource drilldown for ${target.name}`, async ({
      authRuntime,
      page,
      workshopCardsPage,
      liveStackLandingPage,
      workshopLandingPage,
      workshopLaunchOptionsDialog,
      environmentConfig,
      targetEnvironment,
    }, testInfo) => {
      testInfo.annotations.push({
        type: "environment",
        description: `${targetEnvironment} -> ${environmentConfig.base_url}`,
      });
      testInfo.annotations.push({
        type: "search-term",
        description: target.search_term,
      });

      const openLiveStack = async () => {
        await openCatalogSearch(workshopCardsPage, environmentConfig.base_url, target.search_term);
        const card = await workshopCardsPage.openResultCardByTitle("livestack", target.title_pattern);
        await signInIfRequired(page, authRuntime, `LiveStack resources: ${card.title}`);
        await liveStackLandingPage.assertLoaded(card.title);
        return card;
      };

      const liveStackCard = await openLiveStack();
      testInfo.annotations.push({
        type: "livestack-resource-card",
        description: `${liveStackCard.title} -> ${liveStackCard.href}`,
      });

      const workshopResources = await liveStackLandingPage.workshopResourceRecords();
      const assetActions = await liveStackLandingPage.assetActionRecords();

      expect(workshopResources, `${liveStackCard.title} should list demo or workshop resources`).not.toEqual([]);
      expect(assetActions, `${liveStackCard.title} should list asset actions`).not.toEqual([]);

      for (const resource of workshopResources) {
        await test.step(`Open resource workshop: ${resource.title}`, async () => {
          await openLiveStack();
          await liveStackLandingPage.openWorkshopResource(resource);
          await signInIfRequired(page, authRuntime, `LiveStack resource workshop: ${resource.title}`);
          await workshopLandingPage.assertLoaded();
          await assertContentQuality(page, {
            contextName: `LiveStack resource workshop: ${resource.title}`,
          });

          await workshopLandingPage.openLaunchOptions();
          await workshopLaunchOptionsDialog.assertHasLaunchAction();

          if (await workshopLaunchOptionsDialog.hasPreviewInstructions()) {
            const previewPage = await workshopLaunchOptionsDialog.openPreviewInstructions();
            await signInIfRequired(previewPage, authRuntime, `LiveStack resource preview: ${resource.title}`);

            const instructionsPage = new WorkshopInstructionsPage(previewPage);
            await instructionsPage.assertLoaded();
            await instructionsPage.assertContentQuality({
              contextName: `LiveStack resource preview: ${resource.title}`,
            });

            if (previewPage !== page) {
              await previewPage.close();
            }
          }
        });
      }

      for (const assetAction of assetActions) {
        await test.step(`Click asset action: ${assetAction.title}`, async () => {
          await openLiveStack();
          await assertAssetActionWorks(page, liveStackLandingPage.clickAssetAction.bind(liveStackLandingPage), assetAction);
          await signInIfRequired(page, authRuntime, `LiveStack asset action: ${assetAction.title}`);
          await assertNoBrowserError(page, `LiveStack asset action: ${assetAction.title}`);
        });
      }
    });
  }
});

async function assertAssetActionWorks(
  page: Page,
  clickAssetAction: (record: LiveStackActionRecord) => Promise<void>,
  record: LiveStackActionRecord,
): Promise<void> {
  const beforeUrl = page.url();
  const popupPromise = page.waitForEvent("popup", { timeout: 5_000 }).catch(() => undefined);
  const downloadPromise = page.waitForEvent("download", { timeout: 5_000 }).catch(() => undefined);

  await clickAssetAction(record);

  const [popup, download] = await Promise.all([popupPromise, downloadPromise]);

  if (download) {
    expect(download.suggestedFilename(), `${record.title} should start a named download`).not.toHaveLength(0);
    return;
  }

  if (popup) {
    await popup.waitForLoadState("domcontentloaded").catch(() => undefined);
    await assertNoBrowserError(popup, `Asset popup: ${record.title}`);
    await popup.close();
    return;
  }

  if (page.url() === beforeUrl && record.tagName !== "button") {
    throw new Error(`Asset action "${record.title}" did not open a page, popup, or download.`);
  }
}

async function assertNoBrowserError(page: Page, contextName: string): Promise<void> {
  const currentUrl = page.url();

  expect(currentUrl, `${contextName} should not end on a browser error page`).not.toMatch(/^chrome-error:\/\//i);
  expect(currentUrl, `${contextName} should not be blank`).not.toBe("about:blank");
}
