import { assertContentQuality } from "../../../../support/contentQuality.js";
import { signInIfRequired } from "../../../../support/authenticatedNavigation.js";
import { exactTitlePattern, openCatalogSearch } from "../../../../support/overviewFlows.js";
import { getLiveStackOverviewTargets } from "../../../../support/overviewTargets.js";
import { expect, test } from "../../../../support/test.js";

const LIVESTACK_OVERVIEW_TAGS = ["@regression", "@platform", "@overview", "@livestack", "@content", "@ui"];

test.describe("LiveLabs LiveStack overview pages", { tag: LIVESTACK_OVERVIEW_TAGS }, () => {
  test.describe.configure({ timeout: 360_000 });

  for (const target of getLiveStackOverviewTargets()) {
    test(`validates LiveStack overview links and content for ${target.name}`, async ({
      authRuntime,
      page,
      workshopCardsPage,
      liveStackLandingPage,
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

      const cards = await workshopCardsPage.resultCardRecords("livestack", target.max_cards);
      expect(cards.length, `${target.name} should expose enough LiveStack overview cards`).toBeGreaterThanOrEqual(
        target.minimum_cards,
      );

      for (const card of cards) {
        testInfo.annotations.push({
          type: "livestack-card",
          description: `${card.title} -> ${card.href}`,
        });

        await test.step(`Validate LiveStack overview: ${card.title}`, async () => {
          await openCatalogSearch(workshopCardsPage, environmentConfig.base_url, target.search_term);
          await workshopCardsPage.openResultCardByTitle("livestack", exactTitlePattern(card.title));
          await signInIfRequired(page, authRuntime, `LiveStack overview: ${card.title}`);
          await liveStackLandingPage.assertLoaded(card.title);
          await liveStackLandingPage.assertDemoWorkshopAndAssetsAvailable();
          await assertContentQuality(page, {
            contextName: `LiveStack overview: ${card.title}`,
            expectedTerms: target.expected_terms,
          });
        });
      }
    });
  }
});
