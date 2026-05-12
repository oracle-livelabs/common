import { expect, type Locator, type Page } from "@playwright/test";

import { BasePage } from "../basePage.js";

// WorkshopCardsPage represents the search and browse results screen that sits
// between homepage intent and an individual workshop landing page.
export class WorkshopCardsPage extends BasePage {
  static readonly PATH = "/livelabs-workshop-cards";
  static readonly SEARCH_PLACEHOLDER = "Search for workshops and sprints...";
  static readonly NO_RESULTS_TEXT = "No Workshops or Sprints were found matching your criteria";

  constructor(page: Page) {
    super(page);
  }

  get heading(): Locator {
    return this.page.getByRole("heading", { name: "Workshops and Sprints" });
  }

  get clearSearchButton(): Locator {
    return this.page.getByRole("button", { name: "Clear Search" });
  }

  get copySearchLinkButton(): Locator {
    return this.page.getByRole("button", { name: "Copy Search Link" });
  }

  get searchInput(): Locator {
    return this.inputByPlaceholder(WorkshopCardsPage.SEARCH_PLACEHOLDER);
  }

  get productFilter(): Locator {
    return this.inputByPlaceholder("Filter Product");
  }

  get focusAreaFilter(): Locator {
    return this.inputByPlaceholder("Filter Focus Area");
  }

  get workshopLinks(): Locator {
    return this.page.locator('a[href*="view-workshop"]:visible');
  }

  get noResultsMessage(): Locator {
    return this.page.getByText(WorkshopCardsPage.NO_RESULTS_TEXT, { exact: true });
  }

  async goto(baseUrl: string, searchTerm: string): Promise<void> {
    const query = encodeURIComponent(searchTerm).replace(/%20/g, "+");
    await this.gotoUrl(`${baseUrl}${WorkshopCardsPage.PATH}?clear=100&search=${query}`, WorkshopCardsPage.PATH);
    await this.dismissCookieBannerIfPresent();
  }

  private async assertResultsShellLoaded(): Promise<void> {
    await this.waitForPath(WorkshopCardsPage.PATH);
    await this.assertPageTitleMatches(/Workshops & Sprints/);
    await this.assertVisible(this.heading);
    await this.assertVisible(this.clearSearchButton);
    await this.assertVisible(this.copySearchLinkButton);
    await this.waitForEditable(this.searchInput);
    await this.waitForEditable(this.productFilter);
    await this.waitForEditable(this.focusAreaFilter);

    const parsedUrl = new URL(this.page.url());
    expect(parsedUrl.pathname.endsWith(WorkshopCardsPage.PATH), `Unexpected results path: ${parsedUrl.pathname}`).toBe(
      true,
    );
  }

  async assertSearchContext(expectedSearchTerm: string): Promise<void> {
    await this.assertResultsShellLoaded();
    await expect(this.searchInput).toHaveValue(expectedSearchTerm);

    const parsedUrl = new URL(this.page.url());
    const actualSearch = parsedUrl.searchParams.get("search") ?? "";

    expect(
      actualSearch.toLowerCase(),
      `Expected search term "${expectedSearchTerm}" but saw "${actualSearch}" in URL.`,
    ).toBe(expectedSearchTerm.toLowerCase());
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
    await this.waitForVisible(this.workshopLinks.first());
    expect(await this.workshopLinks.count()).toBeGreaterThan(0);
  }

  async assertNoResults(expectedSearchTerm: string): Promise<void> {
    await this.assertSearchContext(expectedSearchTerm);
    await this.assertVisible(this.noResultsMessage);
    await expect(this.workshopLinks).toHaveCount(0);
  }

  async firstWorkshopTitle(): Promise<string> {
    await this.assertHasResults();
    return (await this.workshopLinks.first().innerText()).trim();
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
}
