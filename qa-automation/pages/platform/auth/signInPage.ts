import type { Locator, Page } from "@playwright/test";

import { BasePage } from "../../basePage.js";

export class SignInPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get usernameInput(): Locator {
    return this.page.getByRole("textbox").first();
  }

  get submitButton(): Locator {
    return this.page.getByRole("button").first();
  }

  async assertLoaded(): Promise<void> {
    await this.waitForEditable(this.usernameInput);
    await this.assertVisible(this.submitButton);
  }
}
