import type { Locator, Page } from "@playwright/test";

import { BasePage } from "../../basePage.js";

export class FooterRegion extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get footer(): Locator {
    return this.page.getByRole("contentinfo");
  }

  get footerLinks(): Locator {
    return this.footer.getByRole("link");
  }

  async assertLoaded(): Promise<void> {
    await this.assertVisible(this.footer);
  }
}
