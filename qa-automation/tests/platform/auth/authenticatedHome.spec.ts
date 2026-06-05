import { test } from "../../support/test.js";

const AUTH_HOME_TAGS = ["@auth", "@platform", "@home", "@smoke"];

test.describe("LiveLabs authenticated home smoke", { tag: AUTH_HOME_TAGS }, () => {
  test("loads the public home with a configured storage state", async ({
    authRuntime,
    environmentConfig,
    headerRegion,
    homePage,
  }) => {
    test.skip(!authRuntime.hasStorageState, "requires QA_STORAGE_STATE pointing to a Playwright storage-state file");

    await homePage.goto(environmentConfig.base_url);
    await headerRegion.assertLoaded();
    await homePage.assertAiSearchEntryPointLoaded();
  });
});
