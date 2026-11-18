import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

// Reuse the browser tooling already installed in the sibling QA Automation checkout.
const { chromium } = await import('../../../qa-automation/node_modules/playwright/index.mjs')
const root = fileURLToPath(new URL('../..', import.meta.url))
const output = resolve(root, 'output/screenshots/asana-redesign-v1')
const url = process.env.QA_PROTOTYPE_URL || 'http://127.0.0.1:4192/prototype.html'
const maxImageDimension = 1280
const tileOverlap = 64
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true, locale: 'en-GB' })
const page = await context.newPage()
const errors = [], checks = [], screenshots = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
const check = (name, condition) => { assert.ok(condition, name); checks.push(name) }
const splitAxis = length => {
  const count = Math.max(1, Math.ceil((length - tileOverlap) / (maxImageDimension - tileOverlap)))
  const size = Math.ceil((length + (count - 1) * tileOverlap) / count)
  const step = size - tileOverlap
  return Array.from({ length: count }, (_, index) => {
    const start = Math.min(index * step, length - size)
    return { start, size: Math.min(size, length - start) }
  })
}
const capture = async name => {
  await page.locator('#toast.toast-visible').waitFor({ state: 'hidden' })
  const viewport = page.viewportSize()
  const documentSize = await page.evaluate(() => ({
    width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
  }))
  const width = Math.max(viewport.width, documentSize.width)
  const height = Math.max(viewport.height, documentSize.height)
  const columns = splitAxis(width), rows = splitAxis(height)
  const tiled = columns.length > 1 || rows.length > 1
  const files = []
  for (const [rowIndex, row] of rows.entries()) {
    for (const [columnIndex, column] of columns.entries()) {
      const file = tiled
        ? name.replace(/\.png$/i, `__r${String(rowIndex + 1).padStart(2, '0')}-c${String(columnIndex + 1).padStart(2, '0')}.png`)
        : name
      const path = resolve(output, file)
      if (tiled) {
        await page.screenshot({ path, clip: { x: column.start, y: row.start, width: column.size, height: row.size }, animations: 'disabled' })
      } else {
        await page.screenshot({ path, fullPage: true, animations: 'disabled' })
      }
      files.push(file)
    }
  }
  screenshots.push({ name: files[0], files, originalDimensions: { width, height }, tileGrid: { rows: rows.length, columns: columns.length }, tileOverlapPixels: tiled ? tileOverlap : 0, viewport, url: page.url(), captureMode: 'full page' })
}
try {
  await page.goto(url)
  await page.locator('.task-card').first().waitFor()
  await page.evaluate(() => document.fonts.ready)
  check('Initial board has all 16 sample tasks and four status columns', await page.locator('.task-card').count() === 16 && await page.locator('.board-column').count() === 4)
  check('No document-level horizontal overflow at desktop', await page.evaluate(() => document.documentElement.scrollWidth === innerWidth))
  await capture('01-desktop-board.png')

  await page.locator('[data-task="QA-105"]').click()
  await page.locator('#task-dialog').waitFor({ state: 'visible' })
  await capture('02-desktop-task-detail.png')
  await page.locator('#detail-stage').selectOption('review')
  await page.locator('#detail-priority').selectOption('Low')
  await page.locator('#detail-owner').selectOption('platform')
  await page.locator('#detail-title').fill('Review regression findings — prototype check')
  await page.locator('#detail-due').fill('2026-11-20')
  await page.locator('#detail-due').press('Tab')
  await page.locator('#comment-form textarea').fill('Local note for the interaction check.')
  await page.locator('#comment-form button').click()
  check('Local note appears in the detail panel', await page.locator('.comment').last().textContent().then(s => s.includes('Local note for the interaction check.')))
  await page.locator('#subtask-form input').fill('Confirm browser persistence')
  await page.locator('#subtask-form button').click()
  await page.locator('.subtask-row').last().locator('input').check()
  check('Subtask progress is editable', await page.locator('.subtask-row').last().locator('input').isChecked())
  await page.keyboard.press('Escape')
  check('Escape closes task panel', !await page.locator('#task-dialog').isVisible())
  check('Edited task moved to the review column', await page.locator('[data-drop-value="review"] [data-task="QA-105"]').count() === 1)
  await page.reload()
  await page.locator('[data-task="QA-105"]').click()
  check('Task edits survive reload', await page.locator('#detail-title').inputValue() === 'Review regression findings — prototype check' && await page.locator('#detail-owner').inputValue() === 'platform' && await page.locator('#detail-due').inputValue() === '2026-11-20')
  check('Notes and subtasks survive reload', await page.locator('.comment').count() === 1 && await page.locator('.subtask-row').count() === 4)
  await page.keyboard.press('Escape')

  await page.locator('#global-search').fill('PAR Links')
  check('Search narrows tasks', await page.locator('.task-card').count() === 2)
  await page.locator('#global-search').fill('a search with no matches')
  check('No-results state is useful', await page.locator('.empty-state').isVisible())
  await page.getByRole('button', { name: 'Clear search and filters' }).click()
  await page.locator('[data-action="filter"]').click()
  await page.locator('[data-filter="priority"]').selectOption('High')
  check('Priority filter shows only matching tasks', (await page.locator('.priority').allTextContents()).every(value => value === 'High'))
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await page.locator('[data-action="filter"]').click()
  await page.locator('#group-select').selectOption('area')
  check('Board can group by QA area', await page.locator('.board-column').count() === 5)
  await page.locator('#group-select').selectOption('stage')
  await page.locator('[data-card="QA-101"]').dragTo(page.locator('[data-drop-value="review"] .column-title'))
  check('Drag-and-drop changes task status', await page.locator('[data-drop-value="review"] [data-task="QA-101"]').count() === 1)
  await page.locator('#sort-select').selectOption('priority')
  check('Sorting places high priority first in a mixed column', await page.locator('[data-drop-value="review"] .priority').first().textContent() === 'High')

  await page.locator('[data-view="list"]').click()
  check('List shares the same tasks', await page.locator('.list-task-button').count() === 16)
  await capture('03-desktop-list.png')
  await page.locator('[data-action="fields"]').click()
  await page.locator('[data-preference="owner"]').uncheck()
  await page.locator('#utility-dialog').getByRole('button', { name: 'Done', exact: true }).click()
  check('List fields can be customized', await page.locator('.task-table th').allTextContents().then(cells => !cells.includes('Owner')))
  await page.locator('[data-view="board"]').click()
  check('Field settings are independent by view', await page.locator('.card-footer .avatar').count() === 16)
  await page.locator('[data-view="roadmap"]').click()
  check('Roadmap groups sample tasks into November, December, and January', await page.locator('.board-column').count() === 3)
  await page.locator('[data-card="QA-101"]').dragTo(page.locator('[data-drop-value="2026-12"] .column-title'))
  check('Moving roadmap cards changes the due month', await page.locator('[data-drop-value="2026-12"] [data-task="QA-101"]').count() === 1)
  await capture('04-desktop-roadmap.png')
  await page.locator('[data-view="overview"]').click()
  check('Overview counts derive from the shared task state', await page.locator('.stat-value').first().textContent() === '16')
  await capture('05-desktop-overview.png')
  await page.locator('[data-scope="on-call"]').click()
  check('QA area navigation narrows the workspace', await page.locator('h1').textContent() === 'On-Call' && await page.locator('.stat-value').first().textContent() === '3')
  await page.locator('[data-nav="board"]').click()

  await page.locator('[data-action="add"]').click()
  await page.locator('#new-task-form input[name="title"]').fill('<img src=x onerror=alert(1)> review task')
  await page.locator('#new-task-form').getByRole('button', { name: 'Create task' }).click()
  check('Task creation opens the new task', await page.locator('#detail-title').inputValue() === '<img src=x onerror=alert(1)> review task')
  await page.keyboard.press('Escape')
  check('User text is escaped rather than interpreted as HTML', await page.locator('.task-card img').count() === 0 && await page.locator('.task-card').count() === 17)
  const downloaded = page.waitForEvent('download')
  await page.locator('[data-action="export"]').click()
  const download = await downloaded
  check('Export offers a JSON board download', download.suggestedFilename() === 'livelabs-qa-prototype-board.json')
  await page.locator('[data-action="settings"]').click()
  await page.locator('[data-action="reset-confirm"]').click()
  await page.locator('[data-action="reset"]').click()
  check('Explicit reset restores only the sample workspace', await page.locator('.task-card').count() === 16)

  await page.locator('[data-task="QA-101"]').focus()
  await page.keyboard.press('Enter')
  check('Task detail is keyboard accessible', await page.locator('#task-dialog').isVisible())
  await page.keyboard.press('Escape')
  check('Focus returns to the task after closing detail', await page.evaluate(() => document.activeElement.dataset.task === 'QA-101'))
  await page.keyboard.press('/')
  check('Search keyboard shortcut works', await page.locator('#global-search').evaluate(el => el === document.activeElement))

  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('h1').click()
  await capture('06-mobile-board.png')
  check('Mobile keeps horizontal scrolling inside the board canvas', await page.evaluate(() => document.documentElement.scrollWidth === innerWidth))
  await page.locator('.mobile-toggle').click()
  check('Mobile navigation opens', await page.locator('.sidebar').isVisible())
  await page.locator('[data-scope="par-links"]').click()
  check('Mobile area navigation closes and filters the board', !await page.locator('.sidebar').isVisible() && await page.locator('.task-card').count() === 2)
  await page.locator('.task-card').first().click()
  await capture('07-mobile-task-detail.png')
  check('Mobile detail fits viewport', await page.locator('#task-dialog').evaluate(el => el.getBoundingClientRect().width <= innerWidth))
  await page.keyboard.press('Escape')
  await page.locator('.mobile-toggle').click()
  await page.locator('[data-nav="board"]').click()
  check('No browser runtime or asset errors', errors.length === 0)
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ url, checks, errors, screenshots }, null, 2))
  await writeFile(resolve(output, 'manifest.md'), `# QA Hub redesign review\n\nCaptured: ${new Date().toISOString()}\n\nSource: ${url}\n\nBrowser: Chromium (installed Google Chrome), fresh isolated browser context. All data is synthetic; no live integrations are tested.\n\n## Objectives\n\nMap each original review capture to its linked lossless PNG tiles.\n\n## Estimated Time\n\nEstimated Time: About 5 minutes to review this evidence set.\n\n## Screenshots\n\n${screenshots.map(s => `- ${s.files.map(file => `[${file}](${file})`).join(', ')} — source ${s.originalDimensions.width} × ${s.originalDimensions.height}${s.files.length > 1 ? `; ${s.tileGrid.rows} × ${s.tileGrid.columns} lossless tiles with ${s.tileOverlapPixels}px overlap` : ''}; ${s.captureMode}, ${s.url}`).join('\n')}\n\n## Interaction checks\n\n${checks.map(c => `- PASS: ${c}`).join('\n')}\n\nBrowser errors: ${errors.length}\n\n## Acknowledgements\n\nCapture context and test conditions are recorded above and in the project review notes.\n`)
  console.log(JSON.stringify({ passed: checks.length, errors, output }, null, 2))
} finally {
  await browser.close()
}
