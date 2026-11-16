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
    await expect(matches.filter({hasText:target.title}).first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp('q='));
  }
  await matches.filter({hasText:target.title}).first().getByRole('link',{name:'Open record',exact:true}).click();
  await expect(page.locator('.search-view-header h2')).toHaveText(target.title);
  await page.goBack();await expect(input).toHaveValue('modern data warehouse');
  await expect(matches.filter({hasText:target.title}).first()).toBeVisible();
  await page.goForward();await expect(page.locator('.search-view-header h2')).toHaveText(target.title);
  await page.getByRole('button',{name:'Back to Dashboard',exact:true}).click();
  const unicode=records.find(r=>/[^\x00-\x7F]/.test(r.title));
  if(unicode){await input.fill(unicode.title);await expect(matches.filter({hasText:unicode.title}).first()).toBeVisible();}
  await input.fill('zz-no-such-item-<script>');
  await expect(page.locator('[data-search-status]')).toHaveText('No matches');
  await expect(matches).toHaveCount(0);
  await page.locator('[data-search-clear]').click();await expect(input).toHaveValue('');
  const families=new Map();for(const r of records){const key=String(r.wmsId);families.set(key,[...(families.get(key)||[]),r]);}
  const [wms]=[...families].find(([id,items])=>id&&id!=='undefined'&&items.length>1);
  await page.goto('/search/?wms_id='+encodeURIComponent(wms),{waitUntil:'networkidle'});
  await expect(page.locator('[data-search-status]')).toContainText('Multiple records match');
  await expect(page.locator('.search-view-header h2')).toHaveCount(0);
  expect(errors).toEqual([]);
});
