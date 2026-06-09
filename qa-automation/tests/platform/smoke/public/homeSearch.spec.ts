import { test } from "../../../support/test.js";
import { getHomeSearchTerms } from "../../../support/platformSmokeData.js";
import { resolveSearchTerm } from "../../../support/searchHelpers.js";

const HOME_SEARCH_TAGS = ["@smoke", "@platform", "@search", "@catalog", "@ui"];
const HOME_SEARCH_MATRIX = getHomeSearchTerms();

// Search is the most important anonymous-user path in the current platform
// slice, so the suite keeps a tiny matrix of realistic terms rather than a
// single hard-coded example.
test.describe("LiveLabs homepage search", { tag: HOME_SEARCH_TAGS }, () => {
  for (const searchTerm of HOME_SEARCH_MATRIX) {
    test(`opens matching workshop results for "${searchTerm}"`, async ({
      homePage,
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

      await test.step("Open the homepage", async () => {
        await homePage.goto(environmentConfig.base_url);
      });

      await test.step(`Search with AI for "${resolvedSearchTerm}"`, async () => {
        await homePage.searchFor(resolvedSearchTerm);
      });

      await test.step("Verify the results page and at least one result card", async () => {
        await workshopCardsPage.dismissCookieBannerIfPresent();
        await workshopCardsPage.assertLoaded(resolvedSearchTerm);
      });
    });
  }
});