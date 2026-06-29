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
    return this.page.getByRole("button", { name: /Run on your (?:environment|tenancy)/i }).first();
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
      .filter({ hasText: /Run on your (?:environment|tenancy)|Run on LiveLabs Sandbox|Preview sandbox instructions/i });
  }

  async assertOpened(): Promise<void> {
    await this.assertVisible(this.dialog);
  }

  async assertHasLaunchAction(): Promise<void> {
    await this.assertOpened();
    await this.waitForVisible(this.launchActionButtons.first());
    expect(await this.launchActionButtons.count()).toBeGreaterThan(0);
  }

  async hasPreviewInstructions(): Promise<boolean> {
    return this.previewSandboxInstructionsButton
      .isVisible({
        timeout: BasePage.OPTIONAL_LOAD_TIMEOUT_MS,
      })
      .catch(() => false);
  }

  async hasRunOnYourEnvironmentInstructions(): Promise<boolean> {
    return this.runOnYourEnvironmentButton
      .isVisible({
        timeout: BasePage.OPTIONAL_LOAD_TIMEOUT_MS,
      })
      .catch(() => false);
  }

  async openPreviewInstructions(): Promise<Page> {
    await this.assertOpened();
    return this.openInstructionsFromButton(this.previewSandboxInstructionsButton);
  }

  async openRunOnYourEnvironmentInstructions(): Promise<Page> {
    await this.assertOpened();
    return this.openInstructionsFromButton(this.runOnYourEnvironmentButton);
  }

  private async openInstructionsFromButton(button: Locator): Promise<Page> {
    await this.waitForVisible(button);
    await expect(button).toBeEnabled();

    const currentUrl = this.page.url();
    const popupPromise = this.page
      .waitForEvent("popup", { timeout: BasePage.OPTIONAL_LOAD_TIMEOUT_MS })
      .catch(() => undefined);

    await button.click();

    const popup = await popupPromise;
    const targetPage = popup ?? this.page;

    if (popup) {
      await popup.waitForLoadState("domcontentloaded");
    } else {
      try {
        await this.page.waitForURL((url) => url.toString() !== currentUrl, {
          timeout: BasePage.OPTIONAL_LOAD_TIMEOUT_MS,
          waitUntil: "domcontentloaded",
        });
      } catch {
        // Some APEX actions render the preview in-place without changing the
        // URL. The content readiness check below owns the real assertion.
      }
    }

    await targetPage.locator("body").waitFor({
      state: "visible",
      timeout: BasePage.PAGE_READY_TIMEOUT_MS,
    });

    return targetPage;
  }
}
