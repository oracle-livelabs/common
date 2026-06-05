import assert from 'node:assert/strict'
import test from 'node:test'

import {
  addTestCaseToPlan,
  coverageRows,
  createDefectLink,
  createExecution,
  createProject,
  createRequirement,
  createRequirementDocument,
  createTestCase,
  createTestPlan,
  createTestSuite,
  deleteExecution,
  deleteTestPlan,
  deleteTestCase,
  deriveProjectStats,
  deriveStats,
  documentTraceabilityRows,
  featureProjects,
  generateReport,
  getExecutionLinks,
  getPlanCases,
  getPlanLinks,
  getRequirementLinks,
  getSeedState,
  getTestCaseLinks,
  linkSuiteToPlan,
  linkTestCaseToRequirement,
  removeTestCaseFromPlan,
  requirements,
  testCases,
  testPlans,
  updateExecution,
  updateExecutionStatus,
  updateRequirement,
  updateTestCase,
  updateTestPlan
} from '../public/state.mjs'

test('seeded TMS model has core linked entities', () => {
  const state = getSeedState()

  assert.ok(featureProjects.length >= 3)
  assert.ok(requirements.length >= 4)
  assert.ok(testCases.length >= 5)
  assert.ok(testPlans.length >= 3)
  assert.equal(state.version, 2)
  assert.ok(state.requirementDocuments.length >= 3)
  assert.ok(state.auditEvents.length >= 1)
})

test('execution and project stats derive board counts', () => {
  const state = getSeedState()
  const stats = deriveStats(state)
  const projectStats = deriveProjectStats(state)

  assert.equal(stats.total, state.executions.length)
  assert.equal(stats.passed, 1)
  assert.equal(stats.failed, 1)
  assert.equal(stats.blocked, 1)
  assert.equal(projectStats.length, state.featureProjects.length)
  assert.equal(projectStats.some((row) => row.tests > 0), true)
})

test('requirement and document traceability include tests plans executions and defects', () => {
  const state = getSeedState()
  const requirementRows = coverageRows(state)
  const documentRows = documentTraceabilityRows(state)

  assert.equal(requirementRows.length, state.requirements.length)
  assert.equal(requirementRows.some((row) => row.plans > 0), true)
  assert.equal(requirementRows.some((row) => row.defects > 0), true)
  assert.equal(documentRows.length, state.requirementDocuments.length)
  assert.equal(documentRows.some((row) => row.executions > 0), true)
})

test('can create project requirement document requirement suite test and plan', () => {
  const seeded = getSeedState()
  const withProject = createProject(seeded, { name: 'New Feature', owner: 'QA', status: 'Planning' })
  const project = withProject.featureProjects[0]
  const withDocument = createRequirementDocument(withProject, { projectId: project.id, title: 'New Feature Requirements' })
  const document = withDocument.requirementDocuments[0]
  const withRequirement = createRequirement(withDocument, {
    documentId: document.id,
    title: 'New feature supports QA review',
    priority: 'High',
    status: 'Draft'
  })
  const requirement = withRequirement.requirements[0]
  const withSuite = createTestSuite(withRequirement, {
    projectId: project.id,
    name: 'New Feature Suite',
    owner: 'QA'
  })
  const suite = withSuite.testSuites[0]
  const withCase = createTestCase(withSuite, {
    suiteId: suite.id,
    requirementId: requirement.id,
    title: 'Validate new feature QA review',
    steps: 'Open feature.',
    expected: 'QA review works.'
  })
  const withPlan = createTestPlan(withCase, {
    projectId: project.id,
    requirementDocumentId: document.id,
    name: 'New Feature Plan'
  })

  assert.equal(withPlan.featureProjects.length, seeded.featureProjects.length + 1)
  assert.equal(withPlan.requirementDocuments.length, seeded.requirementDocuments.length + 1)
  assert.equal(withPlan.requirements.length, seeded.requirements.length + 1)
  assert.equal(withPlan.testSuites.length, seeded.testSuites.length + 1)
  assert.equal(withPlan.testCases.length, seeded.testCases.length + 1)
  assert.equal(withPlan.testPlans.length, seeded.testPlans.length + 1)
})

test('test plans can link suites and manage tests inside the plan', () => {
  const state = getSeedState()
  const planId = 'TP-2026-05'
  const suiteId = 'TS-LS'
  const testCaseId = 'TC-002'

  const withSuite = linkSuiteToPlan(state, planId, suiteId)
  const planWithSuite = withSuite.testPlans.find((plan) => plan.id === planId)
  assert.equal(planWithSuite.suiteIds.includes(suiteId), true)

  const withTest = addTestCaseToPlan(withSuite, planId, testCaseId)
  assert.equal(getPlanCases(withTest, planId).some((testCase) => testCase.id === testCaseId), true)

  const withoutTest = removeTestCaseFromPlan(withTest, planId, testCaseId)
  assert.equal(getPlanCases(withoutTest, planId).some((testCase) => testCase.id === testCaseId), false)
})

test('execution CRUD updates status and cascades test deletion safely', () => {
  const state = getSeedState()
  const withExecution = createExecution(state, {
    planId: 'TP-2026-05',
    testCaseId: 'TC-005',
    assignee: 'Smoke QA',
    status: 'Not Run',
    evidence: 'New local execution'
  })
  const execution = withExecution.executions[0]
  const updated = updateExecutionStatus(withExecution, execution.id, 'Passed', 'Smoke evidence')
  const changed = updated.executions.find((item) => item.id === execution.id)

  assert.equal(changed.status, 'Passed')
  assert.equal(changed.evidence, 'Smoke evidence')
  assert.throws(() => updateExecutionStatus(updated, execution.id, 'Skipped'), /Unsupported execution status/)

  const archivedTest = deleteTestCase(updated, 'TC-005')
  assert.equal(archivedTest.testCases.find((testCase) => testCase.id === 'TC-005').status, 'Retired')
  assert.equal(archivedTest.executions.some((item) => item.testCaseId === 'TC-005'), true)
})

test('requirement updates and report generation include traceability', () => {
  const state = getSeedState()
  const updated = updateRequirement(state, 'REQ-004', { status: 'Approved' })
  const requirement = updated.requirements.find((item) => item.id === 'REQ-004')
  const report = generateReport(updated, 'Release Readiness')

  assert.equal(requirement.status, 'Approved')
  assert.match(report, /Demo-only: yes/)
  assert.match(report, /Requirement Traceability/)
  assert.match(report, /Release Readiness/)
})

test('relationship helpers return linked object graphs for details', () => {
  const state = getSeedState()
  const requirementLinks = getRequirementLinks(state, 'REQ-001')
  const testCaseLinks = getTestCaseLinks(state, 'TC-001')
  const planLinks = getPlanLinks(state, 'TP-2026-05')
  const executionLinks = getExecutionLinks(state, 'EX-001')

  assert.equal(requirementLinks.requirement.id, 'REQ-001')
  assert.equal(requirementLinks.testCases.some((testCase) => testCase.id === 'TC-001'), true)
  assert.equal(testCaseLinks.requirement.id, 'REQ-001')
  assert.equal(testCaseLinks.plans.some((plan) => plan.id === 'TP-2026-05'), true)
  assert.equal(planLinks.testCases.some((testCase) => testCase.id === 'TC-001'), true)
  assert.equal(executionLinks.testCase.id, 'TC-001')
  assert.equal(executionLinks.plan.id, 'TP-2026-05')
})

test('detail update helpers can edit linked requirement test plan and execution objects', () => {
  const state = getSeedState()
  const updatedRequirement = updateRequirement(state, 'REQ-001', {
    title: 'Search returns relevant active workshops',
    priority: 'Medium',
    status: 'Needs Review'
  })
  const updatedTest = updateTestCase(updatedRequirement, 'TC-001', {
    title: 'Catalog search returns active workshops',
    automation: 'Playwright candidate',
    status: 'Needs Review',
    steps: 'Search for active workshop keyword and inspect ranking.',
    expected: 'Relevant active workshops appear first.'
  })
  const updatedPlan = updateTestPlan(updatedTest, 'TP-2026-05', {
    name: 'May QA Hub Readiness Updated',
    status: 'Ready',
    buildId: 'BLD-0526'
  })
  const updatedExecution = updateExecution(updatedPlan, 'EX-001', {
    status: 'Blocked',
    assignee: 'Smoke QA',
    evidence: 'Updated detail evidence'
  })

  assert.equal(updatedExecution.requirements.find((item) => item.id === 'REQ-001').title, 'Search returns relevant active workshops')
  assert.equal(updatedExecution.testCases.find((item) => item.id === 'TC-001').automation, 'Playwright candidate')
  assert.equal(updatedExecution.testPlans.find((item) => item.id === 'TP-2026-05').status, 'Ready')
  assert.equal(updatedExecution.executions.find((item) => item.id === 'EX-001').status, 'Blocked')
  assert.equal(updatedExecution.executions.find((item) => item.id === 'EX-001').assignee, 'Smoke QA')
})

test('detail link helpers manage coverage plan membership and defects', () => {
  const state = getSeedState()
  const linkedRequirement = linkTestCaseToRequirement(state, 'REQ-001', 'TC-005')
  const updatedTest = linkedRequirement.testCases.find((testCase) => testCase.id === 'TC-005')
  assert.equal(updatedTest.requirementId, 'REQ-001')

  const withPlan = addTestCaseToPlan(linkedRequirement, 'TP-2026-05', 'TC-005')
  assert.equal(getPlanCases(withPlan, 'TP-2026-05').some((testCase) => testCase.id === 'TC-005'), true)

  const withDefect = createDefectLink(withPlan, {
    executionId: 'EX-001',
    title: 'Smoke linked defect',
    severity: 'High',
    status: 'Open'
  })
  assert.equal(withDefect.defectLinks[0].testCaseId, 'TC-001')
  assert.equal(withDefect.defectLinks[0].executionId, 'EX-001')
})

test('safe lifecycle archives records with history and blocks unsafe unlink', () => {
  const state = getSeedState()
  const archivedPlan = deleteTestPlan(state, 'TP-2026-05')
  assert.equal(archivedPlan.testPlans.find((plan) => plan.id === 'TP-2026-05').status, 'Archived')
  assert.equal(archivedPlan.executions.some((execution) => execution.planId === 'TP-2026-05'), true)

  const archivedExecution = deleteExecution(state, 'EX-001')
  assert.equal(archivedExecution.executions.find((execution) => execution.id === 'EX-001').status, 'Archived')
  assert.throws(() => removeTestCaseFromPlan(state, 'TP-2026-05', 'TC-001'), /execution history/)
})
