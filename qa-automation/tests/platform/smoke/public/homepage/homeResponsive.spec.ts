import { expect, test } from "../../../../support/test.js";

const HOME_RESPONSIVE_TAGS = ["@smoke", "@platform", "@home", "@responsive", "@ui"];

const VIEWPORT_MATRIX = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

test.describe("LiveLabs home responsive smoke", { tag: HOME_RESPONSIVE_TAGS }, () => {
  for (const viewport of VIEWPORT_MATRIX) {
    test(`renders the current search entry at ${viewport.name} size`, async ({ environmentConfig, homePage, page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await homePage.goto(environmentConfig.base_url);
      await homePage.assertAiSearchEntryPointLoaded();
      await expect(homePage.viewAllWorkshopsOption).toBeVisible();
    });
  }
});
