import type { Locator, Page } from "@playwright/test";

import { BasePage } from "../basePage.js";

// WorkshopLandingPage covers the final platform screen before a learner enters
// actual workshop content or launch options.
export class WorkshopLandingPage extends BasePage {
  static readonly PATH = "/view-workshop";
  static readonly OVERVIEW_NAVIGATION_TIMEOUT_MS = Math.max(45_000, BasePage.NAVIGATION_TIMEOUT_MS);

  constructor(page: Page) {
    super(page);
  }

  get shareButton(): Locator {
    return this.page.getByRole("button", { name: "Share" });
  }

  get startButton(): Locator {
    return this.page.getByRole("button", { name: "Start" });
  }

  get overviewHeading(): Locator {
    return this.page.locator("h1:visible, h2:visible").first();
  }

  async goto(baseUrl: string, href: string): Promise<void> {
    await this.gotoUrl(resolvePlatformHref(baseUrl, href), WorkshopLandingPage.PATH, WorkshopLandingPage.OVERVIEW_NAVIGATION_TIMEOUT_MS);
    await this.dismissCookieBannerIfPresent();
  }

  async assertLoaded(expectedTitle?: string): Promise<void> {
    await this.waitForPath(WorkshopLandingPage.PATH);
    await this.dismissCookieBannerIfPresent();
    await this.assertVisible(this.shareButton);
    await this.assertVisible(this.startButton);
    await this.assertBodyContainsText("About This Workshop");
    await this.assertBodyContainsText("Outline");
    await this.assertBodyContainsText("Prerequisites");

    if (expectedTitle) {
      const escapedTitle = expectedTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      await this.assertPageTitleMatches(new RegExp(escapedTitle));
    }
  }

  async openLaunchOptions(): Promise<void> {
    await this.clickWhenReady(this.startButton);
  }
}

function resolvePlatformHref(baseUrl: string, href: string): string {
  if (/^https?:\/\//i.test(href)) {
    return href;
  }

  return new URL(href, `${baseUrl}/`).toString();
}
