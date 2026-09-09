const { test, expect } = require("@playwright/test");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

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
  await page.locator('[data-load-lazy-section="replacement-suggestions"]').click();
  await expect(page.locator('#replacement-recommendations tbody > tr.expandable-row[data-filter-row="true"]')).toHaveCount(100);
  const dashboardHeader = await page.locator("main > .page-header").boundingBox();

  await page.goto("/inventory/index.html", { waitUntil: "networkidle" });
  await expect(page.locator("body")).toHaveClass(/dashboard-inventory-active/);
  expect(new URL(page.url()).searchParams.get("view")).toBe("inventory");
  await expect(page.locator("[data-all-data-total]")).toHaveText("2,250 inventory records");
  await expect(page.locator("[data-all-data-rows] tr[data-all-data-key]")).toHaveCount(100);
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

test("search selection and both Back to Dashboard controls reset the search UI", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const search = page.locator("#global-workshop-search");
  const results = page.locator("[data-search-results]");
  const query = "Autonomous AI Database";

  await search.fill(query);
  await expect(page.locator(".search-result-button").first()).toBeVisible();
  await page.locator(".search-result-button").first().click();
  await expect(page.locator("#search-workshop-view")).toBeVisible();
  await expect(search).toHaveValue("");
  await expect(results).toBeEmpty();
  await expect(page.locator("[data-search-status]")).toBeHidden();
  expect(new URL(page.url()).searchParams.has("q")).toBe(false);

  await page.locator("#search-workshop-view [data-back-dashboard]").click();
  await expect(page.locator("#search-workshop-view")).toBeHidden();
  await expect(search).toHaveValue("");
  await expect(results).toBeEmpty();

  await search.fill(query);
  await expect(page.locator(".search-result-button").first()).toBeVisible();
  await page.locator(".search-result-button").first().click();
  await expect(page.locator("#search-workshop-view")).toBeVisible();
  await page.locator(".sidebar-back-button[data-back-dashboard]").click();
  await expect(page.locator("#search-workshop-view")).toBeHidden();
  await expect(search).toHaveValue("");
  await expect(results).toBeEmpty();
});

test("rank column stays clickable while hidden from the sort dropdown", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator('[data-load-lazy-section="top-performers"]').click();
  const table = page.locator('[data-filter-table="top-performer-top-100-workshops"]');
  const tableDisclosure = page.locator("details.ranked-table-disclosure").filter({ has: table }).first();
  if (!(await tableDisclosure.getAttribute("open"))) await tableDisclosure.locator(":scope > summary").click();
  await table.scrollIntoViewIfNeeded();
  const sortSelect = page.locator('[data-pagination-sort-for="top-performer-top-100-workshops"]');
  await expect(sortSelect.locator("option", { hasText: "#" })).toHaveCount(0);
  const rankHeader = table.locator('button[data-sort-table="top-performer-top-100-workshops"][data-column-index="0"]');
  await expect(rankHeader).toHaveText("#");
  await rankHeader.click();
  await expect(table).toHaveAttribute("data-sort-column-index", "0");
  await rankHeader.click();
  await expect(table.locator('tbody tr[data-filter-row="true"]').first().locator("td").first()).toHaveText("100");
});

test("Portfolio Stats uses themed collapsible glance and example-first fallback guidance", async ({ page }) => {
  await page.goto("/#portfolio-stats", { waitUntil: "networkidle" });
  const portfolio = page.locator("#portfolio-stats");
  const glance = portfolio.locator('[data-portfolio-glance="true"]');
  await expect(glance).toBeVisible();
  await expect(glance).not.toHaveAttribute("open", "");
  await expect(glance.locator("summary h3")).toHaveText("Portfolio at a glance");
  await expect(glance.locator("summary span")).toHaveText("4 portfolio metrics");
  await expect(glance.locator(".portfolio-glance-grid")).toBeHidden();
  const disclosureArrows = await page.locator("main details.toggle-panel > summary.panel-head").evaluateAll((summaries) =>
    summaries.map((summary) => getComputedStyle(summary, "::after").content)
  );
  expect(disclosureArrows.length).toBeGreaterThan(0);
  expect(disclosureArrows.every((content) => content !== "none")).toBe(true);
  await glance.locator("summary").click();
  await expect(glance).toHaveAttribute("open", "");
  await expect(glance.getByText("A quick read across four portfolio metrics. The active portfolio contains 885 items: 585 workshops and 300 sprints.", { exact: true })).toBeVisible();
  await expect(portfolio.locator('[data-portfolio-glance="true"] strong')).toHaveText([
    "885",
    "285",
    "473",
    "433"
  ]);
  await expect(glance.getByText("WMS match rate", { exact: true })).toHaveCount(0);
  await expect(portfolio.getByText("Portfolio Coverage", { exact: true })).toHaveCount(0);
  await expect(portfolio.locator("details.toggle-panel > summary.panel-head")).toHaveCount(3);
  const fallback = portfolio.locator("details").filter({ hasText: "Fallback Implementation Details" });
  await expect(fallback).toBeVisible();
  await fallback.locator("summary").click();
  await expect(fallback.locator(".fallback-example-card")).toBeVisible();
  await expect(fallback.locator(".fallback-example-card h4")).toHaveText("Retire-Now ranking needed more eligible rows");
  await expect(fallback.locator(".fallback-rule-step.is-used .fallback-rule-name")).toHaveText("weighted_v4");
  await expect(fallback.locator(".fallback-explanation.is-used")).toHaveCount(3);
  const fallbackStepStyles = await fallback.locator(".fallback-rule-step, .fallback-explanation").evaluateAll((steps) =>
    steps.map((step) => {
      const style = getComputedStyle(step);
      return [style.backgroundColor, style.color, style.borderLeftColor, style.borderLeftWidth];
    })
  );
  expect(new Set(fallbackStepStyles.map((style) => JSON.stringify(style))).size).toBe(1);
  await expect(fallback.getByText("One clear summary plus one real example.", { exact: true })).toHaveCount(0);
  await expect(portfolio.locator("summary h3").filter({ hasText: "Explore the detailed breakdown" })).toBeVisible();
});

test("every Inventory record is routeable and formerly suppressed value clicks open details", async ({ page, request }) => {
  const payload = await (await request.get("/inventory/data/portfolio_inventory.json")).json();
  const records = payload.records || [];
  const keys = records.map((record) => record.key);
  expect(records).toHaveLength(2250);
  expect(new Set(keys).size).toBe(records.length);
  expect(records.every((record) => record.wmsId || record.livelabsId || record.key)).toBe(true);

  const wmsOnly = records.find((record) => record.wmsId && !record.livelabsId);
  await page.goto("/inventory/index.html", { waitUntil: "networkidle" });
  await page.locator("#all-data-search").fill(wmsOnly.wmsId);
  const wmsRow = page.locator(`[data-all-data-key="${wmsOnly.key}"]`);
  await expect(wmsRow).toBeVisible();
  await wmsRow.locator(".copy-value-target").first().click();
  await expect(page.getByRole("heading", { level: 2, name: wmsOnly.title })).toBeVisible();
  let current = new URL(page.url());
  expect(current.searchParams.get("wms_id")).toBe(String(wmsOnly.wmsId));
  expect(current.searchParams.has("livelabs_id")).toBe(false);

  const both = records.find((record) => record.wmsId && record.livelabsId);
  await page.goto("/inventory/index.html", { waitUntil: "networkidle" });
  await page.locator("#all-data-search").fill(String(both.livelabsId));
  const bothRow = page.locator(`[data-all-data-key="${both.key}"]`);
  await expect(bothRow).toBeVisible();
  await bothRow.locator("td").nth(2).click();
  await expect(page.getByRole("heading", { level: 2, name: both.title })).toBeVisible();
  current = new URL(page.url());
  expect(current.searchParams.get("wms_id")).toBe(String(both.wmsId));
  expect(current.searchParams.get("livelabs_id")).toBe(String(both.livelabsId));
});

test("Inventory loads its generated payload when opened directly from disk", async ({ page }) => {
  const inventoryFile = path.resolve(__dirname, "..", "..", "inventory", "index.html");
  await page.goto(pathToFileURL(inventoryFile).href, { waitUntil: "networkidle" });
  await expect(page.locator("body")).toHaveClass(/dashboard-inventory-active/);
  await expect(page.locator("[data-all-data-total]")).toHaveText("2,250 inventory records");
  await expect(page.locator("[data-all-data-rows] tr[data-all-data-key]")).toHaveCount(100);
  await expect.poll(() => page.evaluate(() => window.__portfolioInventoryError || null)).toBeNull();
});
