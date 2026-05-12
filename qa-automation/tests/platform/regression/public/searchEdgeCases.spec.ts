import { test } from "../../../support/test.js";
import { SEARCH_CASE_NAMES, getSearchCaseByName, type SearchCaseName } from "../../../support/searchCases.js";

const SEARCH_EDGE_CASE_TAGS = ["@regression", "@platform", "@search", "@catalog", "@ui"];
const SEARCH_EDGE_CASE_MATRIX: SearchCaseName[] = [
  SEARCH_CASE_NAMES.unknownWorkshopTerm,
  SEARCH_CASE_NAMES.blankSpaceSearch,
];

// These tests deliberately codify today's edge-case behavior. That lets the
// team decide whether a future product change is a bug or an intentional shift.
test.describe("LiveLabs search edge behavior", { tag: SEARCH_EDGE_CASE_TAGS }, () => {
  for (const caseName of SEARCH_EDGE_CASE_MATRIX) {
    test(`keeps the expected behavior for "${caseName}"`, async ({
      homePage,
      workshopCardsPage,
      environmentConfig,
      targetEnvironment,
    }, testInfo) => {
      const searchCase = getSearchCaseByName(caseName);

      testInfo.annotations.push({
        type: "environment",
        description: `${targetEnvironment} -> ${environmentConfig.base_url}`,
      });
      testInfo.annotations.push({
        type: "search-case",
        description: `${searchCase.id}: "${searchCase.search_term}"`,
      });

      await test.step("Open the homepage", async () => {
        await homePage.goto(environmentConfig.base_url);
      });

      await test.step(`Run the search case "${caseName}"`, async () => {
        await homePage.searchFor(searchCase.search_term);
      });

      await test.step("Verify the observed outcome", async () => {
        await workshopCardsPage.dismissCookieBannerIfPresent();

        if (searchCase.id === "no_results") {
          await workshopCardsPage.assertNoResults(searchCase.search_term);
          return;
        }

        if (searchCase.id === "blank_spaces") {
          await workshopCardsPage.assertLoaded(searchCase.search_term);
          return;
        }

        throw new Error(`Unhandled regression search case: ${searchCase.id}`);
      });
    });
  }
});
