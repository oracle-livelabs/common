const {test, expect} = require('@playwright/test');
const fs = require('node:fs');

const tables = [
  ['performance', 'top-performers-table'], ['urgent', 'jenkins-p1-action-table'],
  ['at-risk', 'at-risk-table'], ['retirement', 'retirement-review-table'],
];

for (const [view, id] of tables) test(`${view}: simple table controls search both owner and additional email`, async ({page, request}) => {
  const contacts = await (await request.get('/api/dashboard-contacts')).json();
  const inventory = await (await request.get('/inventory/data/public_portfolio_inventory.json')).json();
  await page.goto(`/dashboard/?view=${view}`, {waitUntil:'networkidle'});
  const table = page.locator('#' + id);
  const panel = page.locator('.ranked-table-disclosure').filter({has:table});
  await panel.locator(':scope > summary').click();
  await expect(table.locator('thead th').first()).toHaveText('#');
  await expect(table.locator('tr.detail-row')).toHaveCount(0);
  await expect(panel.getByRole('button', {name:'Open record',exact:true})).toHaveCount(0);
  await expect(panel.locator('.filter-disclosure, [data-filter-mode="review-focus"]')).toHaveCount(0);
  const displayedContacts = await table.locator('tbody tr[data-filter-row]').evaluateAll(rows => rows.map(row => ({
    id:row.dataset.livelabsId,
    email:row.querySelector('td[data-additional-contact-column] .dashboard-contact-email')?.textContent || '',
    text:row.querySelector('td[data-additional-contact-column]')?.textContent.trim(),
  })));
  for (const displayed of displayedContacts) {
    const expectedEmail = contacts.items[displayed.id]?.email || '';
    expect(displayed.email).toBe(expectedEmail);
    if (!expectedEmail) expect(displayed.text).toBe('N/A');
  }
  const ids = await table.locator('tbody tr[data-filter-row]').evaluateAll(rows=>rows.map(r=>r.dataset.livelabsId));
  const item = ids.map(id=>inventory.records.find(r=>String(r.livelabsId)===id))
    .find(r=>r && contacts.items[r.livelabsId] && /@/.test(r.owner || ''));
  expect(item).toBeTruthy();
  const search = panel.getByRole('searchbox',{name:'Search this table',exact:true});
  for (const email of [item.owner, contacts.items[item.livelabsId].email]) {
    await search.fill(email.toUpperCase());
    await expect.poll(()=>table.locator('tbody tr[data-filter-row]:visible').evaluateAll(rows=>rows.map(r=>r.dataset.livelabsId))).toContain(String(item.livelabsId));
  }
  await panel.getByRole('button',{name:'Clear filters',exact:true}).click();
  await expect(search).toHaveValue('');
  await expect(table.locator('tbody tr[data-filter-row]:visible')).toHaveCount(10);
});

test('Views restores contacts and a styled export menu; each format exports the sorted second page', async ({page}, testInfo) => {
  await page.goto('/views/', {waitUntil:'networkidle'});
  const table = page.locator('.views-table');
  const first = table.locator('tbody tr').first();
  const email = await first.locator('.views-contact-email').innerText();
  expect(email).toContain('@');
  await page.locator('#views-additional-contact-email').fill(email);
  await expect(table.locator('tbody tr').first()).toContainText(email);
  await page.locator('#views-clear-filters').click();
  await page.locator('#views-type').selectOption('Workshop');
  await page.locator('#views-sort').selectOption('title');
  await page.locator('#views-page-size').selectOption('25');
  await page.locator('#views-next-bottom').click();
  await expect(page.locator('#views-page-size-bottom')).toHaveValue('25');
  const ids = await table.locator('tbody tr').evaluateAll(rows=>rows.map(r=>r.cells[2].textContent.trim()));
  expect(ids).toHaveLength(25);
  const menu = page.locator('.table-export-dropdown');
  await expect(menu.locator('.table-export-options')).toBeHidden();
  expect(await menu.locator('summary').evaluate(el=>getComputedStyle(el).borderBottomWidth)).toBe('1px');
  expect(await menu.locator('.table-export-options').evaluate(el=>getComputedStyle(el).position)).toBe('absolute');
  for (const format of ['csv','xlsx','json']) {
    await menu.locator('summary').click();
    await expect(menu.locator('.table-export-options')).toBeVisible();
    const pending = page.waitForEvent('download');
    await menu.getByRole('button',{name:format==='xlsx'?'Excel (.xlsx)':`${format.toUpperCase()} (.${format})`}).click();
    const file = await pending;
    const bytes = fs.readFileSync(await file.path());
    if (format==='json') expect(JSON.parse(bytes.toString()).rows.map(r=>String(r['LiveLabs ID']))).toEqual(ids);
    if (format==='csv') expect(bytes.toString()).toContain(ids[0]);
    if (format==='xlsx') expect(bytes.subarray(0,2).toString()).toBe('PK');
    await expect(menu.locator('.table-export-options')).toBeHidden();
  }
  await expect(page.locator('#views-export-status')).toHaveText(/Exported 25 rows from page 2 of \d+\./);
  for (const selector of ['.views-table-toolbar','.views-table-meta','.views-pagination']) {
    expect(await page.locator(selector).first().evaluate(el=>getComputedStyle(el).borderBottomWidth)).toBe('0px');
  }
  await page.screenshot({path:testInfo.outputPath('views-restored.png'),fullPage:true});
});

test('direct record startup stays on details and does not load dashboard table fragments', async ({page, request}) => {
  const contacts = await (await request.get('/api/dashboard-contacts')).json();
  const contactEmail = contacts.items['4336']?.email;
  expect(contactEmail).toBeTruthy();
  const fragments = [];
  page.on('request', request=>{if(request.url().includes('/assets/fragments/')) fragments.push(request.url());});
  let release;
  const gate = new Promise(resolve=>{release=resolve;});
  await page.route('**/api/dashboard-admin-state',async route=>{await gate;await route.continue();});
  await page.goto('/search/?livelabs_id=4336&wms_id=12015',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.page-loading-overlay')).toBeVisible();
  await expect(page.locator('#overview')).toBeHidden();
  await expect(page.locator('#portfolio-stats')).toBeHidden();
  release();
  await expect(page.locator('.search-item-banner')).toBeVisible();
  await expect(page.locator('.page-loading-overlay')).toBeHidden();
  await expect(page.locator('.search-overview-panel')).toContainText(contactEmail);
  expect(fragments).toEqual([]);
});

test('static host without the private contact API still renders Views and never requests a public contact script',async({page})=>{
  const requests=[];page.on('request',r=>requests.push(r.url()));
  await page.route('**/api/dashboard-contacts',r=>r.fulfill({status:404,body:'Not found'}));
  await page.goto('/views/',{waitUntil:'networkidle'});
  await expect(page.locator('.views-table tbody tr')).toHaveCount(10);
  await expect(page.locator('.page-loading-overlay')).toBeHidden();
  expect(requests.some(url=>url.includes('views-wms-contact-index.js'))).toBe(false);
});
