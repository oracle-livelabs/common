const { test, expect } = require("@playwright/test");

async function publicInventory(request) {
  const response = await request.get("/inventory/data/public_portfolio_inventory.json");
  expect(response.ok()).toBe(true);
  return response.json();
}

test("Overview keeps search in the shared banner and shows public scope and Jenkins coverage", async ({ page, request }) => {
  const payload = await publicInventory(request);
  const workshopCount = payload.records.filter((record) => record.type === "Workshop").length;
  const sprintCount = payload.records.filter((record) => record.type === "Sprint").length;
  const report = await (await request.get("/api/dashboard-admin-state")).json();
  const overlay = report.qaReportMerge.overlay;
  const matched = payload.records.filter((record) => Object.hasOwn(overlay, String(record.livelabsId)));
  const unmatched = payload.records.filter((record) => !Object.hasOwn(overlay, String(record.livelabsId)));
  const coveragePercent = (matched.length / payload.records.length) * 100;
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/dashboard/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1, name: "LiveLabs Analytics" })).toBeVisible();
  await expect(page.getByText(/Data snapshot: 28 September 2026\./)).toHaveCount(1);

  const mainSearch = page.locator(".page-header .primary-search-panel #global-workshop-search");
  await expect(mainSearch).toBeVisible();
  expect(await mainSearch.evaluate((input) => Boolean(input.closest("header")))).toBe(true);
  await expect(page.locator('.hero-stripe[data-dashboard-page="all"]')).toBeVisible();
  expect(await page.locator("[data-search-results]").evaluate((results) => Boolean(results.closest("main")))).toBe(true);

  await expect(page.locator(".nav-list a")).toHaveText([
    "Overview", "Top Performers", "At-risk", "Retirement"
  ]);
  await expect(page.locator(".nav-list a").filter({ hasText: /Inventory|Replacement|Disabled|Archived|Portfolio Stats/i })).toHaveCount(0);
  await expect(page.locator(".overview-performer-cards")).toHaveCount(0);
  await expect(page.locator("#dashboard-toc")).toHaveCount(0);
  await expect(page.getByText("Review pages", { exact: true })).toHaveCount(0);
  await expect(page.locator("#portfolio-stats")).toBeVisible();
  await expect(page.locator('[data-overview-metric="public-count"]')).toHaveText(payload.records.length.toLocaleString());
  await expect(page.locator('[data-overview-note="public-breakdown"]')).toHaveText(`${workshopCount.toLocaleString()} workshops · ${sprintCount.toLocaleString()} sprints`);
  await expect(page.locator('[data-overview-metric="jenkins-coverage"]')).toHaveText(`${matched.length.toLocaleString()} of ${payload.records.length.toLocaleString()}`);
  await expect(page.locator('[data-overview-note="jenkins-coverage"]')).toContainText(`${coveragePercent.toFixed(1)}% matched`);
  await expect(page.locator('[data-overview-note="jenkins-coverage"]')).toContainText(`${unmatched.length} public items have no matched Jenkins row`);
  expect(unmatched.length).toBe(33);
  expect(unmatched.every((record) => record.type === "Workshop")).toBe(true);
  await expect(page.locator('[data-overview-metric="jenkins-scored-count"]')).toHaveText("861");
  await expect(page.locator('[data-overview-metric="jenkins-p1-count"]')).toHaveText("91");
  await expect(page.locator("main")).not.toContainText("Top Performer Workshop");
  expect(errors).toEqual([]);
});

test("search results stay inline on Overview before a record is opened", async ({ page, request }) => {
  const payload = await publicInventory(request);
  const record = payload.records.find((item) => item.livelabsId && item.title);
  expect(record).toBeTruthy();

  await page.goto("/dashboard/", { waitUntil: "networkidle" });
  await page.locator("#global-workshop-search").fill(record.livelabsId);
  const results = page.locator("[data-search-results]");
  const firstResult = page.locator(".search-result-button").first();
  await expect(firstResult).toBeVisible();
  await expect(results).toContainText(record.title);
  expect(new URL(page.url()).pathname).toBe("/dashboard/");
  expect(await results.evaluate((node) => Boolean(node.closest("main")))).toBe(true);

  await firstResult.click();
  await expect(page.locator("#search-workshop-view")).toBeVisible();
  await expect(page.locator("#search-workshop-view")).toContainText(record.title);
  await expect(page.locator(".page-header .primary-search-panel")).toBeVisible();
  await expect(page.locator('.hero-stripe[data-dashboard-page="all"]')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/search/");
});

test("all six ranking tables blend their Analytics score with Jenkins and sort by the blended score", async ({ page, request }) => {
  const report = await (await request.get("/api/dashboard-admin-state")).json();
  const share = Number(report.qaReportMerge.summary.scorePolicy.tableShare);
  const pages = [
    { view: "performance", mode: "performance", section: "#top-performers", scoreHeader: "Score", ids: ["top-performer-top-100-workshops", "top-performer-top-100-sprints"] },
    { view: "at-risk", mode: "risk", section: "#at-risk-content", scoreHeader: "Review Score", ids: ["at-risk-top-100-workshops", "at-risk-top-100-sprints"] },
    { view: "retirement", mode: "risk", section: "#retire-now-content", scoreHeader: "Retire Score", ids: ["retire-now-top-100-workshops", "retire-now-top-100-sprints"] }
  ];
  for (const group of pages) {
    await page.goto(`/dashboard/?view=${group.view}`, { waitUntil: "networkidle" });
    const section = page.locator(group.section);
    await expect(section).toBeVisible();
    await expect(page.locator(".page-header .primary-search-panel")).toBeVisible();
    await expect(page.locator('.hero-stripe[data-dashboard-page="all"]')).toBeVisible();
    for (const id of group.ids) {
      const table = page.locator(`#${id}`);
      const disclosure = table.locator("xpath=ancestor::details[contains(@class,'ranked-table-disclosure')]").first();
      if (await disclosure.count() && !(await disclosure.getAttribute("open"))) {
        await disclosure.locator(":scope > summary").click();
      }
      await expect(table.locator("tbody tr[data-filter-row='true']").first()).toBeVisible();
      await expect(table.locator("thead")).toContainText("Jenkins Error Score");
      await expect(table.locator("thead")).not.toContainText("Replacement");
      const rows = await table.evaluate((node, scoreHeader) => {
        const headings = [...node.tHead.rows[0].cells].map((cell) => cell.textContent.trim());
        const idIndex = headings.indexOf("LiveLabs ID");
        const scoreIndex = headings.indexOf(scoreHeader);
        const errorIndex = headings.indexOf("Jenkins Error Score");
        return [...node.tBodies[0].rows]
          .filter((row) => row.matches("[data-filter-row='true']"))
          .map((row) => {
            const errorValue = row.cells[errorIndex]?.dataset.sortValue || "";
            return {
              id: row.cells[idIndex]?.dataset.filterValue,
              baseline: Number(row.cells[scoreIndex]?.dataset.analyticsBaseline),
              final: Number(row.cells[scoreIndex]?.dataset.sortValue),
              error: errorValue ? Number(errorValue) : null,
              rank: Number(row.cells[0]?.dataset.sortValue)
            };
          });
      }, group.scoreHeader);
      expect(rows.length).toBeGreaterThan(1);
      expect(rows[0].rank).toBe(1);
      let scoredItems = 0;
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const evidence = report.qaReportMerge.overlay[row.id];
        const hasScore = evidence?.jenkinsErrorScore != null && Number.isFinite(Number(evidence.jenkinsErrorScore));
        const error = hasScore ? Number(evidence.jenkinsErrorScore) : null;
        const expected = hasScore
          ? group.mode === "performance"
            ? row.baseline * (1 - share) + (100 - error) * share
            : row.baseline * (1 - share) + error * share
          : row.baseline;
        expect(row.final, `${id} score for ${row.id}`).toBeCloseTo(expected, 3);
        if (hasScore) scoredItems += 1;
        if (index > 0) expect(rows[index - 1].final, `${id} final rank order`).toBeGreaterThanOrEqual(row.final - 0.0001);
        expect(row.rank).toBe(index + 1);
      }
      expect(scoredItems, `${id} Jenkins-scored rows`).toBeGreaterThan(0);
    }
  }
  await expect(page.locator("#jenkins-ranking-method")).toBeHidden();
  await expect(page.locator("main")).not.toContainText(/Replacement Match Score|replacement candidate/i);
});

test("At-risk puts the P1 queue first and keeps scoring guidance collapsed", async ({ page }) => {
  await page.goto("/dashboard/?view=at-risk", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1, name: "At-risk" })).toBeVisible();
  await expect(page.locator(".page-header .primary-search-panel")).toBeVisible();
  await expect(page.locator('.hero-stripe[data-dashboard-page="all"]')).toBeVisible();
  const queue = page.locator("#jenkins-p1-action-queue");
  const p1Table = queue.locator("#jenkins-p1-action-table");
  await expect(queue).toBeVisible();
  await expect(p1Table).toBeVisible();
  await expect(p1Table.locator("tbody tr[data-filter-row='true']")).not.toHaveCount(0);
  await expect(page.locator("#jenkins-ranking-method")).toBeVisible();
  await expect(page.locator("#jenkins-ranking-method")).not.toHaveAttribute("open", "");
  await expect(page.locator("#at-risk-content [data-filter-table] > table[id]")).toHaveCount(2);

  const correctOrder = await page.evaluate(() => {
    const queue = document.querySelector("#jenkins-p1-action-queue");
    const method = document.querySelector("#jenkins-ranking-method");
    const risk = document.querySelector("#at-risk-content");
    return Boolean(queue && method && risk
      && (queue.compareDocumentPosition(method) & Node.DOCUMENT_POSITION_FOLLOWING)
      && (method.compareDocumentPosition(risk) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(correctOrder).toBe(true);
  await expect(page.locator("main")).not.toContainText(/Replacement Match Score|replacement candidate/i);
});

test("Retirement stays focused and the old Stats route returns to Overview", async ({ page }) => {
  await page.goto("/dashboard/?view=retirement", { waitUntil: "networkidle" });
  await expect(page.locator(".page-header .primary-search-panel")).toBeVisible();
  await expect(page.locator('.hero-stripe[data-dashboard-page="all"]')).toBeVisible();
  await expect(page.locator("#retire-now-content")).toBeVisible();
  await expect(page.locator("#retire-now-content [data-filter-table] > table[id]")).toHaveCount(2);
  await expect(page.locator("main")).not.toContainText(/Replacement Match Score|replacement candidate/i);

  await page.goto("/dashboard/?view=stats", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1, name: "LiveLabs Analytics" })).toBeVisible();
  await expect(page.locator("#portfolio-stats")).toBeVisible();
  await expect(page.locator(".nav-list a").filter({ hasText: "Portfolio Stats" })).toHaveCount(0);
});
