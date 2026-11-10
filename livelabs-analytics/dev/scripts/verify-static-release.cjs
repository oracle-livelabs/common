// Exercise the exact packaged files with no Admin API available.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {chromium} = require('../node_modules/playwright');
const option = name => process.argv[process.argv.indexOf(name) + 1];
if (!process.argv.includes('--release') || !process.argv.includes('--output')) throw new Error('--release and --output are required');
const root = path.resolve(option('--release')), output = path.resolve(option('--output'));
const manifestPath = path.join(root, 'release-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const state = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/dashboard-state.json'), 'utf8'));
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'inventory/data/public_portfolio_inventory.json'), 'utf8'));
const scores = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/score-baselines.json'), 'utf8'));
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf'};
const server = http.createServer((request,response)=>{
  const pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
  const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/')?'index.html':''));
  if (!file.startsWith(root+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {response.writeHead(404);response.end();return;}
  response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(response);
});
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}`;
  const report={status:'failed',passedTests:0,failedTests:0,releaseId:manifest.release_id,
    manifestSha256:crypto.createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex'), checkedAt:new Date().toISOString(), checks:[]};
  let browser;
  const check=(name,condition)=>{assert.ok(condition,name);report.checks.push(name);report.passedTests++;};
  try {
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(url+'/dashboard/',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.querySelector('[data-overview-metric="jenkins-p1-count"]')?.textContent.trim()!=='—');
    const overlays=Object.values(state.qaReportMerge.overlay);
    const p1=overlays.reduce((sum,item)=>sum+Number(item.priorityCounts.p1||0)+Number(item.priorityCounts.p1Verification||0),0);
    check('Public cohort count',await page.locator('[data-overview-metric="public-count"]').innerText()===inventory.records.length.toLocaleString());
    check('Jenkins P1 count survives static delivery',await page.locator('[data-overview-metric="jenkins-p1-count"]').innerText()===p1.toLocaleString());
    check('No public full-inventory file',(await page.request.get(url+'/inventory/data/portfolio_inventory.json')).status()===404);
    await page.screenshot({path:path.join(output,'static-dashboard-desktop.png'),fullPage:true});
    const candidate=Object.entries(state.qaReportMerge.overlay).find(([id,item])=>item.scoreState!=='scored' && scores.records[id]?.performance!=null);
    if(candidate) {
      await page.goto(url+'/search/?livelabs_id='+candidate[0],{waitUntil:'networkidle'});
      await page.getByText('Score and evidence',{exact:true}).click();
      check('Invalid QA retains baseline in packaged details',(await page.locator('#search-workshop-view').innerText()).includes('QA does not change this baseline'));
    }
    await page.setViewportSize({width:390,height:844});
    check('Mobile has no page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(output,'static-evidence-mobile.png'),fullPage:true});
    check('No browser script errors',errors.length===0);
    report.status='passed';
  } catch(error) {report.failedTests++;report.error=error.message;process.exitCode=1;}
  finally {
    if(browser) await browser.close();
    await new Promise(resolve=>server.close(resolve));
    fs.writeFileSync(path.join(output,'browser-evidence.json'),JSON.stringify(report,null,2));
    fs.writeFileSync(path.join(output,'manifest.md'),`# Static release browser verification\n\nRelease: ${report.releaseId}\nStatus: ${report.status}\nDesktop: 1440 × 1000; mobile: 390 × 844. API unavailable; packaged files only.\n\n- static-dashboard-desktop.png\n- static-evidence-mobile.png\n- browser-evidence.json (bound to the release manifest hash)\n`);
    console.log(JSON.stringify(report));
  }
})();
