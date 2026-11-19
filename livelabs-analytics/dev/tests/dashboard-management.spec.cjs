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

test('Admin tables and saved Jenkins reports load the shared table theme', async ({page},testInfo) => {
  const login=await page.request.post(`${baseURL}/api/admin/login`,{data:{username:'regression-reviewer',password},headers:{Origin:baseURL}});
  expect(login.ok()).toBe(true);
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    for (const [route,selector] of [['inventory','#inventory-table thead th'],['dashboard-management','#assignment-table thead th'],[`jenkins/report/${reportId}/summary.html`,'.result-table-head']]) {
      await page.goto(`${baseURL}/admin/${route}`,{waitUntil:'networkidle'});
      const header=page.locator(selector).first();
      const styles=await header.evaluate(el=>{const s=getComputedStyle(el);return {background:s.backgroundColor,color:s.color,font:s.fontSize,weight:s.fontWeight};});
      expect(styles).toEqual({background:'rgb(237, 243, 242)',color:'rgb(49, 86, 93)',font:'12px',weight:'600'});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      await page.screenshot({path:testInfo.outputPath(`shared-${route.split('/')[0]}-${width}.png`),animations:'disabled'});
    }
  }
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
    ['weekly-update','Weekly analytics update'],['data-merge','Data merge'],['jenkins','Jenkins reports'],
    ['dashboard-management','Dashboard tags'],['inventory','Portfolio inventory'],
    ['inventory/author-contributor-gaps','Missing contact'],['governance','Data governance']
  ];
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    for (const [route,title] of pages) {
      await page.goto(`${baseURL}/admin/${route}`);
      await expect(page.locator('html')).not.toHaveClass(/page-loading/);
      await expect(page.locator('h1')).toHaveText(title);
      if (route === 'weekly-update') expect((await page.locator('#weekly-run-select').boundingBox()).height).toBeLessThan(55);
      await expect(page.locator('.analytics-nav a')).toHaveText(['Dashboard tags','Portfolio inventory','Missing contact','Jenkins reports']);
      expect(await page.locator('.analytics-nav a').evaluateAll(links=>links.map(link=>link.getAttribute('href')))).toEqual([
        '/admin/dashboard-management','/admin/inventory','/admin/inventory/author-contributor-gaps','/admin/jenkins'
      ]);
      if (['weekly-update','data-merge','governance'].includes(route)) await expect(page.locator('.analytics-nav a[aria-current="page"]')).toHaveCount(0);
      else await expect(page.locator('.analytics-nav a[aria-current="page"]')).toHaveText(title);
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

test('Admin imports, maps, exports and applies QA without joining WMS siblings', async ({page}, testInfo) => {
  test.setTimeout(180000);
  const login=await page.request.post(`${baseURL}/api/admin/login`, {data:{username:'regression-reviewer',password},headers:{Origin:baseURL}});
  expect(login.ok()).toBe(true);
  const {csrf}=await (await page.request.get(`${baseURL}/api/admin/session`)).json();
  const headers={Origin:baseURL,'X-CSRF-Token':csrf};
  expect((await page.request.post(`${baseURL}/api/admin/snapshots`,{headers,data:{captureCurrent:true}})).ok()).toBe(true);
  expect((await page.request.post(`${baseURL}/api/admin/qa-snapshots`,{headers,data:{action:'upload',label:'Older QA fixture',summary:{runId:'older-fixture',catalogItems:[{catalogItem:{livelabsId:'3570',type:'workshop'},counts:{passed:1},tests:[{title:'Content',status:'passed'}]}]}}})).ok()).toBe(true);
  await page.goto(`${baseURL}/admin/data-merge`);
  await expect(page.locator('html')).not.toHaveClass(/page-loading/);
  const records=['3570','598','931'].map((id,i)=>({key:'livelabs:'+id,livelabsId:id,wmsId:'family-fixture',title:`Merge fixture ${i}`,type:'Workshop',publishType:'Public',publishStatus:'Published'}));
  const snapshot={metadata:{snapshot_date:'2026-11-10'},records};
  await page.locator('#import-snapshot').setInputFiles({name:'acceptance-inventory.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(snapshot))});
  await expect(page.locator('#status')).toContainText('Analytics source saved: 3 records');
  await expect(page.locator('#snapshot-select option:checked')).toContainText('acceptance-inventory.json');
  const catalogItems=['3570','598','999999'].map((id,i)=>({key:'workshop:'+id,catalogItem:{id,livelabsId:id,wmsId:'family-fixture',title:`QA fixture ${i}`,type:'workshop'},status:'failed',counts:{total:2,passed:1,failed:1},tests:[{title:'Content',status:'failed'},{title:'Links',status:'passed'}],issues:[{code:i===1?'BROKEN_VISIBLE_LINK':'POSSIBLE_TYPO',count:i===1?1:2}]}));
  const summary={runId:'acceptance-merge-fixture',runType:'regression',startedAt:'2026-11-10T08:00:00Z',status:'failed',catalogItems,sourceReport:{}};
  await page.locator('#import-jenkins-pair').setInputFiles({name:'acceptance-qa.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(summary))});
  await expect(page.locator('#status')).toContainText('Jenkins report saved: 3 items');
  await expect(page.locator('#jenkins-select option:checked')).toContainText('acceptance-merge-fixture');
  await expect(page.locator('#snapshot-select option:checked')).toContainText('acceptance-inventory.json');
  const snapshotId=await page.locator('#snapshot-select').inputValue();
  const qaId=await page.locator('#jenkins-select').inputValue();
  await page.locator('#analytics-match-field').selectOption('wmsId');
  await page.locator('#qa-match-field').selectOption('wmsId');
  await page.locator('#map-reports').click();
  await expect(page.locator('#merge-status-title')).toHaveText('No unique dashboard matches yet');
  await expect(page.locator('#apply-merge')).toBeDisabled();
  await page.locator('#analytics-match-field').selectOption('livelabsId');
  await page.locator('#qa-match-field').selectOption('livelabsId');
  await page.locator('#map-reports').click();
  await expect(page.locator('#merge-status-title')).toHaveText('Mapped preview is ready');
  // A QA item contributes its two checks and one finding to the merge rows.
  for(const [label,count] of [['Matched inventory items','2'],['Analytics-only items','1'],['QA-only rows','3'],['Ambiguous QA rows','0']]){
    await expect(page.locator('#merge-counts li').filter({hasText:label}).locator('span')).toHaveText(count);
  }
  const downloaded=page.waitForEvent('download');await page.locator('#merge-csv').click();
  const csv=await downloaded;await csv.saveAs(testInfo.outputPath('mapped.csv'));
  expect(fs.readFileSync(testInfo.outputPath('mapped.csv'),'utf8')).toContain('999999');
  page.once('dialog',dialog=>dialog.accept());await page.locator('#apply-merge').click();
  await expect(page.locator('#status')).toContainText('Integrated Jenkins findings for 2 matched inventory items');
  await expect(page.locator('#status')).toContainText('Canonical inventory is unchanged');
  await page.reload();await expect(page.locator('html')).not.toHaveClass(/page-loading/);
  const state=await (await page.request.get(`${baseURL}/api/dashboard-admin-state`)).json();
  expect(Object.keys(state.qaReportMerge.overlay).sort()).toEqual(['3570','598']);
  expect(state.qaReportMerge.overlay['3570'].jenkinsErrorScore).toBe(16.67);
  expect(state.qaReportMerge.overlay['598'].jenkinsErrorScore).toBe(0);
  expect(state.qaReportMerge.overlay['598'].findings.some(f=>f.priority==='P1')).toBe(true);
  const saved=await (await page.request.get(`${baseURL}/api/admin/snapshot?snapshot=${snapshotId}`)).json();
  expect(saved.records.map(r=>r.livelabsId)).toEqual(['3570','598','931']);
  const qa=await (await page.request.get(`${baseURL}/api/admin/qa-snapshot?snapshot=${qaId}`)).json();
  expect(qa.catalogItems).toHaveLength(3);
});

test('Admin inventory searches, filters types, pages and opens the correct record controls', async ({page})=>{
  const login=await page.request.post(`${baseURL}/api/admin/login`,{data:{username:'regression-reviewer',password},headers:{Origin:baseURL}});
  expect(login.ok()).toBe(true);
  const payload=await (await page.request.get(`${baseURL}/api/admin/inventory`)).json();
  await page.goto(`${baseURL}/admin/inventory`);await expect(page.locator('html')).not.toHaveClass(/page-loading/);
  await expect(page.locator('#inventory-count')).toHaveText(`${payload.records.length.toLocaleString()} records`);
  await expect(page.locator('#inventory-rows tr')).toHaveCount(10);
  await expect(page.locator('#inventory-table th').first()).toHaveText('#');
  await expect(page.locator('#inventory-sort, #inventory-sort-direction')).toHaveCount(0);
  expect(await page.locator('.inventory-table-tools').evaluate(node => Boolean(node.compareDocumentPosition(document.querySelector('#inventory-table')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  for(const kind of ['Workshop','Sprint']){
    await page.locator('#inventory-type').selectOption(kind);
    const expected=payload.records.filter(r=>r.type===kind);
    await expect(page.locator('#inventory-count')).toHaveText(expected.length.toLocaleString()+' records');
    expect(await page.locator('#inventory-rows tr').evaluateAll((rows,kind)=>rows.every(row=>row.cells[5].textContent===kind),kind)).toBe(true);
    const topPagination=page.locator('.inventory-table-tools');
    await topPagination.locator('[data-inventory-page-action="next"]').click();
    await expect(topPagination.locator('[data-inventory-page-label]')).toContainText('Page 2 of');
    await expect(page.locator('#inventory-rows tr').first().locator('td').first()).toHaveText('11');
    await topPagination.locator('[data-inventory-page-action="previous"]').click();
    await expect(topPagination.locator('[data-inventory-page-status]')).toContainText('Showing 1');
  }
  await page.locator('#inventory-type').selectOption('');
  const titleSort = page.locator('#inventory-table th[data-inventory-sort-key="title"] button');
  await titleSort.click();
  await expect(titleSort.locator('xpath=..')).toHaveAttribute('aria-sort','ascending');
  await page.locator('[data-inventory-page-size]').first().selectOption('25');
  await page.locator('[data-inventory-page-action="next"]').first().click();
  const visibleIds = await page.locator('#inventory-rows tr td:nth-child(2)').allTextContents();
  await page.locator('.table-export-dropdown summary').click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', {name:'JSON (.json)', exact:true}).click();
  const exported = JSON.parse(fs.readFileSync(await (await downloaded).path(), 'utf8'));
  expect(exported.pagination).toMatchObject({page:2, pageSize:25, exportedRows:25});
  expect(exported.rows.map(row => String(row['LiveLabs ID']))).toEqual(visibleIds);
  expect(exported.rows.map(row => row['#'])).toEqual(Array.from({length:25}, (_, index) => index + 26));
  await expect(page.locator('#inventory-export-status')).toContainText('25 visible page rows exported');
  await page.locator('[data-inventory-page-size]').first().selectOption('10');
  await expect(page.locator('#inventory-export-status')).toBeEmpty();
  const target=payload.records.find(r=>r.livelabsId==='3570');
  for(const query of [target.title,target.owner]){
    await page.locator('#inventory-search').fill(query);
    await expect(page.locator('#inventory-rows tr').filter({hasText:target.title}).first()).toBeVisible();
  }
  await page.locator('#inventory-search').fill(target.title);
  await page.locator('#inventory-rows tr').filter({hasText:target.title}).getByRole('button',{name:'Manage',exact:true}).click();
  await expect(page.locator('#policy-record')).toContainText(target.title);
  await page.locator('#policy-cancel').click();await expect(page.locator('#policy-editor')).toBeHidden();
  await page.locator('#inventory-search').fill('zz-no-such-item');
  await expect(page.locator('#inventory-rows')).toContainText('No records match these filters');
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
  await expect(panel.locator('thead th')).toHaveText(['Item','Author / owner','Tags','Assignment rule','Added']);
  await expect(page.locator('#assignment-page-status')).toHaveText('1–10 of 29 assignments');
  await expect(panel.locator('[data-assignment-row]')).toHaveCount(10);
  await page.locator('#assignment-next').click();
  await expect(page.locator('#assignment-page-status')).toHaveText('11–20 of 29 assignments');
  await page.locator('#assignment-type').selectOption('Sprint');
  await expect(page.locator('#assignment-page-status')).toHaveText('1–10 of 14 assignments');
  await expect(panel.locator('[data-assignment-row] .assignment-item-meta')).toHaveText(Array(10).fill(/· Sprint(?: ·|$)/));
  await page.locator('#assignment-type').selectOption('Workshop');
  await expect(panel.locator('[data-assignment-row] .assignment-item-meta')).toHaveText(Array(10).fill(/· Workshop(?: ·|$)/));
  await page.locator('#assignment-type').selectOption('');
  await page.locator('#assignment-search').fill('refresh');
  await page.locator('#assignment-type').selectOption('Sprint');
  await expect(panel.locator('[data-assignment-row]')).toHaveCount(1);
  await expect(panel.locator('[data-assignment-row] .assignment-item-meta')).toContainText('LiveLabs ID 8001');
  await page.locator('#assignment-clear').click();
  await page.locator('#assignment-search').fill('8000');
  await expect(panel.locator('[data-assignment-row]')).toHaveCount(2);
  await page.locator('#assignment-search').fill('9000');
  await expect(panel.locator('[data-assignment-row]')).toHaveCount(4);
  await page.locator('#assignment-search').fill('WMS family ID');
  await expect(panel.locator('[data-assignment-row]')).toHaveCount(2);
  await panel.getByRole('button',{name:'Sort by Title',exact:true}).click();
  await expect(panel.locator('[data-assignment-row] .assignment-item-meta')).toHaveText([/LiveLabs ID 8001/,/LiveLabs ID 8000/]);
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
  await expect(page.locator('html')).not.toHaveClass(/page-loading/);
  await expect(panel.locator('[data-assignment-row]')).toHaveCount(10);
  await page.locator('#assignment-search').fill('8000');
  await expect(page.locator('#assignment-search')).toHaveValue('8000');
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
  await expect(page.locator('#assignment-empty-state')).toBeVisible();
  await expect(page.locator('#assignment-empty-state')).toContainText('No assignments match your search');
  await expect(page.locator('#assignment-empty-state')).toContainText('Clear the search');
  await expect(panel.getByRole('table')).toBeHidden();
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
  await page.goto(`${baseURL}/admin?next=${encodeURIComponent('/admin/weekly-update')}`);
  await expect(page.locator('html')).not.toHaveClass(/page-loading/);
  await expect(page.locator('.rail')).toHaveCount(0);
  await expect(page.getByRole('link', {name:'Back to dashboard',exact:true})).toHaveCount(1);
  await page.screenshot({path:testInfo.outputPath('sign-in.png'),fullPage:true});
  await page.getByLabel('Username', { exact: true }).fill('regression-reviewer');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(`${baseURL}/admin/weekly-update`);
  await expect(page.locator('#weekly-run-status')).toContainText('No weekly update run is selected');
  await page.goto(`${baseURL}/admin/dashboard-management`);
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
  await expect(page.locator('#inventory-count')).toHaveText(`${inventory.records.length.toLocaleString()} records`);
  await expect(page.locator('#inventory-rows tr')).toHaveCount(10);
  await expect(page.locator('#inventory-table thead th').filter({hasText:/^(LiveLabs ID|WMS ID|Title|Author \/ owner)$/})).toHaveText(['LiveLabs ID','WMS ID','Title','Author / owner']);
  for(const kind of ['Workshop','Sprint']) {
    await page.locator('#inventory-type').selectOption(kind);
    await expect(page.locator('#inventory-count')).toHaveText(`${inventory.records.filter(r=>r.type===kind).length.toLocaleString()} records`);
    const kinds=await page.locator('#inventory-rows tr td:nth-child(6)').allTextContents();
    expect(kinds.every(value=>value===kind)).toBe(true);
  }
  await page.locator('#inventory-type').selectOption('');
  await expect(page.locator('#inventory-search')).toBeVisible();
  const contactRecord=inventory.records.find(record=>(record.details||[]).some(pair=>Array.isArray(pair)&&/support contact|workshop owner/i.test(String(pair[0]))&&String(pair[1]||'').trim()));
  if(contactRecord) {
    const contactValue=contactRecord.details.find(pair=>Array.isArray(pair)&&/support contact|workshop owner/i.test(String(pair[0]))&&String(pair[1]||'').trim())[1];
    await page.locator('#inventory-search').click();
    await page.locator('#inventory-search').pressSequentially(contactValue);
    const expectedMatches=inventory.records.filter(record=>[record.title,record.livelabsId,record.wmsId,record.owner,record.searchable,...(record.details||[]).flatMap(pair=>Array.isArray(pair)?pair:[])].join(' ').toLocaleLowerCase().includes(String(contactValue).toLocaleLowerCase()));
    await expect(page.locator('#inventory-search')).toHaveValue(contactValue);
    await expect(page.locator('#inventory-count')).toHaveText(`${expectedMatches.length.toLocaleString()} records`);
    expect(expectedMatches.length).toBeLessThan(inventory.records.length);
    await page.locator('#inventory-search').fill('');
  }
  const filterDisclosure=page.locator('.inventory-filter-disclosure');
  await filterDisclosure.locator(':scope > summary').click();
  await page.locator('#inventory-scope').selectOption('public');
  await expect(page.locator('#inventory-count')).toHaveText(`${inventory.records.filter(r=>String(r.publishType||'').toLowerCase()==='public'&&String(r.publishStatus||'').toLowerCase()==='published').length.toLocaleString()} records`);
  await page.locator('#inventory-scope').selectOption('all');
  await expect(page.locator('#inventory-count')).toHaveText(`${inventory.records.length.toLocaleString()} records`);
  await page.locator('#inventory-cleanup-queue').selectOption({label:'Removal requests'});
  const requests=inventory.records.filter(r=>r.cleanupQueues.includes('Removal requests'));
  await expect(page.locator('#inventory-count')).toHaveText(`${requests.length.toLocaleString()} records`);
  await page.locator('[data-manage-key]').first().click();
  await expect(page.locator('#review-current')).toContainText('Source retirement confirmed: no');
  expect(scriptErrors).toEqual([]);
  await page.screenshot({path:testInfo.outputPath('cleanup-inventory.png'),fullPage:true});
});

test('weekly update checklist saves a dated run and resumes progress', async ({page}) => {
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  expect((await page.request.get(`${baseURL}/api/admin/weekly-runs`)).status()).toBe(401);
  const login=await page.request.post(`${baseURL}/api/admin/login`,{data:{username:'regression-reviewer',password},headers:{Origin:baseURL}});
  expect(login.ok()).toBe(true);
  await page.goto(`${baseURL}/admin/weekly-update`);
  await expect(page.locator('#weekly-run-status')).toContainText('No weekly update run is selected');
  for (const id of ['weekly-start-run', 'weekly-save']) {
    const colors = await page.locator(`#${id}`).evaluate(node => {
      const style = getComputedStyle(node);
      return {text: style.color, background: style.backgroundColor};
    });
    expect(colors.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(colors.text).not.toBe(colors.background);
  }
  await page.getByRole('button',{name:'Start this week’s update'}).click();
  await expect(page.locator('.weekly-step')).toHaveCount(17);
  const first=page.locator('.weekly-step').first();
  await first.locator('[data-step-complete]').check();
  await first.locator('[data-step-evidence]').fill('fixture source folder · 2026-11-12 · SHA-256 verified');
  await page.getByRole('button',{name:'Save progress'}).click();
  await expect(page.locator('#weekly-save-status')).toHaveText('Saved');
  const list=await (await page.request.get(`${baseURL}/api/admin/weekly-runs`)).json();
  expect(list.runs).toHaveLength(1);
  expect(list.runs[0].runId).toMatch(/^update-\d{8}-[a-f0-9]{8}$/);
  expect(list.runs[0].steps[0]).toMatchObject({status:'COMPLETE',evidence:'fixture source folder · 2026-11-12 · SHA-256 verified'});
  await page.reload();
  await expect(page.locator('.weekly-step')).toHaveCount(17);
  await expect(page.locator('.weekly-step').first().locator('[data-step-complete]')).toBeChecked();
  await expect(page.locator('.weekly-step').first().locator('[data-step-evidence]')).toHaveValue('fixture source folder · 2026-11-12 · SHA-256 verified');
  await expect(page.locator('#weekly-progress-label')).toHaveText('1 of 17 steps complete');
  expect(errors).toEqual([]);
});

test('Admin missing-contact queue prioritizes the main author and groups secondary contacts', async ({page}, testInfo) => {
  const unauthenticated = await page.request.get(`${baseURL}/admin/inventory/author-contributor-gaps`);
  expect(unauthenticated.ok()).toBe(true);
  expect(await unauthenticated.text()).toContain('Admin sign in');
  expect((await page.request.get(`${baseURL}/api/admin/inventory`)).status()).toBe(401);

  const login = await page.request.post(`${baseURL}/api/admin/login`, {
    data: {username:'regression-reviewer',password}, headers: {Origin:baseURL}
  });
  expect(login.ok()).toBe(true);
  const records = [
    {livelabsId:'gap-1',wmsId:'family-1',title:'Main author and additional contact missing',type:'Workshop',category:'OCI',owner:'Platform Team',publishType:'Public',publishStatus:'Published',status:'Quarterly QA',details:[['Owner Group','Platform Team'],['WMS Last Update','2026-11-07T01:22:34Z']]},
    {livelabsId:'gap-2',wmsId:'family-2',title:'Main author missing, support contact available',type:'Sprint',category:'Database',owner:'alex.author@example.com',publishType:'Public',publishStatus:'Published',status:'Quarterly QA',details:[['Support Contact Email','support@example.com'],['Acknowledgement Contributors','Taylor Contributor']]},
    {livelabsId:'gap-3',wmsId:'family-3',title:'Author present, no additional contact',type:'Workshop',category:'OCI',owner:'casey.author@example.com',publishType:'Private',publishStatus:'Draft',status:'In progress',details:[['Owner Email','casey.author@example.com'],['Owner Group','DB Product Management']]},
    {livelabsId:'gap-4',wmsId:'family-4',title:'Second author present, no additional contact',type:'Workshop',category:'Database',owner:'jordan.author@example.com',publishType:'Public',publishStatus:'Published',status:'Quarterly QA',details:[['Owner Email','jordan.author@example.com']]},
    {livelabsId:'gap-5',wmsId:'family-5',title:'Technical contact available',type:'Workshop',category:'OCI',owner:'casey.author@example.com',publishType:'Public',publishStatus:'Published',status:'Quarterly QA',details:[['Owner Email','casey.author@example.com'],['Tech Contact Email','tech@example.com']]},
    {livelabsId:'covered-6',wmsId:'family-6',title:'Both additional contacts available',type:'Workshop',category:'OCI',owner:'casey.author@example.com',publishType:'Public',publishStatus:'Published',status:'Quarterly QA',details:[['Owner Email','casey.author@example.com'],['Support Contact Email','support@example.com'],['Tech Contact Email','tech@example.com']]}
  ];
  for (let index=7;index<=15;index++) records.push({
    livelabsId:`gap-${index}`,wmsId:`family-${index}`,title:`Unassigned author ${index}`,type:'Sprint',category:'Database',owner:'Platform Team',publishType:'Public',publishStatus:'Published',status:'Quarterly QA',details:[['Owner Group','Platform Team']]
  });
  await page.route('**/api/admin/inventory', route => route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify({records,metadata:{snapshot_date:'2026-11-12'}})
  }));
  await page.goto(`${baseURL}/admin/inventory`);
  await page.getByRole('link',{name:'Missing contact'}).click();
  await expect(page).toHaveURL(/\/admin\/inventory\/author-contributor-gaps$/);
  await expect(page.locator('#coverage-source-note')).toHaveCount(0);
  await expect(page.locator('.coverage-summary')).toHaveCount(0);
  await expect(page.locator('#author-status')).toHaveValue('missing');
  await expect(page.locator('#additional-contact-status')).toHaveValue('any');
  await expect(page.locator('#author-contributor-count')).toHaveText('11 records');
  await expect(page.locator('#author-contributor-rows tr')).toHaveCount(10);
  await expect(page.locator('#author-contributor-rows')).toContainText('Main author missing');
  await expect(page.locator('#author-contributor-rows')).toContainText('N/A');
  await expect(page.locator('#author-contributor-rows')).toContainText('support@example.com');
  await expect(page.locator('#author-contributor-rows tr').first().locator('[data-column-label="WMS update"]')).toHaveText('2026-11-07');
  await expect(page.locator('#author-contributor-table thead')).not.toContainText('GitHub contributors');
  await expect(page.locator('#support-contact-status')).toHaveCount(0);
  await expect(page.locator('#tech-contact-status')).toHaveCount(0);
  await expect(page.locator('#contributor-status')).toHaveCount(0);
  await expect(page.locator('#author-contributor-page-size')).toHaveValue('10');
  await expect(page.locator('[data-coverage-page-size]')).toHaveCount(0);
  await expect(page.getByLabel('Main author email').locator('option[value="any"]')).toHaveText('All records');
  await expect(page.getByLabel('Main author email').locator('option[value="missing"]')).toHaveText('Missing email');
  await expect(page.getByLabel('Main author email').locator('option[value="present"]')).toHaveText('Email present');
  await expect(page.getByLabel('Additional contact email').locator('option[value="any"]')).toHaveText('All records');
  await expect(page.getByLabel('Additional contact email').locator('option[value="missing"]')).toHaveText('No additional email');
  await expect(page.getByLabel('Additional contact email').locator('option[value="present"]')).toHaveText('Email available');
  await expect(page.locator('#coverage-filter-disclosure > summary')).toContainText('Additional filters');
  await expect(page.locator('#coverage-filter-disclosure legend')).toHaveText(['Catalog','Publishing','Ownership & source']);
  await expect(page.locator('.coverage-results-toolbar')).toBeVisible();
  await expect(page.locator('#author-contributor-sort, #author-contributor-sort-direction')).toHaveCount(0);
  const coverageTitle = page.locator('#author-contributor-table th[data-coverage-sort-key="title"] button');
  await coverageTitle.click();
  await expect(coverageTitle.locator('xpath=..')).toHaveAttribute('aria-sort','descending');
  await coverageTitle.click();
  await expect(coverageTitle.locator('xpath=..')).toHaveAttribute('aria-sort','ascending');

  await page.locator('#additional-contact-status').selectOption('present');
  await expect(page.locator('#author-contributor-count')).toHaveText('1 record');
  await expect(page.locator('#author-contributor-rows')).toContainText('support@example.com');
  await page.locator('#additional-contact-status').selectOption('missing');
  await expect(page.locator('#author-contributor-count')).toHaveText('10 records');
  await expect(page.locator('#author-contributor-rows')).toContainText('Additional contact missing');
  await page.locator('#additional-contact-status').selectOption('any');
  await page.locator('#author-status').selectOption('any');
  await page.locator('#additional-contact-status').selectOption('missing');
  await expect(page.locator('#author-contributor-count')).toHaveText('12 records');
  await page.locator('#author-status').selectOption('present');
  await expect(page.locator('#author-contributor-count')).toHaveText('2 records');
  await expect(page.locator('#author-contributor-rows')).toContainText('Author present, no additional contact');
  await expect(page.locator('#author-contributor-rows')).toContainText('Second author present, no additional contact');
  await page.locator('#author-contributor-clear').click();
  await expect(page.locator('#author-status')).toHaveValue('missing');
  await expect(page.locator('#additional-contact-status')).toHaveValue('any');
  await expect(page.locator('#author-contributor-count')).toHaveText('11 records');

  await page.locator('#gap-search').fill('support@example.com');
  await expect(page.locator('#author-contributor-count')).toHaveText('1 record');
  await expect(page.locator('#author-contributor-rows')).toContainText('support@example.com');
  await page.locator('#author-contributor-clear').click();
  await expect(page.locator('#author-contributor-page-label')).toHaveText('Page 1 of 2');
  await page.locator('[data-author-contributor-page="next"]').first().click();
  await expect(page.locator('#author-contributor-page-label')).toHaveText('Page 2 of 2');
  await expect(page.locator('#author-contributor-rows tr')).toHaveCount(1);
  await page.locator('[data-author-contributor-page="previous"]').last().click();
  await expect(page.locator('#author-contributor-page-label')).toHaveText('Page 1 of 2');

  const downloadPromise = page.waitForEvent('download');
  await page.getByText('Export visible rows',{exact:true}).click();
  await page.getByRole('button',{name:'CSV (.csv)'}).click();
  const download = await downloadPromise;
  await expect(page.locator('.coverage-table-tools .table-export-dropdown')).not.toHaveAttribute('open');
  expect(download.suggestedFilename()).toMatch(/missing-contact-11-rows\.csv$/);
  const outputPath = await download.path();
  const csv = fs.readFileSync(outputPath,'utf8');
  expect(csv).toContain('Main author missing');
  expect(csv).toContain('Additional contact emails');
  expect(csv).not.toContain('Acknowledgement contributors');
  await page.locator('#author-contributor-clear').click();

  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`page overflows at ${width}`).toBe(true);
    expect(await page.locator('.coverage-results-toolbar').evaluate(element=>element.getBoundingClientRect().height),`table controls should stay compact at ${width}`).toBeLessThan(width < 700 ? 260 : 90);
    if (width >= 1100) expect(await page.locator('.coverage-table-wrap').evaluate(element=>element.scrollWidth<=element.clientWidth+1),'table should fit the desktop content width').toBe(true);
    await page.screenshot({path:testInfo.outputPath(`author-contributor-gaps-${width}.png`),fullPage:true,animations:'disabled'});
  }
});
