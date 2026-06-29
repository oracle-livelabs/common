import { assertContentQuality } from "../../../../support/contentQuality.js";
import { signInIfRequired } from "../../../../support/authenticatedNavigation.js";
import { openCatalogSearch } from "../../../../support/overviewFlows.js";
import { getWorkshopOverviewTargets } from "../../../../support/overviewTargets.js";
import { test } from "../../../../support/test.js";

const WORKSHOP_OVERVIEW_TAGS = ["@regression", "@platform", "@overview", "@workshop", "@content", "@ui"];

test.describe("LiveLabs workshop overview pages", { tag: WORKSHOP_OVERVIEW_TAGS }, () => {
  test.describe.configure({ timeout: 360_000 });

  for (const target of getWorkshopOverviewTargets()) {
    test(`validates workshop overview content for ${target.name}`, async ({
      authRuntime,
      page,
      workshopCardsPage,
      workshopLandingPage,
      environmentConfig,
      targetEnvironment,
    }, testInfo) => {
      testInfo.annotations.push({
        type: "environment",
        description: `${targetEnvironment} -> ${environmentConfig.base_url}`,
      });
      testInfo.annotations.push({
        type: "search-term",
        description: target.search_term,
      });

      await openCatalogSearch(workshopCardsPage, environmentConfig.base_url, target.search_term);

      const card = await workshopCardsPage.openResultCardByTitle("workshop", target.title_pattern);
      testInfo.annotations.push({
        type: "workshop-card",
        description: `${card.title} -> ${card.href}`,
      });

      await signInIfRequired(page, authRuntime, `Workshop overview: ${card.title}`);
      await workshopLandingPage.assertLoaded(card.title);
      await assertContentQuality(page, {
        contextName: `Workshop overview: ${card.title}`,
        expectedTerms: target.expected_terms,
      });
    });
  }
});
