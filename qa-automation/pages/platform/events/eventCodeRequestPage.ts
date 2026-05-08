import type { Locator, Page } from "@playwright/test";

import { BasePage } from "../../basePage.js";

export class EventCodeRequestPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get requestForm(): Locator {
    return this.page.locator("form").first();
  }
}
