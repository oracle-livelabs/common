const { test, expect } = require('@playwright/test');

test('missing QA is unavailable rather than a zero-findings result', async ({page}) => {
  await page.route('**/api/dashboard-admin-state', route => route.fulfill({status:404, body:'Unavailable'}));
  await page.route('**/assets/data/dashboard-state.json', route => route.fulfill({status:404, body:'Unavailable'}));
  await page.goto('/dashboard/?view=urgent', {waitUntil:'networkidle'});
  await expect(page.locator('[data-overview-metric="jenkins-p1-count"]')).toHaveText('Unavailable');
  await expect(page.locator('[data-overview-metric="error-items-count"]')).toHaveText('Unavailable');
  await expect(page.locator('#jenkins-p1-action-queue')).toContainText('QA report unavailable');
  await expect(page.locator('#jenkins-p1-action-queue')).not.toContainText('0 findings');
  await page.getByRole('tab',{name:'Top Performers',exact:true}).click();
  await expect(page.locator('#top-performers')).toBeVisible();
});

test('record links stay under the deployed project prefix', async ({page}) => {
  // Same app served below a project prefix, as on Pages or a versioned tenancy route.
  await page.route('**/common/livelabs-analytics/**', async route => {
    const url=new URL(route.request().url());
    url.pathname=url.pathname.replace('/common/livelabs-analytics','');
    const response=await page.request.get(url.href);
    await route.fulfill({response});
  });
  await page.goto('/common/livelabs-analytics/dashboard/?view=urgent', {waitUntil:'networkidle'});
  const panel=page.locator('#jenkins-p1-action-queue details.ranked-table-disclosure');
  await panel.locator(':scope > summary').click();
  const row=page.locator('#jenkins-p1-action-table tbody tr[data-filter-row="true"]').first();
  await expect(row).toBeVisible();
  await row.locator('td[data-column-label="Title"]').click();
  await expect(page).toHaveURL(/\/common\/livelabs-analytics\/search\//);
  await expect(page.locator('.search-view-header h2')).toBeVisible();
});
