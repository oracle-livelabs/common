import { expect, type Locator, type Page } from "@playwright/test";

import { BasePage } from "../basePage.js";

export class WorkshopLaunchOptionsDialog extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get dialog(): Locator {
    return this.page.getByRole("dialog").first();
  }

  get runOnYourEnvironmentButton(): Locator {
    return this.page.getByRole("button", { name: "Run on your environment" });
  }

  get runOnLiveLabsSandboxButton(): Locator {
    return this.page.getByRole("button", { name: "Run on LiveLabs Sandbox" });
  }

  get previewSandboxInstructionsButton(): Locator {
    return this.page.getByRole("button", { name: "Preview sandbox instructions" });
  }

  get launchActionButtons(): Locator {
    return this.page
      .getByRole("button")
      .filter({ hasText: /Run on your environment|Run on LiveLabs Sandbox|Preview sandbox instructions/i });
  }

  async assertOpened(): Promise<void> {
    await this.assertVisible(this.dialog);
  }

  async assertHasLaunchAction(): Promise<void> {
    await this.assertOpened();
    await this.waitForVisible(this.launchActionButtons.first());
    expect(await this.launchActionButtons.count()).toBeGreaterThan(0);
  }
}
