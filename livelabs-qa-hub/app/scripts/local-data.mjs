// Local read-only discovery. No credentials, test execution, or source mutations.
import { readdir, readFile, realpath, stat } from 'node:fs/promises'
import { resolve, relative, sep } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const list = value => Array.isArray(value) ? value : []
const count = value => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0
const safeText = value => String(value ?? '').replace(/https?:\/\/\S+/gi, '[source URL]').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[contact]').slice(0, 500)
export const validRunId = value => /^[a-zA-Z0-9_-]{1,100}$/.test(value || '')

export async function containedFile(root, file) {
  const base = await realpath(root)
  const target = await realpath(resolve(base, file))
  const rel = relative(base, target)
  if (!rel || rel.startsWith('..' + sep) || rel === '..' || resolve(base, rel) !== target || !(await stat(target)).isFile()) throw new Error('Invalid file')
  return target
}

async function json(root, file) {
  return JSON.parse(await readFile(await containedFile(root, file), 'utf8'))
}

function counts(value = {}) {
  return Object.fromEntries(['total', 'passed', 'failed', 'skipped', 'timedOut', 'interrupted', 'flaky', 'unexpected'].map(key => [key, count(value[key])]))
}

function normalizeRun(summary) {
  if (!summary.counts || ['total', 'passed', 'skipped', 'unexpected'].some(key => !Number.isFinite(summary.counts[key]) || summary.counts[key] < 0)) throw new Error('Incomplete run counts')
  if (!Number.isFinite(Date.parse(summary.startedAt))) throw new Error('Missing run timestamp')
  const c = counts(summary.counts)
  const completed = summary.completion?.state === 'completed'
  return {
    runId: summary.runId, source: 'Local artifact', reportChannel: safeText(summary.reportChannel),
    startedAt: safeText(summary.startedAt), endedAt: safeText(summary.endedAt), durationMs: count(summary.durationMs),
    status: completed ? (c.unexpected ? 'Completed with findings' : 'Passed') : 'Incomplete',
    rawStatus: safeText(summary.status), completionState: safeText(summary.completion?.state || 'unknown'), counts: c,
    reportUrl: '/local-reports/runs/' + encodeURIComponent(summary.runId) + '/summary.html',
    sections: list(summary.sections).map(section => ({ name: safeText(section.name), ...counts(section) })),
    failures: list(summary.failures).map((failure, index) => ({
      id: summary.runId + ':' + index, title: safeText(failure.title), section: safeText(failure.section),
      status: safeText(failure.status), category: safeText(failure.classification?.label || 'Unclassified'),
      file: safeText(failure.file), line: count(failure.line), durationMs: count(failure.durationMs)
    })),
    par: {
      hasData: summary.parAudit?.has_data === true,
      pagesScanned: count(summary.parAudit?.pages_scanned),
      counts: Object.fromEntries(['total', 'working', 'broken', 'unverified'].map(key => [key, count(summary.parAudit?.counts?.[key])])),
      scanProblems: list(summary.parAudit?.scan_errors).length,
      // The Hub exposes classifications and source IDs, never PAR access tokens.
      findings: list(summary.parAudit?.catalog?.links).map((link, index) => ({
        id: safeText(link.fingerprint || index), itemId: safeText(link.catalog_item?.id || ''),
        title: safeText(link.object_name || link.label || 'PAR link'), status: safeText(link.status || 'unverified'),
        httpStatus: Number.isFinite(link.http_status) ? link.http_status : null, occurrences: list(link.sources).length
      }))
    }
  }
}

export async function readReports(automationRoot) {
  const root = resolve(automationRoot, 'reports')
  const history = await json(root, 'history.json')
  const entries = list(history.runs).filter(run => validRunId(run.runId)).slice(0, 100)
  const records = await Promise.allSettled(entries.map(async entry => {
    const summary = await json(root, 'runs/' + entry.runId + '/summary.json')
    if (summary.runId !== entry.runId) throw new Error('Run identity mismatch')
    return normalizeRun(summary)
  }))
  const runs = records.filter(result => result.status === 'fulfilled').map(result => result.value)
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)))
  return { schema: 'qa-hub.local-reports.v1', mode: 'local', observedAt: new Date().toISOString(),
    sourceUpdatedAt: history.generated_at, unavailableRuns: records.length - runs.length,
    limit: 100, historyCount: list(history.runs).length, runs }
}

async function walk(dir, prefix = '') {
  const entries = await readdir(resolve(dir, prefix), { withFileTypes: true })
  const results = await Promise.all(entries.filter(entry => !entry.isSymbolicLink()).map(entry => {
    const file = prefix ? prefix + '/' + entry.name : entry.name
    return entry.isDirectory() ? walk(dir, file) : file
  }))
  return results.flat()
}

export async function readFramework(automationRoot) {
  const files = (await walk(resolve(automationRoot, 'tests/platform'))).filter(file => file.endsWith('.spec.ts'))
  const packageInfo = await json(automationRoot, 'package.json')
  const lanes = [
    ['smoke', 'Public smoke', 'smoke/', 'Home, search, catalog, accessibility and event entry'],
    ['regression', 'Public regression', 'regression/', 'Filters, search, workshop overview and instructions'],
    ['generated', 'Generated catalog', 'generated/', 'Workshop and LiveStack tests expanded from the catalog'],
    ['par', 'PAR checks', 'par/', 'Discovery, probes and scan coverage'],
    ['auth', 'Authenticated', 'auth/', 'Private navigation and reservations; requires approved auth state']
  ].map(([id, name, prefix, scope]) => ({ id, name, scope, specs: files.filter(file => file.startsWith(prefix)).length }))
  return { schema: 'qa-hub.framework.v1', mode: 'local', observedAt: new Date().toISOString(),
    node: packageInfo.engines?.node, playwright: packageInfo.devDependencies?.['@playwright/test'],
    specFiles: files.length, lanes,
    profiles: ['pr-slice', 'nightly-full', 'manual-items'], executionEnabled: false }
}

export async function readRepositories(reposRoot) {
  const dirs = (await readdir(reposRoot, { withFileTypes: true })).filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && /^[a-z0-9-]+$/i.test(entry.name))
  const rows = []
  // Bounded batches keep local Git inspection responsive across large checkouts.
  for (let index = 0; index < dirs.length; index += 5) {
    const batch = await Promise.allSettled(dirs.slice(index, index + 5).map(async entry => {
      const cwd = resolve(reposRoot, entry.name)
      await stat(resolve(cwd, '.git'))
      const git = async args => (await exec('git', ['-c', 'safe.directory=' + cwd.replaceAll('\\', '/'), '-C', cwd, ...args], { timeout: 10000, maxBuffer: 4 * 1024 * 1024, windowsHide: true })).stdout.trim()
      const remotes = await git(['remote', '-v'])
      if (!remotes.includes('github.com/oracle-livelabs/')) return null
      const [commit, committedAt, branch, tracked] = await Promise.all([
        git(['rev-parse', '--short', 'HEAD']), git(['log', '-1', '--format=%cI']), git(['branch', '--show-current']),
        git(['ls-files', '.github/workflows/*', '*manifest.json'])
      ])
      const files = tracked.split(/\r?\n/).filter(Boolean)
      return { name: entry.name, url: 'https://github.com/oracle-livelabs/' + entry.name,
        source: 'Local checkout', commit, committedAt, branch,
        workflowFiles: files.filter(file => file.startsWith('.github/workflows/')).length,
        manifestFiles: files.filter(file => file.endsWith('manifest.json')).length,
        focus: entry.name === 'common' ? 'QA tools and shared platform' : entry.name === 'sprints' ? 'Sprint content' : 'Workshop content' }
    }))
    rows.push(...batch.filter(result => result.status === 'fulfilled' && result.value).map(result => result.value))
  }
  return { schema: 'qa-hub.repositories.v1', mode: 'local', observedAt: new Date().toISOString(),
    liveStatus: 'Not connected', repositories: rows.sort((a, b) => a.name.localeCompare(b.name)) }
}
