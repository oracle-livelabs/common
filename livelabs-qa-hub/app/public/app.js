import {
  authenticate,
  can,
  createAuditEvent,
  createGithubItem,
  createKnowledgeItem,
  createMonitor,
  createUser,
  createWatchEvent,
  deleteKnowledgeItem,
  deleteUser,
  deriveHealthStatus,
  deriveSummary,
  freshnessLabel,
  futureRoles,
  generateReport,
  getActionQueue,
  getEvidence,
  getMonitor,
  getSafeUser,
  getSeedState,
  getSource,
  navigation,
  resetDemoState,
  roles,
  sectionSummaries,
  updateKnowledgeItemStatus,
  updateUser,
  updateWatchEventStatus,
  watchdogTabs
} from './state.mjs'

const app = document.querySelector('#app')
const storageKey = 'livelabs-qa-hub-state-v2'
const sessionKey = 'livelabs-qa-hub-session-v2'
const routeKey = 'livelabs-qa-hub-route-v2'
const tabKey = 'livelabs-qa-hub-watchdog-tab-v2'
const hiddenViewMetadata = {
  'qa-watchdog': {
    label: 'QA Watchdog',
    help: 'Datadog-style alerts, logs, monitor definitions, and incident investigation for QA signals.'
  },
  'health-monitor': {
    label: 'Health Monitor',
    help: 'Source-aware checks with freshness, owners, cadence, and evidence for LiveLabs QA health.'
  },
  'automation-runs': {
    label: 'Automation Runs',
    help: 'CI/CD and local QA run evidence grouped by scope, artifact, owner, and status.'
  },
  'livestack-qa': {
    label: 'LiveStack QA',
    help: 'Guide, bundle, runtime, and validation readiness signals for LiveStack work.'
  },
  'platform-content': {
    label: 'Platform And Content',
    help: 'Catalog, launch, metadata, publishing readiness, and content quality risk.'
  },
  'usage-metrics': {
    label: 'Usage Metrics',
    help: 'Workshop starts, sprint usage, adoption patterns, anomaly detection, and at-risk content signals.'
  },
  'sprint-ops': {
    label: 'Sprint Ops',
    help: 'Sprint procedure health, owner response, blockers, readiness gates, and QA task drift.'
  }
}
const operationGroups = [
  {
    label: 'Monitor And Triage',
    description: 'Find the strongest signals first, then open the record that owns the next action.',
    items: ['qa-watchdog', 'health-monitor']
  },
  {
    label: 'Evidence And Automation',
    description: 'Review run evidence and repository intake without leaving the operations flow.',
    items: ['automation-runs', 'github-intake']
  },
  {
    label: 'Domain QA',
    description: 'Move through LiveLabs domains with a compact operating view instead of a card wall.',
    items: ['livestack-qa', 'platform-content', 'usage-metrics', 'sprint-ops']
  },
  {
    label: 'Test And Release',
    description: 'Promote operational findings into linked testing, traceability, and review-ready reports.',
    items: ['test-management', 'reports']
  }
]
const operationsRegistry = [
  {
    id: 'qa-watchdog',
    label: 'QA Watchdog',
    group: 'Monitor And Triage',
    description: 'Datadog-style alert, log, monitor, and incident review for LiveLabs QA signals.'
  },
  {
    id: 'health-monitor',
    label: 'Health Monitor',
    group: 'Monitor And Triage',
    description: 'Source-aware checks with freshness, owners, cadence, evidence, and risk explanation.'
  },
  {
    id: 'automation-runs',
    label: 'Automation Runs',
    group: 'Evidence And Automation',
    description: 'CI/CD and local QA run evidence grouped by scope, owner, artifact, and status.'
  },
  {
    id: 'github-intake',
    label: 'GitHub Intake',
    group: 'Evidence And Automation',
    description: 'PRs, issues, logs, and review history that need QA attention.'
  },
  {
    id: 'livestack-qa',
    label: 'LiveStack QA',
    group: 'Domain QA',
    description: 'Guide, bundle, runtime, and validation readiness signals for LiveStack work.'
  },
  {
    id: 'platform-content',
    label: 'Platform And Content',
    group: 'Domain QA',
    description: 'Catalog, launch, metadata, publishing readiness, and content quality risk.'
  },
  {
    id: 'usage-metrics',
    label: 'Usage Metrics',
    group: 'Domain QA',
    description: 'Workshop starts, sprint usage, adoption patterns, anomalies, and at-risk content.'
  },
  {
    id: 'sprint-ops',
    label: 'Sprint Ops',
    group: 'Domain QA',
    description: 'Sprint procedure health, owner response, blockers, readiness gates, and task drift.'
  },
  {
    id: 'test-management',
    label: 'Test Management',
    group: 'Test And Release',
    description: 'Open the linked QA TMS for requirements, tests, plans, executions, and traceability.'
  },
  {
    id: 'reports',
    label: 'Reports',
    group: 'Test And Release',
    description: 'Generate review-ready local reports from watchdog, health, and evidence signals.'
  }
]
const operationsSubpageIds = operationsRegistry
  .filter((item) => hiddenViewMetadata[item.id])
  .map((item) => item.id)
const routableViews = new Set([...navigation.map((item) => item.id), ...Object.keys(hiddenViewMetadata)])
const navGlyphs = {
  'command-center': 'CC',
  operations: 'OP',
  'qa-watchdog': 'WD',
  'health-monitor': 'HM',
  'automation-runs': 'AR',
  'github-intake': 'GH',
  'knowledge-base': 'KB',
  'test-management': 'TM',
  reports: 'RP',
  'admin-console': 'AC'
}

let state = loadState()
let session = loadSession()
let activeView = loadRoute()
let activeWatchdogTab = loadWatchdogTab()
let selectedAlertId = null
let selectedReportId = 'rep-daily'
let reportPreview = ''
let message = ''

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || 'null')
    if ([2, 3].includes(stored?.version) && stored?.users?.length && stored?.watchEvents?.length) {
      return normalizeHubState({
        ...getSeedState(),
        ...stored,
        version: 3
      })
    }
  } catch {
    localStorage.removeItem(storageKey)
  }

  const seeded = normalizeHubState(getSeedState())
  localStorage.setItem(storageKey, JSON.stringify(seeded))
  return seeded
}

function normalizeHubState(model) {
  const seed = getSeedState()
  const seedWatchLinks = new Map(seed.watchEvents.map((event) => [event.id, event.tmsLinks || []]))
  const seedGithubLinks = new Map(seed.githubItems.map((item) => [item.id, item.tmsLinks || []]))

  return {
    ...model,
    watchEvents: (model.watchEvents || []).map((event) => ({
      ...event,
      tmsLinks: event.tmsLinks || seedWatchLinks.get(event.id) || []
    })),
    githubItems: (model.githubItems || []).map((item) => ({
      ...item,
      tmsLinks: item.tmsLinks || seedGithubLinks.get(item.id) || []
    }))
  }
}

function loadSession() {
  try {
    const stored = JSON.parse(localStorage.getItem(sessionKey) || 'null')
    if (!stored?.id) {
      return null
    }

    const current = state.users.find((user) => user.id === stored.id && user.status === 'active')
    return getSafeUser(current)
  } catch {
    localStorage.removeItem(sessionKey)
    return null
  }
}

function loadRoute() {
  const saved = localStorage.getItem(routeKey)
  return routableViews.has(saved) ? saved : 'command-center'
}

function loadWatchdogTab() {
  const saved = localStorage.getItem(tabKey)
  return watchdogTabs.some((item) => item.id === saved) ? saved : 'alerts'
}

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(state))
  localStorage.setItem(routeKey, activeView)
  localStorage.setItem(tabKey, activeWatchdogTab)
  if (session) {
    localStorage.setItem(sessionKey, JSON.stringify(session))
  } else {
    localStorage.removeItem(sessionKey)
  }
}

function currentUser() {
  if (!session) {
    return null
  }
  return getSafeUser(state.users.find((user) => user.id === session.id)) || session
}

function audit(action, target, detail) {
  state.auditEvents = [
    createAuditEvent(currentUser(), action, target, detail),
    ...(state.auditEvents || [])
  ].slice(0, 40)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function navGlyph(id) {
  return navGlyphs[id] || String(id || 'QA').slice(0, 2).toUpperCase()
}

function escapeAttr(value) {
  return escapeHtml(value)
}

function statusClass(value) {
  return String(value || '').toLowerCase().replaceAll(' ', '-')
}

function renderHelp(text) {
  return `<span class="inline-help">${escapeHtml(text)}</span>`
}

function renderSourceBadge(source) {
  if (!source) {
    return '<span class="source-badge stale">Source unknown</span>'
  }
  return `<span class="source-badge ${statusClass(source.confidence)}">${escapeHtml(source.name)} - ${escapeHtml(source.confidence)}</span>`
}

function renderFreshness(minutes) {
  const label = freshnessLabel(minutes)
  return `<span class="freshness ${statusClass(label)}">${escapeHtml(label)} - ${minutes} min</span>`
}

function siblingAppUrl(folderName, localPort) {
  const { origin, pathname } = window.location
  if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin) && !pathname.includes('/livelabs-qa-hub/')) {
    return `http://127.0.0.1:${localPort}/`
  }
  const marker = '/livelabs-qa-hub/'
  if (pathname.includes(marker)) {
    return `${origin}${pathname.slice(0, pathname.indexOf(marker))}/${folderName}/`
  }
  return new URL(`../${folderName}/`, window.location.href).toString()
}

function tmsAppUrl() {
  return siblingAppUrl('livelabs-qa-tms', 4193)
}

function tmsObjectUrl(link) {
  const returnView = {
    requirement: 'requirements',
    'test-case': 'repository',
    plan: 'plans',
    execution: 'execution',
    defect: 'defects'
  }[link.type] || 'overview'
  return `${tmsAppUrl()}#${encodeURIComponent(`object:${link.type}:${link.id}:${returnView}`)}`
}

function renderTmsLinks(links = []) {
  if (!links.length) {
    return '<span class="muted-inline">No TMS links yet</span>'
  }

  return `
    <div class="tms-link-row">
      ${links.map((link) => `
        <a class="tms-link-pill" href="${escapeHtml(tmsObjectUrl(link))}" target="_blank" rel="noreferrer">
          ${escapeHtml(link.id)}<span>${escapeHtml(link.label || link.type)}</span>
        </a>
      `).join('')}
    </div>
  `
}

function getViewMeta(viewId) {
  return navigation.find((item) => item.id === viewId) || hiddenViewMetadata[viewId] || {
    label: 'Command Center',
    help: 'LiveLabs QA Hub workspace.'
  }
}

function render() {
  if (!session) document.body.classList.remove('nav-collapsed')
  app.innerHTML = session ? renderShell() : renderLogin()
  bindEvents()
}

function renderLogin() {
  return `
    <main class="auth-page">
      <section class="auth-panel" aria-labelledby="login-title">
        <div class="brand-lockup">
          <div class="brand-mark" aria-hidden="true">QA</div>
          <div>
            <p class="eyebrow">LiveLabs</p>
            <h1 id="login-title">QA Hub V3</h1>
          </div>
        </div>
        <form id="login-form" class="auth-form">
          <label>
            Email
            <input name="email" type="email" autocomplete="username" value="admin@livelabs.qa" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autocomplete="current-password" value="admin123" required />
          </label>
          <button class="primary-button" type="submit">Sign in</button>
          ${message ? `<p class="form-message" role="status">${escapeHtml(message)}</p>` : ''}
        </form>
        <div class="demo-accounts" aria-label="Demo accounts">
          <strong>Demo accounts</strong>
          <span>admin@livelabs.qa / admin123</span>
          <span>user@livelabs.qa / user123</span>
        </div>
      </section>
      <aside class="auth-context" aria-label="Hub scope">
        <p class="eyebrow">Operational Prototype</p>
        <h2>QA health, evidence, and action queues.</h2>
        <p>V3 is still local and demo-safe. It adds source freshness, GitHub intake, a reviewed QA knowledge base, linked test management, reports, audit events, and session persistence.</p>
      </aside>
    </main>
  `
}

function renderShell() {
  const user = currentUser()
  const roleLabel = roles[user.role]?.label || user.role
  const viewMeta = getViewMeta(activeView)
  const navTitle = viewMeta.label
  const navHelp = viewMeta.help
  document.body.classList.remove('nav-collapsed')

  return `
    <div class="app-shell">
      <aside class="sidebar" id="qa-hub-sidebar">
        <div class="brand-lockup sidebar-brand">
          <div class="brand-mark" aria-hidden="true">QA</div>
          <div>
            <p class="eyebrow">LiveLabs</p>
            <h1>QA Hub V3</h1>
          </div>
        </div>
        <nav class="nav" aria-label="Primary">
          ${navigation.map((item) => `
            <button class="nav-item ${activeView === item.id ? 'active' : ''}" data-view="${item.id}" type="button" aria-label="${escapeHtml(`${item.label}: ${item.help}`)}">
              <span class="nav-icon" aria-hidden="true">${escapeHtml(navGlyph(item.id))}</span>
              <span class="nav-label">${escapeHtml(item.label)}</span>
            </button>
          `).join('')}
        </nav>
        <div class="sidebar-footer">
          <div class="session-card">
            <span class="status-dot ${roleLabel === 'Admin' ? 'admin' : ''}"></span>
            <div>
              <strong>${escapeHtml(roleLabel)} session</strong>
              <span>Local demo mode</span>
            </div>
          </div>
        </div>
      </aside>
      <main class="workspace">
        <header class="topbar">
          <div>
            <p class="eyebrow">Workspace</p>
            <h2>${escapeHtml(navTitle)}</h2>
          </div>
          <div class="user-menu">
            <span>${escapeHtml(user.name)}</span>
            <span class="role-pill">${escapeHtml(roleLabel)}</span>
            ${activeView === 'command-center' ? '' : '<button class="ghost-button" data-view="command-center" type="button">Command Center</button>'}
            <button class="ghost-button" id="logout-button" type="button">Sign out</button>
          </div>
        </header>
        <section class="context-strip" aria-label="Page context">
          <strong>${escapeHtml(navTitle)}</strong>
          <span>${escapeHtml(navHelp)}</span>
        </section>
        ${message ? `<p class="banner-message" role="status">${escapeHtml(message)}</p>` : ''}
        ${renderView(user)}
      </main>
      <button class="back-to-top" id="back-to-top" type="button" aria-label="Back to top" aria-hidden="true" tabindex="-1"><span aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><path d="M8 3.25 3.75 7.5l.9.9L7.5 5.56V13h1V5.56l2.85 2.84.9-.9L8 3.25Z" fill="currentColor"></path></svg></span><span>Back to top</span></button>
    </div>
  `
}

function renderView(user) {
  if (activeView === 'command-center') return renderCommandCenter()
  if (activeView === 'operations') return renderOperationsHub()
  if (activeView === 'github-intake') return renderGithubIntake(user)
  if (activeView === 'knowledge-base') return renderKnowledgeBase(user)
  if (activeView === 'test-management') return renderTestManagementLink()
  if (activeView === 'qa-watchdog') return renderWatchdog(user)
  if (activeView === 'health-monitor') return renderHealthMonitor(user)
  if (activeView === 'automation-runs') return renderAutomationRuns()
  if (activeView === 'reports') return renderReports()
  if (activeView === 'admin-console') return renderAdminConsole(user)
  return renderDomainPage(activeView)
}

function renderCommandCenter() {
  const summary = deriveSummary(state.watchEvents, state.healthChecks)
  const queue = getActionQueue(state)

  return `
    <section class="page-grid">
      <article class="page-intro">
        <p class="eyebrow">Triage Overview</p>
        <h3>What needs attention first?</h3>
        <p>The command center now prioritizes active risk, stale sources, failed runs, and items that need a decision before QA can move forward.</p>
      </article>
      <div class="kpi-grid">
        ${renderKpi('Active events', summary.activeEvents, `${summary.highSeverity} high severity`, 'risk', 'Open watchdog records that are not resolved yet.', 'qa-watchdog')}
        ${renderKpi('Risk or stale checks', summary.risk + summary.stale, `${summary.stale} stale source`, 'warn', 'Health checks requiring source or owner attention.', 'health-monitor')}
        ${renderKpi('Healthy domains', summary.healthy, `${summary.watch} on watch`, 'good', 'Operational checks with current evidence.', 'health-monitor')}
      </div>
    </section>
    <section class="dual-grid">
      <article class="content-band">
        <h3>Action Queue ${renderHelp('Highest-priority local demo items from alerts, stale checks, and failed automation runs.')}</h3>
        <div class="action-list">
          ${queue.map((item) => `
            <button class="action-row" data-view="${item.targetView}" type="button">
              <span class="severity ${statusClass(item.priority)}">${escapeHtml(item.priority)}</span>
              <strong>${escapeHtml(item.title)}</strong>
              <small>${escapeHtml(item.domain)} - ${escapeHtml(item.reason)}</small>
            </button>
          `).join('')}
        </div>
      </article>
      <article class="content-band">
        <h3>Needs Decision ${renderHelp('Questions that should be answered before this becomes production work.')}</h3>
        <div class="focus-list">
          <div class="focus-item">Choose V3 stack: Oracle JET, APEX/ORDS, or service-backed prototype.</div>
          <div class="focus-item">Confirm whether Jira remains read-only or becomes a write target later.</div>
          <div class="focus-item">Identify authoritative analytics and WMS/TMS sources.</div>
        </div>
      </article>
    </section>
    <section class="content-band">
      <h3>Health By Domain</h3>
      <div class="monitor-grid">
        ${state.healthChecks.map((check) => renderSignalCard(check)).join('')}
      </div>
    </section>
    <section class="content-band">
      <h3>Recent Evidence</h3>
      <div class="evidence-grid">
        ${state.evidence.slice(0, 5).map((item) => renderEvidenceCard(item)).join('')}
      </div>
    </section>
  `
}

function renderKpi(label, value, note, tone, help, targetView) {
  return `
    <button class="kpi-card ${tone}" data-view="${targetView}" type="button" aria-label="${escapeHtml(`${label}: ${help}`)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(note)}</p>
    </button>
  `
}

function renderOperationsHub() {
  const summary = deriveSummary(state.watchEvents, state.healthChecks)
  const failedRuns = state.automationRuns.filter((run) => ['Failed', 'Blocked'].includes(run.status)).length
  const staleChecks = state.healthChecks.filter((check) => deriveHealthStatus(check) === 'Stale')
  const latestAlert = state.watchEvents[0]
  const latestRun = state.automationRuns.find((run) => ['Failed', 'Blocked'].includes(run.status)) || state.automationRuns[0]
  const queue = getActionQueue(state).slice(0, 4)

  return `
    <section class="page-intro">
      <p class="eyebrow">Operations Workspace</p>
      <h3>One entry point for active QA work.</h3>
      <p>Open the right operational surface from grouped bands, review current risk at the top, and move into detailed QA pages without the old card wall.</p>
    </section>
    <section class="operations-summary" aria-label="QA operations summary">
      ${renderOperationsMetric('Active alerts', summary.activeEvents, `${summary.highSeverity} high severity`, 'risk')}
      ${renderOperationsMetric('Risk or stale checks', summary.risk + summary.stale, `${staleChecks.length} stale source`, 'warn')}
      ${renderOperationsMetric('Run blockers', failedRuns, 'Failed or blocked evidence', failedRuns ? 'risk' : 'good')}
    </section>
    <section class="operation-groups" aria-label="QA operations groups">
      ${operationGroups.map((group) => renderOperationGroup(group)).join('')}
    </section>
    <section class="dual-grid">
      <article class="content-band">
        <h3>Recent Activity</h3>
        <div class="focus-list">
          ${latestAlert ? `<button class="focus-item action-link" data-view="qa-watchdog" type="button"><strong>${escapeHtml(latestAlert.title)}</strong><br /><span>${escapeHtml(latestAlert.status)} - ${escapeHtml(latestAlert.owner)} - ${escapeHtml(latestAlert.updated)}</span></button>` : ''}
          ${latestRun ? `<button class="focus-item action-link" data-view="automation-runs" type="button"><strong>${escapeHtml(latestRun.name)}</strong><br /><span>${escapeHtml(latestRun.status)} - ${escapeHtml(latestRun.owner)} - ${escapeHtml(latestRun.updated)}</span></button>` : ''}
          ${staleChecks[0] ? `<button class="focus-item action-link" data-view="health-monitor" type="button"><strong>${escapeHtml(staleChecks[0].name)}</strong><br /><span>Stale source - ${escapeHtml(staleChecks[0].owner)}</span></button>` : ''}
        </div>
      </article>
      <article class="content-band">
        <h3>Suggested Next Actions</h3>
        <div class="action-list">
          ${queue.map((item) => `
            <button class="action-row" data-view="${escapeHtml(item.targetView)}" type="button">
              <span class="severity ${statusClass(item.priority)}">${escapeHtml(item.priority)}</span>
              <strong>${escapeHtml(item.title)}</strong>
              <small>${escapeHtml(item.reason)}</small>
            </button>
          `).join('')}
        </div>
      </article>
    </section>
  `
}

function renderOperationsMetric(label, value, note, tone) {
  return `
    <article class="ops-metric ${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(note)}</p>
    </article>
  `
}

function renderOperationGroup(group) {
  return `
    <article class="operation-group">
      <div class="operation-group-head">
        <div>
          <p class="eyebrow">${escapeHtml(group.label)}</p>
          <h3>${escapeHtml(group.description)}</h3>
        </div>
      </div>
      <div class="operation-row-list">
        ${group.items.map((id) => renderOperationLauncher(id)).join('')}
      </div>
    </article>
  `
}

function renderOperationLauncher(id) {
  const item = operationsRegistry.find((operation) => operation.id === id)
  if (!item) return ''
  const signal = getOperationSignal(item.id)
  return `
    <button class="operation-row" data-view="${escapeHtml(item.id)}" type="button" aria-label="${escapeHtml(`Open ${item.label}`)}">
      <span class="operation-copy">
        <strong>${escapeHtml(item.label)}</strong>
        <small>${escapeHtml(item.description)}</small>
      </span>
      <span class="operation-meta">
        <span class="status-badge ${statusClass(signal.tone)}">${escapeHtml(signal.label)}</span>
        <span class="small-button as-label">Open</span>
      </span>
    </button>
  `
}

function getOperationSignal(id) {
  const summary = deriveSummary(state.watchEvents, state.healthChecks)
  const domainTitle = hiddenViewMetadata[id]?.label || operationsRegistry.find((item) => item.id === id)?.label
  const domainChecks = state.healthChecks.filter((check) => domainTitle && (check.domain === domainTitle || domainTitle.includes(check.domain) || check.domain.includes(domainTitle.split(' ')[0])))
  const failedRuns = state.automationRuns.filter((run) => ['Failed', 'Blocked'].includes(run.status)).length
  const githubOpen = state.githubItems.filter((item) => !['Closed', 'Resolved', 'Done'].includes(item.status)).length

  if (id === 'qa-watchdog') return { label: `${summary.activeEvents} active`, tone: summary.highSeverity ? 'risk' : 'good' }
  if (id === 'health-monitor') return { label: `${summary.risk + summary.stale} at risk`, tone: summary.risk || summary.stale ? 'risk' : 'good' }
  if (id === 'automation-runs') return { label: `${failedRuns} blocked`, tone: failedRuns ? 'risk' : 'good' }
  if (id === 'github-intake') return { label: `${githubOpen} intake`, tone: githubOpen ? 'warn' : 'good' }
  if (id === 'test-management') return { label: 'Linked app', tone: 'good' }
  if (id === 'reports') return { label: `${state.reports.length} templates`, tone: 'good' }
  if (domainChecks.length) {
    const risky = domainChecks.some((check) => ['Risk', 'Stale'].includes(deriveHealthStatus(check)))
    return { label: risky ? 'Needs review' : 'On watch', tone: risky ? 'risk' : 'warn' }
  }
  return { label: 'Review', tone: 'warn' }
}

function renderOperationsChrome(activeOperationId) {
  const active = operationsRegistry.find((item) => item.id === activeOperationId)
  if (!active) return ''

  const index = operationsSubpageIds.indexOf(activeOperationId)
  const previous = operationsRegistry.find((item) => item.id === operationsSubpageIds[(index - 1 + operationsSubpageIds.length) % operationsSubpageIds.length])
  const next = operationsRegistry.find((item) => item.id === operationsSubpageIds[(index + 1) % operationsSubpageIds.length])

  return `
    <section class="operations-chrome" aria-label="QA Operations navigation">
      <div class="breadcrumb"><button data-view="operations" type="button">QA Operations</button><span>/</span><strong>${escapeHtml(active.label)}</strong></div>
      <div class="sibling-controls">
        <button class="small-button" data-view="operations" type="button">Back to QA Operations</button>
        <button class="small-button" data-view="${escapeHtml(previous.id)}" type="button">Previous: ${escapeHtml(previous.label)}</button>
        <button class="small-button" data-view="${escapeHtml(next.id)}" type="button">Next: ${escapeHtml(next.label)}</button>
      </div>
      <div class="subnav" aria-label="QA Operations sections">
        ${operationsSubpageIds.map((id) => {
          const item = operationsRegistry.find((operation) => operation.id === id)
          return `<button class="${id === activeOperationId ? 'active' : ''}" data-view="${escapeHtml(id)}" type="button">${escapeHtml(item.label)}</button>`
        }).join('')}
      </div>
    </section>
  `
}

function withOperationsChrome(activeOperationId, content) {
  return `${renderOperationsChrome(activeOperationId)}${content}`
}

function renderGithubIntake(user) {
  const isAdmin = can(user.role, 'manage_github_intake')
  return `
    <section class="split-layout">
      <article class="page-intro">
        <p class="eyebrow">Repository QA</p>
        <h3>GitHub PRs, issues, logs, and history.</h3>
        <p>This local intake model tracks repository-driven QA work. A later version can connect to GitHub APIs or exported PR data after access and source ownership are approved.</p>
      </article>
      <aside class="action-panel">
        <h3>${isAdmin ? 'Add Intake Record' : 'View-Only Intake'}</h3>
        ${isAdmin ? renderGithubForm() : '<p>Your role can inspect repository QA records. Admin access is required to add local intake records.</p>'}
      </aside>
    </section>
    <section class="content-band">
      <h3>PR And Issue Queue</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Repository</th><th>Status</th><th>Owner</th><th>Signal</th><th>TMS Links</th><th>Updated</th></tr></thead>
          <tbody>
            ${state.githubItems.map((item) => `
              <tr>
                <td><strong>${escapeHtml(item.type)}: ${escapeHtml(item.title)}</strong><small>${escapeHtml(item.id)}</small></td>
                <td>${escapeHtml(item.repo)}</td>
                <td><span class="status-badge ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
                <td>${escapeHtml(item.owner)}</td>
                <td>${escapeHtml(item.signal)}</td>
                <td>${renderTmsLinks(item.tmsLinks)}</td>
                <td>${escapeHtml(item.updated)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
    <section class="content-band">
      <h3>Logs And History</h3>
      <div class="log-list">
        ${state.githubItems.flatMap((item) => item.history.map((entry) => `
          <article class="log-row">
            <span>${escapeHtml(item.id)}</span>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(entry)}</p>
          </article>
        `)).join('')}
      </div>
    </section>
  `
}

function renderGithubForm() {
  return `
    <form id="github-form" class="stacked-form">
      <label>Title<input name="title" required placeholder="PR, issue, log, or review title" /></label>
      <label>Type
        <select name="type">
          <option>Pull Request</option>
          <option>Issue</option>
          <option>Log</option>
        </select>
      </label>
      <label>Repository<input name="repo" value="oracle-livelabs/common" required /></label>
      <label>Status<input name="status" value="Needs QA Review" required /></label>
      <label>Owner<input name="owner" value="LiveLabs QA" required /></label>
      <label>Source link<input name="link" value="demo://github/manual-intake" /></label>
      <label>QA signal<textarea name="signal" rows="3" required placeholder="What does QA need to inspect or remember?"></textarea></label>
      <button class="primary-button" type="submit">Add intake record</button>
    </form>
  `
}

function renderKnowledgeBase(user) {
  const isAdmin = can(user.role, 'manage_knowledge_base')
  const reviewed = state.knowledgeItems.filter((item) => ['Reviewed', 'Promoted'].includes(item.status)).length
  const needsReview = state.knowledgeItems.length - reviewed
  return `
    <section class="knowledge-shell">
      <div class="knowledge-head">
        <div>
          <p class="eyebrow">QA Knowledge Base</p>
          <h3>Source intake and reusable QA decisions</h3>
        </div>
        <div class="workflow-strip compact-strip">
          <div><strong>${state.knowledgeItems.length}</strong><span>Items</span></div>
          <div><strong>${reviewed}</strong><span>Reviewed</span></div>
          <div><strong>${needsReview}</strong><span>Needs action</span></div>
        </div>
      </div>
      <div class="knowledge-grid">
        <aside class="action-panel compact-panel">
          <h3>${isAdmin ? 'Add Source' : 'Read Only'}</h3>
        ${isAdmin ? renderKnowledgeForm() : '<p>Your role can read reviewed knowledge. Admin access is required to add local demo source notes.</p>'}
        </aside>
        <section class="knowledge-library" aria-label="Knowledge library">
          ${state.knowledgeItems.map((item) => renderKnowledgeItem(item, isAdmin)).join('')}
        </section>
      </div>
    </section>
  `
}

function renderKnowledgeItem(item, isAdmin) {
  const facts = Array.isArray(item.extractedFacts) ? item.extractedFacts : [item.summary]
  const signals = Array.isArray(item.relatedSignals) ? item.relatedSignals : [item.owner]
  return `
    <article class="knowledge-item">
      <div class="knowledge-item-head">
        <div>
          <p class="eyebrow">${escapeHtml(item.type)}</p>
          <h3>${escapeHtml(item.title)}</h3>
        </div>
        <span class="status-badge ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
      </div>
      <p>${escapeHtml(item.summary)}</p>
      <div class="knowledge-facts">
        ${facts.slice(0, 3).map((fact) => `<span>${escapeHtml(fact)}</span>`).join('')}
      </div>
      <div class="meta-row">
        <span>${escapeHtml(item.owner)}</span>
        <span>${escapeHtml(item.source || 'Manual source')}</span>
        <a href="${escapeAttr(item.link || '#')}" target="_blank" rel="noreferrer">Open source</a>
      </div>
      <div class="chip-row">
        ${signals.map((signal) => `<span class="source-badge confirmed">${escapeHtml(signal)}</span>`).join('')}
      </div>
      ${isAdmin ? `
        <div class="card-actions">
          <button class="small-button" data-knowledge-status="${escapeAttr(item.id)}" data-status="Reviewed" type="button">Review</button>
          <button class="small-button" data-knowledge-status="${escapeAttr(item.id)}" data-status="Promoted" type="button">Promote</button>
          <button class="small-button" data-knowledge-status="${escapeAttr(item.id)}" data-status="Needs Source Refresh" type="button">Refresh</button>
          <button class="small-button danger" data-delete-knowledge="${escapeAttr(item.id)}" type="button">Delete</button>
        </div>
      ` : ''}
    </article>
  `
}

function renderKnowledgeForm() {
  return `
    <form id="knowledge-form" class="stacked-form">
      <label>Source Type
        <select name="type">
          <option>Link</option>
          <option>Document</option>
          <option>GitHub</option>
          <option>Analytics</option>
          <option>Automation</option>
        </select>
      </label>
      <label>QA Domain
        <select name="domain">
          <option>Platform</option>
          <option>Content</option>
          <option>Analytics</option>
          <option>Automation</option>
          <option>LiveStack</option>
          <option>TMS</option>
        </select>
      </label>
      <label>Title<input name="title" placeholder="Optional title"></label>
      <label>Link Or File Reference<input name="link" placeholder="https://..., GitHub path, Confluence export, PDF name"></label>
      <label>Source Name<input name="source" placeholder="Jira item, GitHub PR, report, document, or dashboard"></label>
      <label>Extracted Summary<textarea name="summary" rows="3" placeholder="Paste or summarize the useful QA information"></textarea></label>
      <label>Next Action<textarea name="nextAction" rows="2" placeholder="Review, promote, attach evidence, or refresh source"></textarea></label>
      <button class="primary-button" type="submit">Extract Demo Knowledge</button>
    </form>
  `
}

function renderTestManagementLink() {
  return `
    <section class="split-layout">
      <article class="page-intro">
        <p class="eyebrow">Linked QA System</p>
        <h3>LiveLabs QA Test Management.</h3>
        <p>Use the TMS when the work moves from operational signal to test design, plan scope, execution tracking, and release evidence. The QA Hub remains the command layer; the TMS owns requirement traceability and test execution records.</p>
      </article>
      <aside class="action-panel launch-panel">
        <h3>Open The QA TMS</h3>
        <p>Launch the separate local prototype for projects, requirement documents, suites, test plans, executions, traceability, and reports.</p>
        <a class="link-button" href="${escapeHtml(tmsAppUrl())}" target="_blank" rel="noreferrer">Open LiveLabs QA TMS</a>
      </aside>
    </section>
    <section class="kpi-grid">
      ${renderStaticKpi('Requirement Documents', '3', 'Feature/project source docs become traceable requirements.')}
      ${renderStaticKpi('Plan Workflow', 'Linked', 'Plans connect projects, builds, suites, and individual tests.')}
      ${renderStaticKpi('Execution Reports', 'Local', 'Results roll into coverage and release-readiness reports.')}
    </section>
    <section class="dual-grid">
      <article class="content-band">
        <h3>When To Use The TMS</h3>
        <div class="focus-list">
          <div class="focus-item"><strong>Feature or project testing:</strong><br /><span>Create a project, requirement document, suites, test plan, and execution runs.</span></div>
          <div class="focus-item"><strong>Release readiness:</strong><br /><span>Review failed, blocked, and not-run executions before sign-off.</span></div>
          <div class="focus-item"><strong>Traceability:</strong><br /><span>Check whether every requirement maps to tests, plans, executions, and defects.</span></div>
        </div>
      </article>
      <article class="content-band">
        <h3>QA Hub Integration Points</h3>
        <div class="focus-list">
          <div class="focus-item">Watchdog alerts can link to test cases and executions.</div>
          <div class="focus-item">GitHub PRs can request or block release test runs.</div>
          <div class="focus-item">Knowledge Base sources can become requirements or test design notes.</div>
          <div class="focus-item">Health Monitor failures can trigger focused regression plans.</div>
        </div>
      </article>
    </section>
    <section class="content-band">
      <h3>Suggested Workflow</h3>
      <div class="workflow-strip tms-workflow">
        <div><strong>1</strong><span>Create project or feature scope</span></div>
        <div><strong>2</strong><span>Add requirement document and requirements</span></div>
        <div><strong>3</strong><span>Create suites and test cases</span></div>
        <div><strong>4</strong><span>Build test plans and assign tests</span></div>
        <div><strong>5</strong><span>Execute, report, and feed QA Hub decisions</span></div>
      </div>
    </section>
  `
}

function renderStaticKpi(label, value, note) {
  return `
    <article class="kpi-card good static">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(note)}</p>
    </article>
  `
}

function renderWatchdog(user) {
  const isAdmin = can(user.role, 'manage_watchdog')

  return withOperationsChrome('qa-watchdog', `
    <section class="split-layout">
      <article class="page-intro">
        <p class="eyebrow">Datadog-Style QA Operations</p>
        <h3>Alerts, logs, monitors, and incidents.</h3>
        <p>Watchdog records connect severity, owner, source freshness, evidence, timeline, and the next action. V2 keeps all actions local and demo-only.</p>
      </article>
      <aside class="action-panel">
        <h3>${isAdmin ? 'Create Alert' : 'View-Only Access'} ${renderHelp('Users can inspect records. Admins can create and mutate local demo alerts.')}</h3>
        ${isAdmin ? renderWatchdogForm() : '<p>Your role can inspect alerts and details. Admin access is required to change status or create records.</p>'}
      </aside>
    </section>
    <section class="content-band">
      <div class="tab-row" role="tablist" aria-label="Watchdog views">
        ${watchdogTabs.map((tab) => `
          <button class="tab-button ${activeWatchdogTab === tab.id ? 'active' : ''}" data-watchdog-tab="${tab.id}" type="button">${escapeHtml(tab.label)}</button>
        `).join('')}
      </div>
      ${renderWatchdogTab(isAdmin)}
    </section>
    ${selectedAlertId ? renderAlertDrawer(selectedAlertId, isAdmin) : ''}
  `)
}

function renderWatchdogForm() {
  return `
    <form id="watchdog-form" class="stacked-form">
      <label>Title<input name="title" required placeholder="Short issue title" /></label>
      <label>Domain
        <select name="domain">
          <option>Platform</option>
          <option>LiveStack QA</option>
          <option>Platform And Content</option>
          <option>Usage Metrics</option>
          <option>Automation Runs</option>
          <option>Sprint Ops</option>
        </select>
      </label>
      <label>Severity
        <select name="severity">
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </label>
      <label>Owner<input name="owner" placeholder="Owner or team" /></label>
      <label>Source
        <select name="sourceId">
          ${state.sources.map((source) => `<option value="${source.id}">${escapeHtml(source.name)}</option>`).join('')}
        </select>
      </label>
      <label>Next action<textarea name="nextAction" rows="3" placeholder="Recommended investigation step"></textarea></label>
      <button class="primary-button" type="submit">Create alert</button>
    </form>
  `
}

function renderWatchdogTab(isAdmin) {
  if (activeWatchdogTab === 'logs') return renderWatchdogLogs()
  if (activeWatchdogTab === 'monitors') return renderMonitorDefinitions(isAdmin)
  if (activeWatchdogTab === 'incidents') return renderIncidentList(isAdmin)
  return renderAlertTable(isAdmin)
}

function renderAlertTable(isAdmin) {
  return `
    <div class="table-toolbar">
      <span>${state.watchEvents.length} demo alerts</span>
      <span>Filter model: domain, severity, status, owner, source</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Alert</th>
            <th>Domain</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Owner</th>
            <th>Source</th>
            <th>Updated</th>
            <th>Detail</th>
            ${isAdmin ? '<th>Action</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${state.watchEvents.map((event) => {
            const source = getSource(state, event.sourceId)
            return `
              <tr>
                <td><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(event.nextAction)}</small></td>
                <td>${escapeHtml(event.domain)}</td>
                <td><span class="severity ${statusClass(event.severity)}">${escapeHtml(event.severity)}</span></td>
                <td><span class="status-badge ${statusClass(event.status)}">${escapeHtml(event.status)}</span></td>
                <td>${escapeHtml(event.owner)}</td>
                <td>${renderSourceBadge(source)}</td>
                <td>${escapeHtml(event.updated)}</td>
                <td><button class="small-button" data-alert-open="${event.id}" type="button">Open</button></td>
                ${isAdmin ? `
                  <td>
                    <select class="status-select" data-event-id="${event.id}">
                      ${['New', 'Investigating', 'Mitigated', 'Resolved'].map((status) => `
                        <option ${event.status === status ? 'selected' : ''}>${status}</option>
                      `).join('')}
                    </select>
                  </td>
                ` : ''}
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
    </div>
  `
}

function renderWatchdogLogs() {
  const logs = state.watchEvents.flatMap((event) => (event.timeline || []).map((line) => ({
    event,
    line
  })))

  return `
    <div class="log-list">
      ${logs.map(({ event, line }) => `
        <article class="log-row">
          <span class="severity ${statusClass(event.severity)}">${escapeHtml(event.severity)}</span>
          <strong>${escapeHtml(event.title)}</strong>
          <p>${escapeHtml(line)}</p>
        </article>
      `).join('')}
    </div>
  `
}

function renderMonitorDefinitions(isAdmin) {
  return `
    <div class="split-layout inner">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Monitor</th><th>Domain</th><th>Status</th><th>Cadence</th><th>Owner</th><th>Threshold</th></tr>
          </thead>
          <tbody>
            ${state.monitors.map((monitor) => `
              <tr>
                <td><strong>${escapeHtml(monitor.name)}</strong><small>${escapeHtml(monitor.escalation)}</small></td>
                <td>${escapeHtml(monitor.domain)}</td>
                <td><span class="status-badge ${statusClass(monitor.status)}">${escapeHtml(monitor.status)}</span></td>
                <td>${escapeHtml(monitor.cadence)}</td>
                <td>${escapeHtml(monitor.owner)}</td>
                <td>${escapeHtml(monitor.threshold)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <aside class="action-panel">
        <h3>${isAdmin ? 'Add Monitor' : 'Monitor Settings'}</h3>
        ${isAdmin ? renderMonitorForm() : '<p>Admin access is required to configure monitor definitions.</p>'}
      </aside>
    </div>
  `
}

function renderMonitorForm() {
  return `
    <form id="monitor-form" class="stacked-form">
      <label>Name<input name="name" required placeholder="Monitor name" /></label>
      <label>Domain<input name="domain" value="Platform" required /></label>
      <label>Owner<input name="owner" value="LiveLabs QA" required /></label>
      <label>Cadence<input name="cadence" value="Hourly" required /></label>
      <label>Threshold<input name="threshold" value="Threshold pending definition" required /></label>
      <label>Source
        <select name="sourceId">
          ${state.sources.map((source) => `<option value="${source.id}">${escapeHtml(source.name)}</option>`).join('')}
        </select>
      </label>
      <button class="primary-button" type="submit">Add monitor</button>
    </form>
  `
}

function renderIncidentList(isAdmin) {
  const incidents = state.watchEvents.filter((event) => event.incident)
  return `
    <div class="card-grid">
      ${incidents.map((event) => `
        <article class="operation-card">
          <span class="severity ${statusClass(event.severity)}">${escapeHtml(event.severity)}</span>
          <h3>${escapeHtml(event.title)}</h3>
          <p>${escapeHtml(event.nextAction)}</p>
          <div class="run-footer">
            <span>${escapeHtml(event.status)}</span>
            <button class="small-button" data-alert-open="${event.id}" type="button">Open incident</button>
          </div>
        </article>
      `).join('')}
      ${incidents.length ? '' : '<p>No active incident records in demo data.</p>'}
    </div>
  `
}

function renderAlertDrawer(alertId, isAdmin) {
  const event = state.watchEvents.find((item) => item.id === alertId)
  if (!event) return ''
  const source = getSource(state, event.sourceId)
  const monitor = getMonitor(state, event.monitorId)

  return `
    <aside class="drawer" aria-label="Alert detail">
      <div class="drawer-head">
        <div>
          <p class="eyebrow">Alert Detail</p>
          <h3>${escapeHtml(event.title)}</h3>
        </div>
        <button class="small-button" id="close-drawer" type="button">Close</button>
      </div>
      <dl class="detail-list">
        <div><dt>Status</dt><dd>${escapeHtml(event.status)}</dd></div>
        <div><dt>Owner</dt><dd>${escapeHtml(event.owner)}</dd></div>
        <div><dt>Source</dt><dd>${renderSourceBadge(source)}</dd></div>
        <div><dt>Monitor</dt><dd>${escapeHtml(monitor?.name || 'Manual signal')}</dd></div>
        <div><dt>Next action</dt><dd>${escapeHtml(event.nextAction)}</dd></div>
      </dl>
      <h4>Evidence</h4>
      <div class="evidence-grid compact">
        ${(event.evidenceIds || []).map((id) => renderEvidenceCard(getEvidence(state, id))).join('') || '<p>No evidence attached yet.</p>'}
      </div>
      <h4>Linked TMS Objects</h4>
      ${renderTmsLinks(event.tmsLinks)}
      <h4>Timeline</h4>
      <ul class="timeline">
        ${(event.timeline || []).map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
      </ul>
      ${isAdmin ? '<p class="drawer-note">Use the alert table status control to update this local demo record.</p>' : '<p class="drawer-note">View-only role: mutation controls are hidden.</p>'}
    </aside>
  `
}

function renderHealthMonitor(user) {
  const isAdmin = can(user.role, 'configure_monitors')

  return withOperationsChrome('health-monitor', `
    <section class="page-intro">
      <p class="eyebrow">Health Monitor</p>
      <h3>Source-aware health checks.</h3>
      <p>Each row explains the status, owner, freshness, cadence, evidence, and why the check is healthy, watched, risky, or stale.</p>
    </section>
    <section class="content-band">
      <h3>Health Checks ${renderHelp('Stale means freshness exceeded 180 minutes, even if the previous check did not fail.')}</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Check</th><th>Status</th><th>Score</th><th>Freshness</th><th>Owner</th><th>Cadence</th><th>Evidence</th></tr>
          </thead>
          <tbody>
            ${state.healthChecks.map((check) => {
              const source = getSource(state, check.sourceId)
              const evidence = getEvidence(state, check.evidenceId)
              const status = deriveHealthStatus(check)
              return `
                <tr>
                  <td><strong>${escapeHtml(check.name)}</strong><small>${escapeHtml(check.reason)}</small></td>
                  <td><span class="status-badge ${statusClass(status)}">${escapeHtml(status)}</span></td>
                  <td>${escapeHtml(check.score)}</td>
                  <td>${renderFreshness(check.freshnessMinutes)}</td>
                  <td>${escapeHtml(check.owner)}</td>
                  <td>${escapeHtml(check.cadence)}</td>
                  <td>${renderSourceBadge(source)}<small>${escapeHtml(evidence?.title || 'No evidence')}</small></td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      </div>
    </section>
    <section class="content-band">
      <h3>Domain Drilldown</h3>
      <div class="monitor-grid">
        ${state.healthChecks.map((check) => renderSignalCard(check)).join('')}
      </div>
    </section>
    <section class="content-band">
      <h3>Configuration</h3>
      <p>${isAdmin ? 'Admin monitor configuration is available in QA Watchdog and Admin Console.' : 'Your role can inspect health checks. Admin access is required to configure them.'}</p>
    </section>
  `)
}

function renderSignalCard(check) {
  const status = deriveHealthStatus(check)
  return `
    <article class="signal-card ${statusClass(status)}">
      <div>
        <span>${escapeHtml(check.domain)}</span>
        <strong>${escapeHtml(status)}</strong>
      </div>
      <h3>${escapeHtml(check.name)}</h3>
      <p>${escapeHtml(check.owner)} - ${escapeHtml(check.reason)}</p>
      <div class="meter" aria-label="${escapeHtml(check.name)} score ${check.score}">
        <span style="width: ${check.score}%"></span>
      </div>
      <div class="meta-row">${renderFreshness(check.freshnessMinutes)}<span>${escapeHtml(check.cadence)}</span></div>
    </article>
  `
}

function renderAutomationRuns() {
  return withOperationsChrome('automation-runs', `
    <section class="page-intro">
      <p class="eyebrow">Automation Evidence</p>
      <h3>Regression and smoke runs with owners.</h3>
      <p>Runs show artifact, owner, source confidence, and whether they should create a watchdog alert or remain as evidence.</p>
    </section>
    <section class="run-grid">
      ${state.automationRuns.map((run) => {
        const source = getSource(state, run.sourceId)
        return `
          <article class="run-card">
            <span>${escapeHtml(run.id)}</span>
            <h3>${escapeHtml(run.name)}</h3>
            <p>${escapeHtml(run.scope)} - ${escapeHtml(run.updated)} - owner: ${escapeHtml(run.owner)}</p>
            <div class="run-footer">
              <strong class="status-badge ${statusClass(run.status)}">${escapeHtml(run.status)}</strong>
              <code>${escapeHtml(run.artifact)}</code>
            </div>
            ${renderSourceBadge(source)}
          </article>
        `
      }).join('')}
    </section>
  `)
}

function renderReports() {
  return `
    <section class="split-layout">
      <article class="page-intro">
        <p class="eyebrow">Reports</p>
        <h3>Review-ready demo exports.</h3>
        <p>Reports combine source freshness, watchdog findings, health checks, and next actions. Exports are local and clearly marked as demo-only.</p>
      </article>
      <aside class="action-panel">
        <h3>Generate Report ${renderHelp('Creates a local preview and stores the export in demo state. It does not write to a file or send anywhere.')}</h3>
        <form id="report-form" class="stacked-form">
          <label>Template
            <select name="reportId">
              ${state.reports.map((report) => `<option value="${report.id}" ${selectedReportId === report.id ? 'selected' : ''}>${escapeHtml(report.title)}</option>`).join('')}
            </select>
          </label>
          <label>Format
            <select name="format">
              <option>Markdown</option>
              <option>JSON</option>
            </select>
          </label>
          <button class="primary-button" type="submit">Generate preview</button>
        </form>
      </aside>
    </section>
    <section class="card-grid">
      ${state.reports.map((report) => `
        <article class="operation-card">
          <p class="eyebrow">${escapeHtml(report.format)}</p>
          <h3>${escapeHtml(report.title)}</h3>
          <p>${escapeHtml(report.audience)}</p>
          <small>${escapeHtml(report.domains.join(', '))}</small>
        </article>
      `).join('')}
    </section>
    <section class="content-band">
      <h3>Report Preview</h3>
      <textarea class="report-preview" readonly>${escapeHtml(reportPreview || 'Generate a report to preview local demo output.')}</textarea>
    </section>
  `
}

function renderAdminConsole(user) {
  const isAdmin = can(user.role, 'view_admin_console')
  if (!isAdmin) {
    return `
      <section class="page-intro">
        <p class="eyebrow">Your Profile</p>
        <h3>${escapeHtml(user.name)}</h3>
        <p>You have view and export access. Admin Console controls are hidden for this role.</p>
      </section>
      <section class="content-band">
        <h3>Permission Summary</h3>
        ${renderPermissionList(user.role)}
      </section>
    `
  }

  return `
    <section class="page-intro">
      <p class="eyebrow">Admin Console</p>
      <h3>Users, roles, sources, monitors, demo data, and audit.</h3>
      <p>All configuration-like controls are grouped here. This is still local demo state, not production security or source-system configuration.</p>
    </section>
    <section class="dual-grid">
      <article class="content-band">
        <h3>Create Account</h3>
        ${renderUserForm()}
      </article>
      <article class="content-band">
        <h3>Demo Data Controls</h3>
        <p>Reset seeded demo data when review changes need a clean baseline. Sign out only clears the session.</p>
        <button class="danger-button" id="reset-demo" type="button">Reset demo data</button>
      </article>
    </section>
    <section class="content-band">
      <h3>Accounts</h3>
      <div class="account-grid">
        ${state.users.map((account) => renderUserCard(account, user, true)).join('')}
      </div>
    </section>
    <section class="dual-grid">
      <article class="content-band">
        <h3>Future Role Model</h3>
        <div class="focus-list">
          ${futureRoles.map((role) => `<div class="focus-item"><strong>${escapeHtml(role.label)}</strong><br /><span>${escapeHtml(role.purpose)}</span></div>`).join('')}
        </div>
      </article>
      <article class="content-band">
        <h3>Data Sources</h3>
        <div class="source-list">
          ${state.sources.map((source) => `
            <div class="source-row">
              <strong>${escapeHtml(source.name)}</strong>
              <span>${escapeHtml(source.type)} - ${escapeHtml(source.owner)}</span>
              ${renderFreshness(source.freshnessMinutes)}
            </div>
          `).join('')}
        </div>
      </article>
    </section>
    <section class="content-band">
      <h3>Audit Events</h3>
      ${renderAuditTable()}
    </section>
  `
}

function renderDomainPage(viewId) {
  const section = sectionSummaries[viewId]
  const title = section?.title || navigation.find((item) => item.id === viewId)?.label || 'QA Domain'
  const description = section?.description || 'Operational domain view for LiveLabs QA signals.'
  const points = section?.points || ['Connect source evidence', 'Track owner and freshness', 'Promote repeated risk into Watchdog']
  const checks = state.healthChecks.filter((check) => title.includes(check.domain) || check.domain.includes(title.split(' ')[0]))

  return withOperationsChrome(viewId, `
    <section class="page-intro">
      <p class="eyebrow">Domain View</p>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
    </section>
    <section class="content-band">
      <h3>Current Focus</h3>
      <div class="focus-list">
        ${points.map((point) => `<div class="focus-item">${escapeHtml(point)}</div>`).join('')}
      </div>
    </section>
    <section class="content-band">
      <h3>Related Signals</h3>
      <div class="monitor-grid">
        ${(checks.length ? checks : state.healthChecks.slice(0, 3)).map((check) => renderSignalCard(check)).join('')}
      </div>
    </section>
  `)
}

function renderEvidenceCard(item) {
  if (!item) return ''
  const source = getSource(state, item.sourceId)
  return `
    <article class="evidence-card">
      <p class="eyebrow">${escapeHtml(item.type)}</p>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
      <div class="meta-row">
        ${renderSourceBadge(source)}
        ${renderFreshness(item.freshnessMinutes)}
      </div>
    </article>
  `
}

function renderPermissionList(role) {
  return `
    <ul class="permission-list">
      ${(roles[role]?.permissions || []).map((permission) => `<li>${escapeHtml(permission.replaceAll('_', ' '))}</li>`).join('')}
    </ul>
  `
}

function renderUserForm() {
  return `
    <form id="user-form" class="stacked-form">
      <label>Name<input name="name" required placeholder="Full name" /></label>
      <label>Email<input name="email" type="email" required placeholder="person@example.com" /></label>
      <label>Temporary password<input name="password" type="text" value="ChangeMe123" required /></label>
      <label>Team<input name="team" value="LiveLabs QA" required /></label>
      <label>Role
        <select name="role">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <button class="primary-button" type="submit">Create user</button>
    </form>
  `
}

function renderUserCard(account, user, isAdmin) {
  return `
    <article class="account-card">
      <div>
        <h3>${escapeHtml(account.name)}</h3>
        <p>${escapeHtml(account.email)}</p>
      </div>
      <dl>
        <div><dt>Role</dt><dd>${escapeHtml(roles[account.role]?.label || account.role)}</dd></div>
        <div><dt>Status</dt><dd>${escapeHtml(account.status)}</dd></div>
        <div><dt>Team</dt><dd>${escapeHtml(account.team)}</dd></div>
      </dl>
      ${isAdmin ? `
        <div class="card-actions">
          <button class="small-button" data-user-action="toggle-role" data-user-id="${account.id}" type="button">${account.role === 'admin' ? 'Make user' : 'Make admin'}</button>
          <button class="small-button" data-user-action="toggle-status" data-user-id="${account.id}" type="button">${account.status === 'active' ? 'Disable' : 'Enable'}</button>
          <button class="small-button danger" data-user-action="delete" data-user-id="${account.id}" ${account.id === user.id ? 'disabled' : ''} type="button">Remove</button>
        </div>
      ` : ''}
    </article>
  `
}

function renderAuditTable() {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead>
        <tbody>
          ${state.auditEvents.map((event) => `
            <tr>
              <td>${escapeHtml(event.timestamp)}</td>
              <td>${escapeHtml(event.actor)}</td>
              <td>${escapeHtml(event.action)}</td>
              <td>${escapeHtml(event.target)}</td>
              <td>${escapeHtml(event.detail)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

function syncBackToTop() {
  const button = document.querySelector('#back-to-top')
  if (!button) return
  const visible = window.pageYOffset > 320
  button.classList.toggle('is-visible', visible)
  button.setAttribute('aria-hidden', visible ? 'false' : 'true')
  button.tabIndex = visible ? 0 : -1
}

function bindEvents() {
  document.querySelector('#back-to-top')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })
  syncBackToTop()

  const loginForm = document.querySelector('#login-form')
  loginForm?.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(loginForm)
    const result = authenticate(state.users, data.get('email'), data.get('password'))
    if (!result.ok) {
      message = result.reason
      render()
      return
    }

    session = result.user
    message = 'Session restored locally until Sign out.'
    persist()
    render()
  })

  document.querySelector('#logout-button')?.addEventListener('click', () => {
    session = null
    activeView = 'command-center'
    selectedAlertId = null
    message = ''
    persist()
    render()
  })

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      activeView = button.dataset.view
      selectedAlertId = null
      message = ''
      persist()
      render()
    })
  })

  document.querySelectorAll('[data-watchdog-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      activeWatchdogTab = button.dataset.watchdogTab
      selectedAlertId = null
      persist()
      render()
    })
  })

  document.querySelectorAll('[data-alert-open]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedAlertId = button.dataset.alertOpen
      render()
    })
  })

  document.querySelector('#close-drawer')?.addEventListener('click', () => {
    selectedAlertId = null
    render()
  })

  const watchdogForm = document.querySelector('#watchdog-form')
  watchdogForm?.addEventListener('submit', (event) => {
    event.preventDefault()
    try {
      const before = state.watchEvents.length
      state.watchEvents = createWatchEvent(state.watchEvents, Object.fromEntries(new FormData(watchdogForm)), session.role)
      audit('Created watchdog alert', state.watchEvents[0].title, `${state.watchEvents.length - before} local demo alert added.`)
      message = 'Watchdog alert created.'
      persist()
      render()
    } catch (error) {
      message = error.message
      render()
    }
  })

  document.querySelectorAll('.status-select').forEach((select) => {
    select.addEventListener('change', () => {
      try {
        state.watchEvents = updateWatchEventStatus(state.watchEvents, select.dataset.eventId, select.value, session.role)
        audit('Updated watchdog status', select.dataset.eventId, `Status changed to ${select.value}.`)
        message = 'Watchdog status updated.'
        persist()
        render()
      } catch (error) {
        message = error.message
        render()
      }
    })
  })

  const monitorForm = document.querySelector('#monitor-form')
  monitorForm?.addEventListener('submit', (event) => {
    event.preventDefault()
    try {
      state.monitors = createMonitor(state.monitors, Object.fromEntries(new FormData(monitorForm)), session.role)
      audit('Created monitor', state.monitors[0].name, 'Local demo monitor definition added.')
      message = 'Monitor created.'
      persist()
      render()
    } catch (error) {
      message = error.message
      render()
    }
  })

  const userForm = document.querySelector('#user-form')
  userForm?.addEventListener('submit', (event) => {
    event.preventDefault()
    try {
      const before = state.users.length
      state.users = createUser(state.users, Object.fromEntries(new FormData(userForm)), session.role)
      audit('Created user', state.users[state.users.length - 1].email, `${state.users.length - before} local demo user added.`)
      message = 'User created.'
      persist()
      render()
    } catch (error) {
      message = error.message
      render()
    }
  })

  document.querySelectorAll('[data-user-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = state.users.find((account) => account.id === button.dataset.userId)
      if (!target) return

      try {
        if (button.dataset.userAction === 'toggle-role') {
          state.users = updateUser(state.users, target.id, { role: target.role === 'admin' ? 'user' : 'admin' }, session.role)
          audit('Updated user role', target.email, `Role toggled from ${target.role}.`)
        }

        if (button.dataset.userAction === 'toggle-status') {
          state.users = updateUser(state.users, target.id, { status: target.status === 'active' ? 'disabled' : 'active' }, session.role)
          audit('Updated user status', target.email, `Status toggled from ${target.status}.`)
        }

        if (button.dataset.userAction === 'delete') {
          state.users = deleteUser(state.users, target.id, session.role, session.id)
          audit('Removed user', target.email, 'Local demo account removed.')
        }

        message = 'Account updated.'
        persist()
        render()
      } catch (error) {
        message = error.message
        render()
      }
    })
  })

  document.querySelector('#reset-demo')?.addEventListener('click', () => {
    if (!can(session.role, 'manage_demo_data')) {
      message = 'Admin role required to reset demo data.'
      render()
      return
    }
    state = resetDemoState(currentUser())
    session = authenticate(state.users, 'admin@livelabs.qa', 'admin123').user
    activeView = 'command-center'
    activeWatchdogTab = 'alerts'
    selectedAlertId = null
    message = 'Demo data reset to V3 seed state.'
    persist()
    render()
  })

  const reportForm = document.querySelector('#report-form')
  reportForm?.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(reportForm))
    selectedReportId = data.reportId
    reportPreview = generateReport(state, data.reportId, data.format)
    state.reportExports = [
      {
        id: `export-${Date.now()}`,
        reportId: data.reportId,
        format: data.format,
        created: new Date().toISOString()
      },
      ...(state.reportExports || [])
    ]
    audit('Generated report preview', data.reportId, `${data.format} local demo export created.`)
    message = 'Report preview generated locally.'
    persist()
    render()
  })

  const knowledgeForm = document.querySelector('#knowledge-form')
  knowledgeForm?.addEventListener('submit', (event) => {
    event.preventDefault()
    try {
      const data = Object.fromEntries(new FormData(knowledgeForm))
      state.knowledgeItems = createKnowledgeItem(state.knowledgeItems, data, session.role)
      audit('Extracted knowledge source', data.title || data.link || data.source, 'Local demo QA knowledge source added.')
      message = 'Knowledge source extracted into the local library.'
      persist()
      render()
    } catch (error) {
      message = error.message
      render()
    }
  })

  document.querySelectorAll('[data-knowledge-status]').forEach((button) => {
    button.addEventListener('click', () => {
      try {
        state.knowledgeItems = updateKnowledgeItemStatus(state.knowledgeItems, button.dataset.knowledgeStatus, button.dataset.status, session.role)
        audit('Updated knowledge status', button.dataset.knowledgeStatus, button.dataset.status)
        message = 'Knowledge item updated.'
        persist()
        render()
      } catch (error) {
        message = error.message
        render()
      }
    })
  })

  document.querySelectorAll('[data-delete-knowledge]').forEach((button) => {
    button.addEventListener('click', () => {
      try {
        state.knowledgeItems = deleteKnowledgeItem(state.knowledgeItems, button.dataset.deleteKnowledge, session.role)
        audit('Deleted knowledge item', button.dataset.deleteKnowledge, 'Removed from local demo library.')
        message = 'Knowledge item deleted.'
        persist()
        render()
      } catch (error) {
        message = error.message
        render()
      }
    })
  })

  const githubForm = document.querySelector('#github-form')
  githubForm?.addEventListener('submit', (event) => {
    event.preventDefault()
    try {
      const data = Object.fromEntries(new FormData(githubForm))
      state.githubItems = createGithubItem(state.githubItems, data, session.role)
      audit('Added GitHub intake record', data.title, 'Local demo repository QA item added.')
      message = 'GitHub intake record added.'
      persist()
      render()
    } catch (error) {
      message = error.message
      render()
    }
  })
}

window.addEventListener('scroll', syncBackToTop, { passive: true })
window.addEventListener('resize', syncBackToTop)

render()
