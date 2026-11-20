const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const records=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../inventory/data/public_portfolio_inventory.json'),'utf8')).records;

test('search supports IDs, titles, owners, Unicode, empty results and browser history',async({page})=>{
  test.setTimeout(180000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const target=records.find(r=>r.livelabsId==='3570');
  await page.goto('/dashboard/',{waitUntil:'networkidle'});
  await expect(page.locator('html')).not.toHaveClass(/page-loading/);
  const input=page.locator('#global-workshop-search');
  const matches=page.locator('.author-search-result');
  for(const query of [target.livelabsId,target.title,target.owner,'modern data warehouse']){
    await input.fill(query);
    await expect.poll(()=>new URL(page.url()).searchParams.get('q')).toBe(query);
    await expect(matches.filter({hasText:target.title}).first()).toBeVisible();
  }
  await matches.filter({hasText:target.title}).first().getByRole('link',{name:'Open record',exact:true}).click();
  await expect(page.locator('.search-view-header h2')).toHaveText(target.title);
  await page.goBack();await expect(input).toHaveValue('modern data warehouse');
  await expect(matches.filter({hasText:target.title}).first()).toBeVisible();
  await page.goForward();await expect(page.locator('.search-view-header h2')).toHaveText(target.title);
  await page.locator('.rail .nav-list').getByRole('link',{name:'Dashboard',exact:true}).click();
  await expect(page).toHaveURL(/\/dashboard\//);
  await expect(page.locator('.page-loading-overlay')).toBeHidden();
  await expect(page.locator('[data-overview-metric="public-count"]')).toHaveText(String(records.length));
  const unicode=records.find(r=>/[^\x00-\x7F]/.test(r.title));
  if(unicode){await input.fill(unicode.title);await expect(matches.filter({hasText:unicode.title}).first()).toBeVisible();}
  await input.fill('zz-no-such-item-<script>');
  await expect(page.locator('[data-search-status]')).toHaveText('No matches');
  await expect(matches).toHaveCount(0);
  await page.locator('[data-search-clear]').click();await expect(input).toHaveValue('');
  const families=new Map();for(const r of records){const key=String(r.wmsId);families.set(key,[...(families.get(key)||[]),r]);}
  const [wms]=[...families].find(([id,items])=>id&&id!=='undefined'&&items.length>1);
  await page.goto('/search/?wms_id='+encodeURIComponent(wms),{waitUntil:'networkidle'});
  await expect(page.locator('#search-workshop-view')).toContainText('Multiple records match');
  await expect(page.locator('#search-workshop-view a[href*="livelabs_id="]').first()).toBeVisible();
  await expect(page.locator('.search-view-header h2')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('same-document browser history restores query results after record details', async ({ page }) => {
  const target = records.find(record => record.livelabsId === '3570');
  await page.goto('/dashboard/?q=modern+data+warehouse', { waitUntil: 'networkidle' });
  await expect(page.locator('html')).not.toHaveClass(/page-loading/);
  const result = page.locator('.author-search-result').filter({ hasText: target.title }).first();
  await expect(result).toBeVisible();
  const detailUrl = await result.getByRole('link', { name: 'Open record', exact: true }).getAttribute('href');
  // Build same-document entries so Back exercises the application's popstate
  // restoration instead of a fresh document's startup rendering.
  await page.evaluate(url => {
    const queryUrl = location.href;
    history.pushState(null, '', url);
    history.pushState(null, '', queryUrl);
  }, detailUrl);
  await page.goBack();
  await expect(page.locator('.search-view-header h2')).toHaveText(target.title);
  await page.goBack();
  await expect(page.locator('#global-workshop-search')).toHaveValue('modern data warehouse');
  await expect(result).toBeVisible();
  await expect(page.locator('#search-workshop-view')).toBeHidden();
  await page.goForward();
  await expect(page.locator('.search-view-header h2')).toBeVisible();
  await expect(page.locator('.search-view-header h2')).toHaveText(target.title);
});

test('serves the public Views page from its local route', async ({ page, request }) => {
  const response = await request.get('/views/');
  expect(response.status()).toBe(200);
  await page.goto('/views/');
  await expect(page).toHaveTitle('Workshop and Sprint Views · LiveLabs Analytics');
  await expect(page.getByRole('heading', { name: 'Workshop and sprint views' })).toBeVisible();
});

test('Views export status stays aligned with the current page size', async ({ page }) => {
  await page.goto('/views/', { waitUntil: 'networkidle' });
  const status = page.locator('#views-export-status');
  await page.getByText('Export visible rows', { exact: true }).click();
  const firstDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON (.json)' }).click();
  const firstFile = await firstDownload;
  const firstPayload = JSON.parse(fs.readFileSync(await firstFile.path(), 'utf8'));
  expect(firstPayload.rowCount).toBe(10);
  await expect(status).toHaveText('Exported 10 rows from page 1 of 89.');

  await page.locator('#views-page-size').selectOption('100');
  await expect(page.locator('#views-table-count')).toHaveText('Showing 1–100 of 889 records');
  await expect(status).toBeEmpty();

  await page.getByText('Export visible rows', { exact: true }).click();
  const secondDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON (.json)' }).click();
  const secondFile = await secondDownload;
  const secondPayload = JSON.parse(fs.readFileSync(await secondFile.path(), 'utf8'));
  expect(secondPayload.rowCount).toBe(100);
  expect(secondPayload.pagination.exportedRows).toBe(100);
  await expect(status).toHaveText('Exported 100 rows from page 1 of 9.');
});

test('Views table keeps rank first and mirrors pagination above and below the rows', async ({ page }) => {
  await page.goto('/views/', { waitUntil: 'networkidle' });
  const headers = page.locator('.views-table thead th');
  await expect(headers.nth(0)).toHaveText('#');
  await expect(headers.nth(1)).toHaveText('Title');
  await expect(page.locator('[data-views-pagination="top"]')).toBeVisible();
  await expect(page.locator('[data-views-pagination="bottom"]')).toBeVisible();
  await page.locator('#views-page-size-bottom').selectOption('25');
  await expect(page.locator('#views-page-size')).toHaveValue('25');
  await expect(page.locator('#views-table-count')).toContainText('Showing 1–25 of 889 records');
  await page.locator('#views-next-bottom').click();
  await expect(page.locator('#views-page-label')).toHaveText('Page 2 of 36');
  await page.locator('#views-previous').click();
  await expect(page.locator('#views-page-label')).toHaveText('Page 1 of 36');
});

test('clicking a Views row opens its full record detail page', async ({ page }) => {
  await page.goto('/views/', { waitUntil: 'networkidle' });
  const row = page.locator('.views-table tbody tr[data-details-url]').first();
  await expect(row).toBeVisible();
  const targetUrl = await row.getAttribute('data-details-url');
  await row.locator('td').nth(3).click();
  await expect(page).toHaveURL(targetUrl);
  await expect(page.locator('.search-view-header h2')).toBeVisible();
});

test('clicking a Dashboard table row opens the full record detail page', async ({ page }) => {
  await page.goto('/dashboard/?view=performance', { waitUntil: 'networkidle' });
  const table = page.locator('#top-performers-table');
  await expect(table.locator('tbody tr.detail-row')).toHaveCount(0);
  await page.locator('details.ranked-table-disclosure').filter({ has: table }).locator('summary').first().click();
  const row = table.locator('tbody tr[data-filter-row="true"]').first();
  await expect(row).toBeVisible();
  const liveLabsId = await row.getAttribute('data-livelabs-id');
  expect(liveLabsId).toBeTruthy();
  await row.locator('td[data-column-label="Title"]').click();
  await expect(page).toHaveURL(new RegExp(`/search/\\?livelabs_id=${liveLabsId}`));
  await expect(page.locator('.search-view-header h2')).toBeVisible();
});

test('P1 queue rows open details directly without an Open record column or expansion rows', async ({ page }) => {
  await page.goto('/dashboard/?view=urgent', { waitUntil: 'networkidle' });
  const table = page.locator('#jenkins-p1-action-table');
  await page.locator('details.ranked-table-disclosure').filter({ has: table }).locator('summary').first().click();
  await expect(table).toBeVisible();
  await expect(table.locator('tbody tr.detail-row')).toHaveCount(0);
  const headers = (await table.locator('thead th').allTextContents()).join(' ');
  expect(headers).not.toMatch(/open record|record/i);
  const row = table.locator('tbody tr[data-filter-row="true"]').first();
  await expect(row).toBeVisible();
  const liveLabsId = await row.getAttribute('data-livelabs-id');
  expect(liveLabsId).toBeTruthy();
  // The LiveLabs ID cell includes an intentional Copy button. Click the title
  // cell to exercise row navigation rather than the copy action.
  await row.locator('td[data-column-label="Title"]').click();
  await expect(page).toHaveURL(new RegExp(`/search/\\?livelabs_id=${liveLabsId}`));
  await expect(page.locator('.search-view-header h2')).toBeVisible();
});

test('detail pages use the left navigation, full-width banner and concise metric help', async ({ page }) => {
  await page.goto('/search/?livelabs_id=4336&wms_id=12015', { waitUntil: 'networkidle' });
  const banner = page.locator('.search-item-banner');
  await expect(banner).toBeVisible();
  await expect(page.locator('[data-back-dashboard]')).toHaveCount(0);
  await expect(page.locator('.rail .nav-list a')).toHaveCount(2);
  await expect(page.locator('.search-overview-panel .term-help')).toHaveCount(5);
  await expect(page.getByRole('button',{name:'Latest GitHub update help'})).toHaveAttribute('aria-label','Latest GitHub update help');
  const bannerWidth = await banner.evaluate(element => element.getBoundingClientRect().width);
  const overviewWidth = await page.locator('.search-overview-panel').evaluate(element => element.getBoundingClientRect().width);
  expect(Math.abs(bannerWidth - overviewWidth)).toBeLessThan(2);
});

test('score guidance omits policy caveats and keeps the useful calculation summary', async ({ page }) => {
  await page.goto('/dashboard/?view=at-risk', { waitUntil: 'networkidle' });
  await page.locator('#at-risk-content details.toggle-panel').filter({ has: page.locator('.review-methodology') }).locator('summary').click();
  const guidance = page.locator('#at-risk-content details.toggle-panel .toggle-body.review-methodology');
  await expect(guidance).toBeVisible();
  await expect(guidance).toContainText('50%');
  await expect(guidance).toContainText('75%');
  await expect(guidance).not.toContainText('Demand thresholds are provisional');
  await expect(guidance).not.toContainText('Unknown inputs are omitted');
});
