import {
  attachCatalogItem,
  catalogIndexItems,
  catalogItemTestTitle,
  expectedTermsForCatalogItem,
  loadCatalogIndex,
} from "../../support/catalogIndex.js";
import { assertContentQuality } from "../../support/contentQuality.js";
import { openIndexedCatalogItem } from "../../support/indexedCatalogNavigation.js";
import { test } from "../../support/test.js";

const GENERATED_WORKSHOP_TAGS = ["@generated", "@platform", "@overview", "@workshop", "@content", "@ui"];

const loadResult = loadCatalogIndex();
const workshopItems = catalogIndexItems("workshop");

test.describe("LiveLabs generated workshop overview pages", { tag: GENERATED_WORKSHOP_TAGS }, () => {
  test.describe.configure({ timeout: 360_000 });

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
      test(`validates indexed ${catalogItemTestTitle(item)}`, async ({
        authRuntime,
        environmentConfig,
        page,
        targetEnvironment,
        workshopLandingPage,
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

        const navigation = await openIndexedCatalogItem(
          page,
          authRuntime,
          environmentConfig.base_url,
          item,
          `Generated workshop overview: ${item.title}`,
        );

        testInfo.annotations.push({
          type: "navigation",
          description: `${navigation.signedIn ? "signed-in" : "anonymous"} -> ${navigation.targetUrl}`,
        });

        await workshopLandingPage.assertLoaded();
        await assertContentQuality(page, {
          contextName: `Generated workshop overview: ${item.title}`,
          expectedTerms: expectedTermsForCatalogItem(item),
        });
      });
    }
  }
});
