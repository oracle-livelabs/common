import { expect, type Locator, type Page } from "@playwright/test";

import { BasePage } from "../basePage.js";

export type CatalogResultKind = "workshop" | "livestack";

export interface CatalogResultCard {
  title: string;
  href: string;
}

// WorkshopCardsPage represents the search and browse results screen that sits
// between homepage intent and an individual workshop landing page.
export class WorkshopCardsPage extends BasePage {
  static readonly PATH = "/livelabs-workshop-cards";
  static readonly HOME_PATH = "/home";
  static readonly SEARCH_PLACEHOLDER = "Ask a question or search for a workshop with natural language...";
  static readonly LEGACY_SEARCH_PLACEHOLDER = "Search for workshops and sprints...";
  static readonly NO_RESULTS_TEXT = "No Workshops or Sprints were found matching your criteria";
  static readonly FACET_NAMES = ["Level", "Type", "Product", "Workshop Series", "Focus Area", "Role"] as const;
  static readonly CATALOG_NAVIGATION_TIMEOUT_MS = Math.max(45_000, BasePage.NAVIGATION_TIMEOUT_MS);

  constructor(page: Page) {
    super(page);
  }

  get heading(): Locator {
    return this.page.getByRole("heading", { name: /Workshops(?:, Sprints, and LiveStacks| and Sprints)/i });
  }

  get clearSearchButton(): Locator {
    return this.page.getByRole("button", { name: "Clear Search" });
  }

  get copySearchLinkButton(): Locator {
    return this.page.getByRole("button", { name: "Copy Search Link" });
  }

  get searchInput(): Locator {
    return this.page
      .locator(
        [
          `input[placeholder="${WorkshopCardsPage.SEARCH_PLACEHOLDER}"]:visible`,
          `input[placeholder="${WorkshopCardsPage.LEGACY_SEARCH_PLACEHOLDER}"]:visible`,
          `input[aria-label="${WorkshopCardsPage.SEARCH_PLACEHOLDER}"]:visible`,
          `input[aria-label="${WorkshopCardsPage.LEGACY_SEARCH_PLACEHOLDER}"]:visible`,
          'input[placeholder*="search" i]:visible',
          'input[aria-label*="search" i]:visible',
        ].join(", "),
      )
      .first();
  }

  get productFilter(): Locator {
    return this.inputByPlaceholder("Filter Product");
  }

  get focusAreaFilter(): Locator {
    return this.inputByPlaceholder("Filter Focus Area");
  }

  get resultCardLinks(): Locator {
    return this.page.locator(
      [
        'a.a-CardView-fullLink[href*="view-workshop"]:visible',
        'a.a-CardView-fullLink[href*="livestack-landing-page"]:visible',
      ].join(", "),
    );
  }

  get workshopLinks(): Locator {
    return this.page.locator('a.a-CardView-fullLink[href*="view-workshop"]:visible');
  }

  get liveStackLinks(): Locator {
    return this.page.locator('a.a-CardView-fullLink[href*="livestack-landing-page"]:visible');
  }

  get previousPageButton(): Locator {
    return this.page.getByRole("button", { name: "Previous" }).first();
  }

  get nextPageButton(): Locator {
    return this.page.getByRole("button", { name: "Next" }).first();
  }

  get noResultsMessage(): Locator {
    return this.page.getByText(WorkshopCardsPage.NO_RESULTS_TEXT, { exact: true });
  }

  get viewAllWorkshopsOption(): Locator {
    return this.page
      .locator(
        [
          '[data-otel-label="view-all-workshops"]:visible',
          'button:has-text("View All Workshops"):visible',
          'button:has-text("View all Workshops"):visible',
          'a:has-text("View All Workshops"):visible',
          'a:has-text("View all Workshops"):visible',
          '[role="button"]:has-text("View All Workshops"):visible',
          '[role="button"]:has-text("View all Workshops"):visible',
        ].join(", "),
      )
      .first();
  }

  async gotoBrowse(baseUrl: string): Promise<void> {
    await this.gotoUrl(
      `${baseUrl}${WorkshopCardsPage.PATH}?clear=100`,
      WorkshopCardsPage.PATH,
      WorkshopCardsPage.CATALOG_NAVIGATION_TIMEOUT_MS,
    );
    await this.dismissCookieBannerIfPresent();
  }

  async goto(baseUrl: string, searchTerm: string): Promise<void> {
    const query = encodeURIComponent(searchTerm).replace(/%20/g, "+");
    await this.gotoUrl(
      `${baseUrl}${WorkshopCardsPage.PATH}?clear=100&search=${query}`,
      WorkshopCardsPage.PATH,
      WorkshopCardsPage.CATALOG_NAVIGATION_TIMEOUT_MS,
    );
    await this.dismissCookieBannerIfPresent();
  }

  async openBrowseFromHome(baseUrl: string): Promise<void> {
    await this.gotoUrl(
      `${baseUrl}${WorkshopCardsPage.HOME_PATH}`,
      WorkshopCardsPage.HOME_PATH,
      WorkshopCardsPage.CATALOG_NAVIGATION_TIMEOUT_MS,
    );
    await this.dismissCookieBannerIfPresent();
    await this.clickWhenReady(this.viewAllWorkshopsOption);
    await this.waitForPath(WorkshopCardsPage.PATH, WorkshopCardsPage.CATALOG_NAVIGATION_TIMEOUT_MS);
    await this.dismissCookieBannerIfPresent();
  }

  async searchWithinCatalog(searchTerm: string): Promise<void> {
    await this.fillWhenReady(this.searchInput, searchTerm);
    await this.pressWhenReady(this.searchInput, "Enter");
    await this.waitForPath(WorkshopCardsPage.PATH, WorkshopCardsPage.CATALOG_NAVIGATION_TIMEOUT_MS);
    await this.waitForPageReady();
  }

  private async assertResultsShellLoaded(): Promise<void> {
    await this.waitForPath(WorkshopCardsPage.PATH);
    await this.assertPageTitleMatches(/Workshops & Sprints/);
    await this.assertVisible(this.heading);
    await this.assertVisible(this.clearSearchButton);
    await this.assertVisible(this.copySearchLinkButton);
    await this.waitForEditable(this.searchInput);
    await this.assertFacetSectionsPresent();

    const parsedUrl = new URL(this.page.url());
    expect(parsedUrl.pathname.endsWith(WorkshopCardsPage.PATH), `Unexpected results path: ${parsedUrl.pathname}`).toBe(
      true,
    );
  }

  async assertSearchContext(expectedSearchTerm: string): Promise<void> {
    await this.assertResultsShellLoaded();
    const expectedInputValue = expectedSearchTerm.trim() ? expectedSearchTerm : "";
    await expect(this.searchInput).toHaveValue(expectedInputValue);

    const parsedUrl = new URL(this.page.url());
    const actualSearch = parsedUrl.searchParams.get("search") ?? "";

    expect(
      actualSearch.trim().toLowerCase(),
      `Expected search term "${expectedSearchTerm}" but saw "${actualSearch}" in URL.`,
    ).toBe(expectedSearchTerm.trim().toLowerCase());
  }

  async assertLoaded(expectedSearchTerm: string): Promise<void> {
    await this.assertSearchContext(expectedSearchTerm);
    await this.assertHasResults();
  }

  async assertLoadedFromBrowse(): Promise<void> {
    await this.assertResultsShellLoaded();
    await this.assertHasResults();
  }

  async assertHasResults(): Promise<void> {
    await this.waitForVisible(this.resultCardLinks.first());
    expect(await this.resultCardLinks.count()).toBeGreaterThan(0);
  }

  async assertHasWorkshopResults(): Promise<void> {
    await this.waitForVisible(this.workshopLinks.first());
    expect(await this.workshopLinks.count()).toBeGreaterThan(0);
  }

  async assertHasLiveStackResults(): Promise<void> {
    await this.waitForVisible(this.liveStackLinks.first());
    expect(await this.liveStackLinks.count()).toBeGreaterThan(0);
  }

  async assertNoResults(expectedSearchTerm: string): Promise<void> {
    await this.assertSearchContext(expectedSearchTerm);
    await this.assertVisible(this.noResultsMessage);
  }

  async firstWorkshopTitle(): Promise<string> {
    await this.assertHasWorkshopResults();
    return (await this.workshopLinks.first().innerText()).trim();
  }

  async resultCardRecords(kind: CatalogResultKind, maxCards?: number): Promise<CatalogResultCard[]> {
    const links = kind === "livestack" ? this.liveStackLinks : this.workshopLinks;
    await this.waitForVisible(links.first());

    const cards = await links.evaluateAll((anchors) => {
      const seen = new Set<string>();
      const records: CatalogResultCard[] = [];

      for (const anchor of anchors) {
        const title = (anchor.textContent ?? "").replace(/\s+/g, " ").trim();
        const href = anchor.getAttribute("href") ?? "";
        const key = `${title}|${href}`;

        if (!title || !href || seen.has(key)) {
          continue;
        }

        seen.add(key);
        records.push({ title, href });
      }

      return records;
    });

    return typeof maxCards === "number" && maxCards > 0 ? cards.slice(0, maxCards) : cards;
  }

  async findResultCardByTitle(kind: CatalogResultKind, titlePattern: string): Promise<CatalogResultCard> {
    const cards = await this.resultCardRecords(kind);
    const expression = new RegExp(titlePattern, "i");
    const matchingCard = cards.find((card) => expression.test(card.title));

    if (!matchingCard) {
      throw new Error(
        `No ${kind} result card matched "${titlePattern}". Available cards: ${cards
          .map((card) => `"${card.title}"`)
          .join(", ")}`,
      );
    }

    return matchingCard;
  }

  async openResultCardByTitle(kind: CatalogResultKind, titlePattern: string): Promise<CatalogResultCard> {
    const card = await this.findResultCardByTitle(kind, titlePattern);
    const links = kind === "livestack" ? this.liveStackLinks : this.workshopLinks;
    const cardLink = links.filter({ hasText: new RegExp(titlePattern, "i") }).first();

    await this.clickWhenReady(cardLink, WorkshopCardsPage.CATALOG_NAVIGATION_TIMEOUT_MS);
    return card;
  }

  async openFirstWorkshop(): Promise<string> {
    // Returning the title gives the landing-page assertion an easy way to
    // confirm the click opened the same workshop the card advertised.
    const workshopTitle = await this.firstWorkshopTitle();
    await this.clickWhenReady(this.workshopLinks.first());
    return workshopTitle;
  }

  async clearSearch(): Promise<void> {
    await this.clickWhenReady(this.clearSearchButton);
    await this.waitForPageReady();
    await expect(this.searchInput).toHaveValue("");
  }

  async filterByProduct(productName: string): Promise<void> {
    await this.fillWhenReady(this.productFilter, productName);
    await this.waitForPageReady();
    await expect(this.productFilter).toHaveValue(productName);
  }

  async filterByFocusArea(focusAreaName: string): Promise<void> {
    await this.fillWhenReady(this.focusAreaFilter, focusAreaName);
    await this.waitForPageReady();
    await expect(this.focusAreaFilter).toHaveValue(focusAreaName);
  }

  facetRegion(facetName: string): Locator {
    const escapedFacetName = escapeRegex(facetName);

    return this.page
      .locator(".a-FS-control", {
        has: this.page.locator(".a-FS-label", {
          hasText: new RegExp(`^\\s*${escapedFacetName}\\s*$`, "i"),
        }),
      })
      .first();
  }

  facetOption(facetName: string, optionName: string): Locator {
    const escapedOptionName = escapeRegex(optionName);

    return this.facetRegion(facetName)
      .getByRole("option", {
        name: new RegExp(`^\\s*${escapedOptionName}\\b`, "i"),
      })
      .first();
  }

  facetFilterInput(facetName: string): Locator {
    return this.facetRegion(facetName).locator(`input[placeholder="Filter ${facetName}"]:visible`).first();
  }

  async assertFacetSectionsPresent(): Promise<void> {
    for (const facetName of WorkshopCardsPage.FACET_NAMES) {
      await this.assertVisible(this.facetRegion(facetName));
    }
  }

  async selectFacetOption(facetName: string, optionName: string): Promise<void> {
    const filterInput = this.facetFilterInput(facetName);
    const option = this.facetOption(facetName, optionName);

    try {
      await this.fillWhenReady(filterInput, optionName, BasePage.OPTIONAL_LOAD_TIMEOUT_MS);
    } catch {
      // Some facets are short fixed lists and do not expose a filter input.
    }

    await this.clickWhenReady(option);
    await expect(option).toHaveAttribute("aria-selected", "true");
    await this.waitForCatalogRefresh();
  }

  async assertFacetOptionSelected(facetName: string, optionName: string): Promise<void> {
    await expect(this.facetOption(facetName, optionName)).toHaveAttribute("aria-selected", "true");
  }

  async clearFacet(facetName: string): Promise<void> {
    const region = this.facetRegion(facetName);
    const clearButton = region.locator(".a-FS-clearButton").first();

    await this.clickWhenReady(clearButton);
    await this.waitForCatalogRefresh();
  }

  async assertCopySearchLinkPreservesPage(): Promise<void> {
    const currentUrl = this.page.url();

    await this.clickWhenReady(this.copySearchLinkButton);
    await this.waitForPageReady();
    expect(this.page.url()).toBe(currentUrl);
  }

  async assertOverflowToggleWorks(facetName: string): Promise<void> {
    const region = this.facetRegion(facetName);
    const showAllButton = region.getByRole("button", { name: new RegExp(`Show All: ${escapeRegex(facetName)}`, "i") });
    const showLessButton = region.getByRole("button", { name: new RegExp(`Show Less: ${escapeRegex(facetName)}`, "i") });
    const beforeCount = await this.visibleFacetOptionCount(facetName);

    await this.clickWhenReady(showAllButton);
    const expandedCount = await this.visibleFacetOptionCount(facetName);
    expect(expandedCount, `${facetName} should expose at least as many values after Show All`).toBeGreaterThanOrEqual(
      beforeCount,
    );

    await this.clickWhenReady(showLessButton);
    const collapsedCount = await this.visibleFacetOptionCount(facetName);
    expect(collapsedCount, `${facetName} should collapse after Show Less`).toBeLessThanOrEqual(expandedCount);
  }

  private async visibleFacetOptionCount(facetName: string): Promise<number> {
    return this.facetRegion(facetName)
      .locator(".apex-item-option")
      .evaluateAll((options) =>
        options.filter((option) => {
          const style = window.getComputedStyle(option);
          const box = option.getBoundingClientRect();

          return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
        }).length,
      );
  }

  private async waitForCatalogRefresh(): Promise<void> {
    await this.waitForPageReady();

    try {
      await this.page.waitForLoadState("networkidle", {
        timeout: BasePage.OPTIONAL_LOAD_TIMEOUT_MS,
      });
    } catch {
      return;
    }
  }

}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
