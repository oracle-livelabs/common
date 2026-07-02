import { WorkshopInstructionsPage } from "../../../pages/platform/workshopInstructionsPage.js";
import { assertAssetActionWorks, assertNoBrowserError } from "../../support/assetActions.js";
import { signInIfRequired } from "../../support/authenticatedNavigation.js";
import {
  attachCatalogItem,
  catalogIndexItems,
  catalogItemTestTitle,
  expectedTermsForText,
  loadCatalogIndex,
} from "../../support/catalogIndex.js";
import { assertContentQuality } from "../../support/contentQuality.js";
import { openIndexedCatalogItem } from "../../support/indexedCatalogNavigation.js";
import { expect, test } from "../../support/test.js";

const GENERATED_LIVESTACK_RESOURCE_TAGS = [
  "@generated",
  "@platform",
  "@livestack",
  "@resources",
  "@assets",
  "@instructions",
  "@content",
  "@ui",
];

const loadResult = loadCatalogIndex();
const liveStackItems = catalogIndexItems("livestack");

test.describe("LiveLabs generated LiveStack resource drilldown", { tag: GENERATED_LIVESTACK_RESOURCE_TAGS }, () => {
  test.describe.configure({ timeout: 720_000 });

  if (loadResult.status === "missing") {
    test("catalog index is not generated", async () => {
      test.skip(true, loadResult.message);
    });
  } else if (liveStackItems.length === 0) {
    test("catalog index has no LiveStack entries in the current slice", async () => {
      test.skip(true, "The generated catalog index does not contain LiveStack entries for this run.");
    });
  } else {
    for (const item of liveStackItems) {
      test(`validates resources and assets for indexed ${catalogItemTestTitle(item)}`, async ({
        authRuntime,
        environmentConfig,
        liveStackLandingPage,
        page,
        targetEnvironment,
        workshopLandingPage,
        workshopLaunchOptionsDialog,
      }, testInfo) => {
        testInfo.annotations.push({
          type: "environment",
          description: `${targetEnvironment} -> ${environmentConfig.base_url}`,
        });
        testInfo.annotations.push({
          type: "catalog-item",
          description: `${item.id} -> ${item.normalized_href}`,
        });
        await attachCatalogItem(testInfo, item);

        const openLiveStack = async (contextName: string) => {
          const navigation = await openIndexedCatalogItem(page, authRuntime, environmentConfig.base_url, item, contextName);

          testInfo.annotations.push({
            type: "navigation",
            description: `${navigation.signedIn ? "signed-in" : "anonymous"} -> ${navigation.targetUrl}`,
          });

          await liveStackLandingPage.assertLoaded(item.title);
        };

        await openLiveStack(`Generated LiveStack resources: ${item.title}`);

        const workshopResources = await liveStackLandingPage.workshopResourceRecords();
        const assetActions = await liveStackLandingPage.assetActionRecords();

        expect(workshopResources, `${item.title} should list demo or workshop resources`).not.toEqual([]);
        expect(assetActions, `${item.title} should list asset actions`).not.toEqual([]);

        await testInfo.attach("livestack-resources.json", {
          body: JSON.stringify({ workshopResources, assetActions }, null, 2),
          contentType: "application/json",
        });

        for (const resource of workshopResources) {
          await test.step(`Open resource workshop: ${resource.title}`, async () => {
            await openLiveStack(`Generated LiveStack resource workshop: ${resource.title}`);
            await liveStackLandingPage.openWorkshopResource(resource);
            await signInIfRequired(page, authRuntime, `Generated LiveStack resource workshop: ${resource.title}`);
            await workshopLandingPage.assertLoaded();
            await assertContentQuality(page, {
              contextName: `Generated LiveStack resource workshop: ${resource.title}`,
              expectedTerms: expectedTermsForText(resource.title),
              expectedTermsMode: "any",
            });

            await workshopLandingPage.openLaunchOptions();
            await workshopLaunchOptionsDialog.assertHasLaunchAction();

            if (await workshopLaunchOptionsDialog.hasPreviewInstructions()) {
              const previewPage = await workshopLaunchOptionsDialog.openPreviewInstructions();
              await signInIfRequired(previewPage, authRuntime, `Generated LiveStack resource preview: ${resource.title}`);

              const instructionsPage = new WorkshopInstructionsPage(previewPage);
              await instructionsPage.assertLoaded();
              await instructionsPage.assertContentQuality({
                contextName: `Generated LiveStack resource preview: ${resource.title}`,
                expectedTerms: expectedTermsForText(resource.title),
                expectedTermsMode: "any",
              });

              if (previewPage !== page) {
                await previewPage.close();
              }
            } else {
              testInfo.annotations.push({
                type: "preview-instructions",
                description: `Preview Instructions option is not offered for LiveStack resource: ${resource.title}`,
              });
            }

            await openLiveStack(`Generated LiveStack resource tenancy reset: ${resource.title}`);
            await liveStackLandingPage.openWorkshopResource(resource);
            await signInIfRequired(page, authRuntime, `Generated LiveStack resource tenancy: ${resource.title}`);
            await workshopLandingPage.assertLoaded();
            await workshopLandingPage.openLaunchOptions();

            if (await workshopLaunchOptionsDialog.hasRunOnYourEnvironmentInstructions()) {
              const tenancyPage = await workshopLaunchOptionsDialog.openRunOnYourEnvironmentInstructions();
              await signInIfRequired(tenancyPage, authRuntime, `Generated LiveStack resource tenancy: ${resource.title}`);

              const instructionsPage = new WorkshopInstructionsPage(tenancyPage);
              await instructionsPage.assertLoaded();
              await instructionsPage.assertContentQuality({
                contextName: `Generated LiveStack resource tenancy: ${resource.title}`,
                expectedTerms: expectedTermsForText(resource.title),
                expectedTermsMode: "any",
              });

              if (tenancyPage !== page) {
                await tenancyPage.close();
              }
            } else {
              testInfo.annotations.push({
                type: "tenancy-instructions",
                description: `Run on your tenancy/environment option is not offered for LiveStack resource: ${resource.title}`,
              });
            }
          });
        }

        for (const assetAction of assetActions) {
          await test.step(`Click asset action: ${assetAction.title}`, async () => {
            await openLiveStack(`Generated LiveStack asset action: ${assetAction.title}`);
            await assertAssetActionWorks(page, liveStackLandingPage.clickAssetAction.bind(liveStackLandingPage), assetAction);
            await signInIfRequired(page, authRuntime, `Generated LiveStack asset action: ${assetAction.title}`);
            await assertNoBrowserError(page, `Generated LiveStack asset action: ${assetAction.title}`);
          });
        }
      });
    }
  }
});
