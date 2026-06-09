import { test } from "../../../support/test.js";

const HOME_PAGE_TAGS = ["@smoke", "@platform", "@home", "@navigation", "@ui"];

// This spec keeps the homepage smoke check intentionally small and high-signal:
// if this file fails, the public entry point is likely broken for anonymous users.
test.describe("LiveLabs home page", { tag: HOME_PAGE_TAGS }, () => {
  test("shows the core entry points", async ({ homePage, environmentConfig, targetEnvironment }, testInfo) => {
    testInfo.annotations.push({
      type: "environment",
      description: `${targetEnvironment} -> ${environmentConfig.base_url}`,
    });

    await test.step("Open the LiveLabs home page", async () => {
      await homePage.goto(environmentConfig.base_url);
    });

    await test.step("Verify the main learner entry points", async () => {
      await homePage.assertLoaded();
    });
  });

  test("opens workshops from the View all Workshops option", async ({
    homePage,
    workshopCardsPage,
    environmentConfig,
    targetEnvironment,
  }, testInfo) => {
    testInfo.annotations.push({
      type: "environment",
      description: `${targetEnvironment} -> ${environmentConfig.base_url}`,
    });

    await test.step("Open the LiveLabs home page", async () => {
      await homePage.goto(environmentConfig.base_url);
      await homePage.assertLoaded();
    });

    await test.step("Use View all Workshops", async () => {
      await homePage.openAllWorkshops();
    });

    await test.step("Verify the workshop catalog opens", async () => {
      await workshopCardsPage.dismissCookieBannerIfPresent();
      await workshopCardsPage.assertLoadedFromBrowse();
    });
  });
});