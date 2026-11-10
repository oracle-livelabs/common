import { areas, owners, stages, priorities, seedTasks } from './prototype-data.mjs'

const root = document.querySelector('#prototype')
const detail = document.querySelector('#task-dialog')
const utility = document.querySelector('#utility-dialog')
const storageKey = 'livelabs-qa-design-prototype-v1'
const defaultFields = { priority: true, owner: true, due: true, subtasks: true, compact: false }
let tasks = seedTasks(), preferences = { board: { ...defaultFields }, list: { ...defaultFields }, roadmap: { ...defaultFields }, overview: { ...defaultFields } }
let persistent = true, toastTimer, selectedId = '', filterOpen = false, mobileOpen = false
const views = ['board', 'list', 'roadmap', 'overview']
let view = 'board', scope = 'all', query = '', group = 'stage', sort = 'default'
let filters = { stage: '', priority: '', owner: 'all', month: '' }
const validTask = t => t && typeof t.id === 'string' && typeof t.title === 'string' && typeof t.description === 'string' && areas.some(a => a.id === t.area) && stages.some(s => s.id === t.stage) && owners.some(o => o.id === t.owner) && priorities.includes(t.priority) && typeof t.due === 'string' && (!t.due || /^\d{4}-\d{2}-\d{2}$/.test(t.due)) && Array.isArray(t.subtasks) && t.subtasks.every(s => typeof s.id === 'string' && typeof s.title === 'string' && typeof s.done === 'boolean') && Array.isArray(t.comments) && t.comments.every(c => typeof c.text === 'string' && typeof c.at === 'string') && Array.isArray(t.activity) && t.activity.every(a => typeof a.text === 'string' && typeof a.at === 'string')
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
  if (saved?.version === 1 && Array.isArray(saved.tasks) && saved.tasks.every(validTask) && new Set(saved.tasks.map(t => t.id)).size === saved.tasks.length) {
    tasks = saved.tasks
    for (const key of views) for (const field of Object.keys(defaultFields)) if (typeof saved.preferences?.[key]?.[field] === 'boolean') preferences[key][field] = saved.preferences[key][field]
  }
} catch { persistent = false }

const paths = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  board: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="14" rx="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  roadmap: '<path d="M5 3v18M10 5h10v4H10zM7 11h9v4H7zM12 17h8v3h-8z"/>',
  overview: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  check: '<path d="m6 12 4 4 8-8"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  checked: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  folder: '<path d="M3 6h7l2 3h9v11H3Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18"/>',
  filter: '<path d="M3 5h18M6 12h12M10 19h4"/>',
  sort: '<path d="M8 3v18m-4-4 4 4 4-4M16 21V3m-4 4 4-4 4 4"/>',
  group: '<rect x="3" y="3" width="7" height="7" rx="1"/><path d="M14 5h7M14 8h5"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 16h7M14 19h5"/>',
  fields: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  external: '<path d="M14 3h7v7m0-7-11 11M10 3H3v18h18v-7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2l-1.5 1v2M12 17h.01"/>',
  play: '<path d="m8 4 12 8-12 8Z"/><path d="M3 4v16"/>',
  headphones: '<path d="M4 14v-3a8 8 0 0 1 16 0v3M4 13H2v7h5v-7ZM20 13h2v7h-5v-7Z"/>',
  report: '<path d="M5 3h10l4 4v14H5ZM15 3v5h4M9 12h6M9 16h6"/>',
  link: '<path d="m10 14 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 0) scale(.9)"/>',
  branch: '<circle cx="6" cy="4" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="6" cy="20" r="2"/><path d="M6 6v12M18 7v3c0 4-12 3-12 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  message: '<path d="M4 4h16v12H9l-5 4Z"/>',
  tasks: '<path d="m3 7 2 2 4-4M12 7h9M3 15h6v6H3ZM12 18h9"/>',
  flag: '<path d="M5 21V3m0 1c4-4 9 4 14 0v9c-5 4-10-4-14 0"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 8M3 4v6h6"/>'
}
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.circle}</svg>`
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
const areaFor = t => areas.find(a => a.id === t.area)
const ownerFor = t => owners.find(o => o.id === t.owner)
const stageFor = t => stages.find(s => s.id === t.stage)
const selected = (value, current) => value === current ? ' selected' : ''
const options = (items, value) => items.map(item => `<option value="${esc(item.id)}"${selected(item.id, value)}>${esc(item.name)}</option>`).join('')
const shortDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No date'
const monthName = value => value === 'unscheduled' ? 'Unscheduled' : new Date(`${value}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
const avatar = owner => `<span class="avatar ${owner.color}" title="${esc(owner.name)}" aria-label="${esc(owner.name)}">${esc(owner.initials)}</span>`
const areaTag = area => `<span class="area-tag ${area.color}"><span class="dot"></span>${esc(area.name)}</span>`
const priorityTag = value => `<span class="priority ${value.toLowerCase()}">${esc(value)}</span>`
const fields = () => preferences[view]
const filterCount = () => Number(Boolean(filters.stage)) + Number(Boolean(filters.priority)) + Number(filters.owner !== 'all') + Number(Boolean(filters.month))

function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, tasks, preferences })); persistent = true }
  catch { persistent = false; notify('Browser storage is unavailable. Keep this tab open to retain your edits.'); }
}
function notify(message) {
  const element = document.querySelector('#toast')
  element.textContent = message
  element.classList.add('toast-visible')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => element.classList.remove('toast-visible'), 3500)
}
function readRoute() {
  const params = new URLSearchParams(location.hash.slice(1))
  view = views.includes(params.get('view')) ? params.get('view') : 'board'
  scope = areas.some(a => a.id === params.get('area')) ? params.get('area') : 'all'
}
function navigate(nextView = view, nextScope = scope) {
  view = nextView; scope = nextScope; mobileOpen = false
  const params = new URLSearchParams({ view })
  if (scope !== 'all') params.set('area', scope)
  history.pushState(null, '', `#${params}`)
  render()
}
function visibleTasks() {
  const term = query.trim().toLowerCase()
  const result = tasks.filter(t => (scope === 'all' || t.area === scope) && (!term || [t.title, t.id, t.description, areaFor(t).name, ownerFor(t).name].join(' ').toLowerCase().includes(term)) && (!filters.stage || t.stage === filters.stage) && (!filters.priority || t.priority === filters.priority) && (filters.owner === 'all' || t.owner === filters.owner) && (!filters.month || t.due.startsWith(filters.month)))
  if (sort === 'due') result.sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'))
  if (sort === 'priority') result.sort((a, b) => priorities.indexOf(a.priority) - priorities.indexOf(b.priority))
  if (sort === 'title') result.sort((a, b) => a.title.localeCompare(b.title))
  return result
}
function grouped(rows) {
  const definitions = group === 'area' ? areas : stages
  return definitions.map(item => ({ ...item, tasks: rows.filter(t => t[group] === item.id) }))
}
function render() {
  const activeArea = areas.find(a => a.id === scope)
  root.innerHTML = `<div class="app-frame">
    <header class="global-bar">
      <button class="icon-button mobile-toggle" data-action="menu" aria-label="Toggle navigation" aria-expanded="${mobileOpen}">${icon('menu')}</button>
      <a href="#view=board" class="brand" aria-label="LiveLabs QA Hub home"><span class="brand-mark">${icon('check')}</span>LiveLabs<small>QA HUB</small></a>
      <label class="global-search">${icon('search')}<input id="global-search" type="search" autocomplete="off" placeholder="Search tasks, projects, and more" aria-label="Search tasks" value="${esc(query)}"><kbd>/</kbd></label>
      <div class="global-actions"><span class="prototype-label">Design prototype · v1</span><button class="icon-button" data-action="about" aria-label="About this prototype">${icon('help')}</button><span class="avatar self" title="Local reviewer">LB</span></div>
    </header>
    <aside class="sidebar ${mobileOpen ? 'open' : ''}" aria-label="Workspace navigation">
      <div class="workspace-name"><span class="workspace-monogram">LL</span><div>LiveLabs workspace<small>Quality assurance</small></div></div>
      <nav aria-label="Primary">
        <button class="nav-item ${view === 'overview' && scope === 'all' ? 'active' : ''}" data-nav="overview">${icon('overview')}Overview</button>
        <button class="nav-item ${['board', 'list'].includes(view) && scope === 'all' ? 'active' : ''}" data-nav="board">${icon('board')}All QA work<span class="nav-count">${tasks.length}</span></button>
      </nav>
      <div class="nav-section-label">QA areas<span>5</span></div>
      <nav aria-label="QA areas">${areas.map(a => `<button class="nav-item ${scope === a.id ? 'active' : ''}" data-scope="${a.id}"${scope === a.id ? ' aria-current="page"' : ''}><span class="nav-dot ${a.color}"></span>${a.name}<span class="nav-count">${tasks.filter(t => t.area === a.id && t.stage !== 'done').length}</span></button>`).join('')}</nav>
      <div class="nav-section-label">Planning</div>
      <button class="nav-item ${view === 'roadmap' && scope === 'all' ? 'active' : ''}" data-nav="roadmap">${icon('calendar')}Monthly roadmap</button>
      <div class="sidebar-bottom">
        <a class="nav-item external-link" href="/?view=${activeArea?.id || 'overview'}" target="_blank" rel="noopener">${icon('external')}Open current Hub${icon('arrow')}</a>
        <button class="nav-item" data-action="settings">${icon('fields')}Workspace settings</button>
        <div class="sidebar-note"><span>A space for better quality.</span>Plan, review, and follow through.</div>
      </div>
    </aside>
    <main id="workspace" class="workspace" tabindex="-1">
      <div class="project-header">
        <div class="breadcrumb">${icon('folder')}<span>LiveLabs</span><span>/</span><span>Quality assurance</span></div>
        <div class="title-row"><div class="project-symbol ${activeArea?.color || 'green'}">${icon(activeArea?.icon || 'shield')}</div><div class="title-copy"><h1>${activeArea?.name || 'QA workspace'}</h1><p>${activeArea?.description || 'One place to plan, track, and review our QA work.'}</p></div>
          <div class="title-actions"><button class="avatar-stack" data-action="team" aria-label="View example teams">${owners.filter(o => o.id).map(avatar).join('')}</button><button class="button" data-action="export">${icon('download')}Export board</button></div>
        </div>
        <nav class="tabs" aria-label="Project views">${views.map(v => `<button class="tab ${view === v ? 'active' : ''}" data-view="${v}"${view === v ? ' aria-current="page"' : ''}>${icon(v)}${v[0].toUpperCase() + v.slice(1)}${v === 'board' ? `<span class="tab-count">${tasks.filter(t => scope === 'all' || t.area === scope).length}</span>` : ''}</button>`).join('')}</nav>
      </div>
      <div class="toolbar">
        <button class="button primary" data-action="add">${icon('plus')}Add task</button><span class="toolbar-label">Small steps. Better experiences.</span><span class="toolbar-spacer"></span>
        <button class="button subtle ${filterCount() || filterOpen ? 'active-control' : ''}" data-action="filter" aria-expanded="${filterOpen}" aria-controls="filter-panel">${icon('filter')}Filter${filterCount() ? ` (${filterCount()})` : ''}</button>
        ${view !== 'overview' ? `<label class="tool-select">${icon('sort')}<select id="sort-select" aria-label="Sort tasks"><option value="default"${selected('default', sort)}>Sort</option><option value="due"${selected('due', sort)}>Due date</option><option value="priority"${selected('priority', sort)}>Priority</option><option value="title"${selected('title', sort)}>Task name</option></select></label>` : ''}
        ${['board', 'list'].includes(view) ? `<label class="tool-select">${icon('group')}<select id="group-select" aria-label="Group tasks"><option value="stage"${selected('stage', group)}>Status</option><option value="area"${selected('area', group)}>QA area</option></select></label>` : ''}
        ${view !== 'overview' ? `<button class="button subtle fields-button" data-action="fields" aria-label="Customize this view">${icon('fields')}<span>Customize</span></button>` : ''}
      </div>
      ${filterOpen ? renderFilters() : ''}
      <div id="content" class="content ${fields().compact ? 'compact' : ''}"></div>
      <footer class="workspace-footer">${icon('lock')}Sample workspace · <span id="save-state">${persistent ? 'Changes saved in this browser' : 'Changes kept in this tab only'}</span><span class="footer-right">No live data connected <span aria-hidden="true">·</span> <button data-action="about">About this preview</button></span></footer>
    </main>
  </div>`
  renderContent()
}
function renderFilters() {
  const months = [...new Set(tasks.map(t => t.due.slice(0, 7)).filter(Boolean))].sort()
  return `<div id="filter-panel" class="filter-panel"><label class="field-label">Status<select data-filter="stage">${options([{ id: '', name: 'All statuses' }, ...stages], filters.stage)}</select></label><label class="field-label">Priority<select data-filter="priority">${options([{ id: '', name: 'All priorities' }, ...priorities.map(id => ({ id, name: id }))], filters.priority)}</select></label><label class="field-label">Owner<select data-filter="owner">${options([{ id: 'all', name: 'All owners' }, ...owners], filters.owner)}</select></label><label class="field-label">Due month<select data-filter="month">${options([{ id: '', name: 'All dates' }, ...months.map(id => ({ id, name: monthName(id) }))], filters.month)}</select></label><button class="button subtle" data-action="clear">Clear filters</button></div>`
}
function renderContent() {
  const content = document.querySelector('#content')
  const rows = visibleTasks(), done = rows.filter(t => t.stage === 'done').length
  const percent = rows.length ? Math.round(done / rows.length * 100) : 0
  const filtered = filterCount() || query || scope !== 'all'
  content.innerHTML = `<div class="context-line"><strong>${view === 'roadmap' ? 'The months ahead' : view === 'overview' ? 'At a glance' : scope === 'all' ? 'All QA work' : areas.find(a => a.id === scope).name}</strong><span class="mini-divider"></span><span>${rows.length} ${filtered ? 'matching ' : ''}tasks</span><span class="right-note"><span>${done} of ${rows.length} complete</span><span class="progress-track"><span style="width:${percent}%"></span></span><span>${percent}%</span></span></div>
    ${rows.length ? view === 'list' ? renderList(rows) : view === 'roadmap' ? renderRoadmap(rows) : view === 'overview' ? renderOverview(rows) : renderBoard(rows) : `<div class="empty-state">${icon('search')}<h2>No tasks in this view</h2><p>Try another search or clear the filters to see the rest of your workspace.</p><button class="button" data-action="clear">Clear search and filters</button></div>`}`
}
function renderCard(t) {
  const f = fields(), done = t.subtasks.filter(s => s.done).length
  return `<article class="task-card ${t.stage === 'done' ? 'is-done' : ''}" data-card="${esc(t.id)}" draggable="true">
    <div class="card-top"><span class="task-id">${esc(t.id)}</span>${f.priority ? priorityTag(t.priority) : ''}</div>
    <div class="card-title"><button class="completion-button" data-complete="${esc(t.id)}" aria-label="${t.stage === 'done' ? 'Reopen' : 'Complete'} ${esc(t.title)}">${icon(t.stage === 'done' ? 'checked' : 'circle')}</button><button class="card-open" data-task="${esc(t.id)}" aria-label="Open ${esc(t.title)}">${esc(t.title)}</button></div>
    <div class="card-tags">${areaTag(areaFor(t))}${t.blocked ? `<span class="blocked-tag">${icon('flag')}Blocked</span>` : ''}</div>
    <div class="card-footer">${f.due ? `<span class="card-date">${icon('calendar')}${shortDate(t.due)}</span>` : ''}<div class="card-metadata">${f.subtasks && t.subtasks.length ? `<span class="check-count" title="${done} of ${t.subtasks.length} subtasks complete">${icon('tasks')}${done}/${t.subtasks.length}</span>` : ''}${t.comments.length ? `<span class="check-count" title="${t.comments.length} local notes">${icon('message')}${t.comments.length}</span>` : ''}${f.owner ? avatar(ownerFor(t)) : ''}</div></div>
  </article>`
}
function renderBoard(rows) {
  return `<div class="board">${grouped(rows).map(column => `<section class="board-column ${column.color}" data-drop-field="${group}" data-drop-value="${column.id}" aria-label="${column.name}"><h2 class="column-title"><span class="dot"></span>${column.name}<span class="column-count">${column.tasks.length}</span><button class="icon-button" data-add-column="${column.id}" aria-label="Add task to ${column.name}">${icon('plus')}</button></h2><p class="column-hint">${column.hint || column.description}</p><div class="column-cards">${column.tasks.length ? column.tasks.map(renderCard).join('') : '<div class="empty-column">A little room for what’s next.<br>Drop a task here or add one.</div>'}</div><button class="column-add" data-add-column="${column.id}">${icon('plus')}Add task</button></section>`).join('')}</div>`
}
function renderList(rows) {
  const f = fields(), count = 3 + Number(f.owner) + Number(f.due) + Number(f.priority)
  return `<div class="list-wrap"><table class="task-table"><thead><tr><th>Task name</th><th>QA area</th>${f.owner ? '<th>Owner</th>' : ''}${f.due ? '<th>Due date</th>' : ''}${f.priority ? '<th>Priority</th>' : ''}<th>Status</th></tr></thead><tbody>${grouped(rows).filter(c => c.tasks.length).map(c => `<tr class="section-row"><th colspan="${count}">${c.name} <span class="task-id">&nbsp; ${c.tasks.length}</span></th></tr>${c.tasks.map(t => `<tr><td><button class="list-task-button" data-task="${esc(t.id)}">${icon(t.stage === 'done' ? 'checked' : 'circle')}${esc(t.title)}</button></td><td>${areaTag(areaFor(t))}</td>${f.owner ? `<td><span class="list-owner">${avatar(ownerFor(t))}${esc(ownerFor(t).name)}</span></td>` : ''}${f.due ? `<td>${shortDate(t.due)}</td>` : ''}${f.priority ? `<td>${priorityTag(t.priority)}</td>` : ''}<td><span class="area-tag ${stageFor(t).color}">${stageFor(t).name}</span></td></tr>`).join('')}`).join('')}</tbody></table></div>`
}
function renderRoadmap(rows) {
  const months = [...new Set(['2026-11', '2026-12', '2027-01', ...rows.map(t => t.due.slice(0, 7)).filter(Boolean)])].sort()
  if (rows.some(t => !t.due)) months.push('unscheduled')
  return `<div class="board roadmap-board">${months.map((month, index) => {
    const items = rows.filter(t => (t.due.slice(0, 7) || 'unscheduled') === month)
    return `<section class="board-column ${['teal', 'plum', 'sienna'][index % 3]}" data-drop-field="month" data-drop-value="${month}" aria-label="${monthName(month)}"><h2 class="column-title"><span class="dot"></span>${monthName(month)}<span class="column-count">${items.length}</span></h2><div class="column-cards">${items.length ? items.map(renderCard).join('') : '<div class="empty-column">Nothing scheduled yet.<br>Drop a task here to plan ahead.</div>'}</div><button class="column-add" data-add-month="${month}">${icon('plus')}Plan a task</button></section>`
  }).join('')}</div>`
}
function renderOverview(rows) {
  const inProgress = rows.filter(t => t.stage === 'progress').length, inReview = rows.filter(t => t.stage === 'review').length, done = rows.filter(t => t.stage === 'done').length
  const next = rows.filter(t => t.stage !== 'done').sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')).slice(0, 5)
  return `<div class="overview-intro"><h2>A clear view of what’s next.</h2><p>Follow work across QA areas, spot what needs a review, and keep the next action in sight. These counts reflect the sample planning tasks in this view.</p></div><div class="overview-stats">${[['Total tasks', rows.length, 'In the current view'], ['In progress', inProgress, 'Work underway'], ['Ready for review', inReview, 'Waiting for a second look'], ['Completed', done, 'Tasks marked done']].map(([label, value, note]) => `<div class="stat"><span class="stat-label">${label}</span><strong class="stat-value">${value}</strong><span class="stat-note">${note}</span></div>`).join('')}</div><div class="overview-grid"><section class="overview-panel"><h3>Work across QA areas</h3>${areas.map(a => {
    const all = rows.filter(t => t.area === a.id), complete = all.filter(t => t.stage === 'done').length
    return `<div class="area-summary">${areaTag(a)}<span class="progress-track"><span style="width:${all.length ? Math.round(complete / all.length * 100) : 0}%"></span></span><span class="area-summary-count">${complete} / ${all.length} done</span></div>`
  }).join('')}</section><section class="overview-panel"><h3>Coming up next</h3>${next.length ? next.map(t => `<button class="overview-task" data-task="${esc(t.id)}">${avatar(ownerFor(t))}<span><p>${esc(t.title)}</p><small>${shortDate(t.due)} · ${areaFor(t).name}</small></span>${icon('arrow')}</button>`).join('') : '<p class="detail-note">All tasks in this view are complete.</p>'}</section></div>`
}

function record(t, text) { t.activity.unshift({ text, at: new Date().toISOString() }); t.activity = t.activity.slice(0, 40) }
function updateTask(t, key, value) {
  if (t[key] === value) return
  t[key] = value
  const display = key === 'stage' ? stageFor(t).name : key === 'area' ? areaFor(t).name : key === 'owner' ? ownerFor(t).name : key === 'blocked' ? value ? 'Blocked' : 'Unblocked' : value || 'Cleared'
  record(t, key === 'description' ? 'Updated the description' : key === 'title' ? 'Renamed the task' : `${key === 'stage' ? 'Status' : key[0].toUpperCase() + key.slice(1)}: ${display}`)
  persist(); render()
}
function toggleComplete(id) {
  const t = tasks.find(t => t.id === id)
  updateTask(t, 'stage', t.stage === 'done' ? 'backlog' : 'done')
  if (detail.open && selectedId === id) renderDetail(t)
  notify(t.stage === 'done' ? 'Task marked complete' : 'Task moved to backlog')
}
function openTask(id) {
  const t = tasks.find(t => t.id === id)
  if (!t) return
  selectedId = id; renderDetail(t); detail.showModal()
}
function renderDetail(t) {
  detail.innerHTML = `<div class="detail-toolbar"><button class="button ${t.stage === 'done' ? 'done' : ''}" data-detail-complete>${icon('check')}${t.stage === 'done' ? 'Completed' : 'Mark complete'}</button><span class="task-id">${esc(t.id)}</span><button class="icon-button" data-close="detail" aria-label="Close task">${icon('close')}</button></div><div class="detail-body"><div class="detail-kicker">${areaTag(areaFor(t))}<span>Sample planning task</span></div><label class="sr-only" for="detail-title" hidden>Task name</label><textarea id="detail-title" class="detail-title" aria-label="Task name" data-edit="title" rows="2" maxlength="180">${esc(t.title)}</textarea><div class="detail-fields"><label for="detail-owner">Owner</label><select id="detail-owner" data-edit="owner">${options(owners, t.owner)}</select><label for="detail-due">Due date</label><input type="date" id="detail-due" data-edit="due" value="${esc(t.due)}"><label for="detail-area">QA area</label><select id="detail-area" data-edit="area">${options(areas, t.area)}</select><label for="detail-stage">Status</label><select id="detail-stage" data-edit="stage">${options(stages, t.stage)}</select><label for="detail-priority">Priority</label><select id="detail-priority" data-edit="priority">${options(priorities.map(id => ({ id, name: id })), t.priority)}</select><span class="detail-note">Blocker</span><label class="blocked-field"><input type="checkbox" data-edit="blocked"${t.blocked ? ' checked' : ''}>Waiting on a dependency</label></div><h3 class="detail-section-title">Description</h3><textarea class="detail-description" aria-label="Description" data-edit="description" rows="4" maxlength="4000">${esc(t.description)}</textarea><h3 class="detail-section-title">Subtasks <span class="task-id">${t.subtasks.filter(s => s.done).length}/${t.subtasks.length}</span></h3><div>${t.subtasks.map(s => `<label class="subtask-row ${s.done ? 'checked' : ''}"><input type="checkbox" data-subtask="${esc(s.id)}"${s.done ? ' checked' : ''}><span>${esc(s.title)}</span></label>`).join('')}</div><form id="subtask-form" class="subtask-form"><input name="title" aria-label="New subtask" placeholder="Add a subtask…" required maxlength="180"><button class="button" type="submit">${icon('plus')}Add</button></form><h3 class="detail-section-title">Notes & activity</h3><p class="detail-note">Notes stay in this browser and are not sent to anyone.</p>${t.comments.map(c => `<div class="comment"><small>Local reviewer · ${new Date(c.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</small>${esc(c.text)}</div>`).join('')}<form id="comment-form" class="comment-form"><textarea name="comment" aria-label="Add a local note" placeholder="Add context or a next step…" rows="2" required maxlength="2000"></textarea><button class="button primary" type="submit">Add note</button></form>${t.activity.slice(0, 5).map(a => `<div class="activity-item">${esc(a.text)}</div>`).join('')}</div><div class="detail-save-line">${icon('lock')}${persistent ? 'Edits save automatically in this browser' : 'Edits remain in this tab only'}<button data-close="detail">Done</button></div>`
}
function showUtility(title, body) {
  utility.innerHTML = `<div class="utility-header"><h2 id="utility-title">${esc(title)}</h2><button class="icon-button" data-close="utility" aria-label="Close dialog">${icon('close')}</button></div><div class="utility-body">${body}</div>`
  if (!utility.open) utility.showModal()
}
function addTask(defaults = {}) {
  showUtility('A new step forward', `<p>Create a task in this local prototype.</p><form id="new-task-form"><label class="field-label">Task name<input name="title" placeholder="What needs to happen?" required maxlength="180" autofocus></label><label class="field-label">QA area<select name="area">${options(areas, defaults.area || (scope === 'all' ? 'automation' : scope))}</select></label><label class="field-label">Status<select name="stage">${options(stages, defaults.stage || 'backlog')}</select></label><label class="field-label">Priority<select name="priority">${options(priorities.map(id => ({ id, name: id })), 'Medium')}</select></label><label class="field-label">Due date<input type="date" name="due" value="${esc(defaults.due || '')}"></label><div class="utility-actions"><button class="button" type="button" data-close="utility">Cancel</button><button class="button primary" type="submit">Create task</button></div></form>`)
}
function clearFilters() { query = ''; filters = { stage: '', priority: '', owner: 'all', month: '' }; render() }
function exportBoard() {
  const blob = new Blob([JSON.stringify({ type: 'QA Hub design prototype', dataMode: 'sample-with-local-edits', exportedAt: new Date().toISOString(), tasks: visibleTasks() }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob), anchor = document.createElement('a')
  anchor.href = url; anchor.download = 'livelabs-qa-prototype-board.json'; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  notify('Exported the tasks in this view')
}
function action(name) {
  if (name === 'add') addTask()
  if (name === 'filter') { filterOpen = !filterOpen; render(); document.querySelector('[data-action="filter"]').focus() }
  if (name === 'clear') clearFilters()
  if (name === 'export') exportBoard()
  if (name === 'menu') { mobileOpen = !mobileOpen; document.querySelector('.sidebar').classList.toggle('open', mobileOpen); document.querySelector('.mobile-toggle').setAttribute('aria-expanded', mobileOpen) }
  if (name === 'team') showUtility('Example teams', `<p>These role-based owners are sample assignments for this prototype.</p>${owners.filter(o => o.id).map(o => `<div class="team-row">${avatar(o)}${o.name}</div>`).join('')}`)
  if (name === 'fields') showUtility('Customize this view', `<p>Choose the details shown in ${view} view. Each view keeps its own settings.</p>${Object.entries({ priority: 'Priority', owner: 'Owner', due: 'Due date', ...(view !== 'list' ? { subtasks: 'Subtask progress', compact: 'Compact cards' } : {}) }).map(([key, label]) => `<label class="check-option"><input type="checkbox" data-preference="${key}"${fields()[key] ? ' checked' : ''}>${label}</label>`).join('')}<div class="utility-actions"><button class="button primary" data-close="utility">Done</button></div>`)
  if (name === 'about') showUtility('Designed for QA, inspired by Asana', `<p>A first working direction for the LiveLabs QA Hub: shared Board, List, and Roadmap views with a task detail panel.</p><p>All tasks, assignments, dates, and completion states are sample data. Edits and notes stay in your browser. The current Hub remains available for local report and inventory readers.</p><div class="about-links"><a href="https://asana.com/features/project-management/project-views" target="_blank" rel="noopener">Asana project views ${icon('external')}</a><a href="https://help.asana.com/s/article/filtering-and-sorting-custom-fields?language=en_US" target="_blank" rel="noopener">Asana fields, filtering, and sorting ${icon('external')}</a><a href="/" target="_blank" rel="noopener">Open the current QA Hub ${icon('external')}</a></div>`)
  if (name === 'settings') showUtility('Workspace settings', `<p>This is a local design review. Your sample tasks and display preferences are saved only in this browser.</p><p><strong>Connections:</strong> no live Jira, Jenkins, support, or repository feeds are attached to this planning board.</p><div class="utility-actions"><button class="button" data-action="reset-confirm">${icon('reset')}Reset sample workspace</button></div>`)
  if (name === 'reset-confirm') showUtility('Reset this sample workspace?', `<p>This removes tasks, notes, and edits created in this prototype and restores the 16 sample tasks. The current Hub’s data is unaffected.</p><div class="utility-actions"><button class="button" data-close="utility">Keep my changes</button><button class="button primary" data-action="reset">Reset sample workspace</button></div>`)
  if (name === 'reset') { tasks = seedTasks(); for (const key of views) preferences[key] = { ...defaultFields }; persist(); utility.close(); clearFilters(); notify('Sample workspace restored') }
}

root.addEventListener('click', event => {
  const complete = event.target.closest('[data-complete]')
  if (complete) { toggleComplete(complete.dataset.complete); return }
  const task = event.target.closest('[data-task], [data-card]')
  if (task) { openTask(task.dataset.task || task.dataset.card); return }
  const nav = event.target.closest('[data-nav]')
  if (nav) { clearFilters(); navigate(nav.dataset.nav, 'all'); return }
  const area = event.target.closest('[data-scope]')
  if (area) { clearFilters(); navigate(view, area.dataset.scope); return }
  const tab = event.target.closest('[data-view]')
  if (tab) { navigate(tab.dataset.view); return }
  const column = event.target.closest('[data-add-column]')
  if (column) { addTask({ [group]: column.dataset.addColumn }); return }
  const month = event.target.closest('[data-add-month]')
  if (month) { addTask({ due: month.dataset.addMonth === 'unscheduled' ? '' : `${month.dataset.addMonth}-15` }); return }
  const control = event.target.closest('[data-action]')
  if (control) action(control.dataset.action)
})
root.addEventListener('input', event => {
  if (event.target.id === 'global-search') { query = event.target.value; renderContent() }
})
root.addEventListener('change', event => {
  if (event.target.id === 'sort-select') { sort = event.target.value; renderContent() }
  if (event.target.id === 'group-select') { group = event.target.value; renderContent() }
  if (event.target.dataset.filter) {
    filters[event.target.dataset.filter] = event.target.value
    const key = event.target.dataset.filter
    render(); document.querySelector(`[data-filter="${key}"]`).focus()
  }
})

let draggedId = ''
root.addEventListener('dragstart', event => {
  const card = event.target.closest('.task-card')
  if (!card) return
  draggedId = card.dataset.card; event.dataTransfer.setData('text/plain', draggedId); event.dataTransfer.effectAllowed = 'move'; card.classList.add('is-dragging')
})
root.addEventListener('dragend', () => { draggedId = ''; document.querySelectorAll('.drag-over,.is-dragging').forEach(el => el.classList.remove('drag-over', 'is-dragging')) })
root.addEventListener('dragover', event => {
  const column = event.target.closest('[data-drop-value]')
  if (!column || !draggedId) return
  event.preventDefault(); event.dataTransfer.dropEffect = 'move'
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); column.classList.add('drag-over')
})
root.addEventListener('dragleave', event => {
  const column = event.target.closest('[data-drop-value]')
  if (column && !column.contains(event.relatedTarget)) column.classList.remove('drag-over')
})
root.addEventListener('drop', event => {
  const column = event.target.closest('[data-drop-value]')
  if (!column || !draggedId) return
  event.preventDefault()
  const t = tasks.find(t => t.id === draggedId)
  if (!t) return
  const field = column.dataset.dropField, value = column.dataset.dropValue
  if (field === 'month') {
    // Preserve the day when moving months, clamped to the last day of the destination.
    let due = ''
    if (value !== 'unscheduled') {
      const [year, month] = value.split('-').map(Number), lastDay = new Date(year, month, 0).getDate()
      due = `${value}-${String(Math.min(Number(t.due.slice(8)) || 15, lastDay)).padStart(2, '0')}`
    }
    updateTask(t, 'due', due)
  } else updateTask(t, field, value)
  draggedId = ''; notify('Task moved · saved locally')
})

detail.addEventListener('change', event => {
  const t = tasks.find(t => t.id === selectedId)
  if (!t) return
  if (event.target.dataset.edit) {
    const key = event.target.dataset.edit, value = key === 'blocked' ? event.target.checked : event.target.value.trim()
    if (key === 'title' && !value) { event.target.value = t.title; notify('Task name cannot be empty'); return }
    updateTask(t, key, value)
    if (key === 'stage') {
      const button = detail.querySelector('[data-detail-complete]')
      button.classList.toggle('done', t.stage === 'done')
      button.innerHTML = `${icon('check')}${t.stage === 'done' ? 'Completed' : 'Mark complete'}`
    }
    if (key === 'area') detail.querySelector('.detail-kicker').innerHTML = `${areaTag(areaFor(t))}<span>Sample planning task</span>`
  }
  if (event.target.dataset.subtask) {
    const s = t.subtasks.find(s => s.id === event.target.dataset.subtask)
    s.done = event.target.checked; record(t, `${s.done ? 'Completed' : 'Reopened'} subtask: ${s.title}`); persist(); render()
    event.target.closest('.subtask-row').classList.toggle('checked', s.done)
    detail.querySelector('.detail-section-title .task-id').textContent = `${t.subtasks.filter(s => s.done).length}/${t.subtasks.length}`
  }
})
detail.addEventListener('click', event => {
  if (event.target.closest('[data-close]')) detail.close()
  if (event.target.closest('[data-detail-complete]')) toggleComplete(selectedId)
})
detail.addEventListener('submit', event => {
  event.preventDefault()
  const t = tasks.find(t => t.id === selectedId), data = new FormData(event.target)
  if (event.target.id === 'comment-form') {
    const text = data.get('comment').trim()
    if (!text) return
    t.comments.push({ text, at: new Date().toISOString() }); record(t, 'Added a local note')
  }
  if (event.target.id === 'subtask-form') {
    const title = data.get('title').trim()
    if (!title) return
    t.subtasks.push({ id: crypto.randomUUID(), title, done: false }); record(t, `Added subtask: ${title}`)
  }
  const formId = event.target.id
  persist(); render(); renderDetail(t)
  detail.querySelector(`#${formId} input, #${formId} textarea`).focus()
  notify(formId === 'comment-form' ? 'Note saved locally' : 'Subtask added')
})
detail.addEventListener('close', () => {
  const target = [...document.querySelectorAll('[data-task]')].find(el => el.dataset.task === selectedId)
  ;(target || document.querySelector('[data-action="add"]'))?.focus()
})
utility.addEventListener('click', event => {
  if (event.target.closest('[data-close]')) utility.close()
  const button = event.target.closest('[data-action]')
  if (button) action(button.dataset.action)
})
utility.addEventListener('change', event => {
  const field = event.target.dataset.preference
  if (field) { preferences[view][field] = event.target.checked; persist(); render() }
})
utility.addEventListener('submit', event => {
  if (event.target.id !== 'new-task-form') return
  event.preventDefault()
  const data = new FormData(event.target), title = data.get('title').trim()
  if (!title) return
  const next = Math.max(100, ...tasks.map(t => Number(t.id.split('-')[1]) || 100)) + 1
  const t = { id: `QA-${next}`, title, area: data.get('area'), stage: data.get('stage'), priority: data.get('priority'), due: data.get('due'), owner: '', description: '', subtasks: [], comments: [], activity: [], blocked: false, source: 'Created locally in design prototype' }
  tasks.push(t); record(t, 'Created a local task'); persist(); utility.close(); render(); openTask(t.id); notify('Task created locally')
})
document.addEventListener('keydown', event => {
  if (event.key === '/' && !detail.open && !utility.open && !event.target.matches('input,textarea,select,[contenteditable]')) { event.preventDefault(); document.querySelector('#global-search').focus() }
  if (event.key === 'Escape' && mobileOpen) { mobileOpen = false; document.querySelector('.sidebar').classList.remove('open'); document.querySelector('.mobile-toggle').setAttribute('aria-expanded', 'false') }
})
window.addEventListener('hashchange', () => { readRoute(); render() })
window.addEventListener('popstate', () => { readRoute(); render() })
readRoute(); render()
