const {test, expect} = require('@playwright/test');

const tableStyle = table => {
  const th = table.querySelector('thead th');
  const td = table.querySelector('tbody tr:not([hidden]) td');
  const header = getComputedStyle(th), cell = getComputedStyle(td);
  return {headerBg:header.backgroundColor, headerColor:header.color, headerFont:header.fontSize,
    headerWeight:header.fontWeight, headerPadding:header.padding, cellFont:cell.fontSize, family:cell.fontFamily,
    cellPadding:cell.padding, borderColor:cell.borderBottomColor};
};

test('Dashboard and Views share table styling and controls at desktop and mobile widths', async ({page},testInfo) => {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    let expected;
    for (const [route,id] of [['dashboard/?view=performance','#top-performers-table'],['dashboard/?view=urgent','#jenkins-p1-action-table'],['dashboard/?view=at-risk','#at-risk-table'],['dashboard/?view=retirement','#retirement-review-table'],['views/','.views-table']]) {
      await page.goto('/'+route,{waitUntil:'networkidle'});
      const table=page.locator(id);
      const panel=page.locator('.ranked-table-disclosure').filter({has:table});
      if (await panel.count()) await panel.locator(':scope > summary').click();
      const actual=await table.evaluate(tableStyle);
      if (!expected) expected=actual;
      expect(actual,route).toEqual(expected);
      expect(actual.headerBg).toBe('rgb(237, 243, 242)');
      expect(actual.headerColor).toBe('rgb(49, 86, 93)');
      expect(actual.family).toContain('Oracle Sans');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route).toBe(true);
      await table.scrollIntoViewIfNeeded();
      if (route==='views/' || route.includes('performance')) await page.screenshot({path:testInfo.outputPath(`${route==='views/'?'views':'dashboard'}-${width}.png`),animations:'disabled'});
    }
    await page.goto('/views/',{waitUntil:'networkidle'});
    const row=page.locator('.views-table tbody tr').first();
    await row.hover();
    expect(await row.locator('td').first().evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(234, 242, 240)');
    await page.locator('#views-next').click();
    await expect(page.locator('#views-page-label')).toHaveText('Page 2 of 89');
  }
  expect(errors).toEqual([]);
});
