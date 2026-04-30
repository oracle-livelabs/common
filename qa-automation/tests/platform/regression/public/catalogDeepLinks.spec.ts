import { test } from "../../../support/test.js";
import { getHomeSearchTerms } from "../../../support/platformSmokeData.js";
import { resolveSearchTerm } from "../../../support/searchHelpers.js";

const CATALOG_DEEP_LINK_TAGS = ["@regression", "@platform", "@catalog", "@search", "@navigation", "@ui"];
const CATALOG_DEEP_LINK_MATRIX = getHomeSearchTerms();

test.describe("LiveLabs catalog deep links", { tag: CATALOG_DEEP_LINK_TAGS }, () => {
  for (const searchTerm of CATALOG_DEEP_LINK_MATRIX) {
    test(`opens catalog results directly for "${searchTerm}"`, async ({
      workshopCardsPage,
      environmentConfig,
      livelabsSearchTerm,
      targetEnvironment,
    }, testInfo) => {
      const resolvedSearchTerm = resolveSearchTerm(searchTerm, livelabsSearchTerm);

      testInfo.annotations.push({
        type: "environment",
        description: `${targetEnvironment} -> ${environmentConfig.base_url}`,
      });
      testInfo.annotations.push({
        type: "search-term",
        description: resolvedSearchTerm,
      });

      await test.step("Open the catalog search URL directly", async () => {
        await workshopCardsPage.goto(environmentConfig.base_url, resolvedSearchTerm);
      });

      await test.step("Verify the catalog preserves the search context", async () => {
        await workshopCardsPage.assertLoaded(resolvedSearchTerm);
      });
    });
  }
});
