import type { Page } from "@playwright/test";

import { expect, test } from "../../../support/test.js";

const PLATFORM_HTTP_HEALTH_TAGS = ["@smoke", "@platform", "@http", "@contract"];

async function expectPublicPageResponse(page: Page, url: string, expectedText: string | RegExp): Promise<void> {
  const response = await page.goto(url, {
    timeout: 45_000,
    waitUntil: "domcontentloaded",
  });

  expect(response, `No navigation response for ${url}`).not.toBeNull();
  expect(response?.status(), `Unexpected response status for ${url}`).toBeLessThan(400);
  await expect(page.locator("body")).toContainText(expectedText);
}

test.describe("LiveLabs public HTTP health", { tag: PLATFORM_HTTP_HEALTH_TAGS }, () => {
  test("home page responds with public LiveLabs content", async ({ environmentConfig, page }) => {
    await expectPublicPageResponse(page, `${environmentConfig.base_url}/home`, "LiveLabs");
  });

  test("catalog search URL responds for a known broad search term", async ({ environmentConfig, page }) => {
    await expectPublicPageResponse(
      page,
      `${environmentConfig.base_url}/livelabs-workshop-cards?clear=100&search=Database`,
      /Workshops|Sprints/i,
    );
  });
});
