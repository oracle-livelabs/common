export const navItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'projects', label: 'Projects' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'repository', label: 'Test Repository' },
  { id: 'plans', label: 'Test Plans' },
  { id: 'execution', label: 'Test Execution' },
  { id: 'traceability', label: 'Traceability' },
  { id: 'reports', label: 'Execution Reports' },
  { id: 'defects', label: 'Defects' }
]

export const featureProjects = [
  { id: 'FP-LABS', name: 'LiveLabs Platform Search', owner: 'Platform QA', status: 'Active', release: '2026.05', description: 'Catalog search, filtering, workshop discovery, and empty-state quality.' },
  { id: 'FP-LS', name: 'LiveStack Journey Readiness', owner: 'LiveStack QA', status: 'Planning', release: 'V1', description: 'LiveStack guide variants, runtime validation, and journey evidence readiness.' },
  { id: 'FP-CONTENT', name: 'Workshop Content Integrity', owner: 'Content QA', status: 'Active', release: '2026.05', description: 'Workshop link, metadata, launch, and publishing-readiness checks.' }
]

export const requirementDocuments = [
  { id: 'RD-SEARCH', projectId: 'FP-LABS', title: 'Search And Catalog Requirements', owner: 'Platform QA', version: '1.0', status: 'Approved', summary: 'Core discovery behavior for published workshops and no-result states.' },
  { id: 'RD-LS', projectId: 'FP-LS', title: 'LiveStack Readiness Requirements', owner: 'LiveStack QA', version: '0.3', status: 'Needs Review', summary: 'Guide variants and authenticated source gaps for LiveStack journey testing.' },
  { id: 'RD-CONTENT', projectId: 'FP-CONTENT', title: 'Content Integrity Requirements', owner: 'Content QA', version: '1.1', status: 'Approved', summary: 'Published link, metadata, and launch integrity gates.' }
]

export const requirements = [
  { id: 'REQ-001', documentId: 'RD-SEARCH', projectId: 'FP-LABS', title: 'LiveLabs search returns relevant workshops', priority: 'High', source: 'QA Hub Knowledge Base', status: 'Approved' },
  { id: 'REQ-002', documentId: 'RD-LS', projectId: 'FP-LS', title: 'LiveStack guide variants are available and valid', priority: 'High', source: 'LiveStack QA', status: 'Needs Review' },
  { id: 'REQ-003', documentId: 'RD-CONTENT', projectId: 'FP-CONTENT', title: 'Workshop launch links resolve without broken links', priority: 'Medium', source: 'GitHub Intake', status: 'Approved' },
  { id: 'REQ-004', documentId: 'RD-SEARCH', projectId: 'FP-LABS', title: 'Usage anomalies trigger QA ownership review', priority: 'Medium', source: 'QA Watchdog', status: 'Draft' }
]

export const testSuites = [
  { id: 'TS-PLAT', projectId: 'FP-LABS', name: 'Platform Smoke', owner: 'Platform QA', status: 'Ready' },
  { id: 'TS-LS', projectId: 'FP-LS', name: 'LiveStack Readiness', owner: 'LiveStack QA', status: 'Needs Review' },
  { id: 'TS-CONTENT', projectId: 'FP-CONTENT', name: 'Content Integrity', owner: 'Content QA', status: 'Ready' },
  { id: 'TS-USAGE', projectId: 'FP-LABS', name: 'Usage Signals', owner: 'Analytics QA', status: 'Draft' }
]

export const testCases = [
  { id: 'TC-001', projectId: 'FP-LABS', suiteId: 'TS-PLAT', requirementId: 'REQ-001', title: 'Catalog search returns workshop results', type: 'Manual', priority: 'High', automation: 'Candidate', status: 'Ready', steps: 'Search for an active workshop keyword.', expected: 'Relevant active workshops appear first.' },
  { id: 'TC-002', projectId: 'FP-LS', suiteId: 'TS-LS', requirementId: 'REQ-002', title: 'LiveStack desktop guide opens from landing flow', type: 'Manual', priority: 'High', automation: 'No', status: 'Needs Review', steps: 'Open the LiveStack landing flow and choose desktop guide.', expected: 'Desktop guide opens and matches source content.' },
  { id: 'TC-003', projectId: 'FP-CONTENT', suiteId: 'TS-CONTENT', requirementId: 'REQ-003', title: 'Published workshop links pass link validation', type: 'Automated', priority: 'Medium', automation: 'Playwright', status: 'Ready', steps: 'Run link validation against published workshop URLs.', expected: 'No broken launch or content links are reported.' },
  { id: 'TC-004', projectId: 'FP-LABS', suiteId: 'TS-USAGE', requirementId: 'REQ-004', title: 'Usage anomaly creates QA owner action', type: 'Generic', priority: 'Medium', automation: 'API candidate', status: 'Draft', steps: 'Inject usage drop fixture and run anomaly monitor.', expected: 'QA owner action is generated with source evidence.' },
  { id: 'TC-005', projectId: 'FP-LABS', suiteId: 'TS-PLAT', requirementId: 'REQ-001', title: 'Search empty state explains no-result behavior', type: 'BDD', priority: 'Low', automation: 'Cucumber candidate', status: 'Ready', steps: 'Search for a term with no published workshop result.', expected: 'Empty state is clear and does not look like a platform error.' }
]

export const testPlans = [
  { id: 'TP-2026-05', projectId: 'FP-LABS', requirementDocumentId: 'RD-SEARCH', name: 'May QA Hub Readiness', buildId: 'BLD-0526', owner: 'LiveLabs QA', suiteIds: ['TS-PLAT', 'TS-USAGE'], scope: ['TC-001', 'TC-003'], status: 'In Progress' },
  { id: 'TP-LS-V1', projectId: 'FP-LS', requirementDocumentId: 'RD-LS', name: 'LiveStack Journey Readiness', buildId: 'BLD-LS-01', owner: 'LiveStack QA', suiteIds: ['TS-LS'], scope: ['TC-002'], status: 'Needs Review' },
  { id: 'TP-CONTENT-05', projectId: 'FP-CONTENT', requirementDocumentId: 'RD-CONTENT', name: 'Content Integrity Regression', buildId: 'BLD-0526', owner: 'Content QA', suiteIds: ['TS-CONTENT'], scope: ['TC-003'], status: 'Ready' }
]

export const builds = [
  { id: 'BLD-0526', name: 'QA Hub V3 Local', environment: 'Localhost', status: 'Active' },
  { id: 'BLD-LS-01', name: 'LiveStack Journey Draft', environment: 'Dev Preview', status: 'Review' }
]

export const executions = [
  { id: 'EX-001', testCaseId: 'TC-001', planId: 'TP-2026-05', buildId: 'BLD-0526', assignee: 'Platform QA', status: 'Passed', evidence: 'Browser smoke catalog check', runDate: '2026-05-26 10:40' },
  { id: 'EX-002', testCaseId: 'TC-002', planId: 'TP-LS-V1', buildId: 'BLD-LS-01', assignee: 'LiveStack QA', status: 'Blocked', evidence: 'Authenticated page export needed', runDate: '2026-05-26 10:44' },
  { id: 'EX-003', testCaseId: 'TC-003', planId: 'TP-CONTENT-05', buildId: 'BLD-0526', assignee: 'Content QA', status: 'Failed', evidence: 'broken-links.json', runDate: '2026-05-26 10:48' },
  { id: 'EX-004', testCaseId: 'TC-004', planId: 'TP-2026-05', buildId: 'BLD-0526', assignee: 'Analytics QA', status: 'Not Run', evidence: 'Pending usage fixture', runDate: 'Not run yet' }
]

export const defectLinks = [
  { id: 'BUG-001', testCaseId: 'TC-003', executionId: 'EX-003', title: 'Broken workshop link detected', system: 'Jira-ready', status: 'Open', severity: 'Medium' },
  { id: 'BUG-002', testCaseId: 'TC-002', executionId: 'EX-002', title: 'LiveStack authenticated content unavailable to smoke run', system: 'QA Hub Watchdog', status: 'Investigating', severity: 'High' }
]

const statusValues = {
  project: ['Planning', 'Active', 'On Hold', 'Done'],
  document: ['Draft', 'Needs Review', 'Approved', 'Retired'],
  requirement: ['Draft', 'Needs Review', 'Approved', 'Retired'],
  suite: ['Draft', 'Needs Review', 'Ready', 'Retired'],
  testCase: ['Draft', 'Needs Review', 'Ready', 'Retired'],
  plan: ['Planning', 'Needs Review', 'Ready', 'In Progress', 'Done', 'Archived'],
  execution: ['Passed', 'Failed', 'Blocked', 'Not Run', 'Archived'],
  defect: ['Open', 'Investigating', 'Resolved', 'Archived']
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function getSeedState() {
  return {
    version: 2,
    featureProjects: clone(featureProjects),
    requirementDocuments: clone(requirementDocuments),
    requirements: clone(requirements),
    testSuites: clone(testSuites),
    testCases: clone(testCases),
    testPlans: clone(testPlans),
    builds: clone(builds),
    executions: clone(executions),
    defectLinks: clone(defectLinks),
    auditEvents: [
      {
        id: 'audit-seed',
        action: 'Seeded TMS demo state',
        detail: 'Local-only test management data loaded for review.',
        timestamp: '2026-05-26 13:00'
      }
    ]
  }
}

function compactId(value, fallback = 'ITEM') {
  const text = String(value || fallback)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 18)
  return text || fallback
}

function uniqueId(prefix, records, label) {
  const base = `${prefix}-${compactId(label, String(Date.now()).slice(-5))}`
  if (!records.some((record) => record.id === base)) {
    return base
  }
  return `${base}-${Date.now().toString(36).slice(-4).toUpperCase()}`
}

function requiredText(payload, field, label) {
  const value = String(payload[field] || '').trim()
  if (!value) {
    throw new Error(`${label} is required.`)
  }
  return value
}

function allowedStatus(kind, status, fallback) {
  return statusValues[kind]?.includes(status) ? status : fallback
}

function audit(model, action, detail) {
  return [
    createAuditEvent(action, detail),
    ...(model.auditEvents || [])
  ].slice(0, 80)
}

function projectExists(model, projectId) {
  return model.featureProjects.some((project) => project.id === projectId)
}

function documentExists(model, documentId) {
  return model.requirementDocuments.some((document) => document.id === documentId)
}

function suiteExists(model, suiteId) {
  return model.testSuites.some((suite) => suite.id === suiteId)
}

function testCaseExists(model, testCaseId) {
  return model.testCases.some((testCase) => testCase.id === testCaseId)
}

function planExists(model, planId) {
  return model.testPlans.some((plan) => plan.id === planId)
}

export function createAuditEvent(action, detail) {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    action,
    detail,
    timestamp: new Date().toISOString().slice(0, 16).replace('T', ' ')
  }
}

export function createProject(model, payload) {
  const name = requiredText(payload, 'name', 'Feature or project name')
  const nextProject = {
    id: uniqueId('FP', model.featureProjects, name),
    name,
    owner: String(payload.owner || 'LiveLabs QA').trim(),
    status: allowedStatus('project', payload.status, 'Planning'),
    release: String(payload.release || 'Draft').trim(),
    description: String(payload.description || 'Feature/project scope pending detail.').trim()
  }

  return {
    ...model,
    featureProjects: [nextProject, ...model.featureProjects],
    auditEvents: audit(model, 'Created project', name)
  }
}

export function updateProject(model, projectId, patch) {
  if (!projectExists(model, projectId)) {
    throw new Error('Project not found.')
  }

  return {
    ...model,
    featureProjects: model.featureProjects.map((project) => (
      project.id === projectId
        ? {
          ...project,
          name: patch.name ? String(patch.name).trim() : project.name,
          owner: patch.owner ? String(patch.owner).trim() : project.owner,
          status: allowedStatus('project', patch.status, project.status),
          release: patch.release ? String(patch.release).trim() : project.release,
          description: patch.description ? String(patch.description).trim() : project.description
        }
        : project
    )),
    auditEvents: audit(model, 'Updated project', projectId)
  }
}

export function deleteProject(model, projectId) {
  const hasLinks = model.requirementDocuments.some((document) => document.projectId === projectId) ||
    model.testSuites.some((suite) => suite.projectId === projectId) ||
    model.testPlans.some((plan) => plan.projectId === projectId)
  if (hasLinks) {
    throw new Error('Project has linked documents, suites, or plans.')
  }

  return {
    ...model,
    featureProjects: model.featureProjects.filter((project) => project.id !== projectId),
    auditEvents: audit(model, 'Deleted project', projectId)
  }
}

export function createRequirementDocument(model, payload) {
  const title = requiredText(payload, 'title', 'Requirement document title')
  const projectId = payload.projectId || model.featureProjects[0]?.id
  if (!projectExists(model, projectId)) {
    throw new Error('Requirement document project is invalid.')
  }

  const nextDocument = {
    id: uniqueId('RD', model.requirementDocuments, title),
    projectId,
    title,
    owner: String(payload.owner || 'LiveLabs QA').trim(),
    version: String(payload.version || '0.1').trim(),
    status: allowedStatus('document', payload.status, 'Draft'),
    summary: String(payload.summary || 'Requirement document summary pending review.').trim()
  }

  return {
    ...model,
    requirementDocuments: [nextDocument, ...model.requirementDocuments],
    auditEvents: audit(model, 'Created requirement document', title)
  }
}

export function updateRequirementDocument(model, documentId, patch) {
  if (!documentExists(model, documentId)) {
    throw new Error('Requirement document not found.')
  }
  const projectId = patch.projectId || model.requirementDocuments.find((document) => document.id === documentId)?.projectId
  if (!projectExists(model, projectId)) {
    throw new Error('Requirement document project is invalid.')
  }

  return {
    ...model,
    requirementDocuments: model.requirementDocuments.map((document) => (
      document.id === documentId
        ? {
          ...document,
          projectId,
          title: patch.title ? String(patch.title).trim() : document.title,
          owner: patch.owner ? String(patch.owner).trim() : document.owner,
          version: patch.version ? String(patch.version).trim() : document.version,
          status: allowedStatus('document', patch.status, document.status),
          summary: patch.summary ? String(patch.summary).trim() : document.summary
        }
        : document
    )),
    auditEvents: audit(model, 'Updated requirement document', documentId)
  }
}

export function deleteRequirementDocument(model, documentId) {
  const hasLinks = model.requirements.some((requirement) => requirement.documentId === documentId) ||
    model.testPlans.some((plan) => plan.requirementDocumentId === documentId)
  if (hasLinks) {
    throw new Error('Requirement document has linked requirements or plans.')
  }

  return {
    ...model,
    requirementDocuments: model.requirementDocuments.filter((document) => document.id !== documentId),
    auditEvents: audit(model, 'Deleted requirement document', documentId)
  }
}

export function createRequirement(model, payload) {
  const title = requiredText(payload, 'title', 'Requirement title')
  const documentId = payload.documentId || model.requirementDocuments[0]?.id
  const document = model.requirementDocuments.find((item) => item.id === documentId)
  if (!document) {
    throw new Error('Requirement document is invalid.')
  }

  const nextRequirement = {
    id: uniqueId('REQ', model.requirements, title),
    documentId,
    projectId: document.projectId,
    title,
    priority: payload.priority || 'Medium',
    source: String(payload.source || document.title).trim(),
    status: allowedStatus('requirement', payload.status, 'Draft')
  }

  return {
    ...model,
    requirements: [nextRequirement, ...model.requirements],
    auditEvents: audit(model, 'Created requirement', title)
  }
}

export function updateRequirement(model, requirementId, patch) {
  if (!model.requirements.some((requirement) => requirement.id === requirementId)) {
    throw new Error('Requirement not found.')
  }
  const targetDocument = patch.documentId
    ? model.requirementDocuments.find((document) => document.id === patch.documentId)
    : null
  if (patch.documentId && !targetDocument) {
    throw new Error('Requirement document is invalid.')
  }

  return {
    ...model,
    requirements: model.requirements.map((requirement) => (
      requirement.id === requirementId
        ? {
          ...requirement,
          documentId: targetDocument?.id || requirement.documentId,
          projectId: targetDocument?.projectId || requirement.projectId,
          title: patch.title ? String(patch.title).trim() : requirement.title,
          priority: patch.priority || requirement.priority,
          source: patch.source ? String(patch.source).trim() : requirement.source,
          status: allowedStatus('requirement', patch.status, requirement.status)
        }
        : requirement
    )),
    auditEvents: audit(model, 'Updated requirement', requirementId)
  }
}

export function deleteRequirement(model, requirementId) {
  if (model.testCases.some((testCase) => testCase.requirementId === requirementId)) {
    return {
      ...model,
      requirements: model.requirements.map((requirement) => (
        requirement.id === requirementId
          ? { ...requirement, status: 'Retired' }
          : requirement
      )),
      auditEvents: audit(model, 'Archived requirement', `${requirementId} has linked test cases`)
    }
  }

  return {
    ...model,
    requirements: model.requirements.filter((requirement) => requirement.id !== requirementId),
    auditEvents: audit(model, 'Deleted requirement', requirementId)
  }
}

export function createTestSuite(model, payload) {
  const name = requiredText(payload, 'name', 'Test suite name')
  const projectId = payload.projectId || model.featureProjects[0]?.id
  if (!projectExists(model, projectId)) {
    throw new Error('Test suite project is invalid.')
  }

  const nextSuite = {
    id: uniqueId('TS', model.testSuites, name),
    projectId,
    name,
    owner: String(payload.owner || 'LiveLabs QA').trim(),
    status: allowedStatus('suite', payload.status, 'Draft')
  }

  return {
    ...model,
    testSuites: [nextSuite, ...model.testSuites],
    auditEvents: audit(model, 'Created test suite', name)
  }
}

export function updateTestSuite(model, suiteId, patch) {
  if (!suiteExists(model, suiteId)) {
    throw new Error('Test suite not found.')
  }
  const projectId = patch.projectId || model.testSuites.find((suite) => suite.id === suiteId)?.projectId
  if (!projectExists(model, projectId)) {
    throw new Error('Test suite project is invalid.')
  }

  return {
    ...model,
    testSuites: model.testSuites.map((suite) => (
      suite.id === suiteId
        ? {
          ...suite,
          projectId,
          name: patch.name ? String(patch.name).trim() : suite.name,
          owner: patch.owner ? String(patch.owner).trim() : suite.owner,
          status: allowedStatus('suite', patch.status, suite.status)
        }
        : suite
    )),
    auditEvents: audit(model, 'Updated test suite', suiteId)
  }
}

export function deleteTestSuite(model, suiteId) {
  const hasLinks = model.testCases.some((testCase) => testCase.suiteId === suiteId) ||
    model.testPlans.some((plan) => (plan.suiteIds || []).includes(suiteId))
  if (hasLinks) {
    throw new Error('Test suite has linked tests or plans.')
  }

  return {
    ...model,
    testSuites: model.testSuites.filter((suite) => suite.id !== suiteId),
    auditEvents: audit(model, 'Deleted test suite', suiteId)
  }
}

export function createTestCase(model, payload) {
  const title = requiredText(payload, 'title', 'Test case title')
  const suiteId = payload.suiteId || model.testSuites[0]?.id
  const suite = model.testSuites.find((item) => item.id === suiteId)
  if (!suite) {
    throw new Error('Test suite is invalid.')
  }

  const requirementId = payload.requirementId || model.requirements.find((requirement) => requirement.projectId === suite.projectId)?.id
  if (!model.requirements.some((requirement) => requirement.id === requirementId)) {
    throw new Error('Requirement is invalid.')
  }

  const nextCase = {
    id: uniqueId('TC', model.testCases, title),
    projectId: suite.projectId,
    suiteId,
    requirementId,
    title,
    type: payload.type || 'Manual',
    priority: payload.priority || 'Medium',
    automation: String(payload.automation || 'No').trim(),
    status: allowedStatus('testCase', payload.status, 'Draft'),
    steps: String(payload.steps || 'Steps pending detail.').trim(),
    expected: String(payload.expected || 'Expected outcome pending detail.').trim()
  }

  return {
    ...model,
    testCases: [nextCase, ...model.testCases],
    auditEvents: audit(model, 'Created test case', title)
  }
}

export function updateTestCase(model, testCaseId, patch) {
  const current = model.testCases.find((testCase) => testCase.id === testCaseId)
  if (!current) {
    throw new Error('Test case not found.')
  }
  const suite = patch.suiteId
    ? model.testSuites.find((item) => item.id === patch.suiteId)
    : model.testSuites.find((item) => item.id === current.suiteId)
  const requirement = patch.requirementId
    ? model.requirements.find((item) => item.id === patch.requirementId)
    : model.requirements.find((item) => item.id === current.requirementId)

  if (!suite || !requirement) {
    throw new Error('Test case suite or requirement is invalid.')
  }
  if (suite.projectId !== requirement.projectId) {
    throw new Error('Test case suite and requirement must belong to the same project.')
  }

  return {
    ...model,
    testCases: model.testCases.map((testCase) => (
      testCase.id === testCaseId
        ? {
          ...testCase,
          projectId: suite.projectId,
          suiteId: suite.id,
          requirementId: requirement.id,
          title: patch.title ? String(patch.title).trim() : testCase.title,
          type: patch.type || testCase.type,
          priority: patch.priority || testCase.priority,
          automation: patch.automation ? String(patch.automation).trim() : testCase.automation,
          status: allowedStatus('testCase', patch.status, testCase.status),
          steps: patch.steps ? String(patch.steps).trim() : testCase.steps,
          expected: patch.expected ? String(patch.expected).trim() : testCase.expected
        }
        : testCase
    )),
    auditEvents: audit(model, 'Updated test case', testCaseId)
  }
}

export function deleteTestCase(model, testCaseId) {
  const hasExecutionHistory = model.executions.some((execution) => execution.testCaseId === testCaseId)
  const hasDefects = model.defectLinks.some((defect) => defect.testCaseId === testCaseId)
  if (hasExecutionHistory || hasDefects) {
    return {
      ...model,
      testCases: model.testCases.map((testCase) => (
        testCase.id === testCaseId
          ? { ...testCase, status: 'Retired' }
          : testCase
      )),
      auditEvents: audit(model, 'Archived test case', `${testCaseId} has execution or defect history`)
    }
  }

  return {
    ...model,
    testCases: model.testCases.filter((testCase) => testCase.id !== testCaseId),
    testPlans: model.testPlans.map((plan) => ({
      ...plan,
      scope: (plan.scope || []).filter((id) => id !== testCaseId)
    })),
    executions: model.executions.filter((execution) => execution.testCaseId !== testCaseId),
    defectLinks: model.defectLinks.filter((defect) => defect.testCaseId !== testCaseId),
    auditEvents: audit(model, 'Deleted test case', testCaseId)
  }
}

export function createTestPlan(model, payload) {
  const name = requiredText(payload, 'name', 'Test plan name')
  const projectId = payload.projectId || model.featureProjects[0]?.id
  const requirementDocumentId = payload.requirementDocumentId || model.requirementDocuments.find((document) => document.projectId === projectId)?.id
  if (!projectExists(model, projectId) || !documentExists(model, requirementDocumentId)) {
    throw new Error('Test plan project or requirement document is invalid.')
  }

  const nextPlan = {
    id: uniqueId('TP', model.testPlans, name),
    projectId,
    requirementDocumentId,
    name,
    buildId: payload.buildId || model.builds[0]?.id || 'BLD-0526',
    owner: String(payload.owner || 'LiveLabs QA').trim(),
    suiteIds: [],
    scope: [],
    status: allowedStatus('plan', payload.status, 'Planning')
  }

  return {
    ...model,
    testPlans: [nextPlan, ...model.testPlans],
    auditEvents: audit(model, 'Created test plan', name)
  }
}

export function updateTestPlan(model, planId, patch) {
  const current = model.testPlans.find((plan) => plan.id === planId)
  if (!current) {
    throw new Error('Test plan not found.')
  }
  const projectId = patch.projectId || current.projectId
  const requirementDocumentId = patch.requirementDocumentId || current.requirementDocumentId
  const document = model.requirementDocuments.find((item) => item.id === requirementDocumentId)
  if (!projectExists(model, projectId) || !document || document.projectId !== projectId) {
    throw new Error('Test plan project or requirement document is invalid.')
  }

  return {
    ...model,
    testPlans: model.testPlans.map((plan) => (
      plan.id === planId
        ? {
          ...plan,
          projectId,
          requirementDocumentId,
          name: patch.name ? String(patch.name).trim() : plan.name,
          owner: patch.owner ? String(patch.owner).trim() : plan.owner,
          status: allowedStatus('plan', patch.status, plan.status),
          buildId: patch.buildId || plan.buildId
        }
        : plan
    )),
    auditEvents: audit(model, 'Updated test plan', planId)
  }
}

export function deleteTestPlan(model, planId) {
  if (model.executions.some((execution) => execution.planId === planId)) {
    return {
      ...model,
      testPlans: model.testPlans.map((plan) => (
        plan.id === planId
          ? { ...plan, status: 'Archived' }
          : plan
      )),
      auditEvents: audit(model, 'Archived test plan', `${planId} has execution history`)
    }
  }

  return {
    ...model,
    testPlans: model.testPlans.filter((plan) => plan.id !== planId),
    executions: model.executions.filter((execution) => execution.planId !== planId),
    auditEvents: audit(model, 'Deleted test plan', planId)
  }
}

export function linkSuiteToPlan(model, planId, suiteId) {
  if (!planExists(model, planId) || !suiteExists(model, suiteId)) {
    throw new Error('Plan or suite is invalid.')
  }

  return {
    ...model,
    testPlans: model.testPlans.map((plan) => (
      plan.id === planId
        ? { ...plan, suiteIds: [...new Set([...(plan.suiteIds || []), suiteId])] }
        : plan
    )),
    auditEvents: audit(model, 'Linked suite to plan', `${suiteId} -> ${planId}`)
  }
}

export function unlinkSuiteFromPlan(model, planId, suiteId) {
  const suiteTestIds = model.testCases.filter((testCase) => testCase.suiteId === suiteId).map((testCase) => testCase.id)
  const hasExecutionHistory = model.executions.some((execution) => execution.planId === planId && suiteTestIds.includes(execution.testCaseId))
  if (hasExecutionHistory) {
    throw new Error('Suite has execution history in this plan. Keep the link for traceability.')
  }

  return {
    ...model,
    testPlans: model.testPlans.map((plan) => (
      plan.id === planId
        ? {
          ...plan,
          suiteIds: (plan.suiteIds || []).filter((id) => id !== suiteId),
          scope: (plan.scope || []).filter((id) => !suiteTestIds.includes(id))
        }
        : plan
    )),
    auditEvents: audit(model, 'Unlinked suite from plan', `${suiteId} -> ${planId}`)
  }
}

export function addTestCaseToPlan(model, planId, testCaseId) {
  if (!planExists(model, planId) || !testCaseExists(model, testCaseId)) {
    throw new Error('Plan or test case is invalid.')
  }

  const testCase = model.testCases.find((item) => item.id === testCaseId)
  return {
    ...model,
    testPlans: model.testPlans.map((plan) => (
      plan.id === planId
        ? {
          ...plan,
          suiteIds: [...new Set([...(plan.suiteIds || []), testCase.suiteId])],
          scope: [...new Set([...(plan.scope || []), testCaseId])]
        }
        : plan
    )),
    auditEvents: audit(model, 'Added test case to plan', `${testCaseId} -> ${planId}`)
  }
}

export function removeTestCaseFromPlan(model, planId, testCaseId) {
  if (model.executions.some((execution) => execution.planId === planId && execution.testCaseId === testCaseId)) {
    throw new Error('Test case has execution history in this plan. Keep the link for traceability.')
  }

  return {
    ...model,
    testPlans: model.testPlans.map((plan) => (
      plan.id === planId
        ? { ...plan, scope: (plan.scope || []).filter((id) => id !== testCaseId) }
        : plan
    )),
    auditEvents: audit(model, 'Removed test case from plan', `${testCaseId} -> ${planId}`)
  }
}

export function createExecution(model, payload) {
  const planId = payload.planId || model.testPlans[0]?.id
  const testCaseId = payload.testCaseId || model.testPlans.find((plan) => plan.id === planId)?.scope?.[0]
  const buildId = payload.buildId || model.testPlans.find((plan) => plan.id === planId)?.buildId || model.builds[0]?.id
  if (!planExists(model, planId) || !testCaseExists(model, testCaseId)) {
    throw new Error('Execution plan or test case is invalid.')
  }

  const nextExecution = {
    id: uniqueId('EX', model.executions, `${planId}-${testCaseId}`),
    testCaseId,
    planId,
    buildId,
    assignee: String(payload.assignee || 'LiveLabs QA').trim(),
    status: allowedStatus('execution', payload.status, 'Not Run'),
    evidence: String(payload.evidence || 'Pending execution evidence').trim(),
    runDate: new Date().toISOString().slice(0, 16).replace('T', ' ')
  }

  const withPlan = addTestCaseToPlan(model, planId, testCaseId)
  return {
    ...withPlan,
    executions: [nextExecution, ...withPlan.executions],
    auditEvents: audit(withPlan, 'Created execution', nextExecution.id)
  }
}

export function updateExecutionStatus(model, executionId, status, evidence) {
  const nextStatus = allowedStatus('execution', status, '')
  if (!nextStatus) {
    throw new Error('Unsupported execution status.')
  }
  if (!model.executions.some((execution) => execution.id === executionId)) {
    throw new Error('Execution not found.')
  }

  return {
    ...model,
    executions: model.executions.map((execution) => (
      execution.id === executionId
        ? {
          ...execution,
          status: nextStatus,
          evidence: evidence ? String(evidence).trim() : execution.evidence,
          runDate: new Date().toISOString().slice(0, 16).replace('T', ' ')
        }
        : execution
    )),
    auditEvents: audit(model, 'Updated execution status', `${executionId} moved to ${nextStatus}`)
  }
}

export function updateExecution(model, executionId, patch) {
  const current = model.executions.find((execution) => execution.id === executionId)
  if (!current) {
    throw new Error('Execution not found.')
  }

  const planId = patch.planId || current.planId
  const testCaseId = patch.testCaseId || current.testCaseId
  const buildId = patch.buildId || current.buildId
  const status = allowedStatus('execution', patch.status, current.status)
  if (!planExists(model, planId) || !testCaseExists(model, testCaseId)) {
    throw new Error('Execution plan or test case is invalid.')
  }
  if (buildId && !model.builds.some((build) => build.id === buildId)) {
    throw new Error('Execution build is invalid.')
  }

  const withPlan = addTestCaseToPlan(model, planId, testCaseId)
  return {
    ...withPlan,
    executions: withPlan.executions.map((execution) => (
      execution.id === executionId
        ? {
          ...execution,
          planId,
          testCaseId,
          buildId,
          assignee: patch.assignee ? String(patch.assignee).trim() : execution.assignee,
          status,
          evidence: patch.evidence ? String(patch.evidence).trim() : execution.evidence,
          runDate: new Date().toISOString().slice(0, 16).replace('T', ' ')
        }
        : execution
    )),
    auditEvents: audit(withPlan, 'Updated execution', executionId)
  }
}

export function deleteExecution(model, executionId) {
  const execution = model.executions.find((item) => item.id === executionId)
  if (!execution) {
    throw new Error('Execution not found.')
  }
  const hasDefects = model.defectLinks.some((defect) => defect.executionId === executionId)
  if (hasDefects || execution.status !== 'Not Run') {
    return {
      ...model,
      executions: model.executions.map((item) => (
        item.id === executionId
          ? { ...item, status: 'Archived', evidence: `${item.evidence} | Archived for traceability` }
          : item
      )),
      auditEvents: audit(model, 'Archived execution', `${executionId} has result or defect history`)
    }
  }

  return {
    ...model,
    executions: model.executions.filter((execution) => execution.id !== executionId),
    defectLinks: model.defectLinks.filter((defect) => defect.executionId !== executionId),
    auditEvents: audit(model, 'Deleted execution', executionId)
  }
}

export function linkTestCaseToRequirement(model, requirementId, testCaseId) {
  const requirement = model.requirements.find((item) => item.id === requirementId)
  const testCase = model.testCases.find((item) => item.id === testCaseId)
  if (!requirement || !testCase) {
    throw new Error('Requirement or test case is invalid.')
  }
  if (requirement.projectId !== testCase.projectId) {
    throw new Error('Requirement and test case must belong to the same project.')
  }

  return {
    ...model,
    testCases: model.testCases.map((item) => (
      item.id === testCaseId
        ? { ...item, requirementId }
        : item
    )),
    auditEvents: audit(model, 'Linked test case to requirement', `${testCaseId} -> ${requirementId}`)
  }
}

export function createDefectLink(model, payload) {
  const testCaseId = payload.testCaseId || model.executions.find((execution) => execution.id === payload.executionId)?.testCaseId
  const executionId = payload.executionId || model.executions.find((execution) => execution.testCaseId === testCaseId)?.id
  if (!testCaseExists(model, testCaseId) || !model.executions.some((execution) => execution.id === executionId)) {
    throw new Error('Defect test case or execution is invalid.')
  }
  const title = requiredText(payload, 'title', 'Defect title')
  const nextDefect = {
    id: uniqueId('BUG', model.defectLinks, title),
    testCaseId,
    executionId,
    title,
    system: String(payload.system || 'Jira-ready').trim(),
    status: allowedStatus('defect', payload.status, 'Open'),
    severity: payload.severity || 'Medium'
  }

  return {
    ...model,
    defectLinks: [nextDefect, ...model.defectLinks],
    auditEvents: audit(model, 'Created defect link', `${nextDefect.id} -> ${executionId}`)
  }
}

export function deriveStats(model = getSeedState()) {
  const rows = model.executions || executions
  const total = rows.length
  const passed = rows.filter((item) => item.status === 'Passed').length
  const failed = rows.filter((item) => item.status === 'Failed').length
  const blocked = rows.filter((item) => item.status === 'Blocked').length
  const notRun = rows.filter((item) => item.status === 'Not Run').length
  return { total, passed, failed, blocked, notRun }
}

export function deriveProjectStats(model = getSeedState()) {
  return model.featureProjects.map((project) => {
    const projectRequirements = model.requirements.filter((requirement) => requirement.projectId === project.id)
    const projectCases = model.testCases.filter((testCase) => testCase.projectId === project.id)
    const projectPlans = model.testPlans.filter((plan) => plan.projectId === project.id)
    const caseIds = projectCases.map((testCase) => testCase.id)
    const projectExecutions = model.executions.filter((execution) => caseIds.includes(execution.testCaseId))
    return {
      project,
      requirements: projectRequirements.length,
      tests: projectCases.length,
      plans: projectPlans.length,
      executions: projectExecutions.length,
      failed: projectExecutions.filter((execution) => execution.status === 'Failed').length,
      blocked: projectExecutions.filter((execution) => execution.status === 'Blocked').length
    }
  })
}

export function getPlanCases(model, planId) {
  const plan = model.testPlans.find((item) => item.id === planId)
  if (!plan) return []
  return model.testCases.filter((testCase) => (plan.scope || []).includes(testCase.id))
}

export function getRequirementLinks(model, requirementId) {
  const requirement = model.requirements.find((item) => item.id === requirementId)
  if (!requirement) {
    return null
  }
  const testCases = model.testCases.filter((testCase) => testCase.requirementId === requirementId)
  const testCaseIds = testCases.map((testCase) => testCase.id)
  const plans = model.testPlans.filter((plan) => (plan.scope || []).some((id) => testCaseIds.includes(id)))
  const executions = model.executions.filter((execution) => testCaseIds.includes(execution.testCaseId))
  const defects = model.defectLinks.filter((defect) => testCaseIds.includes(defect.testCaseId))
  return {
    requirement,
    document: model.requirementDocuments.find((document) => document.id === requirement.documentId),
    project: model.featureProjects.find((project) => project.id === requirement.projectId),
    testCases,
    plans,
    executions,
    defects
  }
}

export function getTestCaseLinks(model, testCaseId) {
  const testCase = model.testCases.find((item) => item.id === testCaseId)
  if (!testCase) {
    return null
  }
  const plans = model.testPlans.filter((plan) => (plan.scope || []).includes(testCaseId))
  const executions = model.executions.filter((execution) => execution.testCaseId === testCaseId)
  const defects = model.defectLinks.filter((defect) => defect.testCaseId === testCaseId)
  const requirement = model.requirements.find((item) => item.id === testCase.requirementId)
  return {
    testCase,
    suite: model.testSuites.find((suite) => suite.id === testCase.suiteId),
    requirement,
    document: requirement ? model.requirementDocuments.find((document) => document.id === requirement.documentId) : null,
    project: model.featureProjects.find((project) => project.id === testCase.projectId),
    plans,
    executions,
    defects
  }
}

export function getPlanLinks(model, planId) {
  const plan = model.testPlans.find((item) => item.id === planId)
  if (!plan) {
    return null
  }
  const testCases = getPlanCases(model, planId)
  const testCaseIds = testCases.map((testCase) => testCase.id)
  const executions = model.executions.filter((execution) => execution.planId === planId)
  const defects = model.defectLinks.filter((defect) => testCaseIds.includes(defect.testCaseId) || executions.some((execution) => execution.id === defect.executionId))
  return {
    plan,
    project: model.featureProjects.find((project) => project.id === plan.projectId),
    document: model.requirementDocuments.find((document) => document.id === plan.requirementDocumentId),
    suites: model.testSuites.filter((suite) => (plan.suiteIds || []).includes(suite.id)),
    testCases,
    executions,
    defects
  }
}

export function getExecutionLinks(model, executionId) {
  const execution = model.executions.find((item) => item.id === executionId)
  if (!execution) {
    return null
  }
  const testCase = model.testCases.find((item) => item.id === execution.testCaseId)
  const requirement = testCase ? model.requirements.find((item) => item.id === testCase.requirementId) : null
  return {
    execution,
    plan: model.testPlans.find((plan) => plan.id === execution.planId),
    testCase,
    requirement,
    suite: testCase ? model.testSuites.find((suite) => suite.id === testCase.suiteId) : null,
    project: testCase ? model.featureProjects.find((project) => project.id === testCase.projectId) : null,
    build: model.builds.find((build) => build.id === execution.buildId),
    defects: model.defectLinks.filter((defect) => defect.executionId === executionId || defect.testCaseId === execution.testCaseId)
  }
}

export function coverageRows(model = getSeedState()) {
  return model.requirements.map((requirement) => {
    const linkedCases = model.testCases.filter((testCase) => testCase.requirementId === requirement.id)
    const linkedCaseIds = linkedCases.map((testCase) => testCase.id)
    const linkedPlans = model.testPlans.filter((plan) => (plan.scope || []).some((testId) => linkedCaseIds.includes(testId)))
    const linkedExecutions = model.executions.filter((execution) => linkedCaseIds.includes(execution.testCaseId))
    const linkedDefects = model.defectLinks.filter((defect) => linkedCaseIds.includes(defect.testCaseId))
    const latestStatus = linkedExecutions[0]?.status || 'Not Run'

    return {
      requirement,
      document: model.requirementDocuments.find((document) => document.id === requirement.documentId),
      project: model.featureProjects.find((project) => project.id === requirement.projectId),
      tests: linkedCases.length,
      plans: linkedPlans.length,
      executions: linkedExecutions.length,
      defects: linkedDefects.length,
      latestStatus,
      coverage: linkedCases.length ? 'Covered' : 'Gap'
    }
  })
}

export function documentTraceabilityRows(model = getSeedState()) {
  return model.requirementDocuments.map((document) => {
    const documentRequirements = model.requirements.filter((requirement) => requirement.documentId === document.id)
    const requirementIds = documentRequirements.map((requirement) => requirement.id)
    const documentCases = model.testCases.filter((testCase) => requirementIds.includes(testCase.requirementId))
    const caseIds = documentCases.map((testCase) => testCase.id)
    const documentPlans = model.testPlans.filter((plan) => plan.requirementDocumentId === document.id)
    const documentExecutions = model.executions.filter((execution) => caseIds.includes(execution.testCaseId))
    return {
      document,
      requirements: documentRequirements.length,
      tests: documentCases.length,
      plans: documentPlans.length,
      executions: documentExecutions.length,
      status: document.status
    }
  })
}

export function generateReport(model = getSeedState(), reportType = 'Execution Summary') {
  const stats = deriveStats(model)
  const coverage = coverageRows(model)
  const planLines = model.testPlans.map((plan) => {
    const planExecutions = model.executions.filter((execution) => execution.planId === plan.id)
    const failed = planExecutions.filter((execution) => execution.status === 'Failed').length
    const blocked = planExecutions.filter((execution) => execution.status === 'Blocked').length
    return `- ${plan.id}: ${plan.name} (${plan.status}) - ${plan.scope.length} tests, ${planExecutions.length} executions, ${failed} failed, ${blocked} blocked`
  }).join('\n')

  return `# LiveLabs QA TMS ${reportType}

Demo-only: yes
Generated: ${new Date().toISOString()}

## Execution Summary

- Total executions: ${stats.total}
- Passed: ${stats.passed}
- Failed: ${stats.failed}
- Blocked: ${stats.blocked}
- Not run: ${stats.notRun}

## Test Plans

${planLines || '- No test plans available.'}

## Requirement Traceability

${coverage.map((row) => `- ${row.requirement.id}: ${row.coverage}, ${row.tests} tests, ${row.plans} plans, ${row.executions} executions, ${row.defects} defects, latest status: ${row.latestStatus}`).join('\n')}

## Next Actions

- Add missing tests for requirements with traceability gaps.
- Review failed or blocked executions before release readiness.
- Keep Jira/Xray synchronization read-only until write behavior is approved.
`
}
