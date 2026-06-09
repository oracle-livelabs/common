import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..', '..')
const files = [
  '.gitignore',
  'index.html',
  'README.md',
  'docs/research-and-comparison.md',
  'docs/implementation-plan.md',
  'docs/feature-map.md',
  'docs/validation-report.md',
  'app/public/index.html',
  'app/public/app.js',
  'app/public/state.mjs',
  'app/public/styles.css',
  'app/dist/index.html',
  'app/dist/app.js',
  'app/dist/state.mjs',
  'app/dist/styles.css'
]
const failures = []
for (const file of files) {
  if (!existsSync(resolve(root, file))) failures.push(`Missing ${file}`)
}
const state = readFileSync(resolve(root, 'app/public/state.mjs'), 'utf8')
for (const phrase of ['featureProjects', 'requirementDocuments', 'requirements', 'testCases', 'testPlans', 'executions', 'coverageRows', 'documentTraceabilityRows', 'generateReport', 'getSeedState', 'createProject', 'createRequirementDocument', 'createRequirement', 'createTestSuite', 'createTestCase', 'createTestPlan', 'addTestCaseToPlan', 'createExecution', 'updateExecutionStatus']) {
  if (!state.includes(phrase)) failures.push(`Missing state hook ${phrase}`)
}
const app = readFileSync(resolve(root, 'app/public/app.js'), 'utf8')
for (const phrase of ['renderProjects', 'renderRequirements', 'renderRepository', 'renderPlans', 'renderExecution', 'renderTraceability', 'renderReports']) {
  if (!app.includes(phrase)) failures.push(`Missing app view ${phrase}`)
}
for (const phrase of ['qaHubUrl', 'livelabs-qa-hub']) {
  if (!app.includes(phrase)) failures.push(`Missing GitHub Pages routing hook ${phrase}`)
}
if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log('TMS project validation passed.')
