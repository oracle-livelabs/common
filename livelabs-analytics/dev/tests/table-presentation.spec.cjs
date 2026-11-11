const {test,expect}=require('@playwright/test');

const tables = [
  ['performance','top-performers-table',['LiveLabs ID','WMS ID','Title','Council','Last Update','Author Email','#','Type','Views 12m','Views 90d','Score','Errors Found']],
  ['urgent','jenkins-p1-action-table',['LiveLabs ID','Title','Author / owner','Type','Action','P1 findings','Occurrences','Record']],
  ['at-risk','at-risk-table',['LiveLabs ID','WMS ID','Title','Council','Last Update','Author','#','Type','Review status','Views 12m','Score','Errors Found']],
  ['retirement','retirement-review-table',['LiveLabs ID','WMS ID','Title','Council','Last Update','Author','#','Type','Review status','Views 12m','Score','Errors Found']],
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
    const filters=body.locator('.filter-disclosure');
    if(!(await filters.getAttribute('open')))await filters.locator(':scope > summary').click();
    const idFilter=filters.locator('.filter-field').filter({has:page.locator('span',{hasText:/^LiveLabs ID$/})}).locator('input');
    await idFilter.fill(original[0].id);
    await expect(table.locator('tbody tr[data-filter-row="true"]:visible').first().locator('td').first()).toHaveAttribute('data-filter-value',original[0].id);
    await idFilter.fill('');
    await table.getByRole('button',{name:'LiveLabs ID',exact:true}).click();
    await expect(table.locator('thead th').first()).toHaveAttribute('aria-sort',/ascending|descending/);
    const direction=await table.locator('thead th').first().getAttribute('aria-sort');
    const ids=await table.locator('tbody tr[data-filter-row="true"]:visible').evaluateAll(rows=>rows.map(r=>Number(r.cells[0].dataset.sortValue)));
    expect(ids).toEqual([...ids].sort((a,b)=>direction==='ascending'?a-b:b-a));
    const fields=await filters.locator('.filter-grid [data-column-index]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.columnIndex)));
    expect(fields).toEqual([...fields].sort((a,b)=>a-b));
    await table.scrollIntoViewIfNeeded();
    await page.screenshot({path:testInfo.outputPath(id+'.png'),animations:'disabled'});
    // Reinitialization must preserve the same existing fields and row identities.
    await expect(table.locator('thead th')).toHaveText(headers);
    expect(await table.locator('tbody tr[data-filter-row="true"]').count()).toBe(original.length);
  }
  expect(errors).toEqual([]);
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
