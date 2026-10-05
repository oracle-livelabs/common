import { expect, type Locator, type Page } from "@playwright/test";

import { BasePage } from "../basePage.js";

export interface LiveStackActionRecord {
  title: string;
  href?: string;
  tagName: string;
  index: number;
}

// LiveStackLandingPage models the LiveStack overview route. LiveStacks are
// catalog entries with their own demo, workshop, and asset surface rather than
// regular workshop launch pages.
export class LiveStackLandingPage extends BasePage {
  static readonly PATH = "/livestack-landing-page";
  static readonly OVERVIEW_NAVIGATION_TIMEOUT_MS = Math.max(45_000, BasePage.NAVIGATION_TIMEOUT_MS);

  constructor(page: Page) {
    super(page);
  }

  get heading(): Locator {
    return this.page.locator("h1:visible, h2:visible").first();
  }

  get demoLinks(): Locator {
    return this.page.locator('main a[href*="view-workshop"]:visible').filter({ hasText: /demo/i });
  }

  get workshopLinks(): Locator {
    return this.page.locator('main a[href*="view-workshop"]:visible').filter({ hasText: /workshop|livelab|lab/i });
  }

  get assetActions(): Locator {
    return this.page
      .locator('main a[href]:visible, main button:visible')
      .filter({ hasText: /asset|download|github|repository|source|deploy|zip|local/i });
  }

  async goto(baseUrl: string, href: string): Promise<void> {
    await this.gotoUrl(
      resolvePlatformHref(baseUrl, href),
      LiveStackLandingPage.PATH,
      LiveStackLandingPage.OVERVIEW_NAVIGATION_TIMEOUT_MS,
    );
    await this.dismissCookieBannerIfPresent();
  }

  async assertLoaded(expectedTitle?: string): Promise<void> {
    await this.page.waitForURL(
      (url) => url.pathname.includes(LiveStackLandingPage.PATH) || isOracleSignInUrl(url),
      {
        timeout: LiveStackLandingPage.OVERVIEW_NAVIGATION_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      },
    );
    await this.waitForPageReady();

    if (isOracleSignInUrl(new URL(this.page.url()))) {
      throw new Error("LiveStack overview routed an anonymous user to Oracle Sign In instead of the public overview page.");
    }

    await this.dismissCookieBannerIfPresent();
    await this.assertVisible(this.heading);
    await this.assertBodyContainsText("LiveStack");

    if (expectedTitle) {
      const normalizedTitle = expectedTitle.replace(/\s+/g, " ").trim();
      const importantWords = normalizedTitle
        .split(/\s+/)
        .filter((word) => word.length > 4)
        .slice(0, 3);

      for (const word of importantWords) {
        await expect(this.page.locator("body")).toContainText(new RegExp(escapeRegex(word), "i"));
      }
    }
  }

  async assertDemoWorkshopAndAssetsAvailable(): Promise<void> {
    await this.waitForVisible(this.demoLinks.first());
    await expect(this.demoLinks.first()).toHaveAttribute("href", /view-workshop/i);
    await this.waitForVisible(this.workshopLinks.first());
    await expect(this.workshopLinks.first()).toHaveAttribute("href", /view-workshop/i);
    await expect(this.page.locator("body")).toContainText(/asset/i);

    const firstAssetAction = await this.waitForVisible(this.assetActions.first());
    const tagName = await firstAssetAction.evaluate((element) => element.tagName.toLowerCase());

    if (tagName === "a") {
      await expect(firstAssetAction).toHaveAttribute("href", /\S/);
      return;
    }

    await expect(firstAssetAction).toBeEnabled();
  }

  async workshopResourceRecords(): Promise<LiveStackActionRecord[]> {
    return collectActionRecords(this.page.locator('main a[href*="view-workshop"]:visible'));
  }

  async assetActionRecords(): Promise<LiveStackActionRecord[]> {
    return collectActionRecords(this.assetActions);
  }

  async openWorkshopResource(record: LiveStackActionRecord): Promise<void> {
    const link = this.page.locator(`main a[href="${record.href}"]:visible`).first();
    await this.clickWhenReady(link, LiveStackLandingPage.OVERVIEW_NAVIGATION_TIMEOUT_MS);
  }

  async clickAssetAction(record: LiveStackActionRecord): Promise<void> {
    await this.clickWhenReady(this.assetActions.nth(record.index), LiveStackLandingPage.OVERVIEW_NAVIGATION_TIMEOUT_MS);
  }
}

function resolvePlatformHref(baseUrl: string, href: string): string {
  if (/^https?:\/\//i.test(href)) {
    return href;
  }

  return new URL(href, `${baseUrl}/`).toString();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isOracleSignInUrl(url: URL): boolean {
  return url.hostname === "signon.oracle.com" && url.pathname.includes("/signin");
}

async function collectActionRecords(locator: Locator): Promise<LiveStackActionRecord[]> {
  return locator.evaluateAll((elements) => {
    const seen = new Set<string>();
    const records: LiveStackActionRecord[] = [];

    elements.forEach((element, index) => {
      const title = (element.textContent ?? "").replace(/\s+/g, " ").trim();
      const href = element instanceof HTMLAnchorElement ? element.getAttribute("href") ?? undefined : undefined;
      const tagName = element.tagName.toLowerCase();
      const key = `${title}|${href ?? ""}|${tagName}`;

      if (!title || seen.has(key)) {
        return;
      }

      seen.add(key);
      records.push({ title, href, tagName, index });
    });

    return records;
  });
}
