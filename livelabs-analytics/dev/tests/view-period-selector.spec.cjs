const {test,expect}=require('@playwright/test');

const tables=[['performance','top-performers-table'],['urgent','jenkins-p1-action-table'],['at-risk','at-risk-table'],['retirement','retirement-review-table']];
const periods=['Last 7 Days','Last 14 Days','Last 30 Days','Last 90 Days','Last 180 Days','Last 12 Months'];
const metric=(record,key)=>{
  const values=new Map([...(record.details||[]),...(record.values||[])]);
  const value=String(values.get(key)??'').replaceAll(',','').trim();
  return values.get('Dashboard Metric Status')==='available_unique_title_scope' && /^\d+$/.test(value)?Number(value):null;
};

for(const [view,id] of tables)test(`${view}: one views column switches all six periods without changing scores`,async({page,request},testInfo)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const payload=await(await request.get('/inventory/data/public_portfolio_inventory.json')).json();
  const records=new Map(payload.records.map(record=>[String(record.livelabsId),record]));
  await page.goto(`/dashboard/?view=${view}`,{waitUntil:'networkidle'});
  const table=page.locator('#'+id),panel=page.locator('.ranked-table-disclosure').filter({has:table});
  await panel.locator(':scope > summary').click();
  const select=panel.getByRole('combobox',{name:'View period',exact:true});
  await expect(select.locator('option')).toHaveText(periods);
  const scores=()=>table.locator('tbody tr[data-filter-row]').evaluateAll(rows=>Object.fromEntries(rows.map(row=>[row.dataset.livelabsId,row.querySelector('[data-column-label="Score"]')?.textContent||''])));
  const original=await scores();
  for(const period of periods){
    await select.selectOption('Views - '+period);
    await expect(table.locator('thead [data-views-period-column]')).toHaveCount(1);
    expect((await table.locator('thead th').allTextContents()).filter(label=>/^Views/.test(label))).toEqual(['Views']);
    const observed=await table.locator('tbody tr[data-filter-row]').evaluateAll(rows=>rows.map(row=>({id:row.dataset.livelabsId,text:row.querySelector('[data-views-period-column]').textContent,columnCount:row.cells.length,headerCount:row.closest('table').tHead.rows[0].cells.length})));
    for(const item of observed){
      const expected=metric(records.get(item.id),'Views - '+period);
      expect(item.text).toBe(expected===null?'N/A':expected.toLocaleString());
      expect(item.columnCount).toBe(item.headerCount);
    }
    expect(await scores()).toEqual(original);
  }
  await select.selectOption('Views - Last 90 Days');
  await table.getByRole('button',{name:'Views',exact:true}).click();
  let values=await table.locator('tbody tr[data-filter-row]:visible [data-views-period-column]').evaluateAll(cells=>cells.map(cell=>cell.dataset.sortValue).filter(value=>value!=='').map(Number));
  expect(values).toEqual([...values].sort((a,b)=>b-a));
  await select.selectOption('Views - Last 7 Days');
  values=await table.locator('tbody tr[data-filter-row]:visible [data-views-period-column]').evaluateAll(cells=>cells.map(cell=>cell.dataset.sortValue).filter(value=>value!=='').map(Number));
  expect(values).toEqual([...values].sort((a,b)=>b-a));
  await table.getByRole('button',{name:'Views',exact:true}).click();
  await expect(table.locator('thead [data-views-period-column]')).toHaveAttribute('aria-sort','ascending');
  values=await table.locator('tbody tr[data-filter-row]:visible [data-views-period-column]').evaluateAll(cells=>cells.map(cell=>cell.dataset.sortValue).filter(value=>value!=='').map(Number));
  expect(values).toEqual([...values].sort((a,b)=>a-b));
  const menu=panel.locator('.table-export-dropdown');await menu.locator('summary').click();
  const pending=page.waitForEvent('download');await menu.getByRole('button',{name:'JSON (.json)',exact:true}).click();
  const download=await pending,report=JSON.parse(require('node:fs').readFileSync(await download.path(),'utf8'));
  expect(report.viewPeriod).toBe('Views - Last 7 Days');
  expect(report.columns.filter(column=>column.startsWith('Views'))).toEqual(['Views · Last 7 Days']);
  for(const row of report.rows){const expected=metric(records.get(String(row['LiveLabs ID'])),'Views - Last 7 Days');expect(row['Views · Last 7 Days']).toBe(expected===null?'N/A':expected.toLocaleString());}
  await panel.getByRole('button',{name:'Clear filters',exact:true}).click();await expect(select).toHaveValue('Views - Last 12 Months');
  await panel.locator('.table-quick-filters').scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath(`${view}-1440.png`),animations:'disabled'});
  for(const width of [1200,1100,1024,720]){
    await page.setViewportSize({width,height:1000});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${view} at ${width}: page overflow`).toBe(true);
    expect(await panel.locator('.table-quick-filters').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  }
  await page.setViewportSize({width:390,height:1000});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await expect(select).toBeVisible();
  await select.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath(`${view}-390.png`),animations:'disabled'});
  expect(errors).toEqual([]);
});

test('Views uses the same periods and search result actions use teal',async({page,request},testInfo)=>{
  const payload=await(await request.get('/inventory/data/public_portfolio_inventory.json')).json();
  const records=new Map(payload.records.map(record=>[String(record.livelabsId),record]));
  await page.goto('/views/',{waitUntil:'networkidle'});
  await expect(page.getByRole('combobox',{name:'View period',exact:true}).locator('option')).toHaveText(periods);
  for(const period of periods){
    await page.locator('#views-period').selectOption('Views - '+period);
    await expect(page.locator('#views-count-heading')).toHaveText('Views · '+period);
    const rows=await page.locator('#views-table-body tr[data-details-url]').evaluateAll(rows=>rows.map(row=>({id:new URL(row.dataset.detailsUrl).searchParams.get('livelabs_id'),text:row.lastElementChild.textContent})));
    expect(rows).toHaveLength(10);
    for(const row of rows){const expected=metric(records.get(row.id),'Views - '+period);expect(row.text).toBe(expected===null?'N/A':expected.toLocaleString());}
  }
  await page.goto('/dashboard/',{waitUntil:'networkidle'});
  await page.locator('#global-workshop-search').fill('adb');
  const result=page.locator('.author-search-result').first();await expect(result).toBeVisible();
  const primary=result.getByRole('link',{name:'Open record',exact:true}),secondary=result.locator('.author-search-actions .author-button').last();
  expect(await primary.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(37, 94, 99)');
  expect(await secondary.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
  await page.screenshot({path:testInfo.outputPath('search-actions-teal.png'),animations:'disabled'});
  await primary.focus();await expect(primary).toBeFocused();
  expect(await primary.evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('solid');
  await primary.click();await expect(page.locator('.search-item-banner')).toBeVisible();
});

test('periods stay independent across dashboard tabs and an empty urgent table spans every column',async({page,request})=>{
  await page.goto('/dashboard/?view=performance',{waitUntil:'networkidle'});
  const top=page.locator('.ranked-table-disclosure').filter({has:page.locator('#top-performers-table')});
  await top.locator(':scope > summary').click();
  await top.getByRole('combobox',{name:'View period',exact:true}).selectOption('Views - Last 14 Days');
  await page.getByRole('tab',{name:'P1 urgent action',exact:true}).click();
  const urgent=page.locator('.ranked-table-disclosure').filter({has:page.locator('#jenkins-p1-action-table')});
  await urgent.locator(':scope > summary').click();
  await expect(urgent.getByRole('combobox',{name:'View period',exact:true})).toHaveValue('Views - Last 12 Months');
  await page.getByRole('tab',{name:'Top Performers',exact:true}).click();
  await expect(top.getByRole('combobox',{name:'View period',exact:true})).toHaveValue('Views - Last 14 Days');
  const state=await(await request.get('/api/dashboard-admin-state')).json();
  await page.route('**/api/dashboard-admin-state',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...state,qaReportMerge:{...state.qaReportMerge,id:'empty-urgent-test',overlay:{}}})}));
  await page.goto('/dashboard/?view=urgent',{waitUntil:'networkidle'});
  const table=page.locator('#jenkins-p1-action-table');
  expect(await table.locator('tbody td[colspan]').getAttribute('colspan')).toBe(String(await table.locator('thead th').count()));
});
