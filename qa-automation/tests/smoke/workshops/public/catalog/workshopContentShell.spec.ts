import { getWorkshopLandingSearchTerms } from "../../../../support/platformSmokeData.js";
import { resolveSearchTerm } from "../../../../support/searchHelpers.js";
import { test } from "../../../../support/test.js";

const WORKSHOP_CONTENT_SHELL_TAGS = ["@smoke", "@platform", "@workshop", "@content", "@ui"];

test.describe("LiveLabs workshop content shell", { tag: WORKSHOP_CONTENT_SHELL_TAGS }, () => {
  test("opens a workshop landing page directly from catalog results", async ({
    environmentConfig,
    livelabsSearchTerm,
    workshopCardsPage,
    workshopLandingPage,
  }, testInfo) => {
    const [searchTerm] = getWorkshopLandingSearchTerms();
    const resolvedSearchTerm = resolveSearchTerm(searchTerm, livelabsSearchTerm);

    testInfo.annotations.push({
      type: "search-term",
      description: resolvedSearchTerm,
    });

    await workshopCardsPage.goto(environmentConfig.base_url, resolvedSearchTerm);
    await workshopCardsPage.assertLoaded(resolvedSearchTerm);

    const selectedWorkshopTitle = await workshopCardsPage.openFirstWorkshop();
    await workshopLandingPage.assertLoaded(selectedWorkshopTitle);
  });
});
