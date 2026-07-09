import { expect, test } from "../../../../support/test.js";

const HOME_ACCESSIBILITY_TAGS = ["@smoke", "@platform", "@home", "@accessibility", "@ui"];

test.describe("LiveLabs home accessibility smoke", { tag: HOME_ACCESSIBILITY_TAGS }, () => {
  test("keeps the main public landmarks and search entry accessible", async ({ environmentConfig, homePage, page }) => {
    await homePage.goto(environmentConfig.base_url);
    await homePage.assertAiSearchEntryPointLoaded();

    await expect(page.locator("#t_Header")).toBeVisible();
    await expect(page.getByRole("banner", { name: "Announcements" })).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(homePage.heroHeading).toBeVisible();
    await expect(homePage.searchInput).toBeEditable();
    await expect(homePage.searchWithAiOption).toBeVisible();
  });
});
