import { expect, type Locator, type Page } from "@playwright/test";

import { BasePage } from "../basePage.js";

export class OracleSignInPage extends BasePage {
  static readonly HOSTNAME = "signon.oracle.com";
  static readonly SIGN_IN_TIMEOUT_MS = Math.max(90_000, BasePage.NAVIGATION_TIMEOUT_MS);

  constructor(page: Page) {
    super(page);
  }

  get usernameInput(): Locator {
    return this.page
      .locator(
        [
          'input[type="email"]:visible',
          'input[name*="user" i]:visible',
          'input[id*="user" i]:visible',
          'input[aria-label*="user" i]:visible',
          'input[aria-label*="email" i]:visible',
          'input[type="text"]:visible',
        ].join(", "),
      )
      .first();
  }

  get passwordInput(): Locator {
    return this.page.locator('input[type="password"]:visible, input[name*="password" i]:visible').first();
  }

  get nextButton(): Locator {
    return this.page.getByRole("button", { name: /^Next$/i }).first();
  }

  get submitButton(): Locator {
    return this.page.getByRole("button", { name: /sign in|verify|continue|next/i }).first();
  }

  isCurrentPage(): boolean {
    return isOracleSignInUrl(this.page.url());
  }

  async signIn(username: string, password: string): Promise<void> {
    await this.waitForPageReady(OracleSignInPage.SIGN_IN_TIMEOUT_MS);
    await this.fillWhenReady(this.usernameInput, username, OracleSignInPage.SIGN_IN_TIMEOUT_MS);
    await this.clickWhenReady(this.nextButton, OracleSignInPage.SIGN_IN_TIMEOUT_MS);

    await this.fillWhenReady(this.passwordInput, password, OracleSignInPage.SIGN_IN_TIMEOUT_MS);
    await this.clickWhenReady(this.submitButton, OracleSignInPage.SIGN_IN_TIMEOUT_MS);

    await expect
      .poll(() => isOracleSignInUrl(this.page.url()), {
        timeout: OracleSignInPage.SIGN_IN_TIMEOUT_MS,
        message: "Oracle Sign In should return to LiveLabs after credentials are accepted.",
      })
      .toBe(false);
  }
}

export function isOracleSignInUrl(urlValue: string): boolean {
  try {
    const url = new URL(urlValue);
    return url.hostname === OracleSignInPage.HOSTNAME && url.pathname.includes("/signin");
  } catch {
    return urlValue.includes(OracleSignInPage.HOSTNAME);
  }
}
