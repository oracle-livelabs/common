import {
  addTestCaseToPlan,
  coverageRows,
  createExecution,
  createDefectLink,
  createProject,
  createRequirement,
  createRequirementDocument,
  createTestCase,
  createTestPlan,
  createTestSuite,
  deleteExecution,
  deleteProject,
  deleteRequirement,
  deleteRequirementDocument,
  deleteTestCase,
  deleteTestPlan,
  deleteTestSuite,
  deriveProjectStats,
  deriveStats,
  documentTraceabilityRows,
  generateReport,
  getExecutionLinks,
  getPlanCases,
  getPlanLinks,
  getRequirementLinks,
  getSeedState,
  getTestCaseLinks,
  linkSuiteToPlan,
  linkTestCaseToRequirement,
  navItems,
  removeTestCaseFromPlan,
  unlinkSuiteFromPlan,
  updateExecution,
  updateExecutionStatus,
  updateProject,
  updateRequirement,
  updateRequirementDocument,
  updateTestCase,
  updateTestPlan,
  updateTestSuite
} from './state.mjs'

const app = document.querySelector('#app')
const storageKey = 'livelabs-tms-state-v2'
const routeKey = 'livelabs-tms-route-v2'

const objectTypes = new Set(['project', 'document', 'requirement', 'suite', 'test-case', 'plan', 'execution', 'defect'])
const objectNavMap = {
  project: 'projects',
  document: 'requirements',
  requirement: 'requirements',
  suite: 'repository',
  'test-case': 'repository',
  plan: 'plans',
  execution: 'execution',
  defect: 'defects'
}
const navGlyphs = {
  overview: 'OV',
  projects: 'PR',
  requirements: 'RQ',
  repository: 'TC',
  plans: 'TP',
  execution: 'EX',
  traceability: 'TR',
  defects: 'DF',
  reports: 'RP'
}
let activeView = loadRoute()
let state = loadState()
let reportPreview = ''
let message = ''

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || 'null')
    if (stored?.version === 2 && stored?.featureProjects?.length && stored?.testCases?.length) {
      return {
        ...getSeedState(),
        ...stored
      }
    }
  } catch {
    localStorage.removeItem(storageKey)
  }

  const seeded = getSeedState()
  localStorage.setItem(storageKey, JSON.stringify(seeded))
  return seeded
}

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(state))
  localStorage.setItem(routeKey, activeView)
}

function loadRoute() {
  const hashRoute = decodeURIComponent(window.location.hash.slice(1))
  if (hashRoute && parseRoute(hashRoute).mode === 'object') {
    return hashRoute
  }
  const saved = localStorage.getItem(routeKey)
  return parseRoute(saved).mode === 'object' || navItems.some((item) => item.id === saved) ? saved : 'overview'
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
  return navGlyphs[id] || String(id || 'TM').slice(0, 2).toUpperCase()
}

function statusClass(value) {
  return String(value || '').toLowerCase().replaceAll(' ', '-')
}

function byId(records, id) {
  return records.find((record) => record.id === id)
}

function parseRoute(route = activeView) {
  const parts = String(route || '').split(':')
  if (parts[0] === 'object' && objectTypes.has(parts[1]) && parts[2]) {
    return {
      mode: 'object',
      type: parts[1],
      id: decodeURIComponent(parts[2]),
      returnTo: parts[3] || objectNavMap[parts[1]] || 'overview'
    }
  }

  return {
    mode: 'view',
    view: navItems.some((item) => item.id === route) ? route : 'overview'
  }
}

function routeView(route = activeView) {
  const parsed = parseRoute(route)
  return parsed.mode === 'object' ? parsed.returnTo : parsed.view
}

function objectRoute(type, id, returnTo = routeView()) {
  return `object:${type}:${encodeURIComponent(id)}:${returnTo}`
}

function renderObjectLink(type, id, label = id) {
  if (!id) return ''
  return `<button class="object-link" data-object-type="${escapeHtml(type)}" data-object-id="${escapeHtml(id)}" type="button">${escapeHtml(label)}</button>`
}

function qaHubUrl() {
  const { origin, pathname } = window.location
  if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin) && !pathname.includes('/livelabs-qa-tms/')) {
    return 'http://127.0.0.1:4192/'
  }
  const marker = '/livelabs-qa-tms/'
  if (pathname.includes(marker)) {
    return `${origin}${pathname.slice(0, pathname.indexOf(marker))}/livelabs-qa-hub/`
  }
  return new URL('../livelabs-qa-hub/', window.location.href).toString()
}

function render() {
  persist()
  document.body.classList.remove('nav-collapsed')
  if (parseRoute(activeView).mode === 'object') {
    window.history.replaceState(null, '', `#${encodeURIComponent(activeView)}`)
  } else if (window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname)
  }
  const navView = routeView()
  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar" id="qa-tms-sidebar">
        <div class="brand"><span>TMS</span><div><p>LiveLabs QA</p><h1>Test Management</h1></div></div>
        <nav>
          ${navItems.map((item) => `<button class="${navView === item.id ? 'active' : ''}" data-view="${item.id}" type="button"><span class="nav-icon" aria-hidden="true">${escapeHtml(navGlyph(item.id))}</span><span>${escapeHtml(item.label)}</span></button>`).join('')}
        </nav>
        <a class="hub-link" href="${escapeHtml(qaHubUrl())}">Back to QA Hub</a>
      </aside>
      <main>
        ${message ? `<p class="message" role="status">${escapeHtml(message)}</p>` : ''}
        ${renderView()}
      </main>
      <button class="back-to-top" id="back-to-top" type="button" aria-label="Back to top" aria-hidden="true" tabindex="-1"><span aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><path d="M8 3.25 3.75 7.5l.9.9L7.5 5.56V13h1V5.56l2.85 2.84.9-.9L8 3.25Z" fill="currentColor"></path></svg></span><span>Back to top</span></button>
    </div>
  `
  bindEvents()
}

function renderView() {
  const route = parseRoute()
  if (route.mode === 'object') return renderObjectDetail(route)
  if (route.view === 'projects') return renderProjects()
  if (route.view === 'requirements') return renderRequirements()
  if (route.view === 'repository') return renderRepository()
  if (route.view === 'plans') return renderPlans()
  if (route.view === 'execution') return renderExecution()
  if (route.view === 'traceability') return renderTraceability()
  if (route.view === 'reports') return renderReports()
  if (route.view === 'defects') return renderDefects()
  return renderOverview()
}

function renderOverview() {
  const stats = deriveStats(state)
  const projectStats = deriveProjectStats(state)
  const traceabilityRows = documentTraceabilityRows(state)

  return `
    <section class="hero compact-hero">
      <p class="eyebrow">LiveLabs QA TMS</p>
      <h2>Release test control board</h2>
      <p>Track requirements, tests, plans, executions, evidence, and defects from one review surface.</p>
    </section>
    <section class="kpis">
      ${renderKpi('Projects', state.featureProjects.length, 'Feature/project scopes')}
      ${renderKpi('Requirement Docs', state.requirementDocuments.length, 'Reviewable source documents')}
      ${renderKpi('Tests In Plans', state.testPlans.reduce((sum, plan) => sum + plan.scope.length, 0), 'Plan membership records')}
      ${renderKpi('Executions', stats.total, `${stats.failed} failed, ${stats.blocked} blocked`)}
    </section>
    <section class="scenario-board">
      <article>
        <p class="eyebrow">Current Release Focus</p>
        <h3>Author Guide and Analytics readiness</h3>
        <p>Dummy data shows how QA work moves from source feedback into requirements, test cases, execution evidence, and release reports.</p>
      </article>
      <article>
        <p class="eyebrow">Open Risk</p>
        <h3>${stats.failed + stats.blocked} blocked or failed executions</h3>
        <p>Review failed smoke tests, missing evidence, and unresolved defect links before sign-off.</p>
      </article>
      <article>
        <p class="eyebrow">Traceability</p>
        <h3>${traceabilityRows.length} traceability rows</h3>
        <p>Every requirement can link to tests, plans, execution runs, and defects.</p>
      </article>
    </section>
    <section class="workflow-board">
      ${projectStats.map((row) => `
        <article class="summary-card compact-summary">
          <p class="eyebrow">${escapeHtml(row.project.status)}</p>
          <h3>${renderObjectLink('project', row.project.id, row.project.name)}</h3>
          <div class="metric-row">
            <span>${row.requirements} reqs</span>
            <span>${row.tests} tests</span>
            <span>${row.plans} plans</span>
            <span>${row.failed + row.blocked} blockers</span>
          </div>
        </article>
      `).join('')}
    </section>
  `
}

function renderKpi(label, value, note) {
  return `<article class="kpi"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(note)}</p></article>`
}

function renderProjects() {
  return `
    <section class="hero"><p class="eyebrow">Projects And Features</p><h2>Create and manage QA scopes.</h2><p>Use projects/features as the parent for requirement documents, suites, plans, tests, and executions.</p></section>
    <section class="two-col">
      <article><h3>Create Project Or Feature</h3>${renderProjectForm()}</article>
      <article><h3>Project Health</h3>${renderProjectStats()}</article>
    </section>
    <section><h3>Projects</h3>${renderProjectTable()}</section>
  `
}

function renderProjectForm() {
  return `
    <form id="project-form" class="stacked-form">
      <label>Name<input name="name" required placeholder="Feature or project name" /></label>
      <label>Owner<input name="owner" value="LiveLabs QA" required /></label>
      <label>Release<input name="release" value="Draft" /></label>
      <label>Status${renderStatusSelect('status', ['Planning', 'Active', 'On Hold', 'Done'], 'Planning')}</label>
      <label>Description<textarea name="description" rows="3" placeholder="Scope and purpose"></textarea></label>
      <button class="primary" type="submit">Create project</button>
    </form>
  `
}

function renderProjectStats() {
  return `
    <div class="mini-stack">
      ${deriveProjectStats(state).map((row) => `
        <div class="mini-row">
          <strong>${escapeHtml(row.project.name)}</strong>
          <span>${row.requirements} requirements, ${row.tests} tests, ${row.executions} executions</span>
        </div>
      `).join('')}
    </div>
  `
}

function renderProjectTable() {
  return renderTable(
    ['Project', 'Owner', 'Release', 'Status', 'Actions'],
    state.featureProjects.map((project) => [
      `<strong>${renderObjectLink('project', project.id, project.name)}</strong><small>${escapeHtml(project.id)} - ${escapeHtml(project.description)}</small>`,
      project.owner,
      project.release,
      renderStatusSelect('project-status', ['Planning', 'Active', 'On Hold', 'Done'], project.status, { 'data-project-id': project.id }),
      `<button class="tiny danger" data-delete-project="${escapeHtml(project.id)}" type="button">Remove</button>`
    ]),
    true
  )
}

function renderRequirements() {
  return `
    <section class="hero"><p class="eyebrow">Requirements</p><h2>Requirement documents and traceability matrix.</h2><p>Create project-level requirement documents, add requirements, review status, and inspect coverage before planning execution.</p></section>
    <section class="two-col">
      <article><h3>Create Requirement Document</h3>${renderDocumentForm()}</article>
      <article><h3>Create Requirement</h3>${renderRequirementForm()}</article>
    </section>
    <section><h3>Requirement Documents</h3>${renderDocumentTable()}</section>
    <section><h3>Requirement Traceability Matrix</h3>${renderRequirementMatrix()}</section>
  `
}

function renderDocumentForm() {
  return `
    <form id="document-form" class="stacked-form">
      <label>Project${renderProjectSelect('projectId')}</label>
      <label>Title<input name="title" required placeholder="Requirement document title" /></label>
      <label>Owner<input name="owner" value="LiveLabs QA" required /></label>
      <label>Version<input name="version" value="0.1" /></label>
      <label>Status${renderStatusSelect('status', ['Draft', 'Needs Review', 'Approved', 'Retired'], 'Draft')}</label>
      <label>Summary<textarea name="summary" rows="3" placeholder="Document scope and review notes"></textarea></label>
      <button class="primary" type="submit">Create document</button>
    </form>
  `
}

function renderRequirementForm() {
  return `
    <form id="requirement-form" class="stacked-form">
      <label>Document${renderDocumentSelect('documentId')}</label>
      <label>Title<input name="title" required placeholder="Requirement or QA objective" /></label>
      <label>Priority${renderStatusSelect('priority', ['High', 'Medium', 'Low'], 'Medium')}</label>
      <label>Source<input name="source" value="QA Hub Knowledge Base" required /></label>
      <label>Status${renderStatusSelect('status', ['Draft', 'Needs Review', 'Approved', 'Retired'], 'Draft')}</label>
      <button class="primary" type="submit">Create requirement</button>
    </form>
  `
}

function renderDocumentTable() {
  return renderTable(
    ['Document', 'Project', 'Version', 'Owner', 'Status', 'Actions'],
    state.requirementDocuments.map((document) => [
      `<strong>${renderObjectLink('document', document.id, document.title)}</strong><small>${escapeHtml(document.id)} - ${escapeHtml(document.summary)}</small>`,
      renderObjectLink('project', document.projectId, byId(state.featureProjects, document.projectId)?.name || document.projectId),
      document.version,
      document.owner,
      renderStatusSelect('document-status', ['Draft', 'Needs Review', 'Approved', 'Retired'], document.status, { 'data-document-id': document.id }),
      `<button class="tiny danger" data-delete-document="${escapeHtml(document.id)}" type="button">Remove</button>`
    ]),
    true
  )
}

function renderRequirementMatrix() {
  return renderTable(
    ['Requirement', 'Document', 'Project', 'Coverage', 'Tests', 'Plans', 'Executions', 'Defects', 'Status', 'Actions'],
    coverageRows(state).map((row) => [
      `<strong>${renderObjectLink('requirement', row.requirement.id)}</strong><small>${escapeHtml(row.requirement.title)}</small>`,
      renderObjectLink('document', row.document?.id || row.requirement.documentId, row.document?.title || row.requirement.documentId),
      renderObjectLink('project', row.project?.id || row.requirement.projectId, row.project?.name || row.requirement.projectId),
      tag(row.coverage),
      row.tests,
      row.plans,
      row.executions,
      row.defects,
      renderStatusSelect('requirement-status', ['Draft', 'Needs Review', 'Approved', 'Retired'], row.requirement.status, { 'data-requirement-id': row.requirement.id }),
      `<button class="tiny danger" data-delete-requirement="${escapeHtml(row.requirement.id)}" type="button">Remove</button>`
    ]),
    true
  )
}

function renderRepository() {
  return `
    <section class="hero compact-hero"><p class="eyebrow">Test Repository</p><h2>Suites and tests</h2><p>Author reusable test cases and keep each one linked to a requirement.</p></section>
    <section class="two-col compact-actions">
      <details><summary>Create Test Suite</summary>${renderSuiteForm()}</details>
      <details><summary>Create Test Case</summary>${renderTestCaseForm()}</details>
    </section>
    <section><h3>Test Suites</h3>${renderSuiteTable()}</section>
    <section><h3>Test Cases</h3>${renderTestCaseTable()}</section>
  `
}

function renderSuiteForm() {
  return `
    <form id="suite-form" class="stacked-form">
      <label>Project${renderProjectSelect('projectId')}</label>
      <label>Name<input name="name" required placeholder="Suite name" /></label>
      <label>Owner<input name="owner" value="LiveLabs QA" required /></label>
      <label>Status${renderStatusSelect('status', ['Draft', 'Needs Review', 'Ready', 'Retired'], 'Draft')}</label>
      <button class="primary" type="submit">Create suite</button>
    </form>
  `
}

function renderTestCaseForm() {
  return `
    <form id="testcase-form" class="stacked-form">
      <label>Suite${renderSuiteSelect('suiteId')}</label>
      <label>Requirement${renderRequirementSelect('requirementId')}</label>
      <label>Title<input name="title" required placeholder="Test case title" /></label>
      <label>Type${renderStatusSelect('type', ['Manual', 'Automated', 'BDD', 'Generic'], 'Manual')}</label>
      <label>Priority${renderStatusSelect('priority', ['High', 'Medium', 'Low'], 'Medium')}</label>
      <label>Automation<input name="automation" value="Candidate" /></label>
      <label>Steps<textarea name="steps" rows="3" placeholder="Execution steps"></textarea></label>
      <label>Expected<textarea name="expected" rows="3" placeholder="Expected result"></textarea></label>
      <button class="primary" type="submit">Create test case</button>
    </form>
  `
}

function renderSuiteTable() {
  return renderTable(
    ['Suite', 'Project', 'Owner', 'Plans', 'Status', 'Actions'],
    state.testSuites.map((suite) => [
      `<strong>${renderObjectLink('suite', suite.id)}</strong><small>${escapeHtml(suite.name)}</small>`,
      renderObjectLink('project', suite.projectId, byId(state.featureProjects, suite.projectId)?.name || suite.projectId),
      suite.owner,
      state.testPlans.filter((plan) => (plan.suiteIds || []).includes(suite.id)).length,
      renderStatusSelect('suite-status', ['Draft', 'Needs Review', 'Ready', 'Retired'], suite.status, { 'data-suite-id': suite.id }),
      `<button class="tiny danger" data-delete-suite="${escapeHtml(suite.id)}" type="button">Remove</button>`
    ]),
    true
  )
}

function renderTestCaseTable() {
  return renderTable(
    ['Test', 'Suite', 'Requirement', 'Type', 'Priority', 'Status', 'Actions'],
    state.testCases.map((testCase) => [
      `<strong>${renderObjectLink('test-case', testCase.id)}</strong><small>${escapeHtml(testCase.title)}</small><small>${escapeHtml(testCase.steps)}</small>`,
      renderObjectLink('suite', testCase.suiteId, byId(state.testSuites, testCase.suiteId)?.name || testCase.suiteId),
      renderObjectLink('requirement', testCase.requirementId),
      testCase.type,
      tag(testCase.priority),
      renderStatusSelect('testcase-status', ['Draft', 'Needs Review', 'Ready', 'Retired'], testCase.status, { 'data-testcase-id': testCase.id }),
      `<button class="tiny danger" data-delete-testcase="${escapeHtml(testCase.id)}" type="button">Remove</button>`
    ]),
    true
  )
}

function renderPlans() {
  return `
    <section class="hero compact-hero"><p class="eyebrow">Test Plans</p><h2>Plan scope and execution coverage</h2><p>Build release plans from suites and tests, then preserve membership for traceability.</p></section>
    <section class="three-col compact-actions">
      <details><summary>Create Test Plan</summary>${renderPlanForm()}</details>
      <details><summary>Link Suite To Plan</summary>${renderPlanSuiteForm()}</details>
      <details><summary>Add Test To Plan</summary>${renderPlanTestForm()}</details>
    </section>
    <section><h3>Plans</h3>${renderPlanCards()}</section>
  `
}

function renderPlanForm() {
  return `
    <form id="plan-form" class="stacked-form">
      <label>Project${renderProjectSelect('projectId')}</label>
      <label>Requirement Document${renderDocumentSelect('requirementDocumentId')}</label>
      <label>Name<input name="name" required placeholder="Plan name" /></label>
      <label>Build${renderBuildSelect('buildId')}</label>
      <label>Owner<input name="owner" value="LiveLabs QA" required /></label>
      <label>Status${renderStatusSelect('status', ['Planning', 'Needs Review', 'Ready', 'In Progress', 'Done', 'Archived'], 'Planning')}</label>
      <button class="primary" type="submit">Create plan</button>
    </form>
  `
}

function renderPlanSuiteForm() {
  return `
    <form id="plan-suite-form" class="stacked-form">
      <label>Plan${renderPlanSelect('planId')}</label>
      <label>Suite${renderSuiteSelect('suiteId')}</label>
      <button class="primary" type="submit">Link suite</button>
    </form>
  `
}

function renderPlanTestForm() {
  return `
    <form id="plan-test-form" class="stacked-form">
      <label>Plan${renderPlanSelect('planId')}</label>
      <label>Test Case${renderTestCaseSelect('testCaseId')}</label>
      <button class="primary" type="submit">Add test</button>
    </form>
  `
}

function renderPlanCards() {
  return `
    <div class="plan-grid">
      ${state.testPlans.map((plan) => {
        const suites = state.testSuites.filter((suite) => (plan.suiteIds || []).includes(suite.id))
        const cases = getPlanCases(state, plan.id)
        return `
          <article class="plan-card">
            <div class="card-head">
              <div>
                <p class="eyebrow">${renderObjectLink('plan', plan.id)}</p>
                <h3>${escapeHtml(plan.name)}</h3>
              </div>
              ${renderStatusSelect('plan-status', ['Planning', 'Needs Review', 'Ready', 'In Progress', 'Done', 'Archived'], plan.status, { 'data-plan-id': plan.id })}
            </div>
            <p>${renderObjectLink('project', plan.projectId, byId(state.featureProjects, plan.projectId)?.name || plan.projectId)} - ${escapeHtml(plan.owner)} - build ${escapeHtml(plan.buildId)}</p>
            <h4>Suites</h4>
            <div class="chip-row">
              ${suites.map((suite) => `<button class="chip" data-unlink-suite="${escapeHtml(suite.id)}" data-plan-id="${escapeHtml(plan.id)}" type="button">${escapeHtml(suite.name)} x</button>`).join('') || '<span class="muted">No suites linked.</span>'}
            </div>
            <h4>Tests In Plan</h4>
            <div class="mini-stack">
              ${cases.map((testCase) => `
                <div class="mini-row">
                  <strong>${renderObjectLink('test-case', testCase.id)} ${escapeHtml(testCase.title)}</strong>
                  <button class="tiny" data-remove-plan-test="${escapeHtml(testCase.id)}" data-plan-id="${escapeHtml(plan.id)}" type="button">Remove</button>
                </div>
              `).join('') || '<div class="mini-row"><span>No tests assigned.</span></div>'}
            </div>
            <div class="card-actions"><button class="tiny danger" data-delete-plan="${escapeHtml(plan.id)}" type="button">Remove plan</button></div>
          </article>
        `
      }).join('')}
    </div>
  `
}

function renderExecution() {
  return `
    <section class="hero compact-hero"><p class="eyebrow">Test Execution</p><h2>Run board and evidence</h2><p>Capture who tested what, on which build, with what result and evidence.</p></section>
    <section class="two-col compact-actions">
      <details><summary>Create Execution</summary>${renderExecutionForm()}</details>
      <article><h3>Execution Totals</h3>${renderExecutionTotals()}</article>
    </section>
    <section><h3>Execution Board</h3>${renderExecutionTable()}</section>
  `
}

function renderExecutionForm() {
  return `
    <form id="execution-form" class="stacked-form">
      <label>Plan${renderPlanSelect('planId')}</label>
      <label>Test Case${renderTestCaseSelect('testCaseId')}</label>
      <label>Build${renderBuildSelect('buildId')}</label>
      <label>Assignee<input name="assignee" value="LiveLabs QA" required /></label>
      <label>Status${renderStatusSelect('status', ['Passed', 'Failed', 'Blocked', 'Not Run', 'Archived'], 'Not Run')}</label>
      <label>Evidence<input name="evidence" value="Pending execution evidence" /></label>
      <button class="primary" type="submit">Create execution</button>
    </form>
  `
}

function renderExecutionTotals() {
  const stats = deriveStats(state)
  return `
    <div class="metric-grid">
      ${renderKpi('Passed', stats.passed, 'Completed successfully')}
      ${renderKpi('Failed', stats.failed, 'Needs defect or fix')}
      ${renderKpi('Blocked', stats.blocked, 'Cannot complete')}
      ${renderKpi('Not Run', stats.notRun, 'Still pending')}
    </div>
  `
}

function renderExecutionTable() {
  return renderTable(
    ['Execution', 'Plan', 'Test', 'Assignee', 'Status', 'Evidence', 'Run Date', 'Actions'],
    state.executions.map((execution) => [
      renderObjectLink('execution', execution.id),
      renderObjectLink('plan', execution.planId),
      renderObjectLink('test-case', execution.testCaseId),
      execution.assignee,
      renderStatusSelect('execution-status', ['Passed', 'Failed', 'Blocked', 'Not Run', 'Archived'], execution.status, { 'data-execution-id': execution.id }),
      escapeHtml(execution.evidence),
      execution.runDate,
      `<button class="tiny danger" data-delete-execution="${escapeHtml(execution.id)}" type="button">Remove</button>`
    ]),
    true
  )
}

function renderTraceability() {
  return `
    <section class="hero"><p class="eyebrow">Traceability</p><h2>Requirement traceability matrix.</h2><p>See how requirement documents connect to requirements, suites, plans, tests, executions, and defects.</p></section>
    <section><h3>Document Traceability</h3>${renderDocumentTraceability()}</section>
    <section><h3>Requirement Traceability Matrix</h3>${renderRequirementMatrix()}</section>
  `
}

function renderDocumentTraceability() {
  return renderTable(
    ['Document', 'Project', 'Requirements', 'Tests', 'Plans', 'Executions', 'Status'],
    documentTraceabilityRows(state).map((row) => [
      `<strong>${renderObjectLink('document', row.document.id)}</strong><small>${escapeHtml(row.document.title)}</small>`,
      renderObjectLink('project', row.document.projectId, byId(state.featureProjects, row.document.projectId)?.name || row.document.projectId),
      row.requirements,
      row.tests,
      row.plans,
      row.executions,
      tag(row.status)
    ]),
    true
  )
}

function renderDefects() {
  return `
    <section class="hero"><p class="eyebrow">Defects</p><h2>Jira/Xray-ready defect mapping.</h2><p>No Jira writes happen here. These local records model the links that a production integration would synchronize later.</p></section>
    <section>${renderTable(['ID', 'Case', 'Execution', 'Title', 'System', 'Severity', 'Status'], state.defectLinks.map((item) => [renderObjectLink('defect', item.id), renderObjectLink('test-case', item.testCaseId), renderObjectLink('execution', item.executionId), item.title, item.system, tag(item.severity), tag(item.status)]), true)}</section>
  `
}

function renderReports() {
  return `
    <section class="hero">
      <p class="eyebrow">Execution Reports</p>
      <h2>Execution and coverage reporting.</h2>
      <p>Generate a local report from current plans, executions, requirement traceability, and open gaps.</p>
      <form id="report-form" class="inline-form">
        <label>Report Type${renderStatusSelect('reportType', ['Execution Summary', 'Coverage Summary', 'Release Readiness'], 'Execution Summary')}</label>
        <button class="primary" type="submit">Generate report</button>
      </form>
    </section>
    <section><textarea readonly>${escapeHtml(reportPreview || 'Generate a report to preview local output.')}</textarea></section>
  `
}

function renderObjectDetail(route) {
  if (route.type === 'project') return renderProjectDetail(route)
  if (route.type === 'document') return renderDocumentDetail(route)
  if (route.type === 'requirement') return renderRequirementDetail(route)
  if (route.type === 'suite') return renderSuiteDetail(route)
  if (route.type === 'test-case') return renderTestCaseDetail(route)
  if (route.type === 'plan') return renderPlanDetail(route)
  if (route.type === 'execution') return renderExecutionDetail(route)
  if (route.type === 'defect') return renderDefectDetail(route)
  return renderMissingObject(route)
}

function renderDetailChrome(route, label, title, status) {
  return `
    <section class="object-chrome">
      <div class="breadcrumb">
        <button data-view="${escapeHtml(route.returnTo)}" type="button">${escapeHtml(navItems.find((item) => item.id === route.returnTo)?.label || 'Back')}</button>
        <span>/</span>
        <strong>${escapeHtml(label)}</strong>
      </div>
      <div class="object-title">
        <div>
          <p class="eyebrow">${escapeHtml(label)}</p>
          <h2>${escapeHtml(title)}</h2>
        </div>
        ${status ? tag(status) : ''}
      </div>
      <div class="card-actions">
        <button class="tiny" data-view="${escapeHtml(route.returnTo)}" type="button">Back to ${escapeHtml(navItems.find((item) => item.id === route.returnTo)?.label || 'list')}</button>
        <button class="tiny" data-view="traceability" type="button">Traceability</button>
      </div>
    </section>
  `
}

function renderRelationshipStrip(items) {
  return `
    <section class="relationship-strip" aria-label="Linked record summary">
      ${items.map((item) => `
        <div>
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </div>
      `).join('')}
    </section>
  `
}

function renderLinkedList(title, rows, emptyText) {
  return `
    <article>
      <h3>${escapeHtml(title)}</h3>
      <div class="mini-stack">
        ${rows.length ? rows.join('') : `<div class="mini-row"><span>${escapeHtml(emptyText)}</span></div>`}
      </div>
    </article>
  `
}

function renderAuditPanel(objectId) {
  const events = state.auditEvents
    .filter((event) => String(event.detail || '').includes(objectId))
    .slice(0, 5)

  return `
    <article>
      <h3>Audit History</h3>
      <div class="mini-stack">
        ${events.length ? events.map((event) => `
          <div class="mini-row">
            <strong>${escapeHtml(event.action)}</strong>
            <span>${escapeHtml(event.timestamp)} - ${escapeHtml(event.detail)}</span>
          </div>
        `).join('') : '<div class="mini-row"><span>No local audit event for this object yet.</span></div>'}
      </div>
    </article>
  `
}

function renderMissingObject(route) {
  return `
    ${renderDetailChrome(route, `${route.type} ${route.id}`, 'Object not found', 'Needs Review')}
    <section><p>The selected object no longer exists in local demo state.</p></section>
  `
}

function renderProjectDetail(route) {
  const project = byId(state.featureProjects, route.id)
  if (!project) return renderMissingObject(route)
  const documents = state.requirementDocuments.filter((document) => document.projectId === project.id)
  const requirements = state.requirements.filter((requirement) => requirement.projectId === project.id)
  const suites = state.testSuites.filter((suite) => suite.projectId === project.id)
  const plans = state.testPlans.filter((plan) => plan.projectId === project.id)
  const testCaseIds = state.testCases.filter((testCase) => testCase.projectId === project.id).map((testCase) => testCase.id)
  const executions = state.executions.filter((execution) => testCaseIds.includes(execution.testCaseId))

  return `
    ${renderDetailChrome(route, project.id, project.name, project.status)}
    ${renderRelationshipStrip([
      { label: 'Requirement Docs', value: documents.length },
      { label: 'Requirements', value: requirements.length },
      { label: 'Suites', value: suites.length },
      { label: 'Plans', value: plans.length },
      { label: 'Executions', value: executions.length }
    ])}
    <section class="two-col object-layout">
      <article>
        <h3>Edit Project</h3>
        <form id="project-detail-form" class="stacked-form" data-detail-id="${escapeHtml(project.id)}">
          <label>Name<input name="name" value="${escapeHtml(project.name)}" required /></label>
          <label>Owner<input name="owner" value="${escapeHtml(project.owner)}" required /></label>
          <label>Release<input name="release" value="${escapeHtml(project.release)}" /></label>
          <label>Status${renderStatusSelect('status', ['Planning', 'Active', 'On Hold', 'Done'], project.status)}</label>
          <label>Description<textarea name="description" rows="3">${escapeHtml(project.description)}</textarea></label>
          <button class="primary" type="submit">Save project</button>
        </form>
      </article>
      ${renderLinkedList('Linked Records', [
        ...documents.map((document) => `<div class="mini-row"><strong>${renderObjectLink('document', document.id, document.title)}</strong><span>Requirement document</span></div>`),
        ...suites.map((suite) => `<div class="mini-row"><strong>${renderObjectLink('suite', suite.id, suite.name)}</strong><span>Test suite</span></div>`),
        ...plans.map((plan) => `<div class="mini-row"><strong>${renderObjectLink('plan', plan.id, plan.name)}</strong><span>Test plan</span></div>`)
      ], 'No linked records yet.')}
    </section>
  `
}

function renderDocumentDetail(route) {
  const document = byId(state.requirementDocuments, route.id)
  if (!document) return renderMissingObject(route)
  const requirements = state.requirements.filter((requirement) => requirement.documentId === document.id)
  const plans = state.testPlans.filter((plan) => plan.requirementDocumentId === document.id)

  return `
    ${renderDetailChrome(route, document.id, document.title, document.status)}
    ${renderRelationshipStrip([
      { label: 'Project', value: byId(state.featureProjects, document.projectId)?.name || document.projectId },
      { label: 'Requirements', value: requirements.length },
      { label: 'Plans', value: plans.length }
    ])}
    <section class="two-col object-layout">
      <article>
        <h3>Edit Requirement Document</h3>
        <form id="document-detail-form" class="stacked-form" data-detail-id="${escapeHtml(document.id)}">
          <label>Project${renderProjectSelect('projectId', document.projectId)}</label>
          <label>Title<input name="title" value="${escapeHtml(document.title)}" required /></label>
          <label>Owner<input name="owner" value="${escapeHtml(document.owner)}" required /></label>
          <label>Version<input name="version" value="${escapeHtml(document.version)}" /></label>
          <label>Status${renderStatusSelect('status', ['Draft', 'Needs Review', 'Approved', 'Retired'], document.status)}</label>
          <label>Summary<textarea name="summary" rows="3">${escapeHtml(document.summary)}</textarea></label>
          <button class="primary" type="submit">Save document</button>
        </form>
      </article>
      ${renderLinkedList('Requirements And Plans', [
        ...requirements.map((requirement) => `<div class="mini-row"><strong>${renderObjectLink('requirement', requirement.id)}</strong><span>${escapeHtml(requirement.title)}</span></div>`),
        ...plans.map((plan) => `<div class="mini-row"><strong>${renderObjectLink('plan', plan.id)}</strong><span>${escapeHtml(plan.name)}</span></div>`)
      ], 'No child requirements or plans yet.')}
    </section>
  `
}

function renderRequirementDetail(route) {
  const links = getRequirementLinks(state, route.id)
  if (!links) return renderMissingObject(route)
  const { requirement } = links

  return `
    ${renderDetailChrome(route, requirement.id, requirement.title, requirement.status)}
    ${renderRelationshipStrip([
      { label: 'Tests', value: links.testCases.length },
      { label: 'Plans', value: links.plans.length },
      { label: 'Executions', value: links.executions.length },
      { label: 'Defects', value: links.defects.length }
    ])}
    <section class="two-col object-layout">
      <article>
        <h3>Edit Requirement</h3>
        <form id="requirement-detail-form" class="stacked-form" data-detail-id="${escapeHtml(requirement.id)}">
          <label>Document${renderDocumentSelect('documentId', requirement.documentId)}</label>
          <label>Title<input name="title" value="${escapeHtml(requirement.title)}" required /></label>
          <label>Priority${renderStatusSelect('priority', ['High', 'Medium', 'Low'], requirement.priority)}</label>
          <label>Source<input name="source" value="${escapeHtml(requirement.source)}" required /></label>
          <label>Status${renderStatusSelect('status', ['Draft', 'Needs Review', 'Approved', 'Retired'], requirement.status)}</label>
          <button class="primary" type="submit">Save requirement</button>
        </form>
      </article>
      <article>
        <h3>Requirement Traceability</h3>
        ${renderTable(['Linked Type', 'Record', 'Status'], [
          ...links.testCases.map((testCase) => ['Test Case', renderObjectLink('test-case', testCase.id, `${testCase.id} - ${testCase.title}`), tag(testCase.status)]),
          ...links.plans.map((plan) => ['Plan', renderObjectLink('plan', plan.id, `${plan.id} - ${plan.name}`), tag(plan.status)]),
          ...links.executions.map((execution) => ['Execution', renderObjectLink('execution', execution.id), tag(execution.status)]),
          ...links.defects.map((defect) => ['Defect', renderObjectLink('defect', defect.id, `${defect.id} - ${defect.title}`), tag(defect.status)])
        ], true)}
      </article>
      <article>
        <h3>Link Test Coverage</h3>
        <form id="requirement-link-test-form" class="stacked-form compact-form" data-detail-id="${escapeHtml(requirement.id)}">
          <label>Test Case${renderTestCaseSelect('testCaseId')}</label>
          <button class="primary" type="submit">Link test to requirement</button>
        </form>
        <p class="muted-note">Only tests in the same project can be linked. Linked tests keep their plan and execution history.</p>
      </article>
    </section>
    <section class="two-col object-layout">${renderAuditPanel(requirement.id)}</section>
  `
}

function renderSuiteDetail(route) {
  const suite = byId(state.testSuites, route.id)
  if (!suite) return renderMissingObject(route)
  const tests = state.testCases.filter((testCase) => testCase.suiteId === suite.id)
  const plans = state.testPlans.filter((plan) => (plan.suiteIds || []).includes(suite.id))

  return `
    ${renderDetailChrome(route, suite.id, suite.name, suite.status)}
    ${renderRelationshipStrip([
      { label: 'Project', value: byId(state.featureProjects, suite.projectId)?.name || suite.projectId },
      { label: 'Tests', value: tests.length },
      { label: 'Plans', value: plans.length }
    ])}
    <section class="two-col object-layout">
      <article>
        <h3>Edit Suite</h3>
        <form id="suite-detail-form" class="stacked-form" data-detail-id="${escapeHtml(suite.id)}">
          <label>Project${renderProjectSelect('projectId', suite.projectId)}</label>
          <label>Name<input name="name" value="${escapeHtml(suite.name)}" required /></label>
          <label>Owner<input name="owner" value="${escapeHtml(suite.owner)}" required /></label>
          <label>Status${renderStatusSelect('status', ['Draft', 'Needs Review', 'Ready', 'Retired'], suite.status)}</label>
          <button class="primary" type="submit">Save suite</button>
        </form>
      </article>
      ${renderLinkedList('Tests And Plans', [
        ...tests.map((testCase) => `<div class="mini-row"><strong>${renderObjectLink('test-case', testCase.id)}</strong><span>${escapeHtml(testCase.title)}</span></div>`),
        ...plans.map((plan) => `<div class="mini-row"><strong>${renderObjectLink('plan', plan.id)}</strong><span>${escapeHtml(plan.name)}</span></div>`)
      ], 'No tests or plans linked yet.')}
    </section>
  `
}

function renderTestCaseDetail(route) {
  const links = getTestCaseLinks(state, route.id)
  if (!links) return renderMissingObject(route)
  const { testCase } = links

  return `
    ${renderDetailChrome(route, testCase.id, testCase.title, testCase.status)}
    ${renderRelationshipStrip([
      { label: 'Requirement', value: links.requirement?.id || 'Unlinked' },
      { label: 'Plans', value: links.plans.length },
      { label: 'Executions', value: links.executions.length },
      { label: 'Defects', value: links.defects.length }
    ])}
    <section class="two-col object-layout">
      <article>
        <h3>Edit Test Case</h3>
        <form id="testcase-detail-form" class="stacked-form" data-detail-id="${escapeHtml(testCase.id)}">
          <label>Suite${renderSuiteSelect('suiteId', testCase.suiteId)}</label>
          <label>Requirement${renderRequirementSelect('requirementId', testCase.requirementId)}</label>
          <label>Title<input name="title" value="${escapeHtml(testCase.title)}" required /></label>
          <label>Type${renderStatusSelect('type', ['Manual', 'Automated', 'BDD', 'Generic'], testCase.type)}</label>
          <label>Priority${renderStatusSelect('priority', ['High', 'Medium', 'Low'], testCase.priority)}</label>
          <label>Automation<input name="automation" value="${escapeHtml(testCase.automation)}" /></label>
          <label>Status${renderStatusSelect('status', ['Draft', 'Needs Review', 'Ready', 'Retired'], testCase.status)}</label>
          <label>Steps<textarea name="steps" rows="4">${escapeHtml(testCase.steps)}</textarea></label>
          <label>Expected<textarea name="expected" rows="4">${escapeHtml(testCase.expected)}</textarea></label>
          <button class="primary" type="submit">Save test case</button>
        </form>
      </article>
      <article>
        <h3>Linked Records</h3>
        ${renderTable(['Type', 'Record', 'Status'], [
          ['Requirement', renderObjectLink('requirement', links.requirement?.id, links.requirement ? `${links.requirement.id} - ${links.requirement.title}` : 'Unlinked'), links.requirement ? tag(links.requirement.status) : tag('Gap')],
          ...links.plans.map((plan) => ['Plan', renderObjectLink('plan', plan.id, `${plan.id} - ${plan.name}`), tag(plan.status)]),
          ...links.executions.map((execution) => ['Execution', renderObjectLink('execution', execution.id), tag(execution.status)]),
          ...links.defects.map((defect) => ['Defect', renderObjectLink('defect', defect.id, `${defect.id} - ${defect.title}`), tag(defect.status)])
        ], true)}
      </article>
      <article>
        <h3>Plan Membership</h3>
        <form id="testcase-plan-link-form" class="stacked-form compact-form" data-detail-id="${escapeHtml(testCase.id)}">
          <label>Plan${renderPlanSelect('planId')}</label>
          <button class="primary" type="submit">Add test to plan</button>
        </form>
        <div class="mini-stack">
          ${links.plans.map((plan) => `
            <div class="mini-row">
              <strong>${renderObjectLink('plan', plan.id, plan.name)}</strong>
              <button class="tiny" data-remove-plan-test="${escapeHtml(testCase.id)}" data-plan-id="${escapeHtml(plan.id)}" type="button">Remove from plan</button>
            </div>
          `).join('') || '<div class="mini-row"><span>No plan membership yet.</span></div>'}
        </div>
      </article>
    </section>
    <section class="two-col object-layout">${renderAuditPanel(testCase.id)}</section>
  `
}

function renderPlanDetail(route) {
  const links = getPlanLinks(state, route.id)
  if (!links) return renderMissingObject(route)
  const { plan } = links

  return `
    ${renderDetailChrome(route, plan.id, plan.name, plan.status)}
    ${renderRelationshipStrip([
      { label: 'Suites', value: links.suites.length },
      { label: 'Tests', value: links.testCases.length },
      { label: 'Executions', value: links.executions.length },
      { label: 'Defects', value: links.defects.length }
    ])}
    <section class="two-col object-layout">
      <article>
        <h3>Edit Test Plan</h3>
        <form id="plan-detail-form" class="stacked-form" data-detail-id="${escapeHtml(plan.id)}">
          <label>Project${renderProjectSelect('projectId', plan.projectId)}</label>
          <label>Requirement Document${renderDocumentSelect('requirementDocumentId', plan.requirementDocumentId)}</label>
          <label>Name<input name="name" value="${escapeHtml(plan.name)}" required /></label>
          <label>Build${renderBuildSelect('buildId', plan.buildId)}</label>
          <label>Owner<input name="owner" value="${escapeHtml(plan.owner)}" required /></label>
          <label>Status${renderStatusSelect('status', ['Planning', 'Needs Review', 'Ready', 'In Progress', 'Done', 'Archived'], plan.status)}</label>
          <button class="primary" type="submit">Save plan</button>
        </form>
      </article>
      <article>
        <h3>Plan Scope</h3>
        ${renderTable(['Type', 'Record', 'Status'], [
          ...links.suites.map((suite) => ['Suite', renderObjectLink('suite', suite.id, `${suite.id} - ${suite.name}`), `${tag(suite.status)} <button class="tiny" data-unlink-suite="${escapeHtml(suite.id)}" data-plan-id="${escapeHtml(plan.id)}" type="button">Unlink</button>`]),
          ...links.testCases.map((testCase) => ['Test Case', renderObjectLink('test-case', testCase.id, `${testCase.id} - ${testCase.title}`), `${tag(testCase.status)} <button class="tiny" data-remove-plan-test="${escapeHtml(testCase.id)}" data-plan-id="${escapeHtml(plan.id)}" type="button">Remove</button>`]),
          ...links.executions.map((execution) => ['Execution', renderObjectLink('execution', execution.id), tag(execution.status)])
        ], true)}
      </article>
      <article>
        <h3>Manage Plan Links</h3>
        <form id="plan-detail-suite-form" class="stacked-form compact-form" data-detail-id="${escapeHtml(plan.id)}">
          <label>Suite${renderSuiteSelect('suiteId')}</label>
          <button class="primary" type="submit">Link suite</button>
        </form>
        <form id="plan-detail-test-form" class="stacked-form compact-form" data-detail-id="${escapeHtml(plan.id)}">
          <label>Test Case${renderTestCaseSelect('testCaseId')}</label>
          <button class="primary" type="submit">Add test</button>
        </form>
        <p class="muted-note">Removing tests or suites is blocked after execution history exists.</p>
      </article>
    </section>
    <section class="two-col object-layout">${renderAuditPanel(plan.id)}</section>
  `
}

function renderExecutionDetail(route) {
  const links = getExecutionLinks(state, route.id)
  if (!links) return renderMissingObject(route)
  const { execution } = links

  return `
    ${renderDetailChrome(route, execution.id, `${execution.testCaseId} on ${execution.planId}`, execution.status)}
    ${renderRelationshipStrip([
      { label: 'Plan', value: execution.planId },
      { label: 'Test Case', value: execution.testCaseId },
      { label: 'Build', value: execution.buildId },
      { label: 'Defects', value: links.defects.length }
    ])}
    <section class="two-col object-layout">
      <article>
        <h3>Edit Execution</h3>
        <form id="execution-detail-form" class="stacked-form" data-detail-id="${escapeHtml(execution.id)}">
          <label>Plan${renderPlanSelect('planId', execution.planId)}</label>
          <label>Test Case${renderTestCaseSelect('testCaseId', execution.testCaseId)}</label>
          <label>Build${renderBuildSelect('buildId', execution.buildId)}</label>
          <label>Assignee<input name="assignee" value="${escapeHtml(execution.assignee)}" required /></label>
          <label>Status${renderStatusSelect('status', ['Passed', 'Failed', 'Blocked', 'Not Run', 'Archived'], execution.status)}</label>
          <label>Evidence<input name="evidence" value="${escapeHtml(execution.evidence)}" /></label>
          <button class="primary" type="submit">Save execution</button>
        </form>
      </article>
      <article>
        <h3>Execution Context</h3>
        ${renderTable(['Type', 'Record', 'Status'], [
          ['Plan', renderObjectLink('plan', links.plan?.id, links.plan ? `${links.plan.id} - ${links.plan.name}` : execution.planId), links.plan ? tag(links.plan.status) : tag('Gap')],
          ['Test Case', renderObjectLink('test-case', links.testCase?.id, links.testCase ? `${links.testCase.id} - ${links.testCase.title}` : execution.testCaseId), links.testCase ? tag(links.testCase.status) : tag('Gap')],
          ['Requirement', renderObjectLink('requirement', links.requirement?.id, links.requirement ? `${links.requirement.id} - ${links.requirement.title}` : 'Unlinked'), links.requirement ? tag(links.requirement.status) : tag('Gap')],
          ...links.defects.map((defect) => ['Defect', renderObjectLink('defect', defect.id, `${defect.id} - ${defect.title}`), tag(defect.status)])
        ], true)}
      </article>
      <article>
        <h3>Create Linked Defect</h3>
        <form id="execution-defect-form" class="stacked-form compact-form" data-detail-id="${escapeHtml(execution.id)}" data-testcase-id="${escapeHtml(execution.testCaseId)}">
          <label>Title<input name="title" required placeholder="Defect summary" /></label>
          <label>Severity${renderStatusSelect('severity', ['High', 'Medium', 'Low'], 'Medium')}</label>
          <label>Status${renderStatusSelect('status', ['Open', 'Investigating', 'Resolved', 'Archived'], 'Open')}</label>
          <label>System<input name="system" value="Jira-ready" /></label>
          <button class="primary" type="submit">Create defect link</button>
        </form>
        <p class="muted-note">This creates a local Jira-ready mapping only. It does not write to Jira.</p>
      </article>
    </section>
    <section class="two-col object-layout">${renderAuditPanel(execution.id)}</section>
  `
}

function renderDefectDetail(route) {
  const defect = byId(state.defectLinks, route.id)
  if (!defect) return renderMissingObject(route)

  return `
    ${renderDetailChrome(route, defect.id, defect.title, defect.status)}
    ${renderRelationshipStrip([
      { label: 'Severity', value: defect.severity },
      { label: 'System', value: defect.system },
      { label: 'Test Case', value: defect.testCaseId },
      { label: 'Execution', value: defect.executionId }
    ])}
    <section class="two-col object-layout">
      <article>
        <h3>Defect Mapping</h3>
        <p>No Jira writes happen in this local prototype. This detail page preserves the relationship context that a production integration would synchronize later.</p>
        ${renderTable(['Linked Type', 'Record'], [
          ['Test Case', renderObjectLink('test-case', defect.testCaseId)],
          ['Execution', renderObjectLink('execution', defect.executionId)]
        ], true)}
      </article>
      ${renderAuditPanel(defect.id)}
    </section>
  `
}

function renderTable(headers, rows, html = false) {
  return `
    <div class="table-wrap"><table>
      <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${html ? cell : renderCell(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
  `
}

function renderCell(cell) {
  return taggable(cell) ? tag(cell) : escapeHtml(cell)
}

function taggable(cell) {
  return [
    'Active',
    'Approved',
    'Archived',
    'Blocked',
    'Covered',
    'Done',
    'Draft',
    'Failed',
    'Gap',
    'High',
    'In Progress',
    'Investigating',
    'Low',
    'Medium',
    'Needs Review',
    'Not Run',
    'On Hold',
    'Open',
    'Passed',
    'Planning',
    'Ready',
    'Resolved',
    'Retired',
    'Review'
  ].includes(String(cell))
}

function tag(value) {
  return `<span class="status ${statusClass(value)}">${escapeHtml(value)}</span>`
}

function renderProjectSelect(name, selectedId = '') {
  return `<select name="${name}">${state.featureProjects.map((project) => `<option value="${project.id}" ${project.id === selectedId ? 'selected' : ''}>${escapeHtml(project.name)}</option>`).join('')}</select>`
}

function renderDocumentSelect(name, selectedId = '') {
  return `<select name="${name}">${state.requirementDocuments.map((document) => `<option value="${document.id}" ${document.id === selectedId ? 'selected' : ''}>${escapeHtml(document.title)}</option>`).join('')}</select>`
}

function renderRequirementSelect(name, selectedId = '') {
  return `<select name="${name}">${state.requirements.map((requirement) => `<option value="${requirement.id}" ${requirement.id === selectedId ? 'selected' : ''}>${escapeHtml(requirement.id)} - ${escapeHtml(requirement.title)}</option>`).join('')}</select>`
}

function renderSuiteSelect(name, selectedId = '') {
  return `<select name="${name}">${state.testSuites.map((suite) => `<option value="${suite.id}" ${suite.id === selectedId ? 'selected' : ''}>${escapeHtml(suite.name)}</option>`).join('')}</select>`
}

function renderPlanSelect(name, selectedId = '') {
  return `<select name="${name}">${state.testPlans.map((plan) => `<option value="${plan.id}" ${plan.id === selectedId ? 'selected' : ''}>${escapeHtml(plan.name)}</option>`).join('')}</select>`
}

function renderTestCaseSelect(name, selectedId = '') {
  return `<select name="${name}">${state.testCases.map((testCase) => `<option value="${testCase.id}" ${testCase.id === selectedId ? 'selected' : ''}>${escapeHtml(testCase.id)} - ${escapeHtml(testCase.title)}</option>`).join('')}</select>`
}

function renderBuildSelect(name, selectedId = '') {
  return `<select name="${name}">${state.builds.map((build) => `<option value="${build.id}" ${build.id === selectedId ? 'selected' : ''}>${escapeHtml(build.name)}</option>`).join('')}</select>`
}

function renderStatusSelect(name, values, current, attrs = {}) {
  const attributes = Object.entries(attrs).map(([key, value]) => `${key}="${escapeHtml(value)}"`).join(' ')
  return `<select name="${name}" class="${name}" ${attributes}>${values.map((value) => `<option ${value === current ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}</select>`
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

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      activeView = button.dataset.view
      message = ''
      render()
    })
  })
  document.querySelectorAll('[data-object-type][data-object-id]').forEach((button) => {
    button.addEventListener('click', () => {
      activeView = objectRoute(button.dataset.objectType, button.dataset.objectId)
      message = ''
      render()
    })
  })

  bindSubmit('#project-form', (data) => {
    state = createProject(state, data)
    message = 'Project created.'
  })
  bindSubmit('#document-form', (data) => {
    state = createRequirementDocument(state, data)
    message = 'Requirement document created.'
  })
  bindSubmit('#requirement-form', (data) => {
    state = createRequirement(state, data)
    message = 'Requirement created.'
  })
  bindSubmit('#suite-form', (data) => {
    state = createTestSuite(state, data)
    message = 'Test suite created.'
  })
  bindSubmit('#testcase-form', (data) => {
    state = createTestCase(state, data)
    message = 'Test case created.'
  })
  bindSubmit('#plan-form', (data) => {
    state = createTestPlan(state, data)
    message = 'Test plan created.'
  })
  bindSubmit('#plan-suite-form', (data) => {
    state = linkSuiteToPlan(state, data.planId, data.suiteId)
    message = 'Suite linked to test plan.'
  })
  bindSubmit('#plan-test-form', (data) => {
    state = addTestCaseToPlan(state, data.planId, data.testCaseId)
    message = 'Test case added to plan.'
  })
  bindSubmit('#execution-form', (data) => {
    state = createExecution(state, data)
    message = 'Execution created.'
  })
  bindSubmit('#report-form', (data) => {
    reportPreview = generateReport(state, data.reportType)
    message = 'Report generated from current local TMS state.'
  })
  bindSubmit('#project-detail-form', (data, form) => {
    state = updateProject(state, form.dataset.detailId, data)
    message = 'Project detail saved.'
  })
  bindSubmit('#document-detail-form', (data, form) => {
    state = updateRequirementDocument(state, form.dataset.detailId, data)
    message = 'Requirement document detail saved.'
  })
  bindSubmit('#requirement-detail-form', (data, form) => {
    state = updateRequirement(state, form.dataset.detailId, data)
    message = 'Requirement detail saved.'
  })
  bindSubmit('#suite-detail-form', (data, form) => {
    state = updateTestSuite(state, form.dataset.detailId, data)
    message = 'Suite detail saved.'
  })
  bindSubmit('#testcase-detail-form', (data, form) => {
    state = updateTestCase(state, form.dataset.detailId, data)
    message = 'Test case detail saved.'
  })
  bindSubmit('#plan-detail-form', (data, form) => {
    state = updateTestPlan(state, form.dataset.detailId, data)
    message = 'Test plan detail saved.'
  })
  bindSubmit('#execution-detail-form', (data, form) => {
    state = updateExecution(state, form.dataset.detailId, data)
    message = 'Execution detail saved.'
  })
  bindSubmit('#requirement-link-test-form', (data, form) => {
    state = linkTestCaseToRequirement(state, form.dataset.detailId, data.testCaseId)
    message = 'Test case linked to requirement.'
  })
  bindSubmit('#testcase-plan-link-form', (data, form) => {
    state = addTestCaseToPlan(state, data.planId, form.dataset.detailId)
    message = 'Test case added to plan.'
  })
  bindSubmit('#plan-detail-suite-form', (data, form) => {
    state = linkSuiteToPlan(state, form.dataset.detailId, data.suiteId)
    message = 'Suite linked to test plan.'
  })
  bindSubmit('#plan-detail-test-form', (data, form) => {
    state = addTestCaseToPlan(state, form.dataset.detailId, data.testCaseId)
    message = 'Test case added to plan.'
  })
  bindSubmit('#execution-defect-form', (data, form) => {
    state = createDefectLink(state, {
      ...data,
      executionId: form.dataset.detailId,
      testCaseId: form.dataset.testcaseId
    })
    message = 'Defect link created locally.'
  })

  bindChange('.project-status', (select) => {
    state = updateProject(state, select.dataset.projectId, { status: select.value })
    message = 'Project status updated.'
  })
  bindChange('.document-status', (select) => {
    state = updateRequirementDocument(state, select.dataset.documentId, { status: select.value })
    message = 'Requirement document status updated.'
  })
  bindChange('.requirement-status', (select) => {
    state = updateRequirement(state, select.dataset.requirementId, { status: select.value })
    message = 'Requirement status updated.'
  })
  bindChange('.suite-status', (select) => {
    state = updateTestSuite(state, select.dataset.suiteId, { status: select.value })
    message = 'Suite status updated.'
  })
  bindChange('.testcase-status', (select) => {
    state = updateTestCase(state, select.dataset.testcaseId, { status: select.value })
    message = 'Test case status updated.'
  })
  bindChange('.plan-status', (select) => {
    state = updateTestPlan(state, select.dataset.planId, { status: select.value })
    message = 'Plan status updated.'
  })
  bindChange('.execution-status', (select) => {
    state = updateExecutionStatus(state, select.dataset.executionId, select.value)
    message = 'Execution status updated locally.'
  })

  bindClick('[data-delete-project]', (button) => {
    state = deleteProject(state, button.dataset.deleteProject)
    message = 'Project removed.'
  })
  bindClick('[data-delete-document]', (button) => {
    state = deleteRequirementDocument(state, button.dataset.deleteDocument)
    message = 'Requirement document removed.'
  })
  bindClick('[data-delete-requirement]', (button) => {
    state = deleteRequirement(state, button.dataset.deleteRequirement)
    message = 'Requirement removed.'
  })
  bindClick('[data-delete-suite]', (button) => {
    state = deleteTestSuite(state, button.dataset.deleteSuite)
    message = 'Suite removed.'
  })
  bindClick('[data-delete-testcase]', (button) => {
    state = deleteTestCase(state, button.dataset.deleteTestcase)
    message = 'Test case removed.'
  })
  bindClick('[data-delete-plan]', (button) => {
    state = deleteTestPlan(state, button.dataset.deletePlan)
    message = 'Test plan removed.'
  })
  bindClick('[data-delete-execution]', (button) => {
    state = deleteExecution(state, button.dataset.deleteExecution)
    message = 'Execution removed.'
  })
  bindClick('[data-unlink-suite]', (button) => {
    state = unlinkSuiteFromPlan(state, button.dataset.planId, button.dataset.unlinkSuite)
    message = 'Suite unlinked from plan.'
  })
  bindClick('[data-remove-plan-test]', (button) => {
    state = removeTestCaseFromPlan(state, button.dataset.planId, button.dataset.removePlanTest)
    message = 'Test removed from plan.'
  })
}

function bindSubmit(selector, handler) {
  const form = document.querySelector(selector)
  form?.addEventListener('submit', (event) => {
    event.preventDefault()
    try {
      handler(Object.fromEntries(new FormData(form)), form)
      render()
    } catch (error) {
      message = error.message
      render()
    }
  })
}

function bindChange(selector, handler) {
  document.querySelectorAll(selector).forEach((control) => {
    control.addEventListener('change', () => {
      try {
        handler(control)
        render()
      } catch (error) {
        message = error.message
        render()
      }
    })
  })
}

function bindClick(selector, handler) {
  document.querySelectorAll(selector).forEach((button) => {
    button.addEventListener('click', () => {
      try {
        handler(button)
        render()
      } catch (error) {
        message = error.message
        render()
      }
    })
  })
}

window.addEventListener('hashchange', () => {
  const hashRoute = decodeURIComponent(window.location.hash.slice(1))
  if (hashRoute && parseRoute(hashRoute).mode === 'object' && hashRoute !== activeView) {
    activeView = hashRoute
    message = ''
    render()
  }
})

window.addEventListener('scroll', syncBackToTop, { passive: true })
window.addEventListener('resize', syncBackToTop)

render()
