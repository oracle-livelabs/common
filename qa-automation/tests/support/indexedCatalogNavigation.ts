import type { Page } from "@playwright/test";

import { BasePage } from "../../pages/basePage.js";
import type { AuthRuntimeConfig } from "./authRuntime.js";
import type { CatalogIndexItem } from "./catalogIndex.js";
import { signInIfRequired } from "./authenticatedNavigation.js";

export interface IndexedCatalogNavigationResult {
  targetUrl: string;
  signedIn: boolean;
}

export async function openIndexedCatalogItem(
  page: Page,
  authRuntime: AuthRuntimeConfig,
  baseUrl: string,
  item: CatalogIndexItem,
  contextName: string,
): Promise<IndexedCatalogNavigationResult> {
  const targetUrls = resolveCatalogItemUrls(baseUrl, item);
  const basePage = new BasePage(page);
  const expectedPath = item.type === "livestack" ? "/livestack-landing-page" : "/view-workshop";
  let lastError: unknown;

  for (const targetUrl of targetUrls) {
    for (let attempt = 0; attempt <= BasePage.NAVIGATION_RETRIES; attempt += 1) {
      try {
        await page.goto(targetUrl, {
          waitUntil: "commit",
          timeout: Math.max(45_000, BasePage.NAVIGATION_TIMEOUT_MS),
        });

        await page.waitForLoadState("domcontentloaded");
        const signedIn = await signInIfRequired(page, authRuntime, contextName);

        await page.waitForURL((url) => url.pathname.includes(expectedPath), {
          timeout: Math.max(45_000, BasePage.NAVIGATION_TIMEOUT_MS),
          waitUntil: "domcontentloaded",
        });
        await basePage.waitForPageReady();
        await basePage.dismissCookieBannerIfPresent();

        return { targetUrl, signedIn };
      } catch (error) {
        lastError = error;
      }
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Could not open indexed catalog item "${item.title}" after trying ${targetUrls.join(", ")}. Last error: ${detail}`,
  );
}

function resolveCatalogItemUrls(baseUrl: string, item: CatalogIndexItem): string[] {
  const candidates = [new URL(item.href, `${baseUrl}/`).toString()];

  if (/^https?:\/\//i.test(item.normalized_href)) {
    candidates.push(item.normalized_href);
  }

  if (/^https?:\/\//i.test(item.absolute_url)) {
    candidates.push(item.absolute_url);
  }

  return Array.from(new Set(candidates));
}
