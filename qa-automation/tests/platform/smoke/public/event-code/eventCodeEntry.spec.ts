import { test } from "../../../../support/test.js";

const EVENT_CODE_ENTRY_TAGS = ["@smoke", "@platform", "@event-code", "@navigation", "@ui"];

test.describe("LiveLabs event code entry point", { tag: EVENT_CODE_ENTRY_TAGS }, () => {
  test("exposes the anonymous Event Code dialog entry point", async ({
    environmentConfig,
    eventCodeRequestPage,
    headerRegion,
    homePage,
  }) => {
    await homePage.goto(environmentConfig.base_url);
    await homePage.assertLoaded();
    await headerRegion.assertEventCodeVisible();
    await eventCodeRequestPage.assertEntryPointHref(await headerRegion.eventCodeLink.getAttribute("href"));
  });
});
