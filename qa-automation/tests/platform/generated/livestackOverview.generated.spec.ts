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

const GENERATED_LIVESTACK_TAGS = ["@generated", "@platform", "@overview", "@livestack", "@content", "@ui"];

const loadResult = loadCatalogIndex();
const liveStackItems = catalogIndexItems("livestack");

test.describe("LiveLabs generated LiveStack overview pages", { tag: GENERATED_LIVESTACK_TAGS }, () => {
  test.describe.configure({ timeout: 360_000 });

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
      test(`validates indexed ${catalogItemTestTitle(item)}`, async ({
        authRuntime,
        environmentConfig,
        liveStackLandingPage,
        page,
        targetEnvironment,
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
          `Generated LiveStack overview: ${item.title}`,
        );

        testInfo.annotations.push({
          type: "navigation",
          description: `${navigation.signedIn ? "signed-in" : "anonymous"} -> ${navigation.targetUrl}`,
        });

        await liveStackLandingPage.assertLoaded(item.title);
        await liveStackLandingPage.assertDemoWorkshopAndAssetsAvailable();
        await assertContentQuality(page, {
          contextName: `Generated LiveStack overview: ${item.title}`,
          expectedTerms: expectedTermsForCatalogItem(item),
          expectedTermsMode: "any",
        });
      });
    }
  }
});
