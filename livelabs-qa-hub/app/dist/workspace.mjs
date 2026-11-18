import { STORAGE_KEY, workflows, domains, priorities, readWorkspace, rowsFor, editRecord, addRecord, createBugForTest, addPlan, planSummary, recordManualResult } from './tms/workspace-model.mjs'
import { esc, icon, date, stale, opt, pill, outcome, empty } from './workspace-ui.mjs'
import { loadOnCallSnapshot, unavailableOnCall, createReviewPreview } from './on-call-review.mjs'
import { renderOnCallWorkspace } from './on-call-workspace.mjs'
import { bindTables } from './table.mjs'

const root = document.querySelector('#hub'), dialog = document.querySelector('#task-dialog'), modal = document.querySelector('#utility-dialog')
let local = readWorkspace(localStorage), snapshot = null, reports = null, repositories = null
let loading = true, sourceError = '', saveError = false, busy = false, mobile = false, filterOpen = false, selectedRecord = null, timer
let onCall = unavailableOnCall(), onCallSelected = '', onCallPreview = '', onCallError = '', onCallLoading = false, onCallRequest = 0
let query = '', sort = 'priority', filters = { domain: '', outcome: '', owner: '', origin: '' }, limits = {}
let route = { section: 'dashboard', view: 'board' }
const pages = {
  dashboard: { title: 'QA dashboard', help: 'The work, the coverage, and the evidence. Together.', icon: 'dashboard' },
  tests: { title: 'Tests', help: 'Manage test readiness. Keep recorded outcomes in view.', icon: 'tests' },
  bugs: { title: 'Bugs & findings', help: 'Triage findings, track fixes, and follow through on retests.', icon: 'bugs' },
  plans: { title: 'Test plans', help: 'Bring the right tests together for a review or release.', icon: 'plans' },
  requirements: { title: 'Requirements', help: 'Connect expected behavior to the tests that cover it.', icon: 'requirements' },
  work: { title: 'QA work', help: 'Plan the follow-up work across your QA areas.', icon: 'board' },
  runs: { title: 'Automation runs', help: 'Saved framework reports. Live Jenkins is not connected.', icon: 'runs' },
  'par-links': { title: 'PAR Links', help: 'Review link findings and the scope of the latest saved audit.', icon: 'par-links' },
  'on-call': { title: 'On-Call', help: 'Review support cases, draft states, and source coverage.', icon: 'on-call' },
  repositories: { title: 'Repositories', help: 'Local checkouts and source inventory. Live PR feeds are not connected.', icon: 'repositories' },
  settings: { title: 'Sources & workspace', help: 'See where the data comes from and how local work is stored.', icon: 'settings' }
}
const aliases = { overview: 'dashboard', automation: 'tests', jenkins: 'runs', execution: 'tests', defects: 'bugs', repository: 'tests', reports: 'runs' }
const recordKinds = ['tests', 'bugs', 'work']
const allRows = kind => rowsFor(kind, snapshot, local)
const domainFor = id => domains.find(d => d.id === id) || domains[0]
const priorityOrder = ['Critical', 'High', 'Untriaged', 'Medium', 'Low']
const statusFor = row => workflows[row.kind].find(s => s.id === row.status)
const ownerLabel = row => row.owner || 'Unassigned'
const avatar = row => `<span class="avatar ${domainFor(row.domain).color}" title="${esc(ownerLabel(row))}" aria-label="${esc(ownerLabel(row))}">${esc(row.owner ? row.owner.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() : '–')}</span>`
const priority = row => `<span class="priority ${['Critical', 'High'].includes(row.priority) ? 'high' : row.priority === 'Medium' ? 'medium' : 'low'}">${esc(row.priority)}</span>`
const actionButton = (action, label, glyph = 'plus', primary = false) => `<button class="button ${primary ? 'primary' : ''}" data-action="${action}">${icon(glyph)}${label}</button>`
const lastRun = () => snapshot?.runs[0]
const currentTests = () => snapshot?.tests.filter(t => t.inSource) || []
function notify(text) { const el = document.querySelector('#toast'); el.textContent = text; el.classList.add('toast-visible'); clearTimeout(timer); timer = setTimeout(() => el.classList.remove('toast-visible'), 3000) }
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(local)); saveError = false }
  catch { saveError = true; notify('Storage is unavailable. Changes remain in this tab only.') }
}
function readRoute() {
  const params = new URLSearchParams(location.hash.slice(1)), legacy = new URLSearchParams(location.search).get('view')
  const section = params.get('section') || aliases[legacy] || legacy || 'dashboard'
  route = { section: pages[section] ? section : 'dashboard', view: ['board', 'list', 'roadmap'].includes(params.get('view')) ? params.get('view') : 'board' }
  return params.get('record')
}
function navigate(section, view = 'board', clear = true) {
  route = { section, view }; if (clear) { query = ''; filters = { domain: '', outcome: '', owner: '', origin: '' }; limits = {} }
  mobile = false
  history.pushState(null, '', `#${new URLSearchParams({ section, view })}`)
  render()
  if (section === 'repositories' && !repositories) loadRepositories()
}
function visibleRows() {
  const term = query.toLowerCase().trim()
  const rows = allRows(route.section).filter(r => (!term || [r.title, r.id, r.file, r.owner, r.lane, r.description].join(' ').toLowerCase().includes(term)) && (!filters.domain || r.domain === filters.domain) && (!filters.owner || ownerLabel(r) === filters.owner) && (!filters.outcome || (filters.outcome === 'none' ? !r.result : r.result?.status === filters.outcome)) && (!filters.origin || (filters.origin === 'current' ? r.inSource : filters.origin === 'historical' ? r.source === 'Historical report only' : r.source.startsWith('Local'))))
  return rows.sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'due' ? (a.due || '9999').localeCompare(b.due || '9999') : priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority))
}
function navItem(section, count) {
  return `<button class="nav-item ${route.section === section ? 'active' : ''}" data-nav="${section}"${route.section === section ? ' aria-current="page"' : ''}>${icon(pages[section].icon)}${section === 'runs' ? 'Automation runs' : pages[section].title}${count !== undefined ? `<span class="nav-count">${count}</span>` : ''}</button>`
}
function render() {
  const page = pages[route.section], isRecords = recordKinds.includes(route.section), latest = lastRun(), bugs = allRows('bugs')
  document.title = `${page.title} · LiveLabs QA Hub`
  root.innerHTML = `<div class="app-frame unified-frame">
    <header class="global-bar"><button class="icon-button mobile-toggle" data-action="menu" aria-label="Toggle navigation" aria-expanded="${mobile}">${icon('menu')}</button><a class="brand" href="#section=dashboard"><span class="brand-mark">${icon('check')}</span>LiveLabs<small>QA HUB</small></a><label class="global-search">${icon('search')}<input id="workspace-search" type="search" placeholder="Search ${isRecords ? pages[route.section].title.toLowerCase() : 'tests, bugs, and QA work'}" aria-label="Search workspace" value="${esc(query)}"><kbd>/</kbd></label><div class="global-actions"><span class="prototype-label">Local workspace</span><button class="icon-button" data-action="refresh" aria-label="Refresh local sources"${loading ? ' disabled' : ''}>${icon('refresh')}</button><span class="avatar self" title="Local reviewer">QA</span></div></header>
    <aside class="sidebar ${mobile ? 'open' : ''}" aria-label="Workspace navigation"><div class="workspace-name"><span class="workspace-monogram">LL</span><div>Quality workspace<small>QA Hub + Test Management</small></div></div><nav aria-label="Main navigation">${navItem('dashboard')}${navItem('work', local.work.length)}<div class="nav-section-label">Test management</div>${navItem('tests', snapshot ? allRows('tests').length : '…')}${navItem('bugs', bugs.filter(b => b.status !== 'closed').length)}${navItem('plans', local.plans.length)}${navItem('requirements', local.requirements.length)}<div class="nav-section-label">Operations</div>${navItem('runs')}${navItem('par-links')}${navItem('on-call')}${navItem('repositories')}</nav><div class="sidebar-bottom">${navItem('settings')}<div class="sidebar-note"><span>One quality workspace.</span>Framework evidence. Clear next steps.</div></div></aside>
    <main class="workspace" id="workspace" tabindex="-1"><div class="project-header"><div class="breadcrumb">LiveLabs <span>/</span> Quality assurance ${['tests', 'bugs', 'plans', 'requirements'].includes(route.section) ? '<span>/</span> Test management' : ''}</div><div class="title-row"><div class="project-symbol ${route.section === 'bugs' ? 'sienna' : 'teal'}">${icon(page.icon)}</div><div class="title-copy"><h1>${page.title}</h1><p>${page.help}</p></div><div class="title-actions">${route.section === 'dashboard' ? actionButton('refresh', loading ? 'Reading sources…' : 'Refresh sources', 'refresh') : isRecords ? actionButton('export', 'Export view', 'download') : ''}</div></div><nav class="tabs" aria-label="View">${isRecords ? ['board', 'list', ...(route.section === 'work' ? ['roadmap'] : [])].map(v => `<button class="tab ${route.view === v ? 'active' : ''}" data-tab="${v}"${route.view === v ? ' aria-current="page"' : ''}>${icon(v)}${v[0].toUpperCase() + v.slice(1)}</button>`).join('') : `<span class="tab active">${icon(page.icon)}${route.section === 'runs' ? 'Run history' : route.section === 'dashboard' ? 'Overview' : page.title}</span>`}</nav></div>
    ${isRecords ? toolbar() : ''}${isRecords && filterOpen ? filterPanel() : ''}
    <div class="content ${route.section === 'dashboard' ? 'dashboard-content' : ''}" id="workspace-content"></div><footer class="workspace-footer">${icon('lock')}${saveError ? 'Changes in this tab only' : 'Workflow edits saved in this browser'}<span class="footer-right">${loading ? 'Reading local sources…' : snapshot ? `${currentTests().length} current tests · ${snapshot.runs.length} saved runs` : 'Automation source unavailable'} · <button data-nav="settings">Source details</button></span></footer></main></div>`
  renderContent()
}
function toolbar() {
  const label = route.section === 'tests' ? 'Add manual test' : route.section === 'bugs' ? 'Log bug' : 'Add task'
  return `<div class="toolbar">${actionButton('create', label, 'plus', true)}${route.section === 'tests' ? actionButton('plan-from-view', 'Create test plan', 'plans') : ''}<span class="toolbar-spacer"></span><button class="button subtle ${filterOpen ? 'active-control' : ''}" data-action="filter" aria-expanded="${filterOpen}" aria-controls="workspace-filters">${icon('filter')}Filter${Object.values(filters).filter(Boolean).length ? ` (${Object.values(filters).filter(Boolean).length})` : ''}</button><label class="tool-select"><select id="workspace-sort" aria-label="Sort records">${opt([{ id: 'priority', name: 'Priority' }, { id: 'title', name: 'Task name' }, { id: 'due', name: 'Due date' }], sort)}</select></label><span class="workflow-label">Grouped by ${route.view === 'roadmap' ? 'month' : 'workflow'}</span></div>`
}
function filterPanel() {
  const owners = [...new Set(allRows(route.section).map(ownerLabel))].sort()
  return `<div class="filter-panel" id="workspace-filters"><label class="field-label">Domain<select data-filter="domain">${opt([{ id: '', name: 'All domains' }, ...domains], filters.domain)}</select></label><label class="field-label">Recorded result<select data-filter="outcome">${opt([{ id: '', name: 'All results' }, ...['passed', 'failed', 'skipped', 'timedOut', 'interrupted', 'none'].map(id => ({ id, name: id === 'none' ? 'No recorded result' : id }))], filters.outcome)}</select></label><label class="field-label">Owner<select data-filter="owner">${opt([{ id: '', name: 'All owners' }, ...owners.map(id => ({ id, name: id }))], filters.owner)}</select></label>${route.section === 'tests' ? `<label class="field-label">Origin<select data-filter="origin">${opt([{ id: '', name: 'All tests' }, { id: 'current', name: 'Current source' }, { id: 'historical', name: 'Historical only' }, { id: 'manual', name: 'Local manual' }], filters.origin)}</select></label>` : ''}<button class="button subtle" data-action="clear">Clear filters</button></div>`
}
function sourceNotice() {
  if (loading && !snapshot) return '<div class="source-banner" role="status">Reading the framework test inventory and saved reports…</div>'
  if (!snapshot) return `<div class="source-banner warning">${esc(sourceError || 'Automation evidence is unavailable. You can still manage local work.')} ${actionButton('refresh', 'Retry', 'refresh')}</div>`
  const last = lastRun()
  return `<div class="source-banner ${last && stale(last.startedAt) ? 'warning' : ''}"><span>${icon('clock')} ${last ? `Latest saved run: <strong>${date(last.startedAt)}</strong> ${stale(last.startedAt) ? '· Historical evidence — a fresh run is needed to establish current health.' : '· Local report'}` : 'No saved execution results. Collection does not establish a pass or fail.'}</span><button data-nav="runs">Review evidence ${icon('arrow')}</button></div>${snapshot.source.issues.map(issue => `<p class="source-issue">${esc(issue)}</p>`).join('')}`
}
function renderContent() {
  const content = document.querySelector('#workspace-content')
  if (recordKinds.includes(route.section)) {
    const rows = visibleRows(), history = route.section === 'tests' ? rows.filter(t => t.source === 'Historical report only').length : 0
    content.innerHTML = `<div class="context-line"><strong>${rows.length} ${route.section === 'tests' ? 'test cases' : route.section === 'bugs' ? 'bugs & findings' : 'work items'}</strong><span class="mini-divider"></span><span>${route.section === 'tests' ? `${history} historical only · workflow ≠ execution result` : route.section === 'bugs' ? 'Automation findings require human triage' : 'Local planning'}</span><span class="right-note">${icon('lock')}Local workflow</span></div>${sourceError ? `<p class="source-issue">${esc(sourceError)}</p>` : ''}${rows.length ? route.view === 'list' ? renderList(rows) : route.view === 'roadmap' ? renderRoadmap(rows) : renderBoard(rows) : loading ? empty('Reading test sources', 'The framework inventory is being collected without executing tests.') : empty(query || Object.values(filters).some(Boolean) ? 'No matching records' : 'A clear place to start', query || Object.values(filters).some(Boolean) ? 'Adjust the search or filters to see more records.' : 'Create a record to start tracking work here.', actionButton(query || Object.values(filters).some(Boolean) ? 'clear' : 'create', query || Object.values(filters).some(Boolean) ? 'Clear filters' : 'Create a record'))}`
  } else if (route.section === 'dashboard') content.innerHTML = dashboard()
  else if (route.section === 'plans') content.innerHTML = renderPlans()
  else if (route.section === 'requirements') content.innerHTML = renderRequirements()
  else if (route.section === 'runs') content.innerHTML = renderRuns()
  else if (route.section === 'par-links') content.innerHTML = renderPar()
  else if (route.section === 'on-call') content.innerHTML = `<div class="operations-view">${renderOnCallWorkspace(onCall, { selectedCaseId: onCallSelected, reviewPreview: onCallPreview, reviewError: onCallError, loading: onCallLoading })}</div>`
  else if (route.section === 'repositories') content.innerHTML = renderRepositories()
  else content.innerHTML = settings()
  bindTables(content)
}
function card(row) {
  const domain = domainFor(row.domain)
  const bundle = row.file?.match(/tests\/generated\/livestacks\/([^/]+)/)?.[1]
  return `<article class="task-card unified-card" data-card="${esc(row.id)}" data-kind="${row.kind}" draggable="true"><div class="card-top"><span class="task-id">${row.source.startsWith('Local') ? row.kind === 'tests' ? 'Manual test' : row.kind === 'bugs' ? 'Local bug' : 'Task' : row.kind === 'bugs' ? 'Finding' : row.inSource ? 'Automated test' : 'Historical test'}</span>${priority(row)}</div><div class="card-title"><span class="record-glyph ${domain.color}">${icon(row.kind === 'bugs' ? 'bugs' : row.kind === 'tests' ? 'tests' : 'circle')}</span><button class="card-open" data-record="${esc(row.id)}" data-kind="${row.kind}">${esc(row.title)}</button></div>${bundle ? `<p class="record-context">${esc(bundle.replaceAll('-', ' '))}</p>` : ''}<div class="card-tags">${pill(domain.name, domain.color)}${row.lane ? pill(row.lane) : ''}${row.setupRequired ? pill('Setup required', 'sienna') : ''}</div>${row.kind !== 'work' ? `<div class="record-outcome">${outcome(row.result)}${row.result ? `<span>${date(row.result.startedAt)}</span>` : ''}</div>` : ''}<div class="card-footer"><span>${row.due ? icon('plans') + ' ' + date(row.due + 'T12:00:00') : row.kind === 'bugs' ? `${row.occurrences.length} recorded occurrence${row.occurrences.length === 1 ? '' : 's'}` : row.file ? esc(row.file.split('/').pop()) : 'Local planning'}</span><span class="card-metadata">${avatar(row)}</span></div></article>`
}
function renderBoard(rows) {
  return `<div class="board workflow-board">${workflows[route.section].map(stage => {
    const members = rows.filter(r => r.status === stage.id), limit = limits[stage.id] || 18
    return `<section class="board-column ${stage.color}" data-drop="${stage.id}" aria-label="${stage.name}"><h2 class="column-title"><span class="dot"></span>${stage.name}<span class="column-count">${members.length}</span><button class="icon-button" data-new-status="${stage.id}" aria-label="Create in ${stage.name}">${icon('plus')}</button></h2><p class="column-hint">${stage.id === 'triage' ? 'Confirm the issue and its impact' : stage.id === 'retest' ? 'A fix is ready for verification' : stage.id === 'done' || stage.id === 'closed' ? 'Locally marked complete' : 'Local workflow status'}</p><div class="column-cards">${members.length ? members.slice(0, limit).map(card).join('') : '<div class="empty-column">Drop a card here<br>or update its workflow status.</div>'}</div>${members.length > limit ? `<button class="column-add" data-more="${stage.id}">Show ${Math.min(18, members.length - limit)} more · ${members.length - limit} remaining</button>` : ''}</section>`
  }).join('')}</div>`
}
function renderList(rows) {
  return `<div class="list-wrap"><table class="task-table"><thead><tr><th>Name</th><th>Domain</th><th>Workflow</th><th>Recorded result</th><th>Priority</th><th>Owner</th></tr></thead><tbody>${rows.map(row => `<tr><td><button class="list-task-button" data-record="${esc(row.id)}" data-kind="${row.kind}">${icon(row.kind === 'bugs' ? 'bugs' : 'tests')}${esc(row.title)}</button><small class="list-origin">${esc(row.source)}</small></td><td>${pill(domainFor(row.domain).name, domainFor(row.domain).color)}</td><td>${pill(statusFor(row).name, statusFor(row).color)}</td><td>${outcome(row.result)}${row.result ? `<small class="list-origin">${date(row.result.startedAt)}</small>` : ''}</td><td>${priority(row)}</td><td>${avatar(row)} ${esc(ownerLabel(row))}</td></tr>`).join('')}</tbody></table></div>`
}
function renderRoadmap(rows) {
  const now = new Date(), upcoming = Array.from({ length: 3 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() + i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })
  const months = [...new Set([...upcoming, ...rows.map(r => r.due?.slice(0, 7) || 'unscheduled')])].sort()
  return `<div class="board roadmap-board">${months.map(month => `<section class="board-column teal" data-drop-month="${month}"><h2 class="column-title">${month === 'unscheduled' ? 'Unscheduled' : new Date(month + '-01T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}<span class="column-count">${rows.filter(r => (r.due?.slice(0, 7) || 'unscheduled') === month).length}</span></h2><div class="column-cards">${rows.filter(r => (r.due?.slice(0, 7) || 'unscheduled') === month).map(card).join('')}</div></section>`).join('')}</div>`
}
function dashboard() {
  const tests = allRows('tests'), bugs = allRows('bugs'), open = bugs.filter(b => b.status !== 'closed'), last = lastRun()
  const stats = [['Current automated tests', snapshot?.source.collection === 'available' ? currentTests().length : '—', `${snapshot?.source.specFiles || 0} specs · ${currentTests().filter(t => t.setupRequired).length} setup guards`, 'tests'], ['Open bugs & findings', open.length, `${open.filter(b => b.status === 'triage').length} awaiting triage`, 'bugs'], ['Test plans', local.plans.length, 'Local scopes for review and release', 'plans'], ['Tests in review', tests.filter(t => t.status === 'review').length, 'Workflow status, separate from result', 'tests']]
  return `${sourceNotice()}<div class="overview-stats hub-stats">${stats.map(([label, value, note, section]) => `<button class="stat" data-nav="${section}"><span class="stat-label">${label}${icon('arrow')}</span><strong class="stat-value">${value}</strong><span class="stat-note">${note}</span></button>`).join('')}</div><div class="dashboard-grid"><section class="overview-panel triage-panel"><div class="panel-heading"><div><span class="eyebrow">Focus for review</span><h2>Start with the findings</h2></div><button class="button subtle" data-nav="bugs">Open board ${icon('arrow')}</button></div>${open.length ? open.slice(0, 5).map(b => `<button class="overview-task" data-record="${esc(b.id)}" data-kind="bugs"><span class="finding-symbol">${icon('bugs')}</span><span><p>${esc(b.title)}</p><small>${esc(b.classification || 'Local bug')} · ${domainFor(b.domain).name}</small></span>${pill(statusFor(b).name, statusFor(b).color)}${icon('arrow')}</button>`).join('') : empty('No open findings', snapshot ? 'No imported or local findings are open. This does not establish current platform health.' : 'Connect saved run evidence or log a bug to begin triage.')}</section><section class="overview-panel"><div class="panel-heading"><div><span class="eyebrow">Framework coverage</span><h2>Tests by domain</h2></div>${pill('Current source', 'teal')}</div>${domains.map(d => { const count = currentTests().filter(t => t.domain === d.id).length; return `<button class="domain-summary" data-domain-nav="${d.id}"><span class="domain-symbol ${d.color}">${icon('tests')}</span><span><strong>${d.name}</strong><small>${count} collected test cases</small></span><span class="domain-total">${count}</span>${icon('arrow')}</button>` }).join('')}<div class="coverage-footnote">${snapshot?.tests.filter(t => !t.inSource).length || 0} additional tests appear only in historical reports. ${currentTests().filter(t => t.setupRequired).length} collected cases are catalog setup guards, not expanded catalog coverage. They remain visible without claiming current source coverage.</div></section><section class="overview-panel"><div class="panel-heading"><div><span class="eyebrow">Execution evidence</span><h2>Latest saved run</h2></div><button class="button subtle" data-nav="runs">History ${icon('arrow')}</button></div>${last ? `<p class="run-heading">${date(last.startedAt)} ${pill(stale(last.startedAt) ? 'Stale' : 'Recent', stale(last.startedAt) ? 'sienna' : 'green')}</p>${runBar(last)}<div class="run-legend"><span><i class="green"></i>${last.counts.passed} passed</span><span><i class="sienna"></i>${last.counts.failed + last.counts.timedOut} failed / timed out</span><span><i class="neutral"></i>${last.counts.skipped} skipped</span></div><p class="coverage-footnote">${last.counts.total} reported results · ${esc(last.completion)}. Saved locally; live Jenkins status is unavailable.</p>` : empty('No execution report', 'Collecting test names does not run the suite.')}</section><section class="overview-panel"><div class="panel-heading"><div><span class="eyebrow">Plan the next pass</span><h2>Make coverage intentional</h2></div>${icon('plans')}</div><p class="panel-copy">Build a test plan from the library, link the expected behavior, and track each test through review. Record bugs against the test and its run evidence.</p><div class="workflow-path"><span>Requirement</span>${icon('arrow')}<span>Test</span>${icon('arrow')}<span>Finding</span>${icon('arrow')}<span>Retest</span></div>${actionButton('new-plan', 'Create a test plan', 'plus', true)}</section></div>`
}
function runBar(run) {
  const total = run.counts.total || 1
  return `<div class="run-bar" role="img" aria-label="${run.counts.passed} passed, ${run.counts.failed} failed, ${run.counts.skipped} skipped, out of ${run.counts.total}">${[['passed', 'green'], ['failed', 'sienna'], ['timedOut', 'sienna'], ['skipped', 'neutral'], ['interrupted', 'plum']].map(([key, tone]) => `<span class="${tone}" style="width:${run.counts[key] / total * 100}%"></span>`).join('')}</div>`
}
function renderPlans() {
  const tests = allRows('tests')
  return `<div class="section-actions"><span>${local.plans.length} local test plans</span>${actionButton('new-plan', 'Create test plan', 'plus', true)}</div>${local.plans.length ? `<div class="plan-grid">${local.plans.map(p => { const summary = planSummary(p, tests); return `<article class="plan-card"><div class="card-top">${pill(p.status, 'teal')}<span class="task-id">${date(p.createdAt)}</span></div><button class="plan-title" data-plan="${esc(p.id)}">${esc(p.title)}</button><p>${p.testIds.length} tests · ${summary.done} workflow complete</p><div class="progress-track"><span style="width:${p.testIds.length ? summary.done / p.testIds.length * 100 : 0}%"></span></div><div class="plan-meta">${pill(`${summary.findings} with recorded findings`, summary.findings ? 'sienna' : 'neutral')}${summary.missing ? pill(`${summary.missing} unavailable members`, 'sienna') : ''}</div><button class="button subtle" data-plan="${esc(p.id)}">Review plan ${icon('arrow')}</button></article>` }).join('')}</div>` : empty('Plan the next QA pass', 'Select tests from the framework and your manual test library. Plan progress follows local workflow; recorded outcomes retain their source dates.', actionButton('new-plan', 'Create your first plan', 'plans', true))}`
}
function renderRequirements() {
  const tests = allRows('tests')
  return `<div class="section-actions"><span>${local.requirements.length} local requirements</span>${actionButton('new-requirement', 'Add requirement', 'plus', true)}</div>${local.requirements.length ? `<div class="plan-grid">${local.requirements.map(r => { const linked = tests.filter(t => t.requirementIds?.includes(r.id)); return `<article class="plan-card">${pill('Local requirement', 'plum')}<h2>${esc(r.title)}</h2><p>${esc(r.description || 'No description yet.')}</p><span class="coverage-count">${linked.length} linked tests</span>${linked.map(t => `<button class="relation-link" data-record="${esc(t.id)}" data-kind="tests">${icon('tests')}${esc(t.title)}</button>`).join('')}<button class="button subtle" data-requirement="${esc(r.id)}">Edit & link tests ${icon('arrow')}</button></article>` }).join('')}</div>` : empty('Give each test a purpose', 'Capture the expected behavior, then link the tests that verify it. Requirements are local records; no coverage is inferred from names alone.', actionButton('new-requirement', 'Add a requirement', 'plus', true))}`
}
function renderRuns() {
  return `${sourceNotice()}${snapshot?.runs.length ? `<div class="list-wrap"><table class="task-table"><thead><tr><th>Saved run</th><th>Completion</th><th>Results</th><th>Passed</th><th>Unexpected</th><th>Skipped</th><th>Evidence</th></tr></thead><tbody>${snapshot.runs.map(r => `<tr><td><button class="list-task-button" data-run="${esc(r.id)}">${date(r.startedAt)}</button><small class="list-origin">${esc(r.id)}</small></td><td>${pill(r.completion, r.completion === 'completed' ? 'teal' : 'sienna')}</td><td>${r.counts.total}</td><td>${r.counts.passed}</td><td>${r.counts.unexpected}</td><td>${r.counts.skipped}</td><td><a href="${r.reportUrl}" target="_blank" rel="noopener">Open report ${icon('external')}</a></td></tr>`).join('')}</tbody></table></div><p class="page-note">Run outcomes are read-only evidence. Dragging a test or bug updates its workflow, never the recorded result. No execution endpoint is enabled.</p>` : empty('No saved runs available', 'Run the framework through its existing approved workflow, then refresh the local sources here.')}`
}
function renderPar() {
  const run = reports?.runs[0], par = run?.par
  return `<div class="section-actions"><span>${run ? `Saved run · ${date(run.startedAt)}` : 'No saved audit available'}</span>${actionButton('refresh', 'Refresh sources', 'refresh')}</div>${par?.hasData ? `<div class="overview-stats">${[['Links measured', par.counts.total], ['Broken', par.counts.broken], ['Unverified', par.counts.unverified], ['Pages scanned', par.pagesScanned]].map(([label, value]) => `<div class="stat"><span class="stat-label">${label}</span><strong class="stat-value">${value}</strong></div>`).join('')}</div><div class="list-wrap"><table class="task-table"><thead><tr><th>Object</th><th>Catalog item</th><th>Status</th><th>HTTP</th></tr></thead><tbody>${par.findings.map(f => `<tr><td>${esc(f.title)}</td><td>${esc(f.itemId)}</td><td>${pill(f.status, f.status === 'broken' ? 'sienna' : 'neutral')}</td><td>${f.httpStatus || '—'}</td></tr>`).join('')}</tbody></table></div><p class="page-note">${par.scanProblems} scan problems. Tokens and access URLs are excluded from this view.</p>` : empty('PAR coverage is not measured', 'The latest saved report contains no PAR audit data. This is not a clean-link result.')}`
}
function renderRepositories() {
  return `<div class="section-actions"><span>Local inventory · not a live PR feed</span>${actionButton('repositories', 'Refresh inventory', 'refresh')}</div>${repositories?.repositories ? `<div class="list-wrap"><table class="task-table"><thead><tr><th>Repository</th><th>Branch</th><th>Commit</th><th>Workflow files</th><th>Manifests</th></tr></thead><tbody>${repositories.repositories.map(r => `<tr><td><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a></td><td>${esc(r.branch)}</td><td>${esc(r.commit)}<small class="list-origin">${date(r.committedAt)}</small></td><td>${r.workflowFiles}</td><td>${r.manifestFiles}</td></tr>`).join('')}</tbody></table></div>` : empty('Reading repository inventory', 'Local Git checkouts are inspected without changing them.')}`
}
function settings() {
  return `<div class="settings-grid"><section class="overview-panel"><h2>Source connections</h2><dl class="source-list"><div><dt>Framework collection</dt><dd>${snapshot?.source.collection || 'Unavailable'} · ${currentTests().length} test cases / ${snapshot?.source.specFiles || 0} specs</dd></div><div><dt>Saved reports</dt><dd>${snapshot?.runs.length || 0} local runs${lastRun() ? ` · latest ${date(lastRun().startedAt)}` : ''}</dd></div><div><dt>Live Jenkins / Jira</dt><dd>Not connected</dd></div><div><dt>Collected</dt><dd>${snapshot ? date(snapshot.source.collectedAt) : 'Not yet available'}</dd></div></dl>${actionButton('refresh', 'Refresh sources', 'refresh')}<p class="page-note">Refresh collects test names and reads saved reports. It does not execute tests. Historical evidence never falls back to seeded test results.</p></section><section class="overview-panel"><h2>Your local workspace</h2><p class="panel-copy">Owners, workflow, priorities, notes, plans, and requirements stay in this browser. Run results remain read-only. This is a local development workspace without shared persistence or production authentication.</p>${actionButton('backup', 'Download workspace backup', 'download')}<p class="page-note">The earlier Hub and TMS interfaces are retained with their original browser storage.</p><div class="about-links"><a href="./legacy.html" target="_blank" rel="noopener">Previous Hub ${icon('external')}</a><a href="http://127.0.0.1:4193/legacy.html" target="_blank" rel="noopener">Previous TMS & browser data ${icon('external')}</a><a href="./prototype.html" target="_blank" rel="noopener">First design prototype ${icon('external')}</a></div></section></div>`
}

async function refreshSources(force = false) {
  if (busy) return
  busy = loading = true; sourceError = ''; render()
  const results = await Promise.allSettled([fetch('./api/local/tms' + (force ? '?refresh=1' : ''), { cache: 'no-store' }).then(async r => { if (!r.ok) throw new Error(); const data = await r.json(); if (data.schema !== 'qa-tms.automation-workspace.v1') throw new Error(); return data }), fetch('./api/local/reports', { cache: 'no-store' }).then(r => r.ok ? r.json() : null)])
  if (results[0].status === 'fulfilled') snapshot = results[0].value
  else { sourceError = snapshot ? 'Refresh failed. Previously loaded evidence is still shown with its original dates.' : 'Local automation readers are unavailable. Start the Hub development server to load framework evidence.' }
  if (results[1].status === 'fulfilled') reports = results[1].value
  busy = loading = false; render()
  const recordId = new URLSearchParams(location.hash.slice(1)).get('record')
  const recordKind = new URLSearchParams(location.hash.slice(1)).get('kind') || route.section
  if (recordId && recordKinds.includes(recordKind) && !dialog.open) openRecord(recordKind, recordId, false)
}
async function loadRepositories() {
  try { const response = await fetch('./api/local/repositories'); if (!response.ok) throw new Error(); repositories = await response.json() }
  catch { repositories = { repositories: [] }; notify('Repository inventory is unavailable.') }
  if (route.section === 'repositories') renderContent()
}
function getRecord(kind, id) { return allRows(kind).find(r => r.id === id) }
function commit(kind, id, patch, note) {
  const current = getRecord(kind, id)
  const activity = [{ text: note, at: new Date().toISOString() }, ...(current.activity || [])].slice(0, 50)
  editRecord(local, kind, id, { ...patch, activity }); save(); render()
}
function openRecord(kind, id, changeUrl = true) {
  const row = getRecord(kind, id)
  if (!row) return
  selectedRecord = { kind, id }
  if (changeUrl) history.replaceState(null, '', `#${new URLSearchParams({ section: route.section, view: route.view, record: id, kind })}`)
  renderDetail(row)
  if (!dialog.open) dialog.showModal()
}
function renderDetail(row) {
  const linkedBugs = row.kind === 'tests' ? allRows('bugs').filter(b => b.testId === row.id) : [], linkedTest = row.kind === 'bugs' ? getRecord('tests', row.testId) : null
  const sourceTitle = row.source.startsWith('Local') ? `<label class="field-label">Title<input id="record-title" data-edit="title" value="${esc(row.title)}" maxlength="200"></label>` : ''
  dialog.innerHTML = `<div class="detail-toolbar">${pill(row.source, row.source.startsWith('Local') ? 'teal' : 'neutral')}<button class="icon-button" data-close="detail" aria-label="Close record">${icon('close')}</button></div><div class="detail-body"><div class="detail-kicker">${pill(domainFor(row.domain).name, domainFor(row.domain).color)}<span>${row.kind === 'tests' ? 'Test management' : row.kind === 'bugs' ? 'Bug tracking' : 'QA work'}</span></div><h2 class="record-detail-title" id="detail-title">${esc(row.title)}</h2>${sourceTitle}<div class="detail-fields"><label for="record-status">Workflow</label><select id="record-status" data-edit="status">${opt(workflows[row.kind], row.status)}</select><label for="record-priority">Priority</label><select id="record-priority" data-edit="priority">${opt(priorities.map(id => ({ id, name: id })), row.priority)}</select><label for="record-owner">Owner</label><input id="record-owner" data-edit="owner" placeholder="Unassigned" value="${esc(row.owner)}" maxlength="80"><label for="record-due">Due date</label><input id="record-due" type="date" data-edit="due" value="${esc(row.due)}"></div>${row.kind !== 'work' ? `<section class="evidence-box"><div class="evidence-heading"><strong>Recorded execution result</strong>${outcome(row.result)}</div><p>${row.result ? `${date(row.result.startedAt)} · ${esc(row.result.project)} · ${stale(row.result.startedAt) ? 'Historical evidence' : 'Saved local evidence'}` : 'No recorded execution is linked to this test. Workflow status does not establish a result.'}</p>${row.result?.reportUrl ? `<a href="${row.result.reportUrl}" target="_blank" rel="noopener">Open saved report ${icon('external')}</a>` : ''}${row.result ? `<small>Expected: ${esc(row.result.expectedStatus)} · ${esc(row.result.classification)}</small>` : ''}</section>` : ''}${row.file ? `<details class="source-location"><summary>Framework source & identity</summary><code>${esc(row.file)}:${row.line}</code><p>${row.inSource ? 'Collected from the current framework.' : 'Only in historical evidence; no exact current collection match.'}</p><code>${esc(row.id)}</code></details>` : ''}<h3 class="detail-section-title">${row.kind === 'bugs' ? 'Investigation & next action' : 'Description & test steps'}</h3><textarea class="detail-description" data-edit="description" aria-label="Description" rows="4" placeholder="Add context, steps, or the next action…" maxlength="5000">${esc(row.description)}</textarea>${row.kind === 'tests' ? `<h3 class="detail-section-title">Expected behavior</h3><textarea class="detail-description" data-edit="expected" aria-label="Expected behavior" rows="2" maxlength="2000">${esc(row.expected || '')}</textarea><div class="relation-heading"><h3>Linked bugs & findings</h3><button class="button subtle" data-action="bug-for-test">${icon('plus')}Log linked bug</button></div>${linkedBugs.length ? linkedBugs.map(b => `<button class="relation-link" data-record="${esc(b.id)}" data-kind="bugs">${icon('bugs')}${esc(b.title)}${pill(statusFor(b).name, statusFor(b).color)}</button>`).join('') : '<p class="detail-note">No linked bugs or findings.</p>'}<h3 class="detail-section-title">Requirements</h3>${local.requirements.length ? local.requirements.map(r => `<label class="subtask-row"><input type="checkbox" data-link-requirement="${esc(r.id)}"${row.requirementIds?.includes(r.id) ? ' checked' : ''}><span>${esc(r.title)}</span></label>`).join('') : '<p class="detail-note">Add a requirement from the menu to link expected behavior.</p>'}<h3 class="detail-section-title">Test plans</h3>${local.plans.filter(p => p.testIds.includes(row.id)).map(p => `<button class="relation-link" data-plan="${esc(p.id)}">${icon('plans')}${esc(p.title)}</button>`).join('') || '<p class="detail-note">Not assigned to a plan.</p>'}` : ''}${linkedTest ? `<h3 class="detail-section-title">Linked test</h3><button class="relation-link" data-record="${esc(linkedTest.id)}" data-kind="tests">${icon('tests')}${esc(linkedTest.title)}</button>` : ''}${row.kind === 'bugs' && row.occurrences.length ? `<h3 class="detail-section-title">Recorded occurrences</h3>${row.occurrences.map(o => `<div class="occurrence">${outcome(o)}<a href="${o.reportUrl}" target="_blank" rel="noopener">${date(o.startedAt)} ${icon('external')}</a></div>`).join('')}` : ''}<h3 class="detail-section-title">Notes & activity</h3><p class="detail-note">Notes stay in this browser. No comment is posted externally.</p>${(row.notes || []).map(n => `<div class="comment"><small>Local reviewer · ${date(n.at)}</small>${esc(n.text)}</div>`).join('')}<form id="record-note-form" class="comment-form"><textarea name="note" aria-label="Local note" placeholder="Add context or a handoff note…" rows="2" maxlength="3000" required></textarea><button class="button primary">Add note</button></form>${(row.activity || []).slice(0, 8).map(a => `<div class="activity-item">${esc(a.text)} · ${date(a.at)}</div>`).join('')}</div><div class="detail-save-line">${icon('lock')}Local workflow edits · execution evidence stays read-only<button data-close="detail">Done</button></div>`
  if (row.setupRequired) dialog.querySelector('.detail-kicker').insertAdjacentHTML('afterend', '<p class="source-issue">Catalog setup is required. This collected case is a guard check, not expanded catalog coverage.</p>')
  if (row.source === 'Local manual test') dialog.querySelector('.evidence-box').insertAdjacentHTML('beforeend', actionButton('manual-result', 'Record manual outcome', 'tests'))
  if (row.result?.evidence) { const note = document.createElement('p'); note.textContent = row.result.evidence; dialog.querySelector('.evidence-box').append(note) }
}
function showModal(title, html) {
  modal.innerHTML = `<div class="utility-header"><h2 id="utility-title">${esc(title)}</h2><button class="icon-button" data-close="modal" aria-label="Close dialog">${icon('close')}</button></div><div class="utility-body">${html}</div>`
  if (!modal.open) modal.showModal()
}
function createForm(status = '') {
  const kind = recordKinds.includes(route.section) ? route.section : 'work'
  showModal(kind === 'tests' ? 'Add a manual test' : kind === 'bugs' ? 'Log a bug' : 'Create QA work', `<p>This creates a local ${kind === 'tests' ? 'manual test' : 'record'}. Imported automation evidence stays unchanged.</p><form id="create-record" data-kind="${kind}"><label class="field-label">Title<input name="title" required maxlength="200" autofocus></label><label class="field-label">Domain<select name="domain">${opt(domains, filters.domain || 'platform')}</select></label><label class="field-label">Workflow<select name="status">${opt(workflows[kind], status || workflows[kind][0].id)}</select></label>${kind === 'bugs' ? `<label class="field-label">Linked test<select name="testId">${opt([{ id: '', name: 'No linked test' }, ...allRows('tests').map(t => ({ id: t.id, name: t.title }))], '')}</select></label>` : ''}<div class="utility-actions"><button type="button" class="button" data-close="modal">Cancel</button><button class="button primary">Create</button></div></form>`)
}
function planForm(ids, plan) {
  const tests = allRows('tests'), selected = new Set(plan?.testIds || ids || [])
  showModal(plan ? 'Edit test plan' : 'Create test plan', `<form id="plan-form" data-plan="${esc(plan?.id || '')}"><label class="field-label">Plan name<input name="title" required maxlength="200" value="${esc(plan?.title || '')}"></label><label class="field-label">Plan status<select name="status">${opt(['Draft', 'Ready', 'In progress', 'In review', 'Complete'].map(id => ({ id, name: id })), plan?.status || 'Draft')}</select></label><p>Select the tests in scope. Workflow completion and recorded results remain distinct.</p><label class="field-label">Find a test<input type="search" id="plan-search" placeholder="Filter the selection list"></label><div class="selection-list">${tests.map(t => `<label class="check-option" data-test-title="${esc(t.title.toLowerCase())}"><input type="checkbox" name="tests" value="${esc(t.id)}"${selected.has(t.id) ? ' checked' : ''}><span>${esc(t.title)}<small>${esc(t.source)}</small></span></label>`).join('')}</div><p id="plan-error" role="alert"></p><div class="utility-actions"><button class="button" type="button" data-select-visible>Select visible</button><button class="button primary">Save plan</button></div></form>`)
}
function openPlan(id) {
  const plan = local.plans.find(p => p.id === id), summary = planSummary(plan, allRows('tests'))
  showModal(plan.title, `<p>${summary.done}/${plan.testIds.length} workflow complete · ${summary.observed} with recorded evidence · ${summary.missing} unavailable members.</p>${summary.members.map(t => `<button class="relation-link" data-record="${esc(t.id)}" data-kind="tests">${icon('tests')}<span>${esc(t.title)}</span>${pill(statusFor(t).name, statusFor(t).color)}</button>`).join('')}<div class="utility-actions"><button class="button primary" data-edit-plan="${esc(id)}">Edit plan membership</button></div>`)
}
function requirementForm(id = '') {
  const req = local.requirements.find(r => r.id === id)
  showModal(req ? 'Edit requirement' : 'Add requirement', `<form id="requirement-form" data-id="${esc(id)}"><label class="field-label">Expected behavior<input name="title" maxlength="200" required value="${esc(req?.title || '')}"></label><label class="field-label">Description<textarea name="description" rows="3" maxlength="3000">${esc(req?.description || '')}</textarea></label><p>Link tests that verify this requirement.</p><div class="selection-list">${allRows('tests').map(t => `<label class="check-option"><input type="checkbox" name="tests" value="${esc(t.id)}"${t.requirementIds?.includes(id) && id ? ' checked' : ''}><span>${esc(t.title)}</span></label>`).join('')}</div><div class="utility-actions"><button class="button primary">Save requirement</button></div></form>`)
}
function showRun(id) {
  const run = snapshot.runs.find(r => r.id === id)
  showModal('Saved run · ' + date(run.startedAt), `<p>${run.counts.total} reported results. This saved report is ${stale(run.startedAt) ? 'historical evidence' : 'recent local evidence'}.</p>${run.results.map(r => `<button class="relation-link" data-record="${esc(r.testId)}" data-kind="tests">${outcome(r)}<span>${esc(r.title)}</span></button>`).join('')}<div class="utility-actions"><a class="button" href="${run.reportUrl}" target="_blank" rel="noopener">Open full report ${icon('external')}</a></div>`)
}
function download(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })), anchor = document.createElement('a')
  anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function action(name) {
  if (name === 'refresh') refreshSources(true)
  if (name === 'repositories') loadRepositories()
  if (name === 'create') createForm()
  if (name === 'new-plan') planForm([])
  if (name === 'plan-from-view') planForm(visibleRows().map(t => t.id))
  if (name === 'new-requirement') requirementForm()
  if (name === 'filter') { filterOpen = !filterOpen; render(); document.querySelector('[data-action="filter"]').focus() }
  if (name === 'clear') { query = ''; filters = { domain: '', outcome: '', owner: '', origin: '' }; render() }
  if (name === 'menu') { mobile = !mobile; document.querySelector('.sidebar').classList.toggle('open', mobile); document.querySelector('.mobile-toggle').setAttribute('aria-expanded', mobile) }
  if (name === 'export') download({ type: 'QA workspace view', evidenceMode: 'saved-local', records: visibleRows() }, 'qa-workspace-view.json')
  if (name === 'backup') download(local, 'qa-workspace-local-backup.json')
  if (name === 'bug-for-test') { const test = getRecord(selectedRecord.kind, selectedRecord.id); const bug = createBugForTest(local, snapshot, test); save(); render(); openRecord('bugs', bug.id); notify('Linked bug or finding opened') }
  if (name === 'manual-result') showModal('Record a manual execution', `<p>This records your observation for this local manual test. It is separate from automation evidence.</p><form id="manual-result-form"><label class="field-label">Observed outcome<select name="status">${opt(['passed', 'failed', 'blocked', 'skipped'].map(id => ({ id, name: id })), 'passed')}</select></label><label class="field-label">Evidence / observation<textarea name="evidence" required rows="4" maxlength="3000" placeholder="What did you check, and what happened?"></textarea></label><div class="utility-actions"><button class="button primary">Record outcome</button></div></form>`)
}
function sharedClick(event) {
  const close = event.target.closest('[data-close]'); if (close) { (close.dataset.close === 'detail' ? dialog : modal).close(); return }
  const record = event.target.closest('[data-record]'); if (record) { if (modal.open) modal.close(); openRecord(record.dataset.kind, record.dataset.record); return }
  const nav = event.target.closest('[data-nav]'); if (nav) { navigate(nav.dataset.nav); return }
  const button = event.target.closest('[data-action]'); if (button) { action(button.dataset.action); return }
  const plan = event.target.closest('[data-plan]:not(form)'); if (plan) { openPlan(plan.dataset.plan); return }
  const editPlan = event.target.closest('[data-edit-plan]'); if (editPlan) { planForm(null, local.plans.find(p => p.id === editPlan.dataset.editPlan)); return }
  const requirement = event.target.closest('[data-requirement]'); if (requirement) requirementForm(requirement.dataset.requirement)
}
root.addEventListener('click', event => {
  sharedClick(event)
  const tab = event.target.closest('[data-tab]'); if (tab) navigate(route.section, tab.dataset.tab, false)
  const domain = event.target.closest('[data-domain-nav]'); if (domain) { navigate('tests'); filters.domain = domain.dataset.domainNav; filterOpen = true; render() }
  const more = event.target.closest('[data-more]'); if (more) { limits[more.dataset.more] = (limits[more.dataset.more] || 18) + 18; renderContent() }
  const create = event.target.closest('[data-new-status]'); if (create) createForm(create.dataset.newStatus)
  const run = event.target.closest('[data-run]'); if (run) showRun(run.dataset.run)
  const item = event.target.closest('[data-on-call-case]'); if (item) { onCallSelected = item.dataset.onCallCase; onCallPreview = ''; onCallError = ''; renderContent() }
  if (event.target.closest('[data-close-case]')) { onCallSelected = ''; renderContent() }
  const load = event.target.closest('[data-on-call-load]'); if (load) loadSupport(load.dataset.onCallLoad)
})
root.addEventListener('input', event => {
  if (event.target.id !== 'workspace-search') return
  query = event.target.value; limits = {}
  if (recordKinds.includes(route.section)) renderContent()
  else if (query.trim()) {
    const matches = recordKinds.flatMap(kind => allRows(kind).filter(r => [r.title, r.id, r.description].join(' ').toLowerCase().includes(query.toLowerCase())).slice(0, 15))
    document.querySelector('#workspace-content').innerHTML = `<div class="section-actions"><strong>Search results</strong><span>${matches.length} shown · up to 15 per record type</span></div><div class="search-results">${matches.map(r => `<button class="overview-task" data-record="${esc(r.id)}" data-kind="${r.kind}">${icon(r.kind === 'work' ? 'board' : r.kind)}<span><p>${esc(r.title)}</p><small>${esc(r.source)} · ${esc(statusFor(r).name)}</small></span>${icon('arrow')}</button>`).join('') || empty('No matching records', 'Search test names, bugs, or local work.')}</div>`
  } else renderContent()
})
root.addEventListener('change', event => {
  if (event.target.id === 'workspace-sort') { sort = event.target.value; renderContent() }
  if (event.target.dataset.filter) { filters[event.target.dataset.filter] = event.target.value; limits = {}; renderContent() }
})
dialog.addEventListener('click', sharedClick)
modal.addEventListener('click', event => {
  sharedClick(event)
  if (event.target.closest('[data-select-visible]')) modal.querySelectorAll('[data-test-title]:not([hidden]) input').forEach(input => { input.checked = true })
})
dialog.addEventListener('change', event => {
  if (!selectedRecord) return
  const { kind, id } = selectedRecord, row = getRecord(kind, id), key = event.target.dataset.edit
  if (key) {
    const value = event.target.value.trim()
    if (key === 'title' && !value) { event.target.value = row.title; return }
    commit(kind, id, { [key]: value }, `Updated ${key}: ${key === 'description' || key === 'expected' ? 'local content' : value || 'cleared'}`)
    if (key === 'title') dialog.querySelector('#detail-title').textContent = value
  }
  if (event.target.dataset.linkRequirement) {
    const req = event.target.dataset.linkRequirement, ids = new Set(row.requirementIds || [])
    event.target.checked ? ids.add(req) : ids.delete(req)
    commit(kind, id, { requirementIds: [...ids] }, 'Updated linked requirements')
  }
})
dialog.addEventListener('submit', event => {
  if (event.target.id !== 'record-note-form') return
  event.preventDefault(); const row = getRecord(selectedRecord.kind, selectedRecord.id), text = new FormData(event.target).get('note').trim()
  if (!text) return
  commit(row.kind, row.id, { notes: [...(row.notes || []), { text, at: new Date().toISOString() }] }, 'Added a local note')
  renderDetail(getRecord(row.kind, row.id)); dialog.querySelector('[name="note"]').focus(); notify('Note saved locally')
})
dialog.addEventListener('close', () => {
  const params = new URLSearchParams(location.hash.slice(1)); params.delete('record'); params.delete('kind'); history.replaceState(null, '', '#' + params)
  const focus = [...root.querySelectorAll('[data-record]')].find(el => el.dataset.record === selectedRecord?.id)
  ;(focus || root.querySelector('[data-action="create"]') || root.querySelector('h1'))?.focus()
})
modal.addEventListener('input', event => {
  if (event.target.id === 'plan-search') modal.querySelectorAll('[data-test-title]').forEach(el => { el.hidden = !el.dataset.testTitle.includes(event.target.value.toLowerCase()) })
})
modal.addEventListener('submit', event => {
  event.preventDefault(); const form = event.target, data = new FormData(form)
  if (form.id === 'create-record') {
    if (!data.get('title').trim()) return
    const record = addRecord(local, form.dataset.kind, Object.fromEntries(data)); editRecord(local, form.dataset.kind, record.id, { status: data.get('status') }); save(); modal.close(); render(); openRecord(form.dataset.kind, record.id); notify('Local record created')
  }
  if (form.id === 'plan-form') {
    const ids = data.getAll('tests')
    if (!ids.length || !data.get('title').trim()) { modal.querySelector('#plan-error').textContent = 'Enter a plan name and select at least one test.'; return }
    const existing = local.plans.find(p => p.id === form.dataset.plan)
    if (existing) { existing.title = data.get('title').trim(); existing.testIds = ids; existing.status = data.get('status') }
    else { const p = addPlan(local, data.get('title'), ids); p.status = data.get('status') }
    save(); modal.close(); navigate('plans'); notify('Test plan saved')
  }
  if (form.id === 'requirement-form') {
    if (!data.get('title').trim()) return
    let req = local.requirements.find(r => r.id === form.dataset.id)
    if (!req) { req = { id: 'REQ-' + crypto.randomUUID(), title: '' }; local.requirements.push(req) }
    req.title = data.get('title').trim(); req.description = data.get('description').trim()
    const linked = new Set(data.getAll('tests'))
    for (const t of allRows('tests')) { const ids = new Set(t.requirementIds || []); linked.has(t.id) ? ids.add(req.id) : ids.delete(req.id); if (JSON.stringify([...ids]) !== JSON.stringify(t.requirementIds || [])) editRecord(local, 'tests', t.id, { requirementIds: [...ids] }) }
    save(); modal.close(); render(); notify('Requirement and test links saved')
  }
  if (form.id === 'manual-result-form') {
    if (!data.get('evidence').trim()) return
    recordManualResult(local, selectedRecord.id, data.get('status'), data.get('evidence')); save(); modal.close(); render(); renderDetail(getRecord('tests', selectedRecord.id)); notify('Manual result recorded with evidence')
  }
})
async function loadSupport(mode) {
  const request = ++onCallRequest; onCall = unavailableOnCall(); onCallSelected = ''; onCallPreview = ''; onCallError = ''; onCallLoading = mode !== 'none'; renderContent()
  if (mode === 'none') return
  const loaded = await loadOnCallSnapshot({ mode, endpoint: document.querySelector('meta[name="on-call-review-endpoint"]')?.content || '', origin: location.origin, assetBase: new URL('./', location.href).href })
  if (request !== onCallRequest) return
  onCall = loaded; onCallLoading = false; if (route.section === 'on-call') renderContent()
}
root.addEventListener('submit', event => {
  if (!event.target.matches('[data-on-call-review]')) return
  event.preventDefault()
  try { onCallPreview = JSON.stringify(createReviewPreview(onCall, event.target.dataset.onCallReview, new FormData(event.target).get('reviewer')), null, 2); onCallError = '' } catch (e) { onCallError = e.message }
  renderContent()
})
let dragged = null
root.addEventListener('dragstart', event => { const card = event.target.closest('[data-card]'); if (!card) return; dragged = { kind: card.dataset.kind, id: card.dataset.card }; event.dataTransfer.setData('text/plain', dragged.id); event.dataTransfer.effectAllowed = 'move'; card.classList.add('is-dragging') })
root.addEventListener('dragover', event => { const target = event.target.closest('[data-drop],[data-drop-month]'); if (!target || !dragged) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; root.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); target.classList.add('drag-over') })
root.addEventListener('drop', event => { const target = event.target.closest('[data-drop],[data-drop-month]'); if (!target || !dragged) return; event.preventDefault(); if (target.dataset.dropMonth) { const month = target.dataset.dropMonth, row = getRecord(dragged.kind, dragged.id); const [year, monthNumber] = month.split('-').map(Number); const due = month === 'unscheduled' ? '' : `${month}-${String(Math.min(Number(row.due.slice(8)) || 15, new Date(year, monthNumber, 0).getDate())).padStart(2, '0')}`; commit(dragged.kind, dragged.id, { due }, 'Rescheduled local work'); } else commit(dragged.kind, dragged.id, { status: target.dataset.drop }, `Workflow moved to ${target.dataset.drop}`); dragged = null; notify('Workflow updated. Recorded evidence is unchanged.') })
root.addEventListener('dragend', () => { dragged = null; root.querySelectorAll('.is-dragging,.drag-over').forEach(el => el.classList.remove('is-dragging', 'drag-over')) })
document.addEventListener('keydown', event => {
  if (event.key === '/' && !dialog.open && !modal.open && !event.target.matches('input,textarea,select')) { event.preventDefault(); root.querySelector('#workspace-search').focus() }
  if (event.key === 'Escape' && mobile) { mobile = false; root.querySelector('.sidebar').classList.remove('open'); root.querySelector('.mobile-toggle').setAttribute('aria-expanded', 'false') }
})
function restoreRoute() { const id = readRoute(); render(); if (id) { const kind = new URLSearchParams(location.hash.slice(1)).get('kind') || route.section; if (recordKinds.includes(kind)) openRecord(kind, id, false) } else if (dialog.open) dialog.close(); if (route.section === 'repositories' && !repositories) loadRepositories() }
window.addEventListener('hashchange', restoreRoute)
window.addEventListener('popstate', restoreRoute)
readRoute(); render(); refreshSources()
