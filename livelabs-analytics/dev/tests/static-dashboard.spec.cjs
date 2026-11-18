const { test, expect } = require('@playwright/test');

async function data(request) {
  return {
    inventory: await (await request.get('/inventory/data/public_portfolio_inventory.json')).json(),
    state: await (await request.get('/api/dashboard-admin-state')).json(),
    scores: await (await request.get('/assets/data/score-baselines.json')).json(),
  };
}

test('dashboard has no menu and counts P1 separately from P2/P3 items', async ({page, request}) => {
  const {inventory,state} = await data(request);
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  await page.goto('/dashboard/', {waitUntil:'networkidle'});
  await expect(page.getByRole('heading',{level:1,name:'LiveLabs Analytics'})).toBeVisible();
  await expect(page.locator('#global-workshop-search')).toBeVisible();
  await expect(page.getByRole('button',{name:/^(Menu|Close menu)/})).toHaveCount(0);
  await expect(page.locator('.rail')).toBeHidden();
  await expect(page.locator('[data-overview-metric="public-count"]')).toHaveText(inventory.records.length.toLocaleString());
  const matched = inventory.records.map(r=>state.qaReportMerge.overlay[r.livelabsId]).filter(Boolean);
  const p1 = matched.reduce((sum,item)=>sum+Number(item.priorityCounts.p1||0)+Number(item.priorityCounts.p1Verification||0),0);
  const errorsCount = matched.filter(item=>(item.findings||[]).some(f=>['P2','P3'].includes(f.priority))).length;
  await expect(page.locator('[data-overview-metric="jenkins-p1-count"]')).toHaveText(p1.toLocaleString());
  await expect(page.locator('[data-overview-metric="error-items-count"]')).toHaveText(errorsCount.toLocaleString());
  await expect(page.locator('[data-dashboard-tab]')).toHaveText(['Top Performers','P1 urgent action','At-risk','Retirement review']);
  expect(errors).toEqual([]);
});

test('every ranked row uses its available baseline and valid QA within its review band', async ({page, request}) => {
  const {inventory,state,scores} = await data(request);
  const share = state.qaReportMerge.summary.scorePolicy.tableShare;
  for(const [view,id,mode] of [['performance','top-performers-table','performance'],['at-risk','at-risk-table','risk'],['retirement','retirement-review-table','risk']]) {
    await page.goto('/dashboard/?view='+view,{waitUntil:'networkidle'});
    const table=page.locator('#'+id);
    const disclosure=table.locator('xpath=ancestor::details[contains(@class,"ranked-table-disclosure")]').first();
    if(await disclosure.count() && !(await disclosure.getAttribute('open'))) await disclosure.locator(':scope > summary').click();
    await expect(table.locator('tbody tr[data-filter-row="true"]').first()).toBeVisible();
    // Lazy fragments can appear before the independent QA request has applied.
    await expect(page.locator(`[data-filter-table="${id}"]`)).toHaveAttribute('data-jenkins-merge-id', String(state.qaReportMerge.id || state.qaReportMerge.appliedAt || 'active'));
    const rows=await table.evaluate(node=>[...node.tBodies[0].rows].filter(r=>r.matches('[data-filter-row="true"]')).map(r=>{
      const cell=[...r.cells].find(c=>c.dataset.columnLabel==='Score');
      return {id:r.dataset.livelabsId,score:cell.dataset.sortValue===''?null:Number(cell.dataset.sortValue),band:Number(r.dataset.reviewOrder||0)};
    }));
    const expectedIds=inventory.records.filter(r=>mode==='performance'?scores.records[r.livelabsId].performance!==null:view==='retirement'?['lifecycle','retirement','evidence'].includes(r.review.queue):true).map(r=>String(r.livelabsId));
    expect(rows.map(r=>r.id).sort()).toEqual(expectedIds.sort());
    for(let index=0;index<rows.length;index++) {
      const row=rows[index], base=scores.records[row.id][mode], overlay=state.qaReportMerge.overlay[row.id];
      const error=overlay?.jenkinsErrorScore;
      const usable=overlay?.scoreState==='scored' && error!=null;
      const expected=base==null?null:usable?base*(1-share)+(mode==='performance'?100-error:error)*share:base;
      if(expected==null) expect(row.score).toBeNull(); else expect(row.score).toBeCloseTo(expected,3);
      if(index && (mode==='performance'||rows[index-1].band===row.band) && rows[index-1].score!==null && row.score!==null) expect(rows[index-1].score).toBeGreaterThanOrEqual(row.score-.0001);
      if(index && mode==='risk') expect(rows[index-1].band).toBeLessThanOrEqual(row.band);
    }
  }
});

test('P1 remains in urgent action and retirement explains provisional evidence', async ({page}) => {
  await page.goto('/dashboard/?view=urgent',{waitUntil:'networkidle'});
  await expect(page.locator('#jenkins-p1-action-queue')).toBeVisible();
  await page.locator('#jenkins-p1-action-queue details.ranked-table-disclosure > summary').click();
  await expect(page.locator('#jenkins-p1-action-table tbody tr[data-filter-row="true"]').first()).toBeVisible();
  await page.goto('/dashboard/?view=retirement',{waitUntil:'networkidle'});
  const help=page.locator('#retire-now-content .review-methodology');
  await expect(help).toBeHidden();
  await page.locator('#retire-now-content details.toggle-panel > summary').filter({hasText:'What drives the score'}).click();
  await expect(help).toContainText('verified update and publication dates');
  await expect(help).toContainText('Admin approval does not confirm removal in WMS');
});

for(const width of [1440,390]) test(`search details explain effective weights at ${width}px`,async({page},testInfo)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width,height:900});
  await page.goto('/search/?livelabs_id=4445',{waitUntil:'networkidle'});
  const view=page.locator('#search-workshop-view');
  await expect(view).toBeVisible();
  await view.getByText('Score and evidence',{exact:true}).click();
  await expect(view.locator('.score-summary')).toContainText('QA excluded');
  await expect(view).toContainText('Baseline weight');
  await expect(view).not.toContainText('Retirement readiness: provisional');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({path:testInfo.outputPath(`evidence-${width}.png`),fullPage:true});
});
