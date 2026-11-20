import { authenticate, getSafeUser, getSeedState, navigation } from './state.mjs'
import { createReviewPreview, loadOnCallSnapshot, unavailableOnCall } from './on-call-review.mjs'
import { renderOnCallWorkspace } from './on-call-workspace.mjs'
import { esc, table, bindTables } from './table.mjs'

const app = document.querySelector('#app')
const storageKey = 'livelabs-qa-hub-state-v2'
const sessionKey = 'livelabs-qa-hub-session-v2'
const routeKey = 'livelabs-qa-hub-route-v2'
const aliases = { 'command-center': 'overview', operations: 'overview', 'qa-watchdog': 'overview', 'health-monitor': 'overview', 'automation-runs': 'automation', reports: 'jenkins', 'github-intake': 'repositories', 'admin-console': 'settings', 'on-call-review': 'on-call', 'livestack-qa': 'automation', 'platform-content': 'par-links', 'usage-metrics': 'overview', 'sprint-ops': 'overview' }
const route = value => navigation.some(item => item.id === value) ? value : aliases[value] || 'overview'
const getStored = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback } }
const accounts = getStored(storageKey, getSeedState()).users || getSeedState().users
let session = getStored(sessionKey, null)
session = getSafeUser(accounts.find(user => user.id === session?.id && user.status === 'active'))
let activeView = route(new URLSearchParams(location.search).get('view') || localStorage.getItem(routeKey))
let data = { reports: null, framework: null, repositories: null }
let errors = {}, loading = false, message = '', requestId = 0
let selectedRun = '', onCallSnapshot = unavailableOnCall(), onCallCaseId = '', onCallReviewPreview = '', onCallReviewError = '', onCallLoading = false, onCallRequest = 0
const icons = { overview: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>', 'on-call': '<path d="M5 17h14l-2-4V9a5 5 0 0 0-10 0v4l-2 4Z"/><path d="M10 21h4"/>', jenkins: '<path d="M5 3h10l4 4v14H5Z"/><path d="M9 10h6M9 14h6M9 18h4"/>', 'par-links': '<path d="m10 14 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 0) scale(.9)"/>', automation: '<path d="m9 5 11 7-11 7Z"/><path d="M4 4v16"/>', repositories: '<path d="M6 5v14M6 8h8a4 4 0 0 0 4-4v-1"/><circle cx="6" cy="4" r="2"/><circle cx="6" cy="20" r="2"/><circle cx="18" cy="3" r="2"/>', settings: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>' }
const icon = id => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[id] || ''}</svg>`
const badge = (value, tone = '') => `<span class="status-badge ${esc(tone || (/passed|working|connected/i.test(value) && !/not connected/i.test(value) ? 'good' : /findings|failed|broken|incomplete/i.test(value) ? 'risk' : 'neutral'))}">${esc(value)}</span>`
const date = value => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-GB', {dateStyle:'medium', timeStyle:'short'}).format(new Date(value)) : '—'
const duration = value => Number.isFinite(value) ? (value / 60000).toFixed(1) + ' min' : '—'
const runs = () => data.reports?.runs || []
const latest = () => runs()[0]
const stale = run => run?.endedAt && Date.now() - Date.parse(run.endedAt) > 86400000
const metric = (label, value, note, tone = '') => `<div class="${tone}"><span>${esc(label)}</span><strong>${esc(value ?? '—')}</strong><small>${esc(note)}</small></div>`
const notice = text => `<p class="notice">${esc(text)}</p>`
const action = (view, label) => `<button class="row-link" data-view="${view}">${esc(label)}</button>`
const unavailable = name => loading ? `<div class="empty-state" role="status"><h2>Loading ${esc(name.toLowerCase())}…</h2><p>Reading the local workspace.</p></div>` : `<div class="empty-state"><h2>${esc(name)} unavailable</h2><p>Start the Hub with its local server to read the sibling QA Automation workspace.</p><button data-refresh>Retry connection</button></div>`
const reportLink = run => `<a href="${esc(run.reportUrl)}" target="_blank" rel="noreferrer">Original report ↗</a>`

function sourceLine() {
  const run = latest()
  return `<div class="page-actions"><span class="source-label">${run ? `Local artifacts · latest run ${date(run.startedAt)}` : 'Live Jenkins is not connected'} ${run && stale(run) ? badge('Stale snapshot', 'warn') : ''}</span><button data-refresh ${loading ? 'disabled' : ''}>${loading ? 'Refreshing…' : 'Refresh sources'}</button></div>`
}

function renderLogin() {
  return `<main class="auth-page"><section class="auth-panel"><div class="login-brand">LiveLabs <span>QA Hub</span></div><h1>Review your QA workspace</h1><p>Local preview · live services are not connected.</p><form id="login-form"><label>Email<input name="email" type="email" autocomplete="username" value="admin@livelabs.qa" required></label><label>Password<input name="password" type="password" autocomplete="current-password" value="admin123" required></label><button class="primary-button" type="submit">Open QA Hub</button>${message ? `<p role="alert">${esc(message)}</p>` : ''}</form><details><summary>Demo accounts</summary><p>admin@livelabs.qa / admin123<br>user@livelabs.qa / user123</p></details></section></main>`
}

function navItem(item) {
  return `<a href="?view=${item.id}" class="nav-item ${activeView === item.id ? 'active' : ''}" data-view="${item.id}" ${activeView === item.id ? 'aria-current="page"' : ''}>${icon(item.id)}<span>${esc(item.label)}</span></a>`
}

function renderShell() {
  const meta = navigation.find(item => item.id === activeView)
  return `<a class="skip-link" href="#main-content">Skip to content</a><div class="app-shell"><aside class="sidebar" id="qa-hub-sidebar"><a class="brand" href="?view=overview" data-view="overview"><span class="brand-oracle">ORACLE</span><strong>LiveLabs <span>QA Hub</span></strong></a><button class="mobile-nav-toggle" aria-expanded="false" aria-controls="primary-nav" data-menu>Menu</button><nav id="primary-nav" aria-label="Primary">${navigation.filter(item => item.id !== 'settings').map(navItem).join('')}</nav><div class="sidebar-bottom"><a href="https://oracle-livelabs.github.io/common/livelabs-analytics/" target="_blank" rel="noreferrer">LiveLabs Analytics ↗</a><a href="https://oracle-livelabs.github.io/common/new-author-guide/" target="_blank" rel="noreferrer">Author Guide ↗</a><div class="sidebar-divider"></div>${navItem(navigation.find(item => item.id === 'settings'))}<span class="preview-mode">Local preview</span></div></aside><main class="workspace" id="main-content" tabindex="-1"><header class="topbar"><div><p class="eyebrow">LiveLabs / Quality assurance</p><h1>${esc(meta.label)}</h1></div><div class="user-menu"><span>${esc(session.name)}</span><button id="logout-button">Sign out</button></div></header><p class="page-description">${esc(meta.help)}</p>${message ? `<p class="notice" role="status">${esc(message)}</p>` : ''}${renderView()}<footer class="workspace-footer"><span>Local workspace · ${Object.values(data).filter(Boolean).length}/3 local sources available</span><span>Times shown in your browser timezone</span></footer></main></div>${renderRunDetail()}`
}

function renderView() {
  if (activeView === 'overview') return renderOverview()
  if (activeView === 'jenkins') return renderJenkins()
  if (activeView === 'par-links') return renderPar()
  if (activeView === 'automation') return renderAutomation()
  if (activeView === 'repositories') return renderRepositories()
  if (activeView === 'on-call') return renderOnCallWorkspace(onCallSnapshot, { selectedCaseId: onCallCaseId, reviewPreview: onCallReviewPreview, reviewError: onCallReviewError, loading: onCallLoading })
  return renderSettings()
}

function failuresTable(id, rows) {
  return table(id, {label:'Findings to review', rows, filterKey:'category', filterLabel:'Category', columns:[{key:'title',label:'Check',render:r=>`<strong>${esc(r.title)}</strong>`},{key:'section',label:'Area'},{key:'category',label:'Finding',render:r=>badge(r.category, 'warn')},{key:'status',label:'Result'},{key:'file',label:'Evidence',render:r=>`<details class="cell-details"><summary>Spec location</summary><code>${esc(r.file)}:${esc(r.line)}</code></details>`}], empty:'No findings in the selected report.'})
}

function renderOverview() {
  const run = latest(), c = run?.counts
  return `${sourceLine()}<div class="metric-strip">${metric('Checks in latest run', c?.total, run ? 'Saved local report' : 'No report loaded')}${metric('Unexpected results',c?.unexpected,'Require review','risk')}${metric('Passed',c?.passed,'Latest run only','good')}${metric('Skipped',c?.skipped,'Excluded from pass rate')}</div>
    ${run ? `<div class="section-heading compact-heading"><div><h2>Latest regression</h2><p>${date(run.startedAt)} · ${duration(run.durationMs)} · ${esc(run.source)}</p></div><div class="inline-actions">${badge(run.status)}${action('jenkins', 'View run history →')}</div></div>${failuresTable('overview-findings',run.failures)}` : unavailable('Run reports')}
    ${table('source-summary',{label:'Source connections',rows:sourceRows(),filterKey:'status',columns:[{key:'name',label:'Source'},{key:'status',label:'Connection',render:r=>badge(r.status,'neutral')},{key:'scope',label:'Available data'},{key:'next',label:'Review',render:r=>action(r.view,r.next)}]})}`
}

function sourceRows() {
  return [
    {name:'Jenkins / reports',status:'Live not connected',scope:data.reports ? runs().length + ' saved local runs' : 'No local reports',next:'Run history',view:'jenkins'},
    {name:'PAR link checks',status:latest()?.par.hasData ? 'Local artifact' : 'Not measured',scope:'Same regression report; separate coverage status',next:'PAR coverage',view:'par-links'},
    {name:'On-call automations',status:onCallSnapshot.mode === 'synthetic' ? 'Synthetic preview' : onCallSnapshot.availability === 'AVAILABLE' ? 'Private response' : 'Not connected',scope:'Authors Slack and three configured mail sources',next:'On-call inbox',view:'on-call'},
    {name:'QA framework',status:data.framework ? 'Local source' : 'Unavailable',scope:data.framework ? data.framework.specFiles + ' spec files across ' + data.framework.lanes.length + ' lanes' : 'No inventory',next:'Test inventory',view:'automation'},
    {name:'GitHub repositories',status:'Live not connected',scope:data.repositories ? data.repositories.repositories.length + ' local checkouts' : 'No inventory',next:'Repositories',view:'repositories'}
  ]
}

function renderJenkins() {
  const rows = runs().map(run => ({...run,total:run.counts.total,unexpected:run.counts.unexpected,passed:run.counts.passed}))
  return `${sourceLine()}${data.reports?.unavailableRuns ? notice(data.reports.unavailableRuns + ' report(s) could not be read. History may be incomplete.') : ''}${notice('Saved local reports are available below. Live build status, queues and schedules need the Jenkins connection.')}${table('run-history',{label:'Run history',rows,filterKey:'status',defaultSort:'startedAt',descending:true,columns:[{key:'startedAt',label:'Started',render:r=>`<button class="row-link" data-run="${esc(r.runId)}">${date(r.startedAt)}</button><small>${esc(r.runId)}</small>`},{key:'status',label:'Outcome',render:r=>badge(r.status)},{key:'total',label:'Checks',numeric:true},{key:'unexpected',label:'Unexpected',numeric:true},{key:'durationMs',label:'Duration',render:r=>duration(r.durationMs)},{key:'source',label:'Source'},{key:'reportUrl',label:'Report',render:reportLink}],empty:'No saved reports available.'})}
    <details class="disclosure"><summary>Jenkins jobs and report semantics</summary><div class="plain-grid"><div><h3>LiveLabs overall regression</h3><p>Operator entry point for full and targeted scans. Scheduled in Jenkins.</p></div><div><h3>LiveLabs QA engine</h3><p>Runs the selected profile and publishes the unified evidence.</p></div></div><p>A completed scan with findings is distinct from an interrupted or failed execution. The saved report result and Jenkins build result will both be retained when connected.</p></details>`
}

function renderPar() {
  const run = latest(), par = run?.par, measured = par?.hasData
  return `${sourceLine()}<div class="metric-strip">${metric('PAR links',measured ? par.counts.total : null,measured ? 'Latest run coverage' : 'Not measured')}${metric('Broken',measured ? par.counts.broken : null,'Confirmed unusable links','risk')}${metric('Unverified',measured ? par.counts.unverified : null,'Inconclusive probes')}${metric('Pages scanned',measured ? par.pagesScanned : null,'Source coverage')}</div>
    ${!measured ? notice('The latest saved run contains no PAR audit data. Zero findings here does not establish healthy links.') : ''}
    ${table('par-findings',{label:'PAR findings',rows:measured ? par.findings : [],filterKey:'status',columns:[{key:'title',label:'Object'},{key:'itemId',label:'Catalog item'},{key:'status',label:'Status',render:r=>badge(r.status)},{key:'httpStatus',label:'HTTP',numeric:true},{key:'occurrences',label:'Source locations',numeric:true}],empty:'No PAR measurements in the latest report.'})}
    <details class="disclosure"><summary>Coverage and retest workflow</summary><p>Broken links, unverified probes and unscanned source pages remain separate. Tokens stay masked; a future protected resolver will provide approved access.</p><p>Target repaired catalog item IDs through QA Automation. PAR checks run with the unified regression.</p>${action('automation','Open QA Automation →')}${run ? `<p>${reportLink(run)}</p>` : ''}</details>`
}

function renderAutomation() {
  const framework = data.framework, run = latest()
  const attempted = run ? run.counts.passed + run.counts.unexpected : 0
  return `${sourceLine()}<div class="metric-strip">${metric('Spec files',framework?.specFiles,'Source inventory, not test count')}${metric('Test lanes',framework?.lanes.length,'Public, generated, PAR and auth')}${metric('Latest pass rate',attempted ? (100*run.counts.passed/attempted).toFixed(1)+'%' : null,'Passed ÷ (passed + unexpected)')}${metric('Flaky results',run?.counts.flaky,'Latest saved run')}</div>
    <details class="disclosure run-controls"><summary>Run tests <span class="status-badge neutral">Connection required</span></summary><form id="run-request-form" class="run-form"><label>Profile<select name="profile"><option value="pr-slice">PR slice</option><option value="nightly-full">Full catalog</option><option value="manual-items">Targeted catalog items</option></select></label><label>Catalog item IDs<input name="items" placeholder="For example: 1234, 5678" inputmode="numeric" pattern="[0-9, ]*"></label><button type="submit">Preview request</button><button type="button" class="primary-button" disabled aria-describedby="run-connection-note">Run tests</button></form><p id="run-connection-note">Connect the authenticated Jenkins execution API to enable runs. Previewing a request does not start a job.</p><pre id="run-request-preview" hidden></pre></details>
    ${framework ? table('framework-lanes',{label:'Test inventory',rows:framework.lanes,columns:[{key:'name',label:'Lane'},{key:'specs',label:'Spec files',numeric:true},{key:'scope',label:'Coverage'}]}) : unavailable('Framework inventory')}
    ${run ? table('section-results',{label:'Latest results by area',rows:run.sections.map(section => ({...section,result:section.unexpected ? 'Findings' : section.interrupted ? 'Incomplete' : !section.total ? 'Not measured' : section.skipped === section.total ? 'Skipped' : section.skipped ? 'Passed with skips' : 'Passed'})),filterKey:'result',filterLabel:'Result',columns:[{key:'name',label:'Area'},{key:'result',label:'Result'},{key:'total',label:'Checks',numeric:true},{key:'passed',label:'Passed',numeric:true},{key:'unexpected',label:'Unexpected',numeric:true},{key:'skipped',label:'Skipped',numeric:true}]}) : ''}
    <details class="disclosure"><summary>Framework and execution scope</summary><p>Playwright ${esc(framework?.playwright || 'not loaded')} · Node ${esc(framework?.node || 'not loaded')} · TypeScript</p><p>Generated catalog tests expand at runtime. Instruction-page checks do not provision resources or prove workshop execution.</p></details>`
}

function renderRepositories() {
  const rows = data.repositories?.repositories || []
  return `<div class="page-actions"><span class="source-label">Local checkout inventory · GitHub status is not connected</span><button data-refresh ${loading ? 'disabled' : ''}>Refresh sources</button></div><div class="metric-strip">${metric('Repositories',data.repositories ? rows.length : null,'Local LiveLabs checkouts')}${metric('Manifest files',data.repositories ? rows.reduce((n,r)=>n+r.manifestFiles,0) : null,'Tracked files, not unique workshops')}${metric('Workflow files',data.repositories ? rows.reduce((n,r)=>n+r.workflowFiles,0) : null,'Presence does not prove CI runs')}${metric('Open pull requests',null,'Live GitHub connection required')}</div>${table('repository-inventory',{label:'Repository inventory',rows,filterKey:'focus',filterLabel:'Area',defaultSort:'name',columns:[{key:'name',label:'Repository',render:r=>`<a href="${esc(r.url)}" target="_blank" rel="noreferrer">${esc(r.name)} ↗</a>`},{key:'focus',label:'Area'},{key:'manifestFiles',label:'Manifests',numeric:true},{key:'workflowFiles',label:'Workflows',numeric:true},{key:'committedAt',label:'Local commit date',render:r=>`${date(r.committedAt)}<small>${esc(r.commit)}</small>`},{key:'branch',label:'Local branch'}],empty:'No local repository inventory available.'})}${notice('PR review age, check results, owners and failed workflows will come from a read-only GitHub adapter. Local commit dates are not remote freshness.')}`
}

function renderSettings() {
  return `${table('settings-sources',{label:'Connections',rows:sourceRows(),columns:[{key:'name',label:'Source'},{key:'status',label:'State'},{key:'scope',label:'Current scope'}]})}<details class="disclosure"><summary>Preview access</summary><p>Signed in as ${esc(session.name)} (${esc(session.role)}). Demo login controls the preview UI only; it is not production authentication. The local reader is bound to 127.0.0.1 and exposes no run or source-write endpoint.</p></details><details class="disclosure"><summary>Data and freshness</summary><p>Run metrics are derived from saved QA Automation reports. The preview marks reports older than 24 hours as stale. Production freshness thresholds will be configured per source.</p><p>On-call data remains in memory and is cleared at sign out. No support cases or reports are stored in browser storage.</p></details><details class="disclosure"><summary>Integration roadmap</summary><ol><li>Confirm the private portal URL, TLS trust and authentication.</li><li>Connect Jenkins run history and immutable reports.</li><li>Connect private on-call feeds and GitHub review queues.</li><li>Enable authorized, audited test requests.</li></ol></details>${Object.keys(errors).length ? notice('Unavailable local sources: '+Object.keys(errors).join(', ')) : ''}`
}

function renderRunDetail() {
  const run = runs().find(item => item.runId === selectedRun)
  if (!run) return ''
  return `<dialog id="run-dialog" aria-labelledby="run-title"><div class="section-heading"><h2 id="run-title">Run details</h2><button data-close-run aria-label="Close run details">Close</button></div><p>${date(run.startedAt)} · ${esc(run.source)}</p><p>${badge(run.status)} ${reportLink(run)}</p><div class="metric-strip">${metric('Checks',run.counts.total,'')}${metric('Passed',run.counts.passed,'')}${metric('Unexpected',run.counts.unexpected,'')}${metric('Skipped',run.counts.skipped,'')}</div>${failuresTable('run-findings',run.failures)}<details class="disclosure"><summary>Run identity</summary><p>${esc(run.runId)}</p><p>Raw report status: ${esc(run.rawStatus)} · Completion: ${esc(run.completionState)}</p><p>Jenkins build ID and commit are not present in this local artifact.</p></details></dialog>`
}

function render({ focus = false } = {}) {
  app.innerHTML = session ? renderShell() : renderLogin()
  bindTables(app)
  if (selectedRun) document.querySelector('#run-dialog')?.showModal()
  document.querySelector('#run-dialog')?.addEventListener('cancel', event => { event.preventDefault(); closeRun() })
  if (focus) document.querySelector('#main-content')?.focus()
}
function closeRun() { const id = selectedRun; selectedRun = ''; render(); document.querySelector('[data-run="'+id+'"]')?.focus() }

async function refreshSources() {
  const request = ++requestId
  loading = true; render()
  const names = ['reports', 'framework', 'repositories']
  const results = await Promise.allSettled(names.map(async name => {
    const response = await fetch(new URL('./api/local/'+name, location.href), {cache:'no-store',credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(20000)})
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Unavailable')
    const payload = await response.json()
    if (payload.mode !== 'local' || !payload.schema?.startsWith('qa-hub.')) throw new Error('Invalid source')
    return payload
  }))
  if (request !== requestId || !session) return
  errors = {}
  results.forEach((result,index) => { const name = names[index]; data[name] = result.status === 'fulfilled' ? result.value : null; if (result.status === 'rejected') errors[name] = true })
  loading = false; render()
}

app.addEventListener('click', async event => {
  if (event.target.closest('[data-menu]')) { const side = document.querySelector('.sidebar'); const open = side.classList.toggle('nav-open'); event.target.closest('[data-menu]').setAttribute('aria-expanded', String(open)); return }
  const view = event.target.closest('[data-view]')
  if (view) { event.preventDefault(); activeView = route(view.dataset.view); selectedRun = ''; message = ''; localStorage.setItem(routeKey,activeView); const url = new URL(location.href); url.searchParams.set('view',activeView); history.pushState({},'',url); render({focus:true}); return }
  if (event.target.closest('[data-refresh]')) return refreshSources()
  if (event.target.closest('#logout-button')) { requestId++; onCallRequest++; onCallSnapshot=unavailableOnCall(); onCallCaseId=''; onCallReviewPreview=''; onCallReviewError=''; onCallLoading=false; data={reports:null,framework:null,repositories:null}; selectedRun=''; session=null; loading=false; message=''; localStorage.removeItem(sessionKey); render(); return }
  const run = event.target.closest('[data-run]')
  if (run) { selectedRun=run.dataset.run; render(); return }
  if (event.target.closest('[data-close-run]')) return closeRun()
  const item = event.target.closest('[data-on-call-case]')
  if (item) {onCallCaseId=item.dataset.onCallCase;onCallReviewPreview='';onCallReviewError='';render();document.querySelector('#case-detail')?.focus();return}
  if (event.target.closest('[data-close-case]')) {onCallCaseId='';render();return}
  const load = event.target.closest('[data-on-call-load]')
  if (load) {
    const request=++onCallRequest, mode=load.dataset.onCallLoad
    onCallSnapshot=unavailableOnCall();onCallCaseId='';onCallReviewPreview='';onCallReviewError='';onCallLoading=mode!=='none';render()
    const endpoint=document.querySelector('meta[name="on-call-review-endpoint"]')?.content || ''
    const snapshot=await loadOnCallSnapshot({mode,endpoint,origin:location.origin,assetBase:new URL('./',location.href).href})
    if (request!==onCallRequest || !session) return
    onCallSnapshot=snapshot;onCallLoading=false;render()
  }
})

app.addEventListener('submit', event => {
  const form=event.target
  if (form.id==='login-form') {
    event.preventDefault();const fields=new FormData(form), result=authenticate(accounts,fields.get('email'),fields.get('password'))
    if (!result.ok) {message=result.reason;render();return}
    session=result.user;localStorage.setItem(sessionKey,JSON.stringify(session));message='';render();refreshSources()
  }
  if (form.matches('[data-on-call-review]')) {
    event.preventDefault()
    try {onCallReviewPreview=JSON.stringify(createReviewPreview(onCallSnapshot,form.dataset.onCallReview,new FormData(form).get('reviewer')),null,2);onCallReviewError=''} catch(error) {onCallReviewPreview='';onCallReviewError=error.message}
    render()
  }
  if (form.id==='run-request-form') {
    event.preventDefault();const fields=new FormData(form), profile=fields.get('profile'), items=[...new Set(String(fields.get('items')).split(/[ ,]+/).filter(Boolean))]
    const preview=document.querySelector('#run-request-preview');preview.hidden=false
    preview.textContent=profile==='manual-items' && !items.length ? 'Enter at least one catalog item ID for a targeted run.' : profile!=='manual-items' && items.length ? 'Choose Targeted catalog items to use an item list.' : (['Profile: ' + ({'pr-slice':'PR slice','nightly-full':'Full catalog','manual-items':'Targeted catalog items'}[profile]),'Scope: ' + (items.length ? items.join(', ') : profile === 'nightly-full' ? 'Full catalog' : 'Configured PR slice'),'Preview only. Connect Jenkins before submitting a run.'].join('\n'))
  }
})
window.addEventListener('popstate',()=>{activeView=route(new URLSearchParams(location.search).get('view'));selectedRun='';render({focus:true})})
render()
if (session) refreshSources()
