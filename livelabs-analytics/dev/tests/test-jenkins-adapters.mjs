import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../admin/data-merge.js', import.meta.url), 'utf8');
const normalizer = source.slice(source.indexOf('  function normalizeJenkinsSingle('), source.indexOf('  function parseCsv('));
const scope = vm.createContext({});vm.runInContext(normalizer, scope);
const raw = {schemaVersion:2,run:{id:'run-1',configuredTests:1,completion:{state:'completed'}},items:[{
  livelabsId:'123',type:'workshop',catalog:{id:'123',ids:['123']},checks:[{title:'Preview'}],
  evidence:[{errors:['404'],steps:[{title:'Open documentation'}],attachments:[{path:'missing.png'}]}],issues:[]
}]};
const normalized = scope.normalizeJenkinsSingle(raw, 'report.json');
assert.equal(normalized.catalogItems[0].tests[0].title,'Preview');
assert.equal(normalized.failures[0].errors[0],'404');assert.equal(normalized.failures[0].steps[0].title,'Open documentation');
assert.equal(normalized.failures[0].attachments.length,0);assert.equal(normalized.configuredTests,1);
raw.items[0].catalog.ids.push('456');assert.throws(() => scope.normalizeJenkinsSingle(raw, 'report.json'), /groups multiple/);

const pairCode=source.slice(source.indexOf('  async function normalizeJenkinsReportPair('),source.indexOf('  async function downloadSelected('));
const pairScope=vm.createContext({fileExtension:file=>file.name.split('.').pop()});
vm.runInContext(pairCode,pairScope);
const files=[{name:'report.json',size:100},{name:'findings.csv',size:100}];
const richIssue={code:'STALE_PAR_LINK',section:'Catalog PAR Links',file:'par.spec.ts',line:55,count:1,
  details:[{label:'model.onnx',http_status:401,sources:[{sourceLine:308,pageUrl:'https://example.com/lab'}]}]};
const pairReport={schemaVersion:2,run:{id:'run-1',failureCategories:[{code:'STALE_PAR_LINK',count:2}],counts:{total:2}},
  items:[{livelabsId:'123',type:'workshop',catalog:{ids:['123','456']},counts:{total:2},issues:[richIssue]}]};
const csvRow={run_id:'run-1',started_at:'',item_type:'workshop',item_id:'123',item_title:'Example',item_status:'failed',item_priority:'P1',issue_count:'1',issue_code:'STALE_PAR_LINK',issue_label:'Broken PAR',severity:'error',issue_summary:'Download failed',catalog_url:'',final_url:'',test_section:'Catalog PAR Links',test_file:'par.spec.ts',test_line:'55'};
const pairTable={kind:'table',rows:[csvRow,{...csvRow,item_id:'456'}]};
const readPair=()=>pairScope.normalizeJenkinsReportPair(files,new Map([[files[0],pairReport],[files[1],pairTable]]));
let paired=await readPair();
assert.equal(paired.catalogItems[0].issues[0].details[0].sources[0].sourceLine,308);
assert.equal(paired.catalogItems[1].issues[0].details,undefined,'Grouped aliases must not inherit another ID\'s evidence');
assert.equal(paired.catalogItems[0].issues[0].count,1,'CSV counts stay authoritative for the reconciled pair');
richIssue.count=2;
paired=await readPair();
assert.equal(paired.catalogItems[0].issues[0].details,undefined,'Different occurrence counts cannot establish matching evidence');
richIssue.count=1;
pairTable.rows[0].run_id='different-run';
await assert.rejects(readPair(),/different Jenkins run IDs/);
pairTable.rows[0].run_id='run-1';
pairReport.items[0].issues.push({...richIssue});
paired=await readPair();
assert.equal(paired.catalogItems[0].issues[0].details,undefined,'Ambiguous checks are not silently paired');
console.log('PASS reconciled JSON/CSV evidence matches exact IDs and unique checks');

const server = {};let failNext = true,stored = {retest:{}};const notices = [];
const context = vm.createContext({
  window: {dispatchEvent() {}}, StorageEvent: class {},
  document:{createElement(){return {setAttribute(){},className:'',set textContent(value){notices.push(value)}};},querySelector(){return null;},querySelectorAll(){return []; }},
  localStorage:{setItem(_key,value){stored=JSON.parse(value);}},
  fetch: async (url, options) => {
    if(url.endsWith('/session')) return {ok:true,json:async()=>({csrf:'fixture'})};
    if(options?.method === 'POST') {
      if(failNext){failNext=false;throw new Error('Temporary offline');}
      for(const operation of JSON.parse(options.body).operations) {
        if(operation.remove)delete server[operation.id];else server[operation.id]=operation.entry;
      }
    }
    return {ok:true,json:async()=>({retest:{...server}})};
  }
});
vm.runInContext(fs.readFileSync(new URL('../admin/jenkins-report-bridge.js',import.meta.url),'utf8'),context);
await new Promise(resolve=>setImmediate(resolve));
const hub=context.window.qaHub;
const a={testId:'run:123',executionId:'run',itemId:'123'},b={testId:'run:456',executionId:'run',itemId:'456'};
hub.sync({retest:{}},{retest:{A:a}});
await assert.rejects(hub.flush(),/Temporary offline/);
hub.sync({retest:{A:a}},{retest:{A:a,B:b}});await hub.flush();
assert.deepEqual(Object.keys(server).sort(),['A','B']);
hub.sync({retest:{A:a,B:b}},{retest:{B:b}});await hub.flush();assert.deepEqual(Object.keys(server),['B']);
console.log('PASS Complete JSON checks/evidence/identity; failed review saves retry before success.');
