import { readFile, readdir, realpath, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, relative, sep } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const array = value => Array.isArray(value) ? value : []
export const safeText = value => String(value ?? '').replace(/https?:\/\/\S+/gi, '[source URL]').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[contact]').replace(/(?:bearer\s+|(?:token|password|secret|authorization)\s*[:=]\s*)[^\s,;]+/gi, '[redacted]').slice(0, 700)
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 20)
export function canonicalFile(file) {
  const normalized = String(file || '').replaceAll('\\', '/').replace(/^.*?\btests\//, 'tests/')
  const prefixed = normalized.startsWith('tests/') ? normalized : `tests/${normalized}`
  return prefixed.replace(/^tests\/(platform|workshops|livestacks)\/(smoke|regression|generated|auth)\//, 'tests/$2/$1/')
}
const suitePath = path => array(path).filter(p => p && !['chromium', 'firefox', 'webkit'].includes(p) && !/\.spec\.[cm]?[jt]s/.test(p))
export function testIdentity(file, titles) { return 'AT-' + hash(canonicalFile(file) + '\0' + suitePath(titles).join('\0')) }
const dimensions = file => {
  const parts = file.split('/')
  return { domain: parts.includes('livestacks') ? 'livestacks' : parts.includes('workshops') ? 'workshops' : 'platform', lane: ['smoke', 'regression', 'generated', 'auth', 'unit'].find(v => parts.includes(v)) || 'other' }
}
async function jsonWithin(root, path) {
  const base = await realpath(root), target = await realpath(resolve(base, path)), rel = relative(base, target)
  if (rel.startsWith('..' + sep) || rel === '..' || !(await stat(target)).isFile()) throw new Error('Invalid local source')
  return JSON.parse(await readFile(target, 'utf8'))
}
async function filesWithin(root, prefix = '') {
  const entries = await readdir(resolve(root, prefix), { withFileTypes: true })
  return (await Promise.all(entries.filter(e => !e.isSymbolicLink()).map(e => {
    const path = prefix ? `${prefix}/${e.name}` : e.name
    return e.isDirectory() ? filesWithin(root, path) : path
  }))).flat()
}
export function collectionRecords(collection) {
  const result = new Map()
  function visit(suite, parents = []) {
    const next = suite.title && !/\.spec\.[cm]?[jt]s/.test(suite.title) && !['chromium', 'firefox', 'webkit'].includes(suite.title) ? [...parents, suite.title] : parents
    for (const spec of array(suite.specs)) {
      const file = canonicalFile(spec.file || suite.file), titles = [...next, spec.title], id = testIdentity(file, titles)
      const setupRequired = /^catalog index (?:is not generated|does not contain)/i.test(spec.title)
      result.set(id, { id, title: safeText(spec.title), titlePath: titles.map(safeText), file: safeText(file), line: Number(spec.line) || 0, ...dimensions(file), tags: array(spec.tags).map(safeText), inSource: true, setupRequired, source: 'Framework collection', lastResult: null })
    }
    for (const child of array(suite.suites)) visit(child, next)
  }
  for (const suite of array(collection.suites)) visit(suite)
  return [...result.values()]
}
export function reportResults(summary) {
  const byTest = new Map()
  for (const test of array(summary.sections).flatMap(s => array(s.tests))) {
    if (!test.title || !test.file) continue
    const file = canonicalFile(test.file), titles = suitePath(test.titlePath).length ? suitePath(test.titlePath) : [test.title]
    const id = testIdentity(file, titles), project = safeText(test.projectName || 'unspecified')
    const key = id + ':' + project, retry = Number(test.retry) || 0
    const previous = byTest.get(key)
    if (previous && previous.retry > retry) continue
    byTest.set(key, { testId: id, title: safeText(test.title), titlePath: titles.map(safeText), file: safeText(file), line: Number(test.line) || 0, ...dimensions(file), project, retry,
      status: ['passed', 'failed', 'skipped', 'timedOut', 'interrupted'].includes(test.status) ? test.status : 'unknown', expectedStatus: safeText(test.expectedStatus || 'passed'),
      classification: safeText(test.classification?.label || 'Unclassified'), durationMs: Math.max(0, Number(test.durationMs) || 0), runId: summary.runId, startedAt: summary.startedAt,
      reportUrl: '/local-reports/runs/' + summary.runId + '/summary.html' })
  }
  return [...byTest.values()]
}
export function mergeEvidence(sourceTests, summaries) {
  const tests = new Map(sourceTests.map(t => [t.id, { ...t, results: [] }])), bugs = new Map(), runs = []
  for (const summary of [...summaries].sort((a, b) => b.startedAt.localeCompare(a.startedAt))) {
    const results = reportResults(summary)
    runs.push({ id: summary.runId, startedAt: summary.startedAt, completion: safeText(summary.completion?.state || 'unknown'), counts: Object.fromEntries(['total', 'passed', 'failed', 'skipped', 'unexpected', 'flaky', 'timedOut', 'interrupted'].map(k => [k, Math.max(0, Number(summary.counts?.[k]) || 0)])), results, reportUrl: '/local-reports/runs/' + summary.runId + '/summary.html', source: 'Saved local report' })
    for (const result of results) {
      if (!tests.has(result.testId)) tests.set(result.testId, { id: result.testId, title: result.title, titlePath: result.titlePath, file: result.file, line: result.line, domain: result.domain, lane: result.lane, tags: [], inSource: false, source: 'Historical report only', lastResult: null, results: [] })
      const test = tests.get(result.testId)
      test.results.push(result)
      if (!test.lastResult) test.lastResult = result
      const unexpected = result.status !== result.expectedStatus && result.status !== 'skipped' && result.status !== 'unknown'
      if (!unexpected) continue
      const bugId = 'AF-' + hash(result.testId + '\0' + result.project + '\0' + result.classification)
      if (!bugs.has(bugId)) bugs.set(bugId, { id: bugId, title: result.title, testId: result.testId, domain: result.domain, lane: result.lane, classification: result.classification, source: 'Automation finding', occurrences: [] })
      bugs.get(bugId).occurrences.push(result)
    }
  }
  return { tests: [...tests.values()], bugs: [...bugs.values()], runs }
}

export async function readAutomationWorkspace(automationRoot) {
  const source = { collection: 'unavailable', reports: 'unavailable', collectedAt: new Date().toISOString(), issues: [], historyCount: 0, loadedRuns: 0, specFiles: 0 }
  let collected = [], summaries = []
  try {
    source.specFiles = (await filesWithin(resolve(automationRoot, 'tests'))).filter(f => f.endsWith('.spec.ts')).length
    const env = { ...process.env }
    for (const key of ['PLAYWRIGHT_JSON_OUTPUT_NAME', 'PLAYWRIGHT_JSON_OUTPUT_FILE', 'PLAYWRIGHT_JSON_OUTPUT_DIR']) delete env[key]
    const { stdout } = await exec(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--list', '--reporter=json', '--project=chromium'], { cwd: automationRoot, env, windowsHide: true, timeout: 45000, maxBuffer: 32 * 1024 * 1024 })
    const data = JSON.parse(stdout)
    if (array(data.errors).length) throw new Error('Collection errors')
    collected = collectionRecords(data); source.collection = 'available'
  } catch { source.issues.push('Current test collection is unavailable. Historical results remain separate; no tests were executed.') }
  try {
    const reportRoot = resolve(automationRoot, 'reports'), history = await jsonWithin(reportRoot, 'history.json')
    source.historyCount = array(history.runs).length
    const entries = array(history.runs).filter(e => /^[a-zA-Z0-9_-]{1,100}$/.test(e.runId || '')).slice(0, 100)
    const loaded = await Promise.allSettled(entries.map(async entry => {
      const summary = await jsonWithin(reportRoot, `runs/${entry.runId}/summary.json`)
      if (summary.runId !== entry.runId || !Number.isFinite(Date.parse(summary.startedAt)) || !summary.counts || !Array.isArray(summary.sections)) throw new Error('Incomplete report')
      return summary
    }))
    summaries = loaded.filter(r => r.status === 'fulfilled').map(r => r.value)
    source.loadedRuns = summaries.length; source.reports = 'available'
    if (loaded.some(r => r.status === 'rejected')) source.issues.push('Some saved reports could not be read; history is incomplete.')
    if (entries.length < source.historyCount) source.issues.push('Only the first 100 indexed runs are loaded.')
  } catch { source.issues.push('Saved run history is unavailable. No result or pass rate is inferred.') }
  return { schema: 'qa-tms.automation-workspace.v1', mode: 'local', source, ...mergeEvidence(collected, summaries), executionEnabled: false }
}
