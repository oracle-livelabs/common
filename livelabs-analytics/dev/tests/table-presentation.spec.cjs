const {test,expect}=require('@playwright/test');

const tables = [
  ['performance','top-performers-table',['#','LiveLabs ID','WMS ID','Title','Council','WMS Last Update','Author Email','Additional contact email','Type','Views','Score','Errors Found']],
  ['urgent','jenkins-p1-action-table',['#','LiveLabs ID','Title','Author / owner','Additional contact email','Type','Views','Issues']],
  ['at-risk','at-risk-table',['#','LiveLabs ID','WMS ID','Title','Council','WMS Last Update','Author','Additional contact email','Type','Review status','Views','Score','Errors Found']],
  ['retirement','retirement-review-table',['#','LiveLabs ID','WMS ID','Title','Council','WMS Last Update','Author','Additional contact email','Type','Review status','Views','Score','Errors Found']],
];

test('existing content tables keep their fields and WMS order through filtering, sorting and reset',async({page},testInfo)=>{
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  for(const [view,id,headers] of tables){
    await page.goto('/dashboard/?view='+view,{waitUntil:'networkidle'});
    const table=page.locator('#'+id);
    const disclosure=table.locator('xpath=ancestor::details[contains(@class,"ranked-table-disclosure")]').first();
    if(await disclosure.count() && !(await disclosure.getAttribute('open')))await disclosure.locator(':scope > summary').click();
    await expect(table.locator('thead th')).toHaveText(headers);
    const body=table.locator('xpath=ancestor::div[contains(@class,"toggle-body")]').first();
    const type=body.getByRole('combobox',{name:'Content type',exact:true});
    await expect(type).toBeVisible();
    await expect(body.getByRole('searchbox',{name:'Search this table',exact:true})).toBeVisible();
    await expect(type.locator('option')).toHaveText(['All items','Workshops only','Sprints only']);
    const original=await table.locator('tbody tr[data-filter-row="true"]').evaluateAll(rows=>rows.map(r=>({id:r.dataset.livelabsId,type:r.dataset.contentType})));
    for(const kind of ['Workshop','Sprint']){
      await type.selectOption(kind);
      const actual=await table.locator('tbody tr[data-filter-row="true"]').evaluateAll(rows=>rows.filter(r=>!r.hidden).map(r=>({id:r.dataset.livelabsId,type:r.dataset.contentType})));
      const expected=original.filter(r=>r.type===kind);
      expect(actual.length).toBe(Math.min(10,expected.length));
      expect(actual.every(r=>r.type===kind)).toBe(true);
      expect(actual.every(r=>expected.some(e=>e.id===r.id))).toBe(true);
    }
    await type.selectOption('');
    await expect(body.locator('.filter-disclosure, [data-filter-mode="review-focus"], .filter-grid')).toHaveCount(0);
    const idFilter=body.getByRole('searchbox',{name:'Search this table',exact:true});
    await idFilter.fill(original[0].id);
    await expect(table.locator('tbody tr[data-filter-row="true"]:visible').first().locator('td[data-column-label="LiveLabs ID"]')).toHaveAttribute('data-filter-value',original[0].id);
    await idFilter.fill('');
    const idButton=table.getByRole('button',{name:'LiveLabs ID',exact:true});
    const idIndex=Number(await idButton.getAttribute('data-column-index'));
    await idButton.click();
    const idHeader=table.locator(`thead th[data-sort-column-index="${idIndex}"]`);
    await expect(idHeader).toHaveAttribute('aria-sort',/ascending|descending/);
    const direction=await idHeader.getAttribute('aria-sort');
    const ids=await table.locator('tbody tr[data-filter-row="true"]:visible').evaluateAll((rows,index)=>rows.map(r=>Number(r.querySelectorAll('td[data-filter-value]')[index].dataset.sortValue)),idIndex);
    expect(ids).toEqual([...ids].sort((a,b)=>direction==='ascending'?a-b:b-a));
    await table.scrollIntoViewIfNeeded();
    await page.screenshot({path:testInfo.outputPath(id+'.png'),animations:'disabled'});
    // Reinitialization must preserve the same existing fields and row identities.
    await expect(table.locator('thead th')).toHaveText(headers);
    expect(await table.locator('tbody tr[data-filter-row="true"]').count()).toBe(original.length);
  }
  expect(errors).toEqual([]);
});

test('ranked table exports the filtered, sorted visible page using the selected page size',async({page,request})=>{
  const payload=await (await request.get('/inventory/data/public_portfolio_inventory.json')).json();
  await page.goto('/dashboard/?view=performance',{waitUntil:'networkidle'});
  const table=page.locator('#top-performers-table');
  const disclosure=table.locator('xpath=ancestor::details[contains(@class,"ranked-table-disclosure")]').first();
  if(!(await disclosure.getAttribute('open')))await disclosure.locator(':scope > summary').click();
  const body=table.locator('xpath=ancestor::div[contains(@class,"toggle-body")]').first();
  const type=body.getByRole('combobox',{name:'Content type',exact:true});
  const contact=body.getByRole('searchbox',{name:'Search this table',exact:true});
  const target=await table.locator('tbody tr[data-filter-row="true"]').first().evaluate(row=>({id:row.dataset.livelabsId,type:row.dataset.contentType}));
  const record=payload.records.find(item=>String(item.livelabsId||'')===String(target.id));
  expect(record).toBeTruthy();
  const contactValue=[record.owner,...(record.details||[]).filter(pair=>Array.isArray(pair)&&/owner|author|support|technical|manager|contact/i.test(String(pair[0]))).map(pair=>pair[1])].find(value=>/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(String(value||'')));
  expect(contactValue).toBeTruthy();
  await contact.fill(contactValue);
  await expect.poll(()=>table.locator('tbody tr[data-filter-row="true"]:visible').evaluateAll(rows=>rows.map(row=>row.dataset.livelabsId))).toContain(String(target.id));
  await contact.fill('');
  await type.selectOption('Workshop');
  const range=body.locator(`[data-pagination-range-for="${await table.evaluate(el=>el.closest('[data-filter-table]').dataset.filterTable)}"]`);
  const rangeText=await range.first().textContent();
  const matchedCount=Number(rangeText.match(/of\s+(\d+)\s+filtered rows/i)?.[1] || rangeText.match(/of\s+(\d+)\s+rows/i)?.[1] || 0);
  expect(matchedCount).toBeGreaterThan(10);
  const visiblePageCount=Math.min(100,matchedCount);
  await body.locator(`[data-page-size-for="${await table.evaluate(el=>el.closest('[data-filter-table]').dataset.filterTable)}"]`).first().selectOption('100');
  const visibleIds=await table.locator('tbody tr[data-filter-row="true"]:visible').evaluateAll(rows=>rows.map(row=>row.dataset.livelabsId));
  expect(visibleIds).toHaveLength(visiblePageCount);
  const menu=table.locator('xpath=ancestor::div[contains(@class,"toggle-body")]').locator('.table-export-dropdown');
  const exports={};
  for(const format of ['csv','xlsx','json']) {
    await menu.locator(':scope > summary').click();
    const pending=page.waitForEvent('download');
    await menu.getByRole('button',{name:format==='xlsx'?'Excel (.xlsx)':`${format.toUpperCase()} (.${format})`}).click();
    const download=await pending;
    expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${format}$`));
    exports[format]=await require('node:fs/promises').readFile(await download.path());
  }
  expect(exports.csv.toString('utf8').startsWith('\uFEFF')).toBe(true);
  expect(exports.xlsx.subarray(0,2).toString()).toBe('PK');
  const exported=JSON.parse(exports.json.toString('utf8'));
  expect(exported.rowCount).toBe(visibleIds.length);
  expect(exported.rows).toHaveLength(visibleIds.length);
  expect(exported.rows.map(row=>String(row['LiveLabs ID']))).toEqual(visibleIds);
  expect(exported.rows.every(row=>row.Type==='Workshop')).toBe(true);
  expect(exported.appliedFilters).toEqual(expect.arrayContaining([expect.objectContaining({value:'Workshop'})]));
  await expect(body.locator(`[data-table-export-status="top-performers-table"]`)).toHaveText(`${visiblePageCount} visible page rows exported.`);
});

test('dashboard tabs stay readable and support navigation on desktop and mobile',async({page},testInfo)=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  function luminance(rgb){return rgb.match(/\d+/g).slice(0,3).map(Number).map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0);}
  async function expectContrast(tab){
    const colors=await tab.evaluate(el=>{const s=getComputedStyle(el);return {fg:s.color,bg:s.backgroundColor};});
    const [a,b]=[luminance(colors.fg),luminance(colors.bg)].sort((a,b)=>b-a);
    expect((a+.05)/(b+.05)).toBeGreaterThanOrEqual(4.5);
  }
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});
    await page.goto('/dashboard/',{waitUntil:'networkidle'});
    await expect(page.locator('html')).not.toHaveClass(/page-loading/);
    const nav=page.getByRole('tablist',{name:'Dashboard sections'});
    const tabs=nav.getByRole('tab');
    await expect(tabs).toHaveCount(4);
    await expectContrast(tabs.first());
    await tabs.nth(1).hover();
    await expectContrast(tabs.nth(1));
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected','true');
    await expect(page.locator('#jenkins-p1-slot')).toBeVisible();
    expect(await tabs.nth(1).evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('solid');
    await page.keyboard.press('End');
    await expect(tabs.last()).toHaveAttribute('aria-selected','true');
    await expect(page.locator('#retire-now-content')).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/page-loading/);
    await expect(tabs.last()).toBeFocused();
    await page.keyboard.press('Home');
    await expect(tabs.first()).toHaveAttribute('aria-selected','true');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    expect(await tabs.evaluateAll(nodes=>nodes.every(el=>{
      const rect=el.getBoundingClientRect();
      return rect.width>=44 && rect.height>=44 && el.scrollWidth<=el.clientWidth+1;
    }))).toBe(true);
    await nav.screenshot({path:testInfo.outputPath(`tabs-focus-${width}.png`),animations:'disabled'});
    await page.getByRole('heading',{level:1}).click();
    await page.mouse.move(0,0);
    await nav.screenshot({path:testInfo.outputPath(`tabs-${width}.png`),animations:'disabled'});
    await page.screenshot({path:testInfo.outputPath(`dashboard-${width}.png`),animations:'disabled'});
  }
});
