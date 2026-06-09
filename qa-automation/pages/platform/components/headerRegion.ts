import type { Locator, Page } from "@playwright/test";

import { BasePage } from "../../basePage.js";

export class HeaderRegion extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get banner(): Locator {
    return this.page.getByRole("banner");
  }

  get primaryLinks(): Locator {
    return this.banner.getByRole("link");
  }

  get signInLink(): Locator {
    return this.page.getByRole("link", { name: "Sign In" });
  }

  get eventCodeLink(): Locator {
    return this.page.getByRole("link", { name: "Event Code" });
  }

  async assertLoaded(): Promise<void> {
    await this.assertVisible(this.banner);
  }

  async assertSignInVisible(): Promise<void> {
    await this.assertVisible(this.signInLink);
  }

  async assertEventCodeVisible(): Promise<void> {
    await this.assertVisible(this.eventCodeLink);
  }
}
