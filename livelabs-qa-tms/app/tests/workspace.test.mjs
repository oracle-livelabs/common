import test from 'node:test'
import assert from 'node:assert/strict'
import { canonicalFile, testIdentity, collectionRecords, mergeEvidence, safeText } from '../scripts/automation-adapter.mjs'
import { emptyWorkspace, rowsFor, editRecord, addRecord, createBugForTest, addPlan, planSummary, recordManualResult, readWorkspace, latestOutcome } from '../public/workspace-model.mjs'

const file = 'tests/smoke/platform/public/homepage/homePage.spec.ts'
const collected = () => collectionRecords({ suites: [{ title: 'smoke/platform/public/homepage/homePage.spec.ts', file, suites: [{ title: 'Home', specs: [{ title: 'loads', file, line: 7, tags: ['@smoke'] }] }] }] })
const result = (status = 'failed', retry = 0, projectName = 'chromium') => ({ title: 'loads', titlePath: [projectName, 'platform/smoke/public/homepage/homePage.spec.ts', 'Home', 'loads'], file: 'tests/platform/smoke/public/homepage/homePage.spec.ts', line: 7, status, expectedStatus: 'passed', projectName, retry, classification: { label: 'Navigation' }, errors: ['SECRET'], authorEmails: ['private@example.test'], finalUrl: 'https://example.test/token' })
const run = (id, tests) => ({ runId: id, startedAt: id === 'new' ? '2026-11-04T10:00:00Z' : '2026-10-01T10:00:00Z', counts: { total: 1, failed: 1, unexpected: 1 }, completion: { state: 'completed' }, sections: [{ tests }] })

test('test identity joins documented old path order with current path without using line number', () => {
  assert.equal(canonicalFile('tests/platform/smoke/public/homepage/homePage.spec.ts'), file)
  assert.equal(collected()[0].id, testIdentity(file, ['chromium', file, 'Home', 'loads']))
})
test('catalog setup guards are explicit and start in backlog, not ready coverage', () => {
  const tests = collectionRecords({ suites: [{ title: 'generated.spec.ts', file, specs: [{ title: 'catalog index is not generated', file }] }] })
  assert.equal(tests[0].setupRequired, true)
  assert.equal(rowsFor('tests', { tests }, emptyWorkspace())[0].status, 'backlog')
})
test('last retry wins and repeated runs produce one linked finding with multiple occurrences', () => {
  const data = mergeEvidence(collected(), [run('old', [result('failed')]), run('new', [result('failed', 0), result('failed', 1)])])
  assert.equal(data.tests.length, 1); assert.equal(data.runs[0].results.length, 1); assert.equal(data.bugs.length, 1)
  assert.equal(data.bugs[0].occurrences.length, 2); assert.equal(data.tests[0].lastResult.retry, 1)
})
test('successful retry is final evidence and does not create a failure finding', () => {
  const data = mergeEvidence(collected(), [run('new', [result('failed'), result('passed', 1)])])
  assert.equal(data.tests[0].lastResult.status, 'passed'); assert.equal(data.bugs.length, 0)
})
test('unmatched historical tests are retained and never marked as current source', () => {
  const data = mergeEvidence([], [run('old', [result()])])
  assert.equal(data.tests[0].inSource, false); assert.equal(data.tests[0].source, 'Historical report only')
})
test('multi-browser evidence remains separate and an unexpected latest browser outcome remains visible', () => {
  const data = mergeEvidence(collected(), [run('new', [result('passed', 0, 'chromium'), result('failed', 0, 'firefox')])])
  assert.equal(data.tests.length, 1); assert.equal(data.tests[0].results.length, 2)
  assert.equal(latestOutcome(data.tests[0]).status, 'failed')
})
test('reader excludes raw errors, contacts, attachments and URLs from the workspace projection', () => {
  const data = mergeEvidence(collected(), [run('old', [result()])]), text = JSON.stringify(data)
  assert.equal(text.includes('private@example'), false); assert.equal(text.includes('SECRET'), false); assert.equal(text.includes('example.test'), false)
  assert.equal(safeText('https://x.test/private token=abc a@b.test').includes('abc'), false)
})
test('workflow edits and refreshes never rewrite automation outcomes', () => {
  const local = emptyWorkspace(), snapshot = mergeEvidence(collected(), [run('old', [result()])]), before = JSON.stringify(snapshot), id = snapshot.tests[0].id
  editRecord(local, 'tests', id, { status: 'done', owner: 'Reviewer' })
  const row = rowsFor('tests', structuredClone(snapshot), local)[0]
  assert.equal(row.status, 'done'); assert.equal(row.result.status, 'failed'); assert.equal(JSON.stringify(snapshot), before)
  assert.throws(() => editRecord(local, 'tests', id, { lastResult: 'passed' }), /Evidence/)
  assert.throws(() => editRecord(local, 'tests', id, { status: 'passed' }), /Invalid/)
})
test('later pass does not silently close a previously triaged bug', () => {
  const snapshot = mergeEvidence(collected(), [run('old', [result()]), run('new', [result('passed')])]), local = emptyWorkspace()
  editRecord(local, 'bugs', snapshot.bugs[0].id, { status: 'retest' })
  const row = rowsFor('bugs', snapshot, local)[0]
  assert.equal(row.status, 'retest'); assert.equal(row.result.status, 'passed'); assert.equal(row.occurrences.length, 1)
})
test('creating a linked bug reuses an existing open finding', () => {
  const snapshot = mergeEvidence(collected(), [run('old', [result()])]), local = emptyWorkspace()
  assert.equal(createBugForTest(local, snapshot, snapshot.tests[0]).id, snapshot.bugs[0].id)
  assert.equal(local.bugs.length, 0)
})
test('plan counts distinguish workflow completion, findings, and unavailable members', () => {
  const local = emptyWorkspace(), snapshot = mergeEvidence(collected(), [run('old', [result()])]), id = snapshot.tests[0].id
  editRecord(local, 'tests', id, { status: 'done' })
  const plan = addPlan(local, 'Review', [id, id, 'missing'], 'one'), summary = planSummary(plan, rowsFor('tests', snapshot, local))
  assert.equal(plan.testIds.length, 2); assert.equal(summary.done, 1); assert.equal(summary.findings, 1); assert.equal(summary.missing, 1)
})
test('manual execution requires evidence and cannot overwrite an imported test', () => {
  const local = emptyWorkspace(), manual = addRecord(local, 'tests', { title: 'Manual check' }, () => 'one')
  assert.throws(() => recordManualResult(local, 'AT-imported', 'passed', 'Checked'), /Only local/)
  assert.throws(() => recordManualResult(local, manual.id, 'passed', ''), /evidence/)
  recordManualResult(local, manual.id, 'failed', 'Observed missing label', () => 'one')
  assert.equal(rowsFor('tests', null, local)[0].result.status, 'failed')
})
test('invalid stored workspaces fall back without deleting legacy storage', () => {
  assert.deepEqual(readWorkspace({ getItem: () => '{broken' }), emptyWorkspace())
})
