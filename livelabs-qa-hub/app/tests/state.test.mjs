import assert from 'node:assert/strict'
import test from 'node:test'

import {
  authenticate,
  can,
  createAuditEvent,
  createGithubItem,
  createKnowledgeItem,
  createMonitor,
  createUser,
  createWatchEvent,
  deleteUser,
  deriveHealthStatus,
  deriveSummary,
  freshnessLabel,
  generateReport,
  getActionQueue,
  getSeedState,
  resetDemoState,
  updateUser,
  updateWatchEventStatus
} from '../public/state.mjs'

test('seeded admin and user can authenticate', () => {
  const { users } = getSeedState()

  assert.equal(authenticate(users, 'admin@livelabs.qa', 'admin123').ok, true)
  assert.equal(authenticate(users, 'user@livelabs.qa', 'user123').ok, true)
})

test('role permissions gate admin actions', () => {
  assert.equal(can('admin', 'manage_users'), true)
  assert.equal(can('admin', 'manage_watchdog'), true)
  assert.equal(can('admin', 'configure_monitors'), true)
  assert.equal(can('admin', 'manage_github_intake'), true)
  assert.equal(can('admin', 'manage_knowledge_base'), true)
  assert.equal(can('user', 'view'), true)
  assert.equal(can('user', 'manage_users'), false)
  assert.equal(can('user', 'configure_monitors'), false)
  assert.equal(can('user', 'manage_knowledge_base'), false)
})

test('admin can create update and delete users', () => {
  const { users } = getSeedState()
  const created = createUser(users, {
    name: 'New Reviewer',
    email: 'reviewer@livelabs.qa',
    password: 'review123',
    role: 'user',
    team: 'Review'
  }, 'admin')

  const reviewer = created.find((user) => user.email === 'reviewer@livelabs.qa')
  assert.equal(reviewer.role, 'user')

  const updated = updateUser(created, reviewer.id, { role: 'admin', status: 'disabled' }, 'admin')
  const changed = updated.find((user) => user.id === reviewer.id)
  assert.equal(changed.role, 'admin')
  assert.equal(changed.status, 'disabled')

  const removed = deleteUser(updated, reviewer.id, 'admin', 'usr-admin')
  assert.equal(removed.some((user) => user.id === reviewer.id), false)
})

test('user cannot mutate accounts, watchdog events, or monitors', () => {
  const { users, watchEvents, monitors } = getSeedState()

  assert.throws(() => createUser(users, { email: 'x@y.com' }, 'user'), /Admin role required/)
  assert.throws(() => createWatchEvent(watchEvents, { title: 'Blocked' }, 'user'), /Admin role required/)
  assert.throws(() => createMonitor(monitors, { name: 'Blocked' }, 'user'), /Admin role required/)
})

test('admin can create and update watchdog events', () => {
  const { watchEvents } = getSeedState()
  const created = createWatchEvent(watchEvents, {
    title: 'New platform smoke failure',
    domain: 'Platform',
    severity: 'High',
    owner: 'Platform QA',
    nextAction: 'Review smoke run.'
  }, 'admin')

  assert.equal(created.length, watchEvents.length + 1)
  assert.equal(created[0].status, 'New')
  assert.equal(created[0].timeline.length, 1)

  const updated = updateWatchEventStatus(created, created[0].id, 'Resolved', 'admin')
  assert.equal(updated[0].status, 'Resolved')
  assert.equal(updated[0].timeline.length, 2)
})

test('admin can create monitor definitions', () => {
  const { monitors } = getSeedState()
  const created = createMonitor(monitors, {
    name: 'New demo monitor',
    domain: 'Platform',
    threshold: 'Two consecutive failures',
    owner: 'Platform QA'
  }, 'admin')

  assert.equal(created.length, monitors.length + 1)
  assert.equal(created[0].name, 'New demo monitor')
})

test('admin can create GitHub intake records', () => {
  const { githubItems } = getSeedState()
  const created = createGithubItem(githubItems, {
    type: 'Pull Request',
    title: 'Review new LiveLabs PR',
    repo: 'oracle-livelabs/common',
    owner: 'Content QA',
    signal: 'Needs link validation before merge.'
  }, 'admin')

  assert.equal(created.length, githubItems.length + 1)
  assert.equal(created[0].type, 'Pull Request')
  assert.equal(created[0].history.length, 1)
  assert.throws(() => createGithubItem(githubItems, { title: 'Blocked' }, 'user'), /Admin role required/)
})

test('admin can create knowledge base records', () => {
  const { knowledgeItems } = getSeedState()
  const created = createKnowledgeItem(knowledgeItems, {
    title: 'Reviewed source note',
    summary: 'Source is relevant for QA release readiness.',
    source: 'Local file',
    owner: 'LiveLabs QA'
  }, 'admin')

  assert.equal(created.length, knowledgeItems.length + 1)
  assert.equal(created[0].status, 'New')
  assert.equal(created[0].source, 'Local file')
  assert.throws(() => createKnowledgeItem(knowledgeItems, { title: 'Blocked', summary: 'Nope' }, 'user'), /Admin role required/)
})

test('summary derives active events and health groups', () => {
  const { watchEvents, healthChecks } = getSeedState()
  const summary = deriveSummary(watchEvents, healthChecks)

  assert.equal(summary.activeEvents, 4)
  assert.equal(summary.highSeverity, 1)
  assert.equal(summary.incidents, 2)
  assert.equal(summary.risk, 2)
  assert.equal(summary.watch, 2)
  assert.equal(summary.stale, 1)
})

test('freshness and health status mark stale sources', () => {
  assert.equal(freshnessLabel(20), 'Fresh')
  assert.equal(freshnessLabel(90), 'Needs Review')
  assert.equal(freshnessLabel(240), 'Stale')
  assert.equal(deriveHealthStatus({ status: 'Operational', freshnessMinutes: 240 }), 'Stale')
})

test('action queue includes high alerts stale checks and failed runs', () => {
  const state = getSeedState()
  const queue = getActionQueue(state)

  assert.equal(queue.some((item) => item.targetView === 'qa-watchdog'), true)
  assert.equal(queue.some((item) => item.targetView === 'health-monitor'), true)
  assert.equal(queue.some((item) => item.targetView === 'automation-runs'), true)
})

test('report generator creates markdown and json demo outputs', () => {
  const state = getSeedState()
  const markdown = generateReport(state, 'rep-daily', 'Markdown')
  const json = JSON.parse(generateReport(state, 'rep-automation', 'JSON'))

  assert.match(markdown, /Demo-only: yes/)
  assert.match(markdown, /## Watchdog Findings/)
  assert.equal(json.demoOnly, true)
  assert.equal(json.title, 'Automation Failures')
})

test('reset demo state restores seed state and records audit event', () => {
  const reset = resetDemoState({ name: 'QA Hub Admin' })

  assert.equal(reset.version, 3)
  assert.equal(reset.users.length, 2)
  assert.equal(reset.auditEvents.length, 1)
  assert.equal(reset.auditEvents[0].action, 'Reset demo data')
})

test('audit events include actor action target and timestamp', () => {
  const event = createAuditEvent({ name: 'QA Hub Admin' }, 'Test action', 'Target', 'Detail')

  assert.equal(event.actor, 'QA Hub Admin')
  assert.equal(event.action, 'Test action')
  assert.equal(event.target, 'Target')
  assert.match(event.timestamp, /^\d{4}-\d{2}-\d{2}/)
})
