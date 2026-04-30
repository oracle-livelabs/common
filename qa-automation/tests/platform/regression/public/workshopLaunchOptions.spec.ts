import { test } from "../../../support/test.js";

const WORKSHOP_LAUNCH_OPTIONS_TAGS = ["@regression", "@platform", "@workshop", "@launch", "@ui"];
const WORKSHOP_SEARCH_TERM = "Database";

test.describe("LiveLabs workshop launch options", { tag: WORKSHOP_LAUNCH_OPTIONS_TAGS }, () => {
  test("opens launch options from a workshop landing page", async ({
    homePage,
    workshopCardsPage,
    workshopLandingPage,
    workshopLaunchOptionsDialog,
    environmentConfig,
    targetEnvironment,
  }, testInfo) => {
    let selectedWorkshopTitle = "";

    testInfo.annotations.push({
      type: "environment",
      description: `${targetEnvironment} -> ${environmentConfig.base_url}`,
    });
    testInfo.annotations.push({
      type: "search-term",
      description: WORKSHOP_SEARCH_TERM,
    });

    await test.step("Search for a workshop", async () => {
      await homePage.goto(environmentConfig.base_url);
      await homePage.searchFor(WORKSHOP_SEARCH_TERM);
      await workshopCardsPage.dismissCookieBannerIfPresent();
      await workshopCardsPage.assertLoaded(WORKSHOP_SEARCH_TERM);
    });

    await test.step("Open the first workshop landing page", async () => {
      selectedWorkshopTitle = await workshopCardsPage.openFirstWorkshop();
      await workshopLandingPage.assertLoaded(selectedWorkshopTitle);
    });

    await test.step("Open launch options", async () => {
      await workshopLandingPage.openLaunchOptions();
      await workshopLaunchOptionsDialog.assertHasLaunchAction();
    });
  });
});
