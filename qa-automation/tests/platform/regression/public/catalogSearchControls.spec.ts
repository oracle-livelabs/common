import { test } from "../../../support/test.js";

const CATALOG_SEARCH_CONTROL_TAGS = ["@regression", "@platform", "@catalog", "@search", "@ui"];
const CLEAR_SEARCH_TERM = "Database";

test.describe("LiveLabs catalog search controls", { tag: CATALOG_SEARCH_CONTROL_TAGS }, () => {
  test("clears a direct catalog search back to browse results", async ({
    workshopCardsPage,
    environmentConfig,
    targetEnvironment,
  }, testInfo) => {
    testInfo.annotations.push({
      type: "environment",
      description: `${targetEnvironment} -> ${environmentConfig.base_url}`,
    });
    testInfo.annotations.push({
      type: "search-term",
      description: CLEAR_SEARCH_TERM,
    });

    await test.step("Open catalog results with a search term", async () => {
      await workshopCardsPage.goto(environmentConfig.base_url, CLEAR_SEARCH_TERM);
      await workshopCardsPage.assertLoaded(CLEAR_SEARCH_TERM);
    });

    await test.step("Clear the search", async () => {
      await workshopCardsPage.clearSearch();
    });

    await test.step("Verify browse results remain available", async () => {
      await workshopCardsPage.assertLoadedFromBrowse();
    });
  });
});
