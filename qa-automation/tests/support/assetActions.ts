import { expect, type Page } from "@playwright/test";

import type { LiveStackActionRecord } from "../../pages/platform/liveStackLandingPage.js";

export async function assertAssetActionWorks(
  page: Page,
  clickAssetAction: (record: LiveStackActionRecord) => Promise<void>,
  record: LiveStackActionRecord,
): Promise<void> {
  const beforeUrl = page.url();
  const popupPromise = page.waitForEvent("popup", { timeout: 5_000 }).catch(() => undefined);
  const downloadPromise = page.waitForEvent("download", { timeout: 5_000 }).catch(() => undefined);

  await clickAssetAction(record);

  const [popup, download] = await Promise.all([popupPromise, downloadPromise]);

  if (download) {
    expect(download.suggestedFilename(), `${record.title} should start a named download`).not.toHaveLength(0);
    return;
  }

  if (popup) {
    await popup.waitForLoadState("domcontentloaded").catch(() => undefined);
    await assertNoBrowserError(popup, `Asset popup: ${record.title}`);
    await popup.close();
    return;
  }

  if (page.url() === beforeUrl && record.tagName !== "button") {
    throw new Error(`Asset action "${record.title}" did not open a page, popup, or download.`);
  }
}

export async function assertNoBrowserError(page: Page, contextName: string): Promise<void> {
  const currentUrl = page.url();

  expect(currentUrl, `${contextName} should not end on a browser error page`).not.toMatch(/^chrome-error:\/\//i);
  expect(currentUrl, `${contextName} should not be blank`).not.toBe("about:blank");
}
