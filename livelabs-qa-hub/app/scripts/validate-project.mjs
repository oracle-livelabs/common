import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..', '..')
const requiredFiles = [
  '.gitignore',
  'index.html',
  'README.md',
  'docs/requirements.md',
  'docs/implementation-plan.md',
  'docs/jira-source-notes.md',
  'docs/task-list.md',
  'docs/redwood-design-notes.md',
  'app/public/index.html',
  'app/public/app.js',
  'app/public/state.mjs',
  'app/public/styles.css',
  'app/dist/index.html',
  'app/dist/app.js',
  'app/dist/state.mjs',
  'app/dist/styles.css'
]

const requiredDirs = [
  'sections/qa-watchdog',
  'sections/health-monitor',
  'sections/automation-runs',
  'sections/livestack-qa',
  'sections/platform-content-qa',
  'sections/usage-metrics',
  'sections/sprint-ops',
  'sections/reports-insights',
  'sections/user-access',
  'sections/github-intake',
  'sections/knowledge-base',
  'sections/test-management'
]

const failures = []

for (const file of requiredFiles) {
  if (!existsSync(resolve(projectRoot, file))) {
    failures.push(`Missing file: ${file}`)
  }
}

for (const dir of requiredDirs) {
  if (!existsSync(resolve(projectRoot, dir))) {
    failures.push(`Missing directory: ${dir}`)
  }
}

const requirements = readFileSync(resolve(projectRoot, 'docs/requirements.md'), 'utf8')
for (const phrase of ['QA Watchdog', 'Health Monitor', 'LiveStack', 'Usage Metrics', 'Roles And Permissions']) {
  if (!requirements.includes(phrase)) {
    failures.push(`Requirements missing phrase: ${phrase}`)
  }
}

const appJs = readFileSync(resolve(projectRoot, 'app/public/app.js'), 'utf8')
for (const phrase of ['renderLogin', 'renderWatchdog', 'renderAdminConsole', 'renderReports', 'renderGithubIntake', 'renderKnowledgeBase', 'routeKey', 'createWatchEvent']) {
  if (!appJs.includes(phrase)) {
    failures.push(`Prototype missing app hook: ${phrase}`)
  }
}

for (const phrase of ['siblingAppUrl', 'livelabs-qa-tms']) {
  if (!appJs.includes(phrase)) {
    failures.push(`Prototype missing GitHub Pages routing hook: ${phrase}`)
  }
}

const stateJs = readFileSync(resolve(projectRoot, 'app/public/state.mjs'), 'utf8')
for (const phrase of ['seedSources', 'seedEvidence', 'seedMonitors', 'seedHealthChecks', 'seedGithubItems', 'seedKnowledgeItems', 'generateReport', 'resetDemoState']) {
  if (!stateJs.includes(phrase)) {
    failures.push(`State model missing V3 hook: ${phrase}`)
  }
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Project validation passed.')
