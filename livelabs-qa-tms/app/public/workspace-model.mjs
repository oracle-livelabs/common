export const STORAGE_KEY = 'livelabs-qa-unified-workspace-v1'
export const workflows = {
  tests: [{ id: 'backlog', name: 'Backlog', color: 'neutral' }, { id: 'ready', name: 'Ready', color: 'teal' }, { id: 'progress', name: 'In progress', color: 'ocean' }, { id: 'review', name: 'In review', color: 'sienna' }, { id: 'done', name: 'Done', color: 'green' }],
  bugs: [{ id: 'triage', name: 'Needs triage', color: 'sienna' }, { id: 'confirmed', name: 'Confirmed', color: 'plum' }, { id: 'progress', name: 'In progress', color: 'ocean' }, { id: 'retest', name: 'Ready to retest', color: 'teal' }, { id: 'closed', name: 'Closed', color: 'green' }],
  work: [{ id: 'backlog', name: 'Backlog', color: 'neutral' }, { id: 'progress', name: 'In progress', color: 'ocean' }, { id: 'review', name: 'In review', color: 'sienna' }, { id: 'done', name: 'Done', color: 'green' }]
}
export const domains = [{ id: 'platform', name: 'Platform', color: 'teal' }, { id: 'workshops', name: 'Workshops', color: 'sienna' }, { id: 'livestacks', name: 'LiveStacks', color: 'plum' }]
export const priorities = ['Untriaged', 'Critical', 'High', 'Medium', 'Low']
export function emptyWorkspace() { return { version: 1, edits: {}, tests: [], bugs: [], work: [], plans: [], requirements: [] } }
export function readWorkspace(storage) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) || 'null')
    if (!saved || saved.version !== 1 || !saved.edits || typeof saved.edits !== 'object' || Array.isArray(saved.edits) || !['tests', 'bugs', 'work', 'plans', 'requirements'].every(k => Array.isArray(saved[k]) && saved[k].every(r => r && typeof r.id === 'string' && typeof r.title === 'string'))) return emptyWorkspace()
    return saved
  } catch { return emptyWorkspace() }
}
export const unexpected = result => Boolean(result && result.status !== 'unknown' && result.status !== 'skipped' && result.status !== result.expectedStatus)
export const latestOutcome = test => {
  const latest = test.results?.filter(r => r.runId === test.lastResult?.runId) || []
  return latest.find(unexpected) || test.lastResult || null
}
export function rowsFor(kind, snapshot, local) {
  const base = kind === 'tests' ? snapshot?.tests || [] : kind === 'bugs' ? snapshot?.bugs || [] : []
  return [...base, ...local[kind]].map(record => {
    const test = kind === 'bugs' ? snapshot?.tests.find(t => t.id === record.testId) || local.tests.find(t => t.id === record.testId) : record
    const result = kind === 'bugs' ? latestOutcome(test || {}) : latestOutcome(record)
    const defaults = { status: kind === 'bugs' ? 'triage' : kind === 'work' ? 'backlog' : unexpected(result) ? 'review' : record.inSource && !record.setupRequired ? 'ready' : 'backlog', owner: '', priority: kind === 'bugs' ? 'Untriaged' : 'Medium', due: '', description: '', notes: [], activity: [] }
    const edit = local.edits[record.id] || {}
    return { ...defaults, ...record, ...edit, kind, result, status: workflows[kind].some(s => s.id === edit.status) ? edit.status : workflows[kind].some(s => s.id === record.status) ? record.status : defaults.status }
  })
}
export function editRecord(local, kind, id, patch) {
  if (!['tests', 'bugs', 'work'].includes(kind)) throw new Error('Unknown record type')
  const allowed = ['title', 'status', 'priority', 'owner', 'due', 'description', 'notes', 'activity', 'expected', 'steps', 'requirementIds']
  if (Object.keys(patch).some(key => !allowed.includes(key))) throw new Error('Evidence fields cannot be edited')
  if (patch.status && !workflows[kind].some(s => s.id === patch.status)) throw new Error('Invalid workflow status')
  if (patch.priority && !priorities.includes(patch.priority)) throw new Error('Invalid priority')
  local.edits[id] = { ...local.edits[id], ...patch }
  return local.edits[id]
}
export function addRecord(local, kind, payload, makeId = () => crypto.randomUUID()) {
  if (!workflows[kind] || !payload.title?.trim()) throw new Error('A title is required')
  const prefix = kind === 'tests' ? 'MT' : kind === 'bugs' ? 'BUG' : 'TASK'
  const record = { id: `${prefix}-${makeId()}`, title: payload.title.trim().slice(0, 200), domain: domains.some(d => d.id === payload.domain) ? payload.domain : 'platform', source: 'Local ' + (kind === 'tests' ? 'manual test' : kind === 'bugs' ? 'bug' : 'task'), ...(kind === 'bugs' ? { testId: payload.testId || '', occurrences: [] } : {}), createdAt: new Date().toISOString() }
  local[kind].push(record)
  return record
}
export function createBugForTest(local, snapshot, test) {
  const existing = [...(snapshot?.bugs || []), ...local.bugs].find(b => b.testId === test.id && (local.edits[b.id]?.status || 'triage') !== 'closed')
  if (existing) return existing
  return addRecord(local, 'bugs', { title: test.title, domain: test.domain, testId: test.id })
}
export function addPlan(local, title, testIds, id = crypto.randomUUID()) {
  if (!title.trim() || !testIds.length) throw new Error('Choose a title and at least one test')
  const plan = { id: 'PLAN-' + id, title: title.trim().slice(0, 200), testIds: [...new Set(testIds)], status: 'Draft', createdAt: new Date().toISOString() }
  local.plans.push(plan); return plan
}
export function planSummary(plan, tests) {
  const byId = new Map(tests.map(t => [t.id, t])), members = plan.testIds.map(id => byId.get(id)).filter(Boolean)
  return { members, missing: plan.testIds.length - members.length, done: members.filter(t => t.status === 'done').length, findings: members.filter(t => unexpected(t.result)).length, observed: members.filter(t => t.result).length }
}
export function recordManualResult(local, id, status, evidence, makeId = () => crypto.randomUUID()) {
  const test = local.tests.find(t => t.id === id && t.source === 'Local manual test')
  if (!test) throw new Error('Only local manual tests accept manual execution results')
  if (!['passed', 'failed', 'skipped', 'blocked'].includes(status) || !evidence.trim()) throw new Error('Select an outcome and describe the evidence')
  const result = { testId: id, title: test.title, status, expectedStatus: 'passed', classification: 'User-recorded manual execution', project: 'Manual review', runId: 'MANUAL-' + makeId(), startedAt: new Date().toISOString(), evidence: evidence.trim().slice(0, 3000), reportUrl: '' }
  test.results = [result, ...(test.results || [])]; test.lastResult = result
  return result
}
