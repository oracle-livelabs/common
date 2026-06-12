import { expect, type Locator, type Page } from "@playwright/test";

import { BasePage } from "../basePage.js";

// WorkshopInstructionsPage models the rendered preview instructions opened
// from the launch dialog. It intentionally avoids a fixed path because the
// preview can be served by different workshop backends.
export class WorkshopInstructionsPage extends BasePage {
  static readonly INSTRUCTIONS_READY_TIMEOUT_MS = Math.max(90_000, BasePage.PAGE_READY_TIMEOUT_MS);

  constructor(page: Page) {
    super(page);
  }

  get body(): Locator {
    return this.page.locator("body");
  }

  async assertLoaded(expectedTerms: string[] = []): Promise<void> {
    await this.waitForPageReady(WorkshopInstructionsPage.INSTRUCTIONS_READY_TIMEOUT_MS);
    await this.dismissCookieBannerIfPresent();

    await expect(this.body).toContainText(/workshop|lab|instructions|introduction|task|overview/i, {
      timeout: WorkshopInstructionsPage.INSTRUCTIONS_READY_TIMEOUT_MS,
    });
    await expect(this.body).toContainText(/Get started|Introduction|Objectives|Task\s+1/i, {
      timeout: WorkshopInstructionsPage.INSTRUCTIONS_READY_TIMEOUT_MS,
    });

    for (const term of expectedTerms) {
      await expect(this.body).toContainText(new RegExp(escapeRegex(term), "i"), {
        timeout: WorkshopInstructionsPage.INSTRUCTIONS_READY_TIMEOUT_MS,
      });
    }
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
