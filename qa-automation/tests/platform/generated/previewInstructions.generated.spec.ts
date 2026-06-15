import { WorkshopInstructionsPage } from "../../../pages/platform/workshopInstructionsPage.js";
import {
  attachCatalogItem,
  catalogIndexItems,
  catalogItemTestTitle,
  expectedTermsForCatalogItem,
  loadCatalogIndex,
} from "../../support/catalogIndex.js";
import { signInIfRequired } from "../../support/authenticatedNavigation.js";
import { openIndexedCatalogItem } from "../../support/indexedCatalogNavigation.js";
import { test } from "../../support/test.js";

const GENERATED_PREVIEW_TAGS = ["@generated", "@platform", "@instructions", "@workshop", "@content", "@ui"];

const loadResult = loadCatalogIndex();
const workshopItems = catalogIndexItems("workshop");

test.describe("LiveLabs generated preview instructions", { tag: GENERATED_PREVIEW_TAGS }, () => {
  test.describe.configure({ timeout: 420_000 });

  if (loadResult.status === "missing") {
    test("catalog index is not generated", async () => {
      test.skip(true, loadResult.message);
    });
  } else if (workshopItems.length === 0) {
    test("catalog index has no workshop entries in the current slice", async () => {
      test.skip(true, "The generated catalog index does not contain workshop entries for this run.");
    });
  } else {
    for (const item of workshopItems) {
      test(`validates preview instructions when offered for indexed ${catalogItemTestTitle(item)}`, async ({
        authRuntime,
        environmentConfig,
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

        await openIndexedCatalogItem(
          page,
          authRuntime,
          environmentConfig.base_url,
          item,
          `Generated preview instructions: ${item.title}`,
        );
        await workshopLandingPage.assertLoaded();
        await workshopLandingPage.openLaunchOptions();
        await workshopLaunchOptionsDialog.assertHasLaunchAction();

        if (!(await workshopLaunchOptionsDialog.hasPreviewInstructions())) {
          testInfo.annotations.push({
            type: "preview-instructions",
            description: "Preview Instructions option is not offered for this indexed workshop.",
          });
          return;
        }

        const previewPage = await workshopLaunchOptionsDialog.openPreviewInstructions();
        await signInIfRequired(previewPage, authRuntime, `Generated preview instructions: ${item.title}`);

        const instructionsPage = new WorkshopInstructionsPage(previewPage);
        await instructionsPage.assertLoaded();
        await instructionsPage.assertContentQuality({
          contextName: `Generated preview instructions: ${item.title}`,
          expectedTerms: expectedTermsForCatalogItem(item),
        });

        if (previewPage !== page) {
          await previewPage.close();
        }
      });
    }
  }
});
