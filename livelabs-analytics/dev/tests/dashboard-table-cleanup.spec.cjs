const {test, expect} = require('@playwright/test');

const tables = [
  ['performance', 'top-performers-table'], ['urgent', 'jenkins-p1-action-table'],
  ['at-risk', 'at-risk-table'], ['retirement', 'retirement-review-table'],
];

test('all dashboard tables omit focus filters and keep search, type and sorting', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [view, id] of tables) {
    await page.goto(`/dashboard/?view=${view}`, {waitUntil:'networkidle'});
    const table = page.locator('#' + id);
    const panel = page.locator('.ranked-table-disclosure').filter({has:table});
    if (!await panel.evaluate(el => el.open)) await panel.locator(':scope > summary').click();
    expect(await panel.locator('[data-filter-mode="review-focus"], .filter-disclosure, .review-focus-groups').count()).toBe(0);
    await expect(panel.getByRole('searchbox', {name:'Search this table', exact:true})).toBeVisible();
    await expect(panel.getByRole('combobox', {name:'Content type', exact:true})).toBeVisible();
    await expect(panel.getByRole('combobox', {name:'Sort by', exact:true})).toHaveCount(0);
    await expect(panel.locator('.table-sort-direction')).toHaveCount(0);
    await expect(panel.locator('[data-pagination-position="bottom"]')).toHaveCount(0);
    if (view !== 'urgent') {
      const values = await table.locator('tbody tr[data-filter-row] td[data-column-label="Errors Found"]').allTextContents();
      expect(values.length).toBeGreaterThan(0);
      expect(values.filter(value => !/^(N\/A|[1-9]\d* errors?)$/.test(value))).toEqual([]);
    }
  }
  expect(errors).toEqual([]);
});

test('Views sorts by clicking column headings and keeps the table controls in one toolbar', async ({page}) => {
  await page.goto('/views/', {waitUntil:'networkidle'});
  const table = page.locator('.views-table');
  await expect(page.locator('#views-sort, #views-sort-direction')).toHaveCount(0);
  await expect(page.locator('[data-views-pagination="bottom"]')).toHaveCount(0);
  await expect(page.locator('.views-table-controls')).toBeVisible();
  const viewsHeader = table.getByRole('button', {name:/Views · Last 12 Months/});
  const headerCell = viewsHeader.locator('xpath=..');
  await expect(headerCell).toHaveAttribute('aria-sort','descending');
  await viewsHeader.click();
  await expect(headerCell).toHaveAttribute('aria-sort','ascending');
  const ascending = await table.locator('tbody tr').evaluateAll(rows => rows.map(row => Number(row.lastElementChild.textContent.replaceAll(',',''))));
  expect(ascending).toEqual([...ascending].sort((a,b)=>a-b));
  await viewsHeader.click();
  await expect(headerCell).toHaveAttribute('aria-sort','descending');
  const descending = await table.locator('tbody tr').evaluateAll(rows => rows.map(row => Number(row.lastElementChild.textContent.replaceAll(',',''))));
  expect(descending).toEqual([...descending].sort((a,b)=>b-a));
  await expect(page.locator('.views-table-controls [data-views-previous]')).toBeVisible();
  await expect(page.locator('.views-table-controls .table-export-dropdown > summary')).toBeVisible();
  await expect(page.locator('.views-table-controls #views-clear-filters')).toBeVisible();
});

test('urgent issues combine the issue names, counts and action and remain searchable and exportable', async ({page}, testInfo) => {
  await page.goto('/dashboard/?view=urgent', {waitUntil:'networkidle'});
  const table = page.locator('#jenkins-p1-action-table');
  const panel = page.locator('.ranked-table-disclosure').filter({has:table});
  await panel.locator(':scope > summary').click();
  expect(await table.locator('thead th').allTextContents()).toEqual(['#','LiveLabs ID','Title','Author / owner','Additional contact email','Type','Views','Issues']);
  const row = table.locator('tr[data-livelabs-id="3570"]');
  const issues = row.locator('[data-column-label="Issues"]');
  await expect(issues).toContainText('Stale PAR link');
  await expect(issues).toContainText('Full instructions not loading');
  await expect(issues).toContainText('3 findings');
  await expect(issues).toContainText('9 occurrences');
  await expect(issues).toContainText('Author fix');
  await panel.getByRole('searchbox', {name:'Search this table', exact:true}).fill('Stale PAR link');
  await expect(row).toBeVisible();
  const menu = panel.locator('.table-export-dropdown');
  await menu.locator('summary').click();
  const pending = page.waitForEvent('download');
  await menu.getByRole('button', {name:'JSON (.json)', exact:true}).click();
  const download = await pending;
  const exported = JSON.parse(require('node:fs').readFileSync(await download.path(), 'utf8'));
  expect(exported.rows.find(item => String(item['LiveLabs ID']) === '3570').Issues).toContain('9 occurrences');
  await page.screenshot({path:testInfo.outputPath('urgent-issues.png')});
});

test('Errors Found remains N/A when the dashboard has no saved QA report', async ({page, request}) => {
  const state = await (await request.get('/api/dashboard-admin-state')).json();
  await page.route('**/api/dashboard-admin-state', route => route.fulfill({
    status:200, contentType:'application/json', body:JSON.stringify({...state, qaReportMerge:null}),
  }));
  for (const [view, id] of tables.filter(([view]) => view !== 'urgent')) {
    await page.goto(`/dashboard/?view=${view}`, {waitUntil:'networkidle'});
    const values = await page.locator(`#${id} tbody tr[data-filter-row] td[data-column-label="Errors Found"]`).allTextContents();
    expect(values.length).toBeGreaterThan(0);
    expect(new Set(values)).toEqual(new Set(['N/A']));
  }
});

test('detail tooltips escape their card, fit the viewport and dismiss with Escape', async ({page}, testInfo) => {
  await page.goto('/search/?livelabs_id=3416&score_context=risk', {waitUntil:'networkidle'});
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height:1000});
    for (const help of await page.locator('.term-help').all()) {
      await help.focus();
      const tip = page.getByRole('tooltip');
      await expect(tip).toBeVisible();
      const visibility = await tip.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const old = el.style.pointerEvents;
        el.style.pointerEvents = 'auto';
        const uncovered = [[rect.left + 2,rect.top + 2],[rect.right - 2,rect.bottom - 2]]
          .every(([x,y]) => el.contains(document.elementFromPoint(x,y)));
        el.style.pointerEvents = old;
        return {uncovered, inViewport:rect.left >= 8 && rect.right <= innerWidth - 8 && rect.top >= 8 && rect.bottom <= innerHeight - 8};
      });
      expect(visibility).toEqual({uncovered:true,inViewport:true});
      await page.keyboard.press('Escape');
      await expect(tip).toBeHidden();
    }
    await page.getByRole('button', {name:'Additional contact help', exact:true}).hover();
    await page.screenshot({path:testInfo.outputPath(`tooltip-${width}.png`)});
    await page.mouse.move(0,0);
  }
});
