const {test, expect} = require('@playwright/test');

const tables = [
  ['performance','top-performers-table'], ['urgent','jenkins-p1-action-table'],
  ['at-risk','at-risk-table'], ['retirement','retirement-review-table'],
];

test('contact columns remain balanced on desktop and scroll within the table on mobile', async ({page}, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [view, id] of tables) {
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(`/dashboard/?view=${view}`, {waitUntil:'networkidle'});
    const table = page.locator('#' + id);
    const panel = page.locator('.ranked-table-disclosure').filter({has:table});
    await panel.locator(':scope > summary').click();
    for (const width of [1920,1440,390]) {
      await page.setViewportSize({width,height:1000});
      await table.scrollIntoViewIfNeeded();
      const layout = await table.evaluate(table => {
        const wrapper = table.closest('.table-wrap');
        const headers = [...table.tHead.rows[0].cells];
        const row = [...table.tBodies[0].rows].find(row => !row.hidden && row.matches('[data-filter-row]'));
        const cells = [...row.cells];
        const contactIndex = headers.findIndex(cell => cell.dataset.columnLabel === 'Additional contact email');
        return {
          pageFits:document.documentElement.scrollWidth <= innerWidth + 1,
          tableFits:table.getBoundingClientRect().width <= wrapper.clientWidth + 1,
          scrollable:getComputedStyle(wrapper).overflowX === 'auto',
          correctCount:headers.length === cells.length,
          besideOwner:/Author/.test(headers[contactIndex - 1]?.dataset.columnLabel),
          contactWidth:cells[contactIndex].getBoundingClientRect().width,
          noCellOverflow:cells.every(cell => cell.scrollWidth <= cell.clientWidth + 1),
          noOverlap:cells.every((cell,index) => !index || cell.getBoundingClientRect().left >= cells[index - 1].getBoundingClientRect().right - 1),
        };
      });
      expect(layout.pageFits).toBe(true);
      expect(layout.correctCount, `${view} at ${width}: column count`).toBe(true);
      expect(layout.besideOwner, `${view} at ${width}: contact position`).toBe(true);
      expect(layout.noCellOverflow, `${view} at ${width}: text overflow`).toBe(true);
      expect(layout.noOverlap, `${view} at ${width}: overlapping cells`).toBe(true);
      expect(layout.contactWidth).toBeGreaterThan(100);
      if (width >= 1440) expect(layout.tableFits).toBe(true);
      else expect(layout.scrollable).toBe(true);
      if (width !== 1920) await page.screenshot({path:testInfo.outputPath(`${view}-${width}.png`), animations:'disabled'});
    }
  }
  expect(errors).toEqual([]);
});

test('contacts sort and export with their rows and missing contact data shows N/A', async ({page,request}) => {
  const contacts = await (await request.get('/api/dashboard-contacts')).json();
  await page.goto('/dashboard/?view=performance',{waitUntil:'networkidle'});
  const table = page.locator('#top-performers-table');
  const panel = page.locator('.ranked-table-disclosure').filter({has:table});
  await panel.locator(':scope > summary').click();
  await table.getByRole('button',{name:'Additional contact email',exact:true}).click();
  const visible = await table.locator('tbody tr[data-filter-row]:visible').evaluateAll(rows => rows.map(row => ({
    id:row.dataset.livelabsId, email:row.querySelector('.dashboard-contact-email')?.textContent || '',
  })));
  const collator = new Intl.Collator(undefined,{sensitivity:'base'});
  expect(visible.map(item=>item.email)).toEqual(visible.map(item=>item.email).sort((a,b)=>collator.compare(a,b)));
  visible.forEach(item => expect(item.email).toBe(contacts.items[item.id]?.email || ''));
  const menu = panel.locator('.table-export-dropdown');
  await menu.locator('summary').click();
  const pending = page.waitForEvent('download');
  await menu.getByRole('button',{name:'JSON (.json)',exact:true}).click();
  const download = await pending;
  const exported = JSON.parse(require('node:fs').readFileSync(await download.path(),'utf8'));
  exported.rows.forEach((row,index) => expect(row['Additional contact email']).toContain(visible[index].email));
  await page.route('**/api/dashboard-contacts',route=>route.fulfill({status:404,body:'Not found'}));
  for (const [view,id] of tables) {
    await page.goto(`/dashboard/?view=${view}`,{waitUntil:'networkidle'});
    const values = await page.locator(`#${id} td[data-additional-contact-column]`).allTextContents();
    expect(values.length).toBeGreaterThan(0);
    expect(new Set(values)).toEqual(new Set(['N/A']));
  }
});
