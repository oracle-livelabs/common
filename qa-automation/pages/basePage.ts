import { expect, type Locator, type Page } from "@playwright/test";

import { parseIntegerFlag, runnerDefaults } from "../config/projectConfig.js";

const defaults = runnerDefaults();

// BasePage collects the waiting and interaction rules we want every page object
// to share. Keeping that behavior here means individual pages can stay focused
// on the LiveLabs-specific selectors and assertions.
export class BasePage {
  static readonly DEFAULT_TIMEOUT_MS = parseIntegerFlag(process.env.QA_EXPECT_TIMEOUT_MS, defaults.expect_timeout_ms);
  static readonly PAGE_READY_TIMEOUT_MS = parseIntegerFlag(
    process.env.QA_PAGE_READY_TIMEOUT_MS,
    defaults.page_ready_timeout_ms,
  );
  static readonly NAVIGATION_TIMEOUT_MS = parseIntegerFlag(
    process.env.QA_NAVIGATION_TIMEOUT_MS,
    defaults.navigation_timeout_ms,
  );
  static readonly COOKIE_TIMEOUT_MS = parseIntegerFlag(process.env.QA_COOKIE_TIMEOUT_MS, defaults.cookie_timeout_ms);
  static readonly OPTIONAL_LOAD_TIMEOUT_MS = parseIntegerFlag(
    process.env.QA_OPTIONAL_LOAD_TIMEOUT_MS,
    defaults.optional_load_timeout_ms,
  );
  static readonly NAVIGATION_RETRIES = Math.max(
    0,
    parseIntegerFlag(process.env.QA_NAVIGATION_RETRIES, defaults.navigation_retries),
  );

  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async waitForPageReady(timeout = BasePage.PAGE_READY_TIMEOUT_MS): Promise<void> {
    // DOMContentLoaded is enough for most checks; the full `load` event is
    // attempted only as a best-effort extra signal because some pages keep
    // loading non-critical assets longer than the UI needs.
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.locator("body").waitFor({
      state: "visible",
      timeout,
    });

    try {
      await this.page.waitForLoadState("load", {
        timeout: BasePage.OPTIONAL_LOAD_TIMEOUT_MS,
      });
    } catch {
      return;
    }
  }

  async waitForPath(pathFragment: string, timeout = BasePage.NAVIGATION_TIMEOUT_MS): Promise<void> {
    await this.page.waitForURL(`**${pathFragment}*`, {
      timeout,
      waitUntil: "domcontentloaded",
    });
    await this.waitForPageReady();
  }

  protected currentPathIncludes(pathFragment: string): boolean {
    const currentUrl = this.page.url();
    if (!currentUrl) {
      return false;
    }

    try {
      return new URL(currentUrl).pathname.includes(pathFragment);
    } catch {
      return currentUrl.includes(pathFragment);
    }
  }

  protected async gotoUrl(targetUrl: string, expectedPathFragment: string): Promise<void> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= BasePage.NAVIGATION_RETRIES; attempt += 1) {
      try {
        // Waiting for `commit` avoids over-coupling navigation success to the
        // timing of slower assets on the public site. The page-object asserts
        // still own the business readiness checks immediately after this.
        await this.page.goto(targetUrl, {
          timeout: BasePage.NAVIGATION_TIMEOUT_MS,
          waitUntil: "commit",
        });
      } catch (error) {
        lastError = error;
        if (!this.currentPathIncludes(expectedPathFragment) && attempt === BasePage.NAVIGATION_RETRIES) {
          throw error;
        }
      }

      try {
        await this.waitForPath(expectedPathFragment, BasePage.NAVIGATION_TIMEOUT_MS);
        return;
      } catch (error) {
        lastError = error;
        if (attempt === BasePage.NAVIGATION_RETRIES) {
          throw error;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`Navigation failed for ${targetUrl}`);
  }

  async waitForVisible(locator: Locator, timeout = BasePage.DEFAULT_TIMEOUT_MS): Promise<Locator> {
    await expect(locator).toBeVisible({ timeout });
    return locator;
  }

  async waitForEditable(locator: Locator, timeout = BasePage.DEFAULT_TIMEOUT_MS): Promise<Locator> {
    await expect(locator).toBeEditable({ timeout });
    return locator;
  }

  async assertVisible(locator: Locator, timeout = BasePage.DEFAULT_TIMEOUT_MS): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
  }

  async clickWhenReady(locator: Locator, timeout = BasePage.DEFAULT_TIMEOUT_MS): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
    await expect(locator).toBeEnabled({ timeout });
    await locator.click({ timeout });
  }

  async fillWhenReady(locator: Locator, value: string, timeout = BasePage.DEFAULT_TIMEOUT_MS): Promise<void> {
    await expect(locator).toBeEditable({ timeout });
    await locator.click({ timeout });
    await locator.fill(value, { timeout });
  }

  async pressWhenReady(locator: Locator, key: string, timeout = BasePage.DEFAULT_TIMEOUT_MS): Promise<void> {
    await expect(locator).toBeEditable({ timeout });
    await locator.press(key, { timeout });
  }

  async assertPageTitleMatches(expression: RegExp, timeout = BasePage.DEFAULT_TIMEOUT_MS): Promise<void> {
    await expect(this.page).toHaveTitle(expression, { timeout });
  }

  async assertBodyContainsText(text: string, timeout = BasePage.DEFAULT_TIMEOUT_MS): Promise<void> {
    const body = this.page.locator("body");
    await expect(body).toContainText(text, { timeout });
  }

  async dismissCookieBannerIfPresent(): Promise<void> {
    // LiveLabs can present either accept or decline actions depending on the
    // session state. We clear whichever is visible so tests do not fail on
    // unrelated overlay timing.
    for (const buttonName of ["Decline all", "Accept all"]) {
      const button = this.page.getByRole("button", { name: buttonName }).first();
      try {
        await this.waitForVisible(button, BasePage.COOKIE_TIMEOUT_MS);
        await this.clickWhenReady(button, BasePage.COOKIE_TIMEOUT_MS);
        await button.waitFor({
          state: "hidden",
          timeout: BasePage.COOKIE_TIMEOUT_MS,
        });
        await this.waitForPageReady();
        return;
      } catch {
        continue;
      }
    }
  }

  inputByPlaceholder(placeholder: string): Locator {
    return this.page.locator(`input[placeholder="${placeholder}"]:visible`).first();
  }
}
