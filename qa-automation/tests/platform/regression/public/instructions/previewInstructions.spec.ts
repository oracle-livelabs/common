import { WorkshopInstructionsPage } from "../../../../../pages/platform/workshopInstructionsPage.js";
import { signInIfRequired } from "../../../../support/authenticatedNavigation.js";
import { openCatalogSearch } from "../../../../support/overviewFlows.js";
import { getPreviewInstructionTargets } from "../../../../support/overviewTargets.js";
import { test } from "../../../../support/test.js";

const PREVIEW_INSTRUCTIONS_TAGS = ["@regression", "@platform", "@instructions", "@workshop", "@content", "@ui"];

test.describe("LiveLabs preview instructions", { tag: PREVIEW_INSTRUCTIONS_TAGS }, () => {
  test.describe.configure({ timeout: 360_000 });

  for (const target of getPreviewInstructionTargets()) {
    test(`validates preview instructions for ${target.name}`, async ({
      authRuntime,
      page,
      workshopCardsPage,
      workshopLandingPage,
      workshopLaunchOptionsDialog,
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
        type: "preview-card",
        description: `${card.title} -> ${card.href}`,
      });

      await signInIfRequired(page, authRuntime, `Preview source workshop: ${card.title}`);
      await workshopLandingPage.assertLoaded(card.title);
      await workshopLandingPage.openLaunchOptions();

      const previewPage = await workshopLaunchOptionsDialog.openPreviewInstructions();
      await signInIfRequired(previewPage, authRuntime, `Preview instructions: ${card.title}`);

      const instructionsPage = new WorkshopInstructionsPage(previewPage);
      await instructionsPage.assertLoaded(target.expected_terms);
      await instructionsPage.assertContentQuality({
        contextName: `Preview instructions: ${card.title}`,
        expectedTerms: target.expected_terms,
      });

      if (previewPage !== page) {
        await previewPage.close();
      }
    });
  }
});
