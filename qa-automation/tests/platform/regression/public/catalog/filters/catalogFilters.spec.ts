import {
  getCatalogCombinedFilterTargets,
  getCatalogFacetSections,
  getCatalogOverflowFacets,
  getCatalogSingleFacetTargets,
  type CatalogResultKind,
} from "../../../../../support/catalogFilterTargets.js";
import { test } from "../../../../../support/test.js";

const CATALOG_FILTER_TAGS = ["@regression", "@platform", "@catalog", "@filters", "@ui"];
const BUTTON_SEARCH_TERM = "Database";

test.describe("LiveLabs catalog filters", { tag: CATALOG_FILTER_TAGS }, () => {
  test.describe.configure({ timeout: 180_000 });

  test("shows the current filter sections and primary catalog buttons", async ({
    workshopCardsPage,
    environmentConfig,
    targetEnvironment,
  }, testInfo) => {
    testInfo.annotations.push({
      type: "environment",
      description: `${targetEnvironment} -> ${environmentConfig.base_url}`,
    });

    await test.step("Open the catalog browse page", async () => {
      await workshopCardsPage.openBrowseFromHome(environmentConfig.base_url);
      await workshopCardsPage.assertLoadedFromBrowse();
    });

    await test.step("Verify every configured facet section is available", async () => {
      for (const facetName of getCatalogFacetSections()) {
        await workshopCardsPage.assertVisible(workshopCardsPage.facetRegion(facetName));
      }
    });

    await test.step("Verify primary catalog buttons are ready", async () => {
      await workshopCardsPage.assertVisible(workshopCardsPage.clearSearchButton);
      await workshopCardsPage.assertVisible(workshopCardsPage.copySearchLinkButton);
    });
  });

  for (const target of getCatalogSingleFacetTargets()) {
    test(`filters catalog by ${target.facet}: ${target.option}`, async ({
      workshopCardsPage,
      environmentConfig,
      targetEnvironment,
    }, testInfo) => {
      testInfo.annotations.push({
        type: "environment",
        description: `${targetEnvironment} -> ${environmentConfig.base_url}`,
      });
      testInfo.annotations.push({
        type: "catalog-filter",
        description: `${target.facet}: ${target.option}`,
      });

      await test.step("Open the catalog browse page", async () => {
        await workshopCardsPage.openBrowseFromHome(environmentConfig.base_url);
        await workshopCardsPage.assertLoadedFromBrowse();
      });

      await test.step(`Select ${target.facet}: ${target.option}`, async () => {
        await workshopCardsPage.selectFacetOption(target.facet, target.option);
        await workshopCardsPage.assertFacetOptionSelected(target.facet, target.option);
      });

      await test.step("Verify filtered results remain usable", async () => {
        await assertExpectedResultKind(workshopCardsPage, target.expected_result_kind);
      });
    });
  }

  for (const target of getCatalogCombinedFilterTargets()) {
    test(`supports combined filters for ${target.name}`, async ({
      workshopCardsPage,
      environmentConfig,
      targetEnvironment,
    }, testInfo) => {
      testInfo.annotations.push({
        type: "environment",
        description: `${targetEnvironment} -> ${environmentConfig.base_url}`,
      });
      testInfo.annotations.push({
        type: "catalog-filter",
        description: target.filters.map((filter) => `${filter.facet}: ${filter.option}`).join("; "),
      });

      await test.step("Open the catalog browse page", async () => {
        await workshopCardsPage.openBrowseFromHome(environmentConfig.base_url);
        await workshopCardsPage.assertLoadedFromBrowse();
      });

      for (const filter of target.filters) {
        await test.step(`Select ${filter.facet}: ${filter.option}`, async () => {
          await workshopCardsPage.selectFacetOption(filter.facet, filter.option);
          await workshopCardsPage.assertFacetOptionSelected(filter.facet, filter.option);
        });
      }

      await test.step("Verify the combined filter result set", async () => {
        await assertExpectedResultKind(workshopCardsPage, target.expected_result_kind);
      });
    });
  }

  test("keeps catalog action buttons and overflow controls usable", async ({
    workshopCardsPage,
    environmentConfig,
    targetEnvironment,
  }, testInfo) => {
    testInfo.annotations.push({
      type: "environment",
      description: `${targetEnvironment} -> ${environmentConfig.base_url}`,
    });
    testInfo.annotations.push({
      type: "search-term",
      description: BUTTON_SEARCH_TERM,
    });

    await test.step("Open catalog results with a search term", async () => {
      await workshopCardsPage.openBrowseFromHome(environmentConfig.base_url);
      await workshopCardsPage.searchWithinCatalog(BUTTON_SEARCH_TERM);
      await workshopCardsPage.assertLoaded(BUTTON_SEARCH_TERM);
    });

    await test.step("Copy the current search link without leaving the page", async () => {
      await workshopCardsPage.assertCopySearchLinkPreservesPage();
    });

    for (const facetName of getCatalogOverflowFacets()) {
      await test.step(`Expand and collapse ${facetName}`, async () => {
        await workshopCardsPage.assertOverflowToggleWorks(facetName);
      });
    }

    await test.step("Clear the search and return to browse results", async () => {
      await workshopCardsPage.clearSearch();
      await workshopCardsPage.assertLoadedFromBrowse();
    });
  });
});

async function assertExpectedResultKind(
  workshopCardsPage: {
    assertHasResults(): Promise<void>;
    assertHasWorkshopResults(): Promise<void>;
    assertHasLiveStackResults(): Promise<void>;
  },
  resultKind: CatalogResultKind,
): Promise<void> {
  if (resultKind === "workshop") {
    await workshopCardsPage.assertHasWorkshopResults();
    return;
  }

  if (resultKind === "livestack") {
    await workshopCardsPage.assertHasLiveStackResults();
    return;
  }

  await workshopCardsPage.assertHasResults();
}
