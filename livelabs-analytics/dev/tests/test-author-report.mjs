import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context = {window:{}, URL};
vm.runInNewContext(fs.readFileSync(new URL('../../assets/js/author-report.js', import.meta.url), 'utf8'), context);
const ui = context.window.LiveLabsAuthor;
assert.equal(ui.safeUrl('javascript:alert(1)'), '');
assert.ok(!ui.text('HTTPS://example.com/?token=SAMPLE_SECRET').includes('SAMPLE_SECRET'));
assert.ok(!ui.text('<img src=x onerror=alert(1)>').includes('<img'));
const html = ui.evidenceHtml({findings:[
  {priority:'P2',code:'MARKDOWN',label:'Markdown',count:2,authorEvidence:{location:'Lab 9',locationUrl:'https://example.com/lab9',details:[{label:'Marker',actionUrl:'https://example.com/lab9',sourceLine:24}]}},
  {priority:'P1',code:'BROKEN',label:'Broken link',count:1,message:'Check link'}
]});
assert.ok(html.indexOf('Broken link') < html.indexOf('Markdown'));
assert.ok(!/<details[^>]+\bopen\b/.test(html));
assert.ok(html.includes('Exact lab or source line not supplied.'));
assert.ok(html.includes('Markdown line 24'));
assert.ok(html.includes('href="https://example.com/lab9"'));
assert.ok(!html.includes('Jenkins error score'));
assert.ok(ui.evidenceHtml(null).includes('No Jenkins report'));
const partial = ui.evidenceHtml({findingRows:3, priorityCounts:{p1:3}, findings:[]});
assert.ok(partial.includes('3 findings'));
assert.ok(partial.includes('unknown passed'));
assert.ok(partial.includes('no detailed entries'));
assert.ok(ui.evidenceHtml({findingRows:2,findings:[],priorityCounts:{p1:0,p1Verification:2}}).includes('2 findings'));
const locationOnly = ui.evidenceHtml({findings:[{priority:'P1',code:'CHECK',count:1,authorEvidence:{locationUrl:'https://example.com/lab'}}]});
assert.ok(!locationOnly.includes('No exact content URL'));
assert.ok(!locationOnly.includes('Steps were not supplied'));
assert.ok(ui.liveButton({type:'Sprint',details:new Map([['Production URL','https://livelabs.oracle.com/?wid=1036']])},null).includes('Open sprint'));
console.log('PASS author evidence rendering: escaping, redaction, priority, disclosure, location, missing evidence, destination');

for (const [overlay, expected] of [
  [{testCounts:{passed:2}}, 'scored'],
  [{testCounts:{failed:5},findings:[{code:'WORKSHOP_NOT_AVAILABLE'}]}, 'inspection-unavailable'],
  [{testCounts:{passed:0},itemStatus:'passed'}, 'no-completed-checks'],
  [{testCounts:{passed:1,skipped:1}}, 'incomplete-checks'],
  [{testCounts:{passed:1,total:3}}, 'incomplete-checks'],
  [{testCounts:{failed:2}}, 'unexplained-failure'],
  [{testCounts:{passed:1,failed:1},findings:[{priority:'P1',group:'author-facing'}]}, 'scored'],
]) assert.equal(ui.qaValidity(overlay), expected);
console.log('PASS QA validity browser fallback');

const parHtml=ui.evidenceHtml({findings:[{code:'STALE_PAR_LINK',priority:'P1',label:'Stale PAR link',count:1,
  authorEvidence:{problem:'Model download failed',details:[{label:'model.onnx',httpStatus:'401',bucket:'models',region:'us-phoenix-1',
    maskedUrl:'https://objectstorage.example.com/p/***/n/ns/b/models/o/model.onnx',fingerprint:'0123456789abcdef',
    sources:[{label:'Lab 2: Download model',pageUrl:'https://example.com/lab?lab=download',sourceLine:308,
      sourceFileUrl:'https://raw.githubusercontent.com/example/repo/main/lab.md',section:'Task 6',sourceText:'Download model.onnx',instruction:'3. Download'}]}]}}]});
for(const value of ['Where to fix it','Markdown line 308','Task 6','models','HTTP 401','0123456789abcdef','/p/***/n/'])assert.ok(parHtml.includes(value),value);
assert.ok(parHtml.includes('href="https://example.com/lab?lab=download"'));
assert.ok(parHtml.includes('href="https://github.com/example/repo/blob/main/lab.md#L308"'));
assert.ok(!/href="[^"]*\/p\//.test(parHtml));
assert.ok(!ui.text('https://objectstorage.example.com/p/SECRET_TOKEN/n/ns/b/models/o/model').includes('SECRET_TOKEN'));
console.log('PASS nested source locations and masked PAR technical details');

const locationFirst=ui.evidenceHtml({findings:[{code:'STALE_PAR_LINK',priority:'P1',label:'Stale PAR link',file:'qa.spec.ts',line:999,
  authorEvidence:{problem:'Generic check summary',details:[{label:'tweets.jsonn',httpStatus:'404',sources:[
    {label:'Rendered lab',pageUrl:'https://example.com/workshop?lab=json',location:'a[href]: LINK'},
    {label:'Lab 2: Load JSON tweets',pageUrl:'https://example.com/workshop?lab=json',sourceFileUrl:'https://example.com/json.md',
      sourceLine:29,section:'Task 1: Upload JSON tweets',sourceText:'Download tweets.jsonn',searchText:'tweets.jsonn'}]}]}}]});
assert.ok(locationFirst.includes('Check here first'));
assert.ok(locationFirst.indexOf('Markdown line 29')<locationFirst.indexOf('Generic check summary'));
assert.ok(locationFirst.indexOf('Lab 2: Load JSON tweets')<locationFirst.indexOf('Rendered lab'));
assert.ok(locationFirst.includes('<mark>tweets.jsonn</mark>'));
assert.ok(locationFirst.includes('Other recorded locations (1)'));
assert.ok(locationFirst.indexOf('Markdown line 29')<locationFirst.indexOf('qa.spec.ts:999'));
const specificPage=ui.evidenceHtml({findings:[{code:'TYPO',authorEvidence:{details:[{label:'Typo',
  actionUrl:'https://example.com/workshop',actionLabel:'Open workshop',pageUrl:'https://example.com/workshop?lab=setup',
  labTitle:'Lab 4: Setup',sourceLine:85,text:'Fix alsow',marker:'alsow'}]}}]});
assert.ok(specificPage.includes('href="https://example.com/workshop?lab=setup"'));
assert.ok(!specificPage.includes('href="https://example.com/workshop"'));
console.log('PASS exact content location precedes summaries and QA metadata');

const concise=ui.evidenceHtml({startedAt:'2026-10-15T12:11:24Z',itemStatus:'failed',findings:[
  {code:'LOAD',label:'Full instructions not loading',count:4,section:'Preview instructions'},
  {code:'LOAD',label:'Full instructions not loading',count:2,section:'Source quality'}]});
assert.ok(concise.includes('15 Oct 2026'));
assert.ok(concise.includes('2 checks · 6 occurrences'));
assert.ok(!concise.includes('No suggested change was supplied'));
const compactScore=ui.scoreHtml({performance:27.64,performanceComponents:[{label:'Annual demand',value:35.11,effectiveWeight:.45}],
  evidence:{confidence:'Recorded activity only',readiness:'provisional'}}, {testCounts:{passed:1},jenkinsErrorScore:0});
assert.ok(compactScore.includes('45.73'));
assert.ok(compactScore.includes('33.75%'));
assert.ok(!/Recorded activity only|Retirement readiness|Shared-title demand|Demand attribution/.test(compactScore));
console.log('PASS concise dates, counts and unchanged score weights');
