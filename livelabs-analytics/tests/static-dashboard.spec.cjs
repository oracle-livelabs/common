const { test, expect } = require("@playwright/test");

test("approved dashboard shell and Inventory dimensions remain stable", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1, name: "LiveLabs Analytics" })).toBeVisible();
  await expect(page.getByText("Data snapshot: 14 August 2026.", { exact: true })).toHaveCount(1);
  await expect(page.locator('section.metric-band[aria-label="Dashboard summary"] > span')).toHaveText([
    "Governance",
    "Demand",
    "Retirement"
  ]);
  await expect(page.locator("h3", { hasText: /^Top (10|50|100)$/ })).toHaveCount(0);
  await expect(page.locator('#replacement-recommendations tbody > tr.expandable-row[data-filter-row="true"]')).toHaveCount(100);
  const dashboardHeader = await page.locator("main > .page-header").boundingBox();

  await page.goto("/inventory/", { waitUntil: "networkidle" });
  await expect(page.locator("body")).toHaveClass(/dashboard-inventory-active/);
  await expect(page.locator("[data-all-data-rows] tr[data-all-data-key]").first()).toBeVisible();
  const inventoryHeader = await page.locator("#all-data-browser > .page-header").boundingBox();
  expect(Math.abs(dashboardHeader.width - inventoryHeader.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(dashboardHeader.height - inventoryHeader.height)).toBeLessThanOrEqual(1);
  const inventoryBannerEdgesVisible = await page.evaluate(() => {
    const header = document.querySelector("#all-data-browser > .page-header");
    if (!header) return false;
    const rect = header.getBoundingClientRect();
    const leftEdge = document.elementFromPoint(Math.ceil(rect.left + 1), Math.ceil(rect.top + 12));
    const rightEdge = document.elementFromPoint(Math.floor(rect.right - 1), Math.ceil(rect.top + 12));
    return (leftEdge === header || header.contains(leftEdge)) && (rightEdge === header || header.contains(rightEdge));
  });
  expect(inventoryBannerEdgesVisible).toBe(true);
  
  const audit = await page.evaluate(() => window.__inventoryNavigationAudit);
  expect(audit).toEqual({
    records: 2250,
    uniqueKeys: 2250,
    duplicateKeys: [],
    missingKeys: [],
    status: "passed"
  });
  expect(pageErrors).toEqual([]);
});

test("every Inventory record is routeable and formerly suppressed value clicks open details", async ({ page, request }) => {
  const payload = await (await request.get("/data/portfolio_inventory.json")).json();
  const records = payload.records || [];
  const keys = records.map((record) => record.key);
  expect(records).toHaveLength(2250);
  expect(new Set(keys).size).toBe(records.length);
  expect(records.every((record) => record.wmsId || record.livelabsId || record.key)).toBe(true);

  const wmsOnly = records.find((record) => record.wmsId && !record.livelabsId);
  await page.goto("/inventory/", { waitUntil: "networkidle" });
  await page.locator("#all-data-search").fill(wmsOnly.wmsId);
  const wmsRow = page.locator(`[data-all-data-key="${wmsOnly.key}"]`);
  await expect(wmsRow).toBeVisible();
  await wmsRow.locator(".copy-value-target").first().click();
  await expect(page.getByRole("heading", { level: 2, name: wmsOnly.title })).toBeVisible();
  let current = new URL(page.url());
  expect(current.searchParams.get("wms_id")).toBe(String(wmsOnly.wmsId));
  expect(current.searchParams.has("livelabs_id")).toBe(false);

  const both = records.find((record) => record.wmsId && record.livelabsId);
  await page.goto("/inventory/", { waitUntil: "networkidle" });
  await page.locator("#all-data-search").fill(String(both.livelabsId));
  const bothRow = page.locator(`[data-all-data-key="${both.key}"]`);
  await expect(bothRow).toBeVisible();
  await bothRow.locator("td").nth(2).click();
  await expect(page.getByRole("heading", { level: 2, name: both.title })).toBeVisible();
  current = new URL(page.url());
  expect(current.searchParams.get("wms_id")).toBe(String(both.wmsId));
  expect(current.searchParams.get("livelabs_id")).toBe(String(both.livelabsId));
});
