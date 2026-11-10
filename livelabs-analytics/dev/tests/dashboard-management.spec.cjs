const { test, expect } = require('@playwright/test');
const { spawn, execFileSync } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

const root = path.resolve(__dirname, '../..');
let service, runtime, baseURL;
const password = randomBytes(24).toString('hex');
const reportId = 'b'.repeat(64);

test.beforeAll(async () => {
  runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'analytics-admin-regression-'));
  // Exercise the actual pinned report renderer, without importing private run data.
  const reportDir = path.join(runtime, 'jenkins-reports', reportId);
  fs.mkdirSync(reportDir, {recursive:true});
  const summary = {runId:'admin-shell-fixture',runType:'regression',startedAt:'2026-11-08T08:00:00Z',
    status:'passed',durationMs:1000,counts:{total:1,passed:1,failed:0},failures:[],failureCategories:[],sections:[],
    catalogItems:[{key:'workshop:123',catalogItem:{id:'123',livelabsId:'123',type:'workshop',title:'Admin layout fixture'},
      status:'passed',counts:{total:1,passed:1},tests:[{title:'Preview content',status:'passed'}]}]};
  const source = path.join(runtime,'fixture.json');
  fs.writeFileSync(source, JSON.stringify(summary));
  execFileSync('node', ['dev/scripts/render-jenkins-report.mjs',source,reportDir], {cwd:root,windowsHide:true});
  fs.writeFileSync(path.join(reportDir,'manifest.json'), JSON.stringify({id:reportId,runId:summary.runId,
    startedAt:summary.startedAt,runType:'regression',items:1,counts:summary.counts,sourceFile:'fixture.json',renderer:'pinned fixture',sourceSha256:'fixture',groupedIdentities:[]}));
  const script = `
import importlib.util, os, sys
from pathlib import Path
from http.server import ThreadingHTTPServer
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path('dev/scripts').resolve()))
spec = importlib.util.spec_from_file_location('admin_regression_server', 'dev/scripts/admin-server.py')
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)
app.STATE = Path(os.environ['ANALYTICS_TEST_STATE'])
app.DATABASE = app.STATE / 'admin.sqlite3'
app.JENKINS_ARCHIVE = app.STATE / 'jenkins-reports'
app.initialize()
app.configure('regression-reviewer', os.environ['ANALYTICS_TEST_PASSWORD'])
server = ThreadingHTTPServer(('127.0.0.1', 0), app.Handler)
port = server.server_address[1]
server.allowed_hosts = {f'127.0.0.1:{port}'}
server.public_origin = None
print(f'http://127.0.0.1:{port}', flush=True)
server.serve_forever()
`;
  service = spawn('python', ['-X', 'utf8', '-u', '-c', script], {
    cwd: root, windowsHide: true,
    env: { ...process.env, ANALYTICS_TEST_STATE: runtime, ANALYTICS_TEST_PASSWORD: password },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  baseURL = await new Promise((resolve, reject) => {
    let output = '', diagnostics = '';
    service.stderr.on('data', chunk => { diagnostics += chunk; });
    service.stdout.on('data', chunk => {
      output += chunk;
      const url = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (url) resolve(url[0]);
    });
    service.once('error', reject);
    service.once('exit', code => reject(new Error(`Isolated Admin service exited (${code}): ${diagnostics}`)));
  });
});

test('every Admin page shares compact navigation, responsive layout and working report views', async ({page}, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const login = await page.request.post(`${baseURL}/api/admin/login`, {data:{username:'regression-reviewer',password},headers:{Origin:baseURL}});
  expect(login.ok()).toBe(true);
  await page.goto(`${baseURL}/admin/governance`);
  await expect(page.locator('#snapshot-info')).toContainText('Capture the current inventory or import a snapshot');
  await expect(page.getByText('Unable to load this page',{exact:true})).not.toBeVisible();
  const session = await (await page.request.get(`${baseURL}/api/admin/session`)).json();
  const capture = await page.request.post(`${baseURL}/api/admin/snapshots`, {data:{captureCurrent:true},headers:{Origin:baseURL,'X-CSRF-Token':session.csrf}});
  expect(capture.ok()).toBe(true);
  const pages = [
    ['dashboard-management','Dashboard management'],['governance','Data governance'],
    ['data-merge','Data merge'],['jenkins','Jenkins reports'],['inventory','Portfolio inventory']
  ];
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    for (const [route,title] of pages) {
      await page.goto(`${baseURL}/admin/${route}`);
      await expect(page.locator('html')).not.toHaveClass(/page-loading/);
      await expect(page.locator('h1')).toHaveText(title);
      await expect(page.locator('.analytics-nav a')).toHaveText(pages.map(p=>p[1]));
      await expect(page.locator('.analytics-nav a[aria-current="page"]')).toHaveText(title);
      await expect(page.locator('.analytics-shell-layout a').filter({hasText:/^Back to dashboard$/})).toHaveCount(1);
      await expect(page.locator('main a[href^="/dashboard/"]')).toHaveCount(0);
      if (width < 950) {
        await expect(page.locator('.analytics-navigation')).not.toHaveAttribute('open','');
        await page.locator('.analytics-navigation > summary').click();
        await expect(page.getByRole('link',{name:'Back to dashboard',exact:true})).toBeVisible();
        await page.locator('.analytics-navigation > summary').click();
      }
      const header = page.locator('.admin-hero, .analytics-report-content > header');
      expect((await header.boundingBox()).height).toBeLessThan(width === 390 ? 320 : 225);
      await page.waitForLoadState('networkidle');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1), `${route} overflows at ${width}`).toBe(true);
      await expect(page.getByText('Unable to load this page',{exact:true})).not.toBeVisible();
      await page.screenshot({path:testInfo.outputPath(`${route}-${width}.png`),fullPage:true,animations:'disabled'});
      if (route === 'governance') {
        for (const tab of ['Data quality','Review decisions']) {
          await page.getByRole('tab',{name:tab,exact:true}).click();
          await expect(page.getByRole('tab',{name:tab,exact:true})).toHaveAttribute('aria-selected','true');
          await page.screenshot({path:testInfo.outputPath(`${tab.replaceAll(' ','-')}-${width}.png`),fullPage:true,animations:'disabled'});
        }
      }
      if (route === 'jenkins') {
        await expect(page.locator('[data-item-search]')).toBeVisible();
        await page.locator('[data-item-search]').fill('Admin layout fixture');
        await expect(page.locator('.result-row').first()).toBeVisible();
        await page.getByRole('link',{name:/Retest List/}).click();
        await expect(page.locator('h1')).toHaveText('Jenkins retest list');
        await expect(page.locator('.analytics-nav a[aria-current="page"]')).toHaveText('Jenkins reports');
        await page.screenshot({path:testInfo.outputPath(`jenkins-retest-${width}.png`),fullPage:true});
        await page.getByRole('link',{name:'All runs',exact:true}).click();
        await expect(page.locator('#report-version')).toBeEnabled();
        await expect(page.locator('#open-report')).toBeVisible();
        await page.screenshot({path:testInfo.outputPath(`jenkins-history-${width}.png`),fullPage:true});
      }
    }
  }
  // Optional local visual review of an existing run. Only immutable report files
  // are copied into the disposable test service; its real database is never used.
  if (process.env.ANALYTICS_UI_SAVED_REPORT_REVIEW === '1') {
    const archive = path.join(root,'.private/admin/jenkins-reports');
    const saved = fs.readdirSync(archive).find(name=>/^[a-f0-9]{64}$/.test(name));
    expect(saved).toBeTruthy();
    const target = path.join(runtime,'jenkins-reports',saved);
    fs.mkdirSync(target);
    for (const name of ['manifest.json','summary.html','retest-list.html','hub-ui.css']) {
      fs.copyFileSync(path.join(archive,saved,name),path.join(target,name));
    }
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await page.goto(`${baseURL}/admin/jenkins/report/${saved}/summary.html`);
      await expect(page.locator('.result-row').first()).toBeVisible();
      await page.locator('[data-item-filter]').selectOption('priority:P1');
      await page.locator('.result-row > summary').first().click();
      await expect(page.locator('.result-row[open]').first()).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({path:testInfo.outputPath(`jenkins-saved-run-${width}.png`),fullPage:true,animations:'disabled'});
    }
  }
  await page.goto(`${baseURL}/admin/user-settings`);
  await expect(page).toHaveURL(`${baseURL}/admin/dashboard-management`);
  await page.locator('.analytics-navigation > summary').click();
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(page).toHaveURL(`${baseURL}/admin`);
  expect((await page.request.get(`${baseURL}/api/admin/session`)).status()).toBe(401);
  expect(errors).toEqual([]);
});

test.afterAll(async () => {
  if (service && service.exitCode === null) {
    const stopped = once(service, 'exit');
    service.kill();
    await stopped;
  }
  if (runtime && path.dirname(runtime) === path.resolve(os.tmpdir()) && path.basename(runtime).startsWith('analytics-admin-regression-')) {
    fs.rmSync(runtime, { recursive: true, force: true });
  }
});

async function assignmentFixture(page) {
  const login = await page.request.post(`${baseURL}/api/admin/login`, {data:{username:'regression-reviewer',password},headers:{Origin:baseURL}});
  expect(login.ok()).toBe(true);
  const {csrf} = await (await page.request.get(`${baseURL}/api/admin/session`)).json();
  const records = Array.from({length:26}, (_,i)=>({key:`item-${i}`,livelabsId:String(8000+i),wmsId:String(i<2?9000:9000+i),
    title:i===25?'=SUM(1,2)':`Assignment item ${i}`,type:i%2?'Sprint':'Workshop',category:i%2?'Database':'OCI',owner:'reviewer@example.test',
    publishType:'Public',publishStatus:'Published',status:'Completed',update:'2026-10-31',
    details:[['Production URL','https://example.test/workshop'],['Support Contact Email','support@example.test'],['Views - Last 12 Months',1234]],
    sourceFlags:{dashboard_snapshot_date:'2026-11-09'},review:{readiness:'evidence-needed',reasons:['Verify publication date']}}));
  const rowOverrides = records.map((record,i)=>({id:`rule-${i}`,target:'livelabs_id',value:record.livelabsId,tags:['retired'],enabled:true}));
  rowOverrides.push({id:'family-rule',target:'wms_id',value:'9000',tags:['refresh'],enabled:true},
    {id:'missing-rule',target:'livelabs_id',value:'99999',recordTitle:'Missing item',tags:['retired'],enabled:false});
  const response=await page.request.post(`${baseURL}/api/admin/dashboard-state`, {headers:{Origin:baseURL,'X-CSRF-Token':csrf},data:{
    tagDefinitions:[{key:'retired',label:'Retired',description:'Retired workshop',color:'red'},
      {key:'refresh',label:'Refresh',description:'Review and refresh content',color:'teal'}],rowOverrides}});
  expect(response.ok()).toBe(true);
  await page.route('**/api/admin/inventory', route=>route.fulfill({json:{records,metadata:{snapshot_date:'2026-11-09'}}}));
  await page.goto(`${baseURL}/admin/dashboard-management`);
  await expect(page.locator('#status')).toContainText('Loaded saved dashboard tags');
  await expect(page.locator('html')).not.toHaveClass(/page-loading/);
}

test('assignment table filters, sorts, pages and edits the exact rule from an expanded row', async ({page}, testInfo) => {
  await assignmentFixture(page);
  const panel=page.locator('.current-assignment-panel');
  await expect(panel.getByRole('table')).toBeVisible();
  await panel.screenshot({path:testInfo.outputPath('assignments-desktop-table.png')});
  await expect(panel.locator('thead th')).toHaveText(['LiveLabs ID','WMS ID','Title','Council','Author / owner','Type','Tags','Match rule','Added']);
  await expect(page.locator('#assignment-page-status')).toHaveText('1–10 of 29 rows');
  await expect(panel.locator('[data-assignment-row]')).toHaveCount(10);
  await page.locator('#assignment-next').click();
  await expect(page.locator('#assignment-page-status')).toHaveText('11–20 of 29 rows');
  await page.locator('#assignment-type').selectOption('Sprint');
  await expect(page.locator('#assignment-page-status')).toHaveText('1–10 of 14 rows');
  expect(await panel.locator('[data-assignment-row] td:nth-child(6)').allTextContents()).toEqual(Array(10).fill('Sprint'));
  await page.locator('#assignment-type').selectOption('Workshop');
  expect(await panel.locator('[data-assignment-row] td:nth-child(6)').allTextContents()).toEqual(Array(10).fill('Workshop'));
  await page.locator('#assignment-type').selectOption('');
  await panel.locator('summary').filter({hasText:'Apply filters'}).click();
  await page.locator('#assignment-council').selectOption('Database');
  await page.locator('#assignment-tag').selectOption('refresh');
  await expect(panel.locator('[data-assignment-row]')).toHaveCount(1);
  await expect(panel.locator('[data-assignment-row] td:first-child')).toHaveText('8001');
  await page.locator('#assignment-clear').click();
  await page.locator('#assignment-livelabs-filter').fill('8000');
  await page.locator('#assignment-wms-filter').fill('9000');
  await expect(panel.locator('[data-assignment-row]')).toHaveCount(2);
  await page.locator('#assignment-clear').click();
  await page.locator('#assignment-target-filter').selectOption('wms_id');
  await expect(panel.locator('[data-assignment-row]')).toHaveCount(2);
  await panel.getByRole('button',{name:'Sort by LiveLabs ID',exact:true}).click();
  await expect(panel.locator('[data-assignment-row] td:first-child')).toHaveText(['8001','8000']);
  await panel.locator('[data-assignment-row]').first().click();
  await expect(panel.locator('.assignment-rule-scope')).toContainText('2 items');
  await expect(panel.locator('.assignment-item-details')).toContainText('Assignment item 1');
  await panel.getByText('Source fields',{exact:true}).click();
  await expect(panel.locator('.assignment-item-details')).toContainText('support@example.test');
  await panel.screenshot({path:testInfo.outputPath('assignments-desktop-expanded.png')});
  await panel.getByRole('button',{name:'Edit tags',exact:true}).click();
  await panel.locator('.assignment-edit-tags input[value="retired"]').check();
  await panel.getByRole('button',{name:'Save tags',exact:true}).click();
  await expect(page.locator('#status')).toContainText('Saved 2 tags');
  const state=await (await page.request.get(`${baseURL}/api/admin/dashboard-state`)).json();
  expect(state.state.rowOverrides.find(r=>r.id==='family-rule').tags).toEqual(['retired','refresh']);
  expect(state.state.rowOverrides.find(r=>r.id==='rule-0').tags).toEqual(['retired']);
  await page.reload();
  await expect(panel.locator('[data-assignment-row]')).toHaveCount(10);
  await page.locator('#assignment-search').fill('8000');
  await expect(panel.locator('[data-assignment-row]')).toHaveCount(2);
  await page.screenshot({path:testInfo.outputPath('assignments-desktop.png'),fullPage:true});
});

test('assignment rows retain drafts on failed saves, support keyboard actions and fit mobile', async ({page}, testInfo) => {
  await assignmentFixture(page);
  const panel=page.locator('.current-assignment-panel');
  await page.locator('#assignment-search').fill('8002');
  await expect(panel.locator('[data-assignment-row]')).toHaveCount(1);
  const toggle=panel.locator('[data-toggle-assignment]');
  await toggle.focus();
  await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded','true');
  await toggle.press('Space');
  await expect(toggle).toHaveAttribute('aria-expanded','false');
  await expect(toggle).toBeFocused();
  await toggle.press('Enter');
  await panel.getByRole('button',{name:'Edit tags',exact:true}).click();
  await panel.locator('.assignment-edit-tags input[value="refresh"]').check();
  await page.route('**/api/admin/dashboard-state', route=>route.request().method()==='POST'?route.fulfill({status:500,json:{error:'Test save failure'}}):route.continue());
  await panel.getByRole('button',{name:'Save tags',exact:true}).click();
  await expect(panel.getByRole('status')).toContainText('Could not save assignment');
  await expect(panel.locator('.assignment-edit-tags input[value="refresh"]')).toBeChecked();
  await panel.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.unroute('**/api/admin/dashboard-state');
  await page.setViewportSize({width:390,height:844});
  await panel.scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await panel.getByRole('button',{name:'Edit tags',exact:true}).scrollIntoViewIfNeeded();
  await expect(panel.getByRole('button',{name:'Edit tags',exact:true})).toBeInViewport();
  const actionBox=await panel.getByRole('button',{name:'Edit tags',exact:true}).boundingBox();
  expect(actionBox.x).toBeGreaterThanOrEqual(0);
  expect(actionBox.x+actionBox.width).toBeLessThanOrEqual(390);
  await page.screenshot({path:testInfo.outputPath('assignments-mobile-expanded.png'),fullPage:true});
  await panel.getByRole('button',{name:'Remove assignment',exact:true}).click();
  await panel.getByRole('button',{name:'Confirm removal',exact:true}).click();
  await expect(panel.locator('[data-assignment-row]')).toHaveCount(0);
  await expect(panel).toContainText('No assignments match these filters');
  const state=await (await page.request.get(`${baseURL}/api/admin/dashboard-state`)).json();
  expect(state.state.rowOverrides.some(r=>r.id==='rule-2')).toBe(false);
  await page.locator('#assignment-clear').click();
  await page.locator('#assignment-page-size').selectOption('50');
  await expect(panel.locator('[data-assignment-row]')).toHaveCount(28);
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#assignment-export').click();
  const file=await (await downloadPromise).path();
  expect(fs.readFileSync(file,'utf8')).toContain("'=SUM(1,2)");
  await page.locator('#assignment-search').fill('99999');
  await panel.locator('[data-toggle-assignment]').click();
  await expect(panel).toContainText('not in the current inventory');
  await expect(panel).toContainText('Disabled');
});

test('sign-in loads Dashboard management and its protected inventory', async ({ page }, testInfo) => {
  const scriptErrors = [];
  page.on('pageerror', error => scriptErrors.push(error.message));
  expect((await page.request.get(`${baseURL}/api/admin/inventory`)).status()).toBe(401);
  await page.goto(`${baseURL}/admin`);
  await expect(page.locator('html')).not.toHaveClass(/page-loading/);
  await expect(page.locator('.rail')).toHaveCount(0);
  await expect(page.getByRole('link', {name:'Back to dashboard',exact:true})).toHaveCount(1);
  await page.screenshot({path:testInfo.outputPath('sign-in.png'),fullPage:true});
  await page.getByLabel('Username', { exact: true }).fill('regression-reviewer');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(`${baseURL}/admin/dashboard-management`);
  await expect(page.locator('#status')).toContainText(/Loaded (saved dashboard|existing browser) tags/);
  await expect(page.getByText('Unable to load this page', { exact: true })).not.toBeVisible();
  const inventoryResponse = await page.request.get(`${baseURL}/api/admin/inventory`);
  expect(inventoryResponse.ok()).toBe(true);
  const inventory = await inventoryResponse.json();
  const record = inventory.records.find(item => item.livelabsId && item.title);
  expect(record).toBeTruthy();
  await page.locator('#item-search').fill(record.livelabsId);
  await expect(page.locator('#item-results')).toContainText(record.title);
  expect((await page.request.get(`${baseURL}/inventory/data/portfolio_inventory.json`)).status()).toBe(404);
  expect(scriptErrors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('dashboard-management.png'), fullPage: true });
  await page.goto(`${baseURL}/admin/inventory`);
  await expect(page.locator('#count-all')).toHaveText(inventory.records.length.toLocaleString());
  await expect(page.locator('#inventory-table thead th').filter({hasText:/^(LiveLabs ID|WMS ID|Title|Author \/ owner)$/})).toHaveText(['LiveLabs ID','WMS ID','Title','Author / owner']);
  for(const kind of ['Workshop','Sprint']) {
    await page.locator('#inventory-type').selectOption(kind);
    await expect(page.locator('#inventory-count')).toHaveText(`${inventory.records.filter(r=>r.type===kind).length.toLocaleString()} records`);
    const kinds=await page.locator('#inventory-rows tr td:nth-child(5)').allTextContents();
    expect(kinds.every(value=>value===kind)).toBe(true);
  }
  await page.locator('#inventory-type').selectOption('');
  await expect(page.locator('#audit-calibration')).toContainText('Threshold sensitivity by content type');
  await page.locator('#inventory-cleanup-queue').selectOption({label:'Removal requests'});
  const requests=inventory.records.filter(r=>r.cleanupQueues.includes('Removal requests'));
  await expect(page.locator('#inventory-count')).toHaveText(`${requests.length.toLocaleString()} records`);
  await page.locator('[data-manage-key]').first().click();
  await expect(page.locator('#review-current')).toContainText('Source retirement confirmed: no');
  expect(scriptErrors).toEqual([]);
  await page.screenshot({path:testInfo.outputPath('cleanup-inventory.png'),fullPage:true});
});
