import type { Locator, Page } from "@playwright/test";

import { BasePage } from "../basePage.js";

// HomePage models the public LiveLabs entry page where anonymous users start
// most of the platform journeys covered by the current suite.
export class HomePage extends BasePage {
  static readonly PATH = "/home";
  static readonly RESULTS_PATH = "/livelabs-workshop-cards";
  static readonly SEARCH_PLACEHOLDER = "Ask a question or search for a workshop with natural language...";
  static readonly LEGACY_SEARCH_PLACEHOLDER = "Search for workshops and sprints...";
  static readonly SEARCH_TRIGGER_TIMEOUT_MS = Math.max(5_000, BasePage.COOKIE_TIMEOUT_MS);

  constructor(page: Page) {
    super(page);
  }

  get heroHeading(): Locator {
    return this.page.getByRole("heading", { name: /What solution are you looking for today\?|Get Hands[- ]On/i });
  }

  get searchInput(): Locator {
    return this.page
      .locator(
        [
          "#P1_SEARCH_BAR input.apex-item-text:visible",
          `input[placeholder="${HomePage.SEARCH_PLACEHOLDER}"]:visible`,
          `input[placeholder="${HomePage.LEGACY_SEARCH_PLACEHOLDER}"]:visible`,
          `input[aria-label="${HomePage.SEARCH_PLACEHOLDER}"]:visible`,
          `input[aria-label="${HomePage.LEGACY_SEARCH_PLACEHOLDER}"]:visible`,
          'input[placeholder*="search" i]:visible',
          'input[aria-label*="search" i]:visible',
        ].join(", "),
      )
      .first();
  }

  get signInLink(): Locator {
    return this.page.getByRole("link", { name: "Sign In" });
  }

  get searchWithAiOption(): Locator {
    return this.page
      .locator(
        [
          '[data-otel-label="search-with-ai"]:visible',
          'button:has-text("Search with AI"):visible',
          'a:has-text("Search with AI"):visible',
          '[role="button"]:has-text("Search with AI"):visible',
        ].join(", "),
      )
      .first();
  }

  get searchSubmitButton(): Locator {
    return this.page.locator("#P1_SEARCH_BAR button:visible").first();
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

  async goto(baseUrl: string): Promise<void> {
    await this.gotoUrl(`${baseUrl}${HomePage.PATH}`, HomePage.PATH);
    await this.dismissCookieBannerIfPresent();
  }

  async assertLoaded(): Promise<void> {
    await this.waitForPath(HomePage.PATH);
    await this.assertPageTitleMatches(/LiveLabs Home/);
    await this.assertAiSearchEntryPointLoaded();
    await this.assertVisible(this.signInLink);
    await this.assertVisible(this.viewAllWorkshopsOption);
  }

  async assertAiSearchEntryPointLoaded(): Promise<void> {
    await this.assertVisible(this.heroHeading);
    await this.waitForEditable(this.searchInput);
    await this.assertVisible(this.searchWithAiOption);
  }

  async searchFor(term: string): Promise<void> {
    // The home UI now exposes "Search with AI". We prefer that trigger and
    // fall back to Enter for compatibility while the rollout settles.
    await this.fillWhenReady(this.searchInput, term);
    await this.submitSearch();
    await this.waitForPath(HomePage.RESULTS_PATH, BasePage.NAVIGATION_TIMEOUT_MS);
  }

  async openAllWorkshops(): Promise<void> {
    await this.clickWhenReady(this.viewAllWorkshopsOption);
    await this.waitForPath(HomePage.RESULTS_PATH, BasePage.NAVIGATION_TIMEOUT_MS);
  }

  private async submitSearch(): Promise<void> {
    try {
      await this.waitForVisible(this.searchWithAiOption, HomePage.SEARCH_TRIGGER_TIMEOUT_MS);
      await this.clickWhenReady(this.searchWithAiOption);
      return;
    } catch {
      try {
        await this.clickWhenReady(this.searchSubmitButton, HomePage.SEARCH_TRIGGER_TIMEOUT_MS);
        return;
      } catch {
        await this.pressWhenReady(this.searchInput, "Enter");
      }
    }
  }
}
