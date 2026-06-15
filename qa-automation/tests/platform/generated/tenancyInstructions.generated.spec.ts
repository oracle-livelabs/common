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

const GENERATED_TENANCY_TAGS = ["@generated", "@platform", "@instructions", "@tenancy", "@workshop", "@content", "@ui"];

const loadResult = loadCatalogIndex();
const workshopItems = catalogIndexItems("workshop");

test.describe("LiveLabs generated tenancy instructions", { tag: GENERATED_TENANCY_TAGS }, () => {
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
      test(`validates Run on your tenancy instructions when offered for indexed ${catalogItemTestTitle(item)}`, async ({
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
          `Generated tenancy instructions: ${item.title}`,
        );
        await workshopLandingPage.assertLoaded();
        await workshopLandingPage.openLaunchOptions();
        await workshopLaunchOptionsDialog.assertHasLaunchAction();

        if (!(await workshopLaunchOptionsDialog.hasRunOnYourEnvironmentInstructions())) {
          testInfo.annotations.push({
            type: "tenancy-instructions",
            description: "Run on your tenancy/environment option is not offered for this indexed workshop.",
          });
          return;
        }

        const instructionsPage = await workshopLaunchOptionsDialog.openRunOnYourEnvironmentInstructions();
        await signInIfRequired(instructionsPage, authRuntime, `Generated tenancy instructions: ${item.title}`);

        const workshopInstructionsPage = new WorkshopInstructionsPage(instructionsPage);
        await workshopInstructionsPage.assertLoaded(expectedTermsForCatalogItem(item));
        await workshopInstructionsPage.assertContentQuality({
          contextName: `Generated tenancy instructions: ${item.title}`,
          expectedTerms: expectedTermsForCatalogItem(item),
        });

        if (instructionsPage !== page) {
          await instructionsPage.close();
        }
      });
    }
  }
});
