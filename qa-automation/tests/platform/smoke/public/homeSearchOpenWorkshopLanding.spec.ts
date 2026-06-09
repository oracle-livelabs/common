import { test } from "../../../support/test.js";
import { getWorkshopLandingSearchTerms } from "../../../support/platformSmokeData.js";
import { resolveSearchTerm } from "../../../support/searchHelpers.js";

const HOME_SEARCH_LANDING_TAGS = ["@smoke", "@platform", "@search", "@catalog", "@ui"];
const HOME_SEARCH_LANDING_MATRIX = getWorkshopLandingSearchTerms();

// This spec proves the public flow can move all the way from homepage intent
// to a real workshop landing page without crossing into guide-content mode.
test.describe("LiveLabs homepage search opens a workshop landing page", { tag: HOME_SEARCH_LANDING_TAGS }, () => {
  for (const searchTerm of HOME_SEARCH_LANDING_MATRIX) {
    test(`opens a workshop landing page for "${searchTerm}"`, async ({
      homePage,
      workshopCardsPage,
      workshopLandingPage,
      environmentConfig,
      livelabsSearchTerm,
      targetEnvironment,
    }, testInfo) => {
      const resolvedSearchTerm = resolveSearchTerm(searchTerm, livelabsSearchTerm);
      let selectedWorkshopTitle = "";

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

      await test.step("Verify the results page", async () => {
        await workshopCardsPage.dismissCookieBannerIfPresent();
        await workshopCardsPage.assertLoaded(resolvedSearchTerm);
      });

      await test.step("Open the first workshop card from the results list", async () => {
        selectedWorkshopTitle = await workshopCardsPage.openFirstWorkshop();
      });

      await test.step("Verify the selected workshop landing page", async () => {
        await workshopLandingPage.assertLoaded(selectedWorkshopTitle);
      });
    });
  }
});