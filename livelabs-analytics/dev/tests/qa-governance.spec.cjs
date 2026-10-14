const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
let payload;
test.beforeAll(async ({ request }) => { payload = await (await request.get('/inventory/data/portfolio_inventory.json')).json(); });
test.beforeEach(() => { test.skip(!payload.metadata.qa_governance, 'Run against a generated governance candidate.'); });

test('QA details distinguish findings, reported passes, conflicts and missing evidence; exports carry evidence', async ({ page }, testInfo) => {
  const samples = [
    payload.records.find(r => r.qa.ranking_applicable && r.qa.observed_error_score > 0),
    payload.records.find(r => r.qa.state === 'reported_pass'),
    payload.records.find(r => r.qa.match_status === 'type_conflict'),
    payload.records.find(r => r.qa.state === 'not_observed')
  ];
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  for (const record of samples) {
    expect(record).toBeTruthy();
    await page.goto('/search/?' + new URLSearchParams(record.livelabsId ? {livelabs_id:record.livelabsId} : {wms_id:record.wmsId}), {waitUntil:'networkidle'});
    const evidence = page.locator('[data-qa-evidence]');
    await expect(evidence).toBeVisible();
    await expect(evidence).toContainText('not a test failure percentage');
    const score = evidence.locator('tr').filter({has:page.getByRole('rowheader',{name:'QA Error Score',exact:true})});
    await expect(score.locator('td')).toContainText(String(record.qa.observed_error_score ?? 'Unknown'));
    if (record.qa.match_status === 'type_conflict') await expect(evidence).toContainText('type_conflict');
    await page.locator('#search-workshop-view .report-export-dropdown > summary').click();
    const pending = page.waitForEvent('download');
    await page.locator('[data-export-search-csv]').click();
    const csv = await fs.readFile(await (await pending).path(), 'utf8');
    expect(csv).toContain('QA Error Score');
    expect(csv).toContain('QA Owner Action');
    expect(csv).toContain('QA Findings Detail');
    if (record === samples[0]) await page.screenshot({path:testInfo.outputPath('qa-search-evidence.png'),fullPage:true});
  }
  expect(errors).toEqual([]);
});

test('Inventory exposes QA scores, retains unknowns and sorts numeric scores before missing evidence', async ({page},testInfo) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/inventory/',{waitUntil:'networkidle'});
  await expect(page.locator('[data-inventory-warning]')).toContainText('Analytics snapshot predates Jenkins run');
  await expect(page.locator('#all-content-data-table thead')).toContainText('QA Error Score');
  await page.locator('[data-all-data-sort]').first().selectOption('qaError');
  expect(errors).toEqual([]);
  await expect(page.locator('[data-all-data-rows] tr').first().locator('td').nth(9)).toHaveText('0');
  await page.locator('[data-all-data-sort-direction]').first().click();
  const max = Math.max(...payload.records.map(r => r.qa.observed_error_score ?? -1));
  await expect(page.locator('[data-all-data-rows] tr').first().locator('td').nth(9)).toHaveText(String(max));
  await page.screenshot({path:testInfo.outputPath('qa-inventory.png'),fullPage:false});
  await page.locator('[data-all-data-rows] tr').first().locator('td').nth(9).click();
  await expect(page.locator('[data-qa-evidence]')).toBeVisible();
});

test('all nine tables contain QA evidence and paired details, with replacement target evidence', async ({page},testInfo) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/dashboard/',{waitUntil:'networkidle'});
  const tables=page.locator('[data-filter-table] > table[id]');
  await expect(tables).toHaveCount(9);
  for (const table of await tables.all()) {
    for (const disclosure of await table.locator('xpath=ancestor::details').all()) {
      if (await disclosure.getAttribute('open') === null) await disclosure.locator(':scope > summary').click();
    }
    await expect(table.locator(':scope > thead')).toContainText('QA Error Score');
    const rows = table.locator('tbody > tr.expandable-row');
    expect(await rows.count()).toBeGreaterThan(0);
    await rows.first().click();
    const detail = table.locator('tbody > tr.detail-row').first();
    await expect(detail).toBeVisible();
    await expect(detail.locator('.qa-evidence')).toContainText('QA evidence and score adjustment');
    const cols = await table.locator(':scope > thead > tr > th').count();
    await expect(detail.locator(':scope > td')).toHaveAttribute('colspan',String(cols));
    await rows.first().click();
  }
  await expect(page.locator('#replacement-recommendations > thead')).toContainText('Target QA Error Score');
  await page.screenshot({path:testInfo.outputPath('qa-ranking-tables.png'),fullPage:false});
  expect(errors).toEqual([]);
});

test('evidence layout remains usable at narrow viewport', async ({page},testInfo) => {
  const record=payload.records.find(r=>r.qa.ranking_applicable && r.qa.observed_error_score>0);
  await page.setViewportSize({width:390,height:844});
  await page.goto('/search/?livelabs_id='+record.livelabsId,{waitUntil:'networkidle'});
  await expect(page.locator('[data-qa-evidence]')).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
  expect(overflow).toBe(false);
  await page.screenshot({path:testInfo.outputPath('qa-mobile.png'),fullPage:true});
});
