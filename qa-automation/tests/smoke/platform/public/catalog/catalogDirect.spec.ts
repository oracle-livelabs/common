import { getHomeSearchTerms } from "../../../../support/platformSmokeData.js";
import { resolveSearchTerm } from "../../../../support/searchHelpers.js";
import { test } from "../../../../support/test.js";

const CATALOG_DIRECT_TAGS = ["@smoke", "@platform", "@catalog", "@search", "@direct", "@ui"];

test.describe("LiveLabs catalog direct smoke", { tag: CATALOG_DIRECT_TAGS }, () => {
  for (const searchTerm of getHomeSearchTerms()) {
    test(`opens catalog results directly for "${searchTerm}"`, async ({
      environmentConfig,
      livelabsSearchTerm,
      workshopCardsPage,
    }, testInfo) => {
      const resolvedSearchTerm = resolveSearchTerm(searchTerm, livelabsSearchTerm);

      testInfo.annotations.push({
        type: "search-term",
        description: resolvedSearchTerm,
      });

      await workshopCardsPage.goto(environmentConfig.base_url, resolvedSearchTerm);
      await workshopCardsPage.assertLoaded(resolvedSearchTerm);
    });
  }
});
