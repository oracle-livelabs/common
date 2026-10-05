import { expect, test } from "../../support/test.js";
import {
  assertPageIsNotAuthenticationFallback,
  bootstrapPrivatePageAccess,
  hasConfiguredPrivatePageAccess,
  resolvePrivatePageUrl,
} from "../../support/authRuntime.js";

const PRIVATE_PAGE_TAGS = ["@auth", "@platform", "@private-page", "@smoke"];

test.describe("LiveLabs private page smoke", { tag: PRIVATE_PAGE_TAGS }, () => {
  test("loads the configured private page through an approved session handoff", async ({
    authRuntime,
    environmentConfig,
    page,
  }) => {
    const targetUrl = resolvePrivatePageUrl(authRuntime, environmentConfig.base_url);

    if (!targetUrl) {
      test.skip(true, "requires QA_AUTH_TARGET_URL pointing to the private page under test");
      return;
    }

    if (!hasConfiguredPrivatePageAccess(authRuntime)) {
      test.skip(true, "requires QA_STORAGE_STATE or QA_AUTH_BOOTSTRAP_URL plus QA_AUTH_BOOTSTRAP_TOKEN");
      return;
    }

    await test.step("Apply optional private access bootstrap", async () => {
      await bootstrapPrivatePageAccess(page, authRuntime);
    });

    await test.step("Open the configured private page", async () => {
      const response = await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 0).toBeLessThan(500);
    });

    await test.step("Verify the page is past the authentication boundary", async () => {
      if (authRuntime.privatePageReadyText) {
        await expect(page.getByText(authRuntime.privatePageReadyText, { exact: false }).first()).toBeVisible();
      }

      await assertPageIsNotAuthenticationFallback(page);
    });
  });
});
