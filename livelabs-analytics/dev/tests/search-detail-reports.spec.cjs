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
  const menu = page.locator("#search-workshop-view .report-export-dropdown");
  if (await menu.count()) {
    const open = await menu.evaluate((element) => element.hasAttribute("open"));
    if (!open) await menu.locator(":scope > summary").click();
  }
  const pending = page.waitForEvent("download");
  await page.locator("#search-workshop-view [data-export-search-csv]").click();
  const download = await pending;
  const csv = await fs.readFile(await download.path(), "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  const rows = parseCsv(csv);
  expect(rows[0]).toEqual(["Section", "Row", "Field", "Value"]);
  expect(rows.every((row) => row.length === 4)).toBe(true);
  return { rows, filename: download.suggestedFilename() };
}

test("Jenkins evidence retains exact lab locations, source excerpts, and PAR diagnostics", async ({ page, context }, testInfo) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/search/?livelabs_id=4021', { waitUntil: 'networkidle' });
  const report = page.locator('[data-qa-report-overlay]');
  await expect(report).toBeVisible();
  const par = report.locator('.author-finding-group').filter({ has: page.locator(':scope > summary strong', { hasText: 'Stale PAR link' }) });
  await par.locator(':scope > summary').click();
  const model = par.locator('.author-target').filter({ has: page.locator(':scope > strong', { hasText: 'all-MiniLM-L6-v2.onnx' }) });
  await expect(model).toHaveCount(1);
  await expect(model.locator('.author-source-location')).toHaveCount(2);
  await expect(model).toContainText('Markdown line 308');
  await expect(model).toContainText('Task 6: Download ONNX embedding models');
  await expect(model.getByRole('link', { name: 'Open exact lab' }).first()).toHaveAttribute('href', /[?&]lab=download/);
  await expect(model.getByRole('link', { name: 'Open source' })).toHaveAttribute('href', /\/download\/download\.md$/);
  await model.locator('.author-target-technical > summary').click();
  for (const value of ['HTTP 401', 'huggingface-models', 'oraclepartnersas', 'us-phoenix-1', '3415fce1e6c92535']) {
    await expect(model).toContainText(value);
  }
  const copy = model.getByRole('button', { name: 'Copy masked URL', exact: true });
  const masked = await copy.getAttribute('data-copy-value');
  expect(masked).toContain('/p/***/n/');
  await copy.click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(masked);
  const sourceCopy = model.getByRole('button', { name: 'Copy source text', exact: true });
  await sourceCopy.click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(await sourceCopy.getAttribute('data-copy-value'));
  await expect(par.locator('.author-target').filter({ has: page.locator(':scope > strong', { hasText: 'tinybert.onnx' }) })).toContainText('Markdown line 311');
  const typo = report.locator('.author-finding-group').filter({ has: page.locator(':scope > summary strong', { hasText: 'Possible typo' }) });
  await typo.locator(':scope > summary').click();
  await expect(typo).toContainText('Markdown line 85');
  await expect(typo.locator('mark', { hasText: 'alsow' })).toHaveCount(1);
  const { rows } = await downloadReport(page);
  expect(rows.some(row => row[3].includes('Markdown line 308'))).toBe(true);
  expect(rows.some(row => row[3].includes('/download/download.md'))).toBe(true);
  expect(rows.some(row => row[3].includes('HTTP 401'))).toBe(true);
  expect(await report.locator('a[href*="/p/"]').count()).toBe(0);
  await model.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('jenkins-evidence-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await model.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await model.screenshot({ path: testInfo.outputPath('jenkins-evidence-mobile-detail.png') });
  expect(errors).toEqual([]);
});

test('opening an error leads with the exact content location before generic QA details', async ({page}, testInfo) => {
  await page.goto('/search/?livelabs_id=3570', {waitUntil:'networkidle'});
  const report=page.locator('[data-qa-report-overlay]');
  const par=report.locator('.author-finding-group').filter({has:page.locator(':scope > summary strong',{hasText:'Stale PAR link'})});
  await par.locator(':scope > summary').click();
  const check=par.locator('.author-check').first();
  const primary=check.locator('.author-first-check').first();
  await expect(primary).toBeVisible();
  await expect(primary).toContainText('Check here first');
  await expect(primary).toContainText('Lab 2: Load JSON tweets');
  await expect(primary.locator(':scope > strong')).toHaveText('Lab 2: Load JSON tweets');
  await expect(primary).toContainText('Task 1: Upload JSON tweets into Object Storage');
  await expect(primary).toContainText('Markdown line 29');
  await expect(primary.locator('mark')).toHaveText('labfiles/JSON_Full_tweets.jsonn');
  await expect(primary.getByRole('link',{name:'Open exact lab'})).toHaveAttribute('href',/[?&]lab=json/);
  await expect(primary.getByRole('link',{name:'Open source'})).toHaveAttribute('href',/\/json\/json\.md$/);
  expect(await check.evaluate(el=>el.firstElementChild.matches('.author-target'))).toBe(true);
  for (const selector of ['.author-check-guidance','.author-check-metadata','.author-target-technical','.author-other-locations']) {
    await expect(check.locator(selector)).not.toHaveAttribute('open','');
  }
  const alternate=check.locator('.author-other-locations');
  await alternate.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(alternate.locator('.author-source-location')).toBeVisible();
  await expect(alternate).toContainText('Rendered lab');
  await alternate.locator('summary').click();
  const {rows}=await downloadReport(page);
  expect(rows.some(row=>row[3].includes('Markdown line 29'))).toBe(true);
  expect(rows.some(row=>row[3].includes('Rendered lab'))).toBe(true);
  expect(rows.some(row=>row[2]==='Suggested action')).toBe(true);
  await par.locator(':scope > summary').scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath('jenkins-location-first-desktop.png')});
  await page.setViewportSize({width:390,height:844});
  await primary.scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await primary.screenshot({path:testInfo.outputPath('jenkins-location-first-mobile.png')});
});

test('record details prioritize ownership and keep errors and score tables compact', async ({page}, testInfo) => {
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await page.goto('/search/?livelabs_id=3570',{waitUntil:'networkidle'});
    const view=page.locator('#search-workshop-view');
    const ownership=view.locator('.search-ownership-panel');
    await expect(ownership).toHaveAttribute('open','');
    await expect(view.locator('.search-detail-panel h3').first()).toHaveText('Ownership & publishing');
    await expect(ownership.locator('dd').filter({hasText:/^Published/})).toBeVisible();
    const report=view.locator('[data-qa-report-overlay]');
    await expect(report.locator('.author-report-date')).toContainText('15 Oct 2026');
    const loading=report.locator('.author-finding-group').filter({has:page.locator(':scope > summary strong',{hasText:'Full instructions not loading'})});
    await expect(loading.locator(':scope > summary')).toContainText('2 checks · 6 occurrences');
    await loading.locator(':scope > summary').click();
    await expect(loading.locator('.author-check-facts')).toHaveCount(2);
    await expect(loading).not.toContainText('Steps were not supplied');
    await expect(loading).not.toContainText('No suggested change was supplied');
    for (const check of await loading.locator('.author-check').all()) expect((await check.boundingBox()).height).toBeLessThan(220);
    const score=view.locator('.search-score-panel');
    await score.locator(':scope > summary').click();
    await expect(score.locator('.score-summary')).toContainText('Final 45.73');
    await expect(score).not.toContainText('Recorded activity only');
    await expect(score).not.toContainText('Retirement readiness');
    await expect(score).not.toContainText('Shared-title demand');
    const table=score.locator('table');
    await expect(table.locator('thead th')).toHaveCount(4);
    expect((await table.boundingBox()).height).toBeLessThan(width>700?240:320);
    expect((await table.locator('thead th').last().boundingBox()).width).toBeGreaterThan(50);
    expect(await table.locator('th, td').evaluateAll(cells=>cells.every(cell=>cell.scrollWidth<=cell.clientWidth+1))).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const {rows}=await downloadReport(page);
    expect(rows).toContainEqual(['Score and evidence','1','Annual demand / Final weight','33.75%']);
    expect(rows.some(row=>row[2]==='Report date'&&row[3]==='15 Oct 2026')).toBe(true);
    await table.screenshot({path:testInfo.outputPath(`compact-record-score-${width}.png`)});
    await view.locator('h2').click();
    await page.screenshot({path:testInfo.outputPath(`compact-record-page-${width}.png`),fullPage:true});
  }
});

test("public workshop and sprint details copy and export their displayed content", async ({ page, context, request }, testInfo) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const { records } = await (await request.get("/inventory/data/public_portfolio_inventory.json")).json();
  const samples = [
    records.find((record) => record.type === "Workshop" && record.family?.total > 1 && record.livelabsId),
    records.find((record) => record.type === "Sprint" && record.livelabsId)
  ];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const record of samples) {
    const params = new URLSearchParams(record.livelabsId ? { livelabs_id: record.livelabsId } : { wms_id: record.wmsId });
    await page.goto(`/search/?${params}`, { waitUntil: "networkidle" });
    const view = page.locator("#search-workshop-view");
    await expect(view).toBeVisible();
    const actions = view.locator(".search-view-actions > button");
    await expect(actions).toHaveText(["Copy link", "Back to Dashboard"]);
    await expect(view.locator(".search-view-header [data-copy-value]")).toHaveCount(0);
    const latest = view.locator(".search-result-card").filter({ has: page.locator("dt", { hasText: "Last update" }) });
    const latestButton = latest.getByRole("button", { name: "Copy Last update", exact: true });
    await expect(latestButton).toHaveCSS("opacity", "0");
    await latest.locator('dd').hover();
    await expect(latestButton).toHaveCSS("opacity", "1");
    const expectedLatest = await latestButton.getAttribute("data-copy-value");
    await latestButton.click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expectedLatest);

    const governance = view.locator(".search-detail-panel").filter({ has: page.getByRole("heading", { name: "Ownership & publishing", exact: true }) });
    if (!(await governance.evaluate(element=>element.open))) await governance.locator(':scope > summary').click();
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
    expect(rows).toContainEqual(["Page Overview", "N/A", "Title", record.title]);
    expect(rows).toContainEqual(["Summary", "N/A", "Last update", expectedLatest]);
    expect(rows.some(row => row[0] === 'Source details')).toBe(true);
    expect(rows.some(row => row[0] === 'Score and evidence' && row[2].includes('Baseline weight'))).toBe(true);
    const displayed = await view.locator('[data-copy-value]').evaluateAll(buttons=>buttons.map(button=>button.dataset.copyValue));
    for (const value of displayed) expect(rows.some(row => row[3] === value || row[3] === `'${value}`)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("WMS-reported ownership is preserved separately from support contacts", async ({ page, request }) => {
  const { records } = await (await request.get("/inventory/data/public_portfolio_inventory.json")).json();
  const record = records.find((item) => item.livelabsId === "4074");
  expect(record.owner).toBe("vasile-lucian.brinzei@oracle.com");
  expect(record.ownership).toBeUndefined();
  await page.goto("/search/?livelabs_id=4074&wms_id=11763", { waitUntil: "networkidle" });
  const view = page.locator("#search-workshop-view");
  await expect(view).toBeVisible();
  await expect(view.locator(".search-view-subtitle")).toContainText("WMS reported owner: vasile-lucian.brinzei@oracle.com");
  await expect(view.locator(".search-view-subtitle")).not.toContainText("Ownership needs review");
  const governance = view.locator(".search-detail-panel").filter({ has: page.getByRole("heading", { name: "Ownership & publishing", exact: true }) });
  if (!(await governance.evaluate(element=>element.open))) await governance.locator(':scope > summary').click();
  const copy = governance.getByRole("button", { name: "Copy Owner", exact: true });
  await expect(copy).toHaveAttribute("data-copy-value", "vasile-lucian.brinzei@oracle.com");
  await expect(copy).toHaveCSS("opacity", "0");
  await copy.focus();
  await expect(copy).toHaveCSS("opacity", "1");
  const { rows } = await downloadReport(page);
  expect(rows).toContainEqual(["Ownership & publishing", "N/A", "Owner", "vasile-lucian.brinzei@oracle.com"]);
  expect(rows.some((row) => row[2] === "WMS Reported Owner Email (disputed)")).toBe(false);
  expect(rows).toContainEqual(["Source details", "N/A", "Support Contact Email", "marco.antonio.luchian@oracle.com"]);
});

test("CSV preserves file detail, Unicode, quotes, newlines, and safe spreadsheet text", async ({ page }) => {
  await page.goto("/search/?livelabs_id=598", { waitUntil: "networkidle" });
  await expect(page.locator("#search-workshop-view")).toBeVisible();
  await page.evaluate(() => {
    // Exercise the exporter with hostile-looking text as inert displayed values.
    const section = document.createElement('section'); section.className='search-detail-panel';
    const heading=document.createElement('h3');heading.textContent='CSV fixture';section.append(heading);
    const table=document.createElement('table'), body=document.createElement('tbody');table.className='search-detail-table';table.append(body);section.append(table);
    for (const [key, value] of [
      ['Unicode and quotes', 'CSV fixture: "quoted", café\nSecond line'],
      ['Formula', '=HYPERLINK("https://example.invalid")'],
      ['File', 'Intro, "first".md\nlabs/café/intro.md']
    ]) {
      const row=document.createElement('tr'),label=document.createElement('th'),cell=document.createElement('td');label.textContent=key;cell.textContent=value;row.append(label,cell);body.append(row);
    }
    document.querySelector('#search-workshop-view').append(section);
  });
  const { rows } = await downloadReport(page);
  expect(rows).toContainEqual(['CSV fixture','N/A','Unicode and quotes','CSV fixture: "quoted", café\nSecond line']);
  expect(rows).toContainEqual(['CSV fixture','N/A','Formula',"'=HYPERLINK(\"https://example.invalid\")"]);
  expect(rows).toContainEqual(['CSV fixture','N/A','File','Intro, "first".md\nlabs/café/intro.md']);
  expect(rows.some((row) => row.some((value) => value === "Copy" || value === "Copied"))).toBe(false);
  await page.locator('#search-workshop-view .report-export-dropdown > summary').click();
  const link = await page.locator("[data-copy-search-link]").boundingBox();
  const exportButton = await page.locator("[data-export-search-csv]").boundingBox();
  expect(exportButton.y).toBeGreaterThanOrEqual(link.y + link.height);
  await page.screenshot({ path: testInfo.outputPath("search-detail-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const exportMenu = page.locator("#search-workshop-view .report-export-dropdown");
  if (!(await exportMenu.evaluate((element) => element.hasAttribute("open")))) {
    await exportMenu.locator(":scope > summary").click();
  }
  await expect(page.locator("[data-export-search-csv]")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("search-detail-mobile.png"), fullPage: true });
});
