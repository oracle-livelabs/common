const { test, expect } = require("@playwright/test");
const fs = require("node:fs/promises");

// Parse downloaded CSV independently, including quoted commas and embedded newlines.
function parseCsv(csv) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  csv = csv.replace(/^\uFEFF/, "");
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (char === '"') {
      if (quoted && csv[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === "," || char === "\n")) {
      row.push(cell.replace(/\r$/, "")); cell = "";
      if (char === "\n") { rows.push(row); row = []; }
    } else cell += char;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}

async function downloadReport(page) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV report", exact: true }).click();
  const download = await pending;
  const csv = await fs.readFile(await download.path(), "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  const rows = parseCsv(csv);
  expect(rows[0]).toEqual(["Section", "Row", "Field", "Value"]);
  expect(rows.every((row) => row.length === 4)).toBe(true);
  return { rows, filename: download.suggestedFilename() };
}

test("workshop, sprint, and WMS-only result pages copy and export their displayed content", async ({ page, context, request }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const { records } = await (await request.get("/inventory/data/portfolio_inventory.json")).json();
  const samples = [
    records.find((record) => record.type === "Workshop" && record.family?.total > 1 && record.livelabsId),
    records.find((record) => record.type === "Sprint" && record.livelabsId),
    records.find((record) => record.wmsId && !record.livelabsId)
  ];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const record of samples) {
    const params = new URLSearchParams(record.livelabsId ? { livelabs_id: record.livelabsId } : { wms_id: record.wmsId });
    await page.goto(`/?${params}`, { waitUntil: "networkidle" });
    const view = page.locator("#search-workshop-view");
    await expect(view).toBeVisible();
    const actions = view.locator(".search-view-actions > button");
    await expect(actions).toHaveText(["Copy link", "Export CSV report", "Back to Dashboard"]);
    await expect(view.locator(".search-view-header [data-copy-value]")).toHaveCount(0);
    const latest = view.locator(".search-result-card").filter({ has: page.locator("dt", { hasText: "Latest Update" }) });
    const latestButton = latest.getByRole("button", { name: "Copy Latest Update", exact: true });
    await expect(latestButton).toHaveCSS("opacity", "0");
    await latest.hover();
    await expect(latestButton).toHaveCSS("opacity", "1");
    const expectedLatest = await latestButton.getAttribute("data-copy-value");
    await latestButton.click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expectedLatest);

    const governance = view.locator(".search-detail-panel").filter({ has: page.getByRole("heading", { name: "Governance Summary", exact: true }) });
    for (const field of await governance.locator("dd").all()) {
      const button = field.getByRole("button");
      await field.hover();
      await expect(button).toHaveCSS("opacity", "1");
      const value = await button.getAttribute("data-copy-value");
      await button.click();
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(value);
    }
    const { rows, filename } = await downloadReport(page);
    expect(filename).toMatch(/-report\.csv$/);
    expect(rows).toContainEqual(["Page Overview", "", "Title", record.title]);
    expect(rows).toContainEqual(["Summary", "", "Latest Update", expectedLatest]);
    const expectedSections = await view.locator(".search-detail-panel h3").allTextContents();
    expect([...new Set(rows.slice(1).map((row) => row[0]))]).toEqual(["Page Overview", "Summary", ...expectedSections]);
    // Every rendered data value must appear in the download and have a Copy control.
    const displayed = await view.locator("dd, td").evaluateAll((fields) => fields.map((field) => {
      const copy = field.querySelector("[data-copy-value]");
      return copy ? copy.dataset.copyValue : null;
    }));
    expect(displayed.every((value) => value !== null)).toBe(true);
    for (const value of displayed) expect(rows.some((row) => row[3] === value || row[3] === `'${value}`)).toBe(true);
    if (record.family?.total > 1) expect(rows.some((row) => row[0] === "Same WMS Family" && row[2] === "Related Content")).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("WMS-reported ownership is preserved separately from support contacts", async ({ page, request }) => {
  const { records } = await (await request.get("/inventory/data/portfolio_inventory.json")).json();
  const record = records.find((item) => item.livelabsId === "4074");
  expect(record.owner).toBe("vasile-lucian.brinzei@oracle.com");
  expect(record.ownership).toBeUndefined();
  await page.goto("/?livelabs_id=4074&wms_id=11763", { waitUntil: "networkidle" });
  const view = page.locator("#search-workshop-view");
  await expect(view).toBeVisible();
  await expect(view.locator(".search-view-subtitle")).toContainText("WMS reported owner: vasile-lucian.brinzei@oracle.com");
  await expect(view.locator(".search-view-subtitle")).not.toContainText("Ownership needs review");
  const governance = view.locator(".search-detail-panel").filter({ has: page.getByRole("heading", { name: "Governance Summary", exact: true }) });
  const copy = governance.getByRole("button", { name: "Copy Owner", exact: true });
  await expect(copy).toHaveAttribute("data-copy-value", "vasile-lucian.brinzei@oracle.com");
  await expect(copy).toHaveCSS("opacity", "0");
  await copy.focus();
  await expect(copy).toHaveCSS("opacity", "1");
  const { rows } = await downloadReport(page);
  expect(rows).toContainEqual(["Governance Summary", "", "Owner", "vasile-lucian.brinzei@oracle.com"]);
  expect(rows.some((row) => row[2] === "WMS Reported Owner Email (disputed)")).toBe(false);
  expect(rows).toContainEqual(["Additional Details", "", "Support Contact Email", "marco.antonio.luchian@oracle.com"]);
});

test("CSV preserves file detail, Unicode, quotes, newlines, and safe spreadsheet text", async ({ page }) => {
  await page.goto("/?livelabs_id=634", { waitUntil: "networkidle" });
  await expect(page.locator("#search-workshop-view")).toBeVisible();
  await page.evaluate(() => {
    const record = {
      title: 'CSV fixture: "quoted", café\nSecond line', type: "Sprint", livelabsId: "fixture-1", wmsId: "fixture-2",
      category: "@category", owner: "+owner", source: "CSV regression fixture", update: "2026-10-09", status: "N/A",
      values: new Map([["Views 12m", "1,234"], ["Title", 'CSV fixture: "quoted", café\nSecond line']]),
      details: new Map([["Workshop Path", '=HYPERLINK("https://example.invalid")'], ["Publish Status", "N/A"]]),
      fileUpdates: [{ fileName: 'Intro, "first".md', filePath: "labs/café/intro.md", gitUpdate: "2026-10-09", acknowledgement: "N/A", checkLabel: "Review", checkNote: "First line\nSecond line" }]
    };
    renderSearchDetail(record, { updateUrl: false });
  });
  const { rows } = await downloadReport(page);
  expect(rows).toContainEqual(["Page Overview", "", "Title", 'CSV fixture: "quoted", café\nSecond line']);
  expect(rows).toContainEqual(["Summary", "", "Category", "'@category"]);
  expect(rows).toContainEqual(["Governance Summary", "", "Owner", "'+owner"]);
  expect(rows).toContainEqual(["Governance Summary", "", "Workshop Path", '\'=HYPERLINK("https://example.invalid")']);
  expect(rows).toContainEqual(["Files Updated On GitHub", "1", "Markdown File", 'Intro, "first".md\nlabs/café/intro.md']);
  expect(rows).toContainEqual(["Files Updated On GitHub", "1", "Date Check", "Review\nFirst line\nSecond line"]);
  expect(rows.some((row) => row.some((value) => value === "Copy" || value === "Copied"))).toBe(false);
  const link = await page.locator("[data-copy-search-link]").boundingBox();
  const exportButton = await page.locator("[data-export-search-csv]").boundingBox();
  expect(exportButton.y).toBeGreaterThanOrEqual(link.y + link.height);
  await page.screenshot({ path: "../test-results/search-detail-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("[data-export-search-csv]")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "../test-results/search-detail-mobile.png", fullPage: true });
});
