// Exact artifact acceptance: no API, root and nested hosting, all ranked rows and routes.
const fs=require('node:fs'), path=require('node:path'), http=require('node:http'), crypto=require('node:crypto'), assert=require('node:assert/strict');
const {chromium}=require('../node_modules/playwright');
const option=name=>process.argv[process.argv.indexOf(name)+1];
if(!process.argv.includes('--release')||!process.argv.includes('--output'))throw new Error('--release and --output required');
const root=path.resolve(option('--release')), output=path.resolve(option('--output'));
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const hash=name=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex');
const manifest=read('release-manifest.json'),state=read('assets/data/dashboard-state.json'),inventory=read('inventory/data/public_portfolio_inventory.json'),scores=read('assets/data/score-baselines.json');
const prefixes=['','/common/livelabs-analytics','/releases/acceptance'];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf'};
let hideQa=false;
const server=http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end();return}
  const prefix=prefixes.slice(1).find(p=>pathname===p||pathname.startsWith(p+'/'))||'';pathname=pathname.slice(prefix.length);
  const file=path.resolve(root,'.'+pathname);
  if(!(file===root||file.startsWith(root+path.sep))||(hideQa&&pathname==='/assets/data/dashboard-state.json')){res.writeHead(404);res.end();return}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory()&&!pathname.endsWith('/')){res.writeHead(302,{Location:prefix+pathname+'/'});res.end();return}
  const target=pathname.endsWith('/')?path.join(file,'index.html'):file;
  if(!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end();return}
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(target).pipe(res);
});
(async()=>{
  fs.mkdirSync(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const report={status:'failed',passedTests:0,failedTests:0,releaseId:manifest.release_id,manifestSha256:hash('release-manifest.json'),checkedAt:new Date().toISOString(),checks:[],externalLinksVerified:false};
  const check=(name,condition)=>{assert.ok(condition,name);report.checks.push(name);report.passedTests++;console.log('PASS '+name)};let browser;
  try{
    check('Manifest hashes',manifest.release_files.every(f=>hash(f.path)===f.sha256&&fs.statSync(path.join(root,f.path)).size===f.bytes));
    check('QA export inventory binding',state.releaseEvidence.inventorySha256===hash('inventory/data/public_portfolio_inventory.json'));
    const overlays=Object.values(state.qaReportMerge.overlay),p1=overlays.reduce((n,item)=>n+item.findings.filter(f=>f.priority==='P1').length,0),errorItems=overlays.filter(item=>item.findings.some(f=>['P2','P3'].includes(f.priority))).length;
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],failedAssets=[];
    page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(30000);
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/\.(?:css|js|png|svg|ttf)(?:\?|$)/.test(r.url()))failedAssets.push({url:r.url(),status:r.status()})});
    for(const prefix of prefixes){
      const base=origin+prefix;
      await page.goto(base+'/dashboard/',{waitUntil:'networkidle'});
      await page.waitForFunction(()=>/^\d/.test(document.querySelector('[data-overview-metric="jenkins-p1-count"]')?.textContent.trim()||''));
      check(prefix+' public count',(await page.locator('[data-overview-metric="public-count"]').innerText())===inventory.records.length.toLocaleString());
      check(prefix+' QA counts',(await page.locator('[data-overview-metric="jenkins-p1-count"]').innerText())===p1.toLocaleString()&&(await page.locator('[data-overview-metric="error-items-count"]').innerText())===errorItems.toLocaleString());
      for(const forbidden of ['inventory/data/portfolio_inventory.json','dev/admin/panel.html','.private/admin/admin.sqlite3','api/admin/inventory'])check(prefix+' excludes '+forbidden,(await page.request.get(base+'/'+forbidden)).status()===404);
      for(const [view,id,mode] of [['performance','top-performers-table','performance'],['urgent','jenkins-p1-action-table',null],['at-risk','at-risk-table','risk'],['retirement','retirement-review-table','risk']]){
        await page.goto(base+'/dashboard/?view='+view,{waitUntil:'networkidle'});
        const table=page.locator('#'+id);await table.waitFor({state:'attached'});
        const panel=table.locator('xpath=ancestor::details[contains(@class,"ranked-table-disclosure")]').first();
        if(await panel.count()&&!(await panel.getAttribute('open')))await panel.locator(':scope > summary').click();
        if(mode)await page.waitForFunction(tableId=>Boolean(document.querySelector(`[data-filter-table="${tableId}"]`)?.dataset.jenkinsMergeId),id);
        const rows=await table.locator('tbody tr[data-filter-row="true"]').evaluateAll(nodes=>nodes.map(r=>({id:r.dataset.livelabsId,score:[...r.cells].find(c=>c.dataset.columnLabel==='Score')?.dataset.sortValue})));
        check(prefix+' '+view+' unique rows',rows.length>0&&new Set(rows.map(r=>r.id)).size===rows.length);
        if(mode){const share=state.qaReportMerge.summary.scorePolicy.tableShare;check(prefix+' '+view+' every final score',rows.every(row=>{
          const baseline=scores.records[row.id]?.[mode],qa=state.qaReportMerge.overlay[row.id];
          const expected=baseline==null?null:qa?.scoreState==='scored'&&qa.jenkinsErrorScore!=null?baseline*(1-share)+(mode==='performance'?100-qa.jenkinsErrorScore:qa.jenkinsErrorScore)*share:baseline;
          return expected==null?row.score==='':Math.abs(Number(row.score)-expected)<.001;
        }))}
        const links=await table.locator('a[href*="search/"]').evaluateAll(nodes=>nodes.map(a=>a.href));
        check(prefix+' '+view+' detail paths',links.length>0&&links.every(href=>new URL(href).pathname.startsWith(prefix+'/search/')));
        await page.locator('#global-workshop-search').fill('3570');
        const result=page.locator('.author-search-result').filter({hasText:'Modern Data Warehouse Workshop'}).getByRole('link',{name:'Open record',exact:true});
        await result.waitFor({state:'visible'});await result.click();await page.locator('.search-view-header h2').waitFor({state:'visible'});
        check(prefix+' search from '+view,new URL(page.url()).pathname===prefix+'/search/'&&new URL(page.url()).searchParams.get('livelabs_id')==='3570');
      }
      for(const route of ['/?livelabs_id=3570','/search/?livelabs_id=3570','/search/index.html?livelabs_id=3570']){
        await page.goto(base+route,{waitUntil:'networkidle'});await page.locator('.search-view-header h2').waitFor({state:'visible'});
        check(prefix+' deep link '+route,(await page.locator('.search-view-header h2').innerText()).includes('Modern Data Warehouse Workshop'));
        check(prefix+' loaded images',await page.locator('img:visible').evaluateAll(nodes=>nodes.every(img=>img.complete&&img.naturalWidth>0)));
      }
      await page.getByRole('button',{name:'Back to Dashboard',exact:true}).click();
      check(prefix+' return to dashboard',new URL(page.url()).pathname===prefix+'/dashboard/');
      await page.goto(base+'/search/?livelabs_id=not-a-record',{waitUntil:'networkidle'});
      check(prefix+' unknown identity handled',!(await page.locator('.search-view-header h2').count()));
    }
    const invalidQa=Object.entries(state.qaReportMerge.overlay).find(([id,item])=>item.scoreState!=='scored'&&scores.records[id]?.performance!=null);
    if(invalidQa){await page.goto(origin+'/search/?livelabs_id='+invalidQa[0],{waitUntil:'networkidle'});await page.getByText('Score and evidence',{exact:true}).click();check('Invalid QA retains baseline',(await page.locator('.score-summary').innerText()).includes('QA excluded'))}
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:900});await page.goto(origin+'/dashboard/?view=urgent',{waitUntil:'networkidle'});
      await page.waitForFunction(()=>!document.documentElement.classList.contains('page-loading'));
      const disclosure=page.locator('#jenkins-p1-action-table').locator('xpath=ancestor::details[contains(@class,"ranked-table-disclosure")]').first();
      if(!(await disclosure.getAttribute('open')))await disclosure.locator(':scope > summary').click();
      await page.locator('#jenkins-p1-action-table tbody tr[data-filter-row="true"]:visible').first().waitFor();
      check('No page overflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(output,`static-dashboard-${width}.png`),fullPage:true});
      await page.goto(origin+'/search/?livelabs_id=3570',{waitUntil:'networkidle'});
      await page.waitForFunction(()=>!document.documentElement.classList.contains('page-loading'));
      await page.locator('.search-view-header h2').waitFor({state:'visible'});
      check('No detail overflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(output,`static-detail-${width}.png`),fullPage:true});
    }
    hideQa=true;await page.goto(origin+'/dashboard/?view=urgent',{waitUntil:'networkidle'});
    check('Missing QA is unavailable',(await page.locator('[data-overview-metric="jenkins-p1-count"]').innerText())==='Unavailable');
    check('Missing QA never means zero',(await page.locator('#jenkins-p1-action-queue').innerText()).includes('QA report unavailable'));
    check('No missing visual/script assets',failedAssets.length===0);check('No browser script errors',errors.length===0);report.status='passed';
  }catch(error){report.failedTests++;report.error=error.stack;process.exitCode=1}
  finally{fs.writeFileSync(path.join(output,'browser-evidence.json'),JSON.stringify(report,null,2));if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify(report))}
})();
