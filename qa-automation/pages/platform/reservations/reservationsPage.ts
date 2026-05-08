import type { Locator, Page } from "@playwright/test";

import { BasePage } from "../../basePage.js";

export class ReservationsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get reservationsTable(): Locator {
    return this.page.getByRole("table").first();
  }
}
