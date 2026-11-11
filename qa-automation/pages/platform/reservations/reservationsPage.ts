import { expect, type Locator, type Page } from "@playwright/test";

import { BasePage } from "../../basePage.js";

export class ReservationsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get reservationsTable(): Locator {
    return this.page.getByRole("table").first();
  }

  async goto(targetUrl: string): Promise<void> {
    const expectedPath = new URL(targetUrl).pathname;
    await this.gotoUrl(targetUrl, expectedPath);
    await this.dismissCookieBannerIfPresent();
  }

  async assertLoaded(): Promise<void> {
    await this.waitForPageReady();
    await expect(this.page.locator("body")).toContainText(/reservation/i);
  }
}
