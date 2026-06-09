import type { Locator, Page } from "@playwright/test";

import { BasePage } from "../../basePage.js";

export class EventCodeRequestPage extends BasePage {
  static readonly PATH = "/enter-event-code";

  constructor(page: Page) {
    super(page);
  }

  get requestForm(): Locator {
    return this.page.locator("form").first();
  }

  get eventCodeInput(): Locator {
    return this.page
      .locator(
        [
          'input[name*="EVENT" i]:visible',
          'input[id*="EVENT" i]:visible',
          'input[placeholder*="event" i]:visible',
          'input[aria-label*="event" i]:visible',
          "input:visible",
        ].join(", "),
      )
      .first();
  }

  async assertEntryPointHref(href: string | null): Promise<void> {
    const decodedHref = href ? decodeURIComponent(href) : "";
    if (!decodedHref.includes(EventCodeRequestPage.PATH)) {
      throw new Error(`Expected Event Code entry point to reference ${EventCodeRequestPage.PATH}, saw: ${href ?? "<none>"}`);
    }
  }
}
