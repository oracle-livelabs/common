import { mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const resourcesDir = resolve(appRoot, '..', 'resources')
const appPort = Number(process.env.APP_PORT || 4193)
const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9334)
const appUrl = `http://127.0.0.1:${appPort}`

function findChrome() {
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean)
  const found = candidates.find((candidate) => existsSync(candidate))
  if (!found) throw new Error('Chrome or Edge executable not found.')
  return found
}

async function waitForJson(url, attempts = 80) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return response.json()
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 125))
    }
  }
  throw new Error(`Timed out waiting for ${url}`)
}

class Cdp {
  constructor(wsUrl) {
    this.nextId = 1
    this.pending = new Map()
    this.ws = new WebSocket(wsUrl)
  }
  async open() {
    await new Promise((resolveOpen, rejectOpen) => {
      this.ws.addEventListener('open', resolveOpen, { once: true })
      this.ws.addEventListener('error', rejectOpen, { once: true })
    })
    this.ws.addEventListener('message', (event) => {
      const payload = JSON.parse(event.data)
      if (!payload.id || !this.pending.has(payload.id)) return
      const pending = this.pending.get(payload.id)
      this.pending.delete(payload.id)
      payload.error ? pending.rejectPending(new Error(payload.error.message)) : pending.resolvePending(payload.result)
    })
  }
  send(method, params = {}) {
    const id = this.nextId++
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolvePending, rejectPending) => this.pending.set(id, { resolvePending, rejectPending }))
  }
  close() {
    this.ws.close()
  }
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Evaluation failed')
  return result.result.value
}

async function waitFor(client, expression, label) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await evaluate(client, expression)) return
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100))
  }
  throw new Error(`Timed out waiting for ${label}`)
}

const profileDir = resolve(appRoot, '.chrome-smoke-profile')
await rm(profileDir, { recursive: true, force: true })
await mkdir(profileDir, { recursive: true })
await mkdir(resourcesDir, { recursive: true })

const chrome = spawn(findChrome(), ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profileDir}`, 'about:blank'], { stdio: 'ignore' })
let client
try {
  await waitForJson(`http://127.0.0.1:${debugPort}/json/version`)
  const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${appUrl}`, { method: 'PUT' }).then((response) => response.json())
  client = new Cdp(target.webSocketDebuggerUrl)
  await client.open()
  await client.send('Page.enable')
  await client.send('Runtime.enable')
  await client.send('Page.navigate', { url: appUrl })
  await waitFor(client, 'document.body.innerText.includes("Release test control board")', 'overview')
  await evaluate(client, 'localStorage.clear(); true')
  await client.send('Page.reload')
  await waitFor(client, 'document.body.innerText.includes("Release test control board")', 'overview after storage reset')

  await evaluate(client, 'document.querySelector("[data-view=\\"projects\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("#project-form"))', 'projects')
  await evaluate(client, `(() => {
    const form = document.querySelector("#project-form");
    form.elements.name.value = "Smoke Feature";
    form.elements.description.value = "Smoke-created feature scope.";
    form.requestSubmit();
    return true;
  })()`)
  await waitFor(client, 'document.body.innerText.includes("Smoke Feature")', 'created project')

  await evaluate(client, 'document.querySelector("[data-view=\\"requirements\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("#document-form")) && Boolean(document.querySelector("#requirement-form"))', 'requirements')
  await evaluate(client, 'document.querySelector("[data-view=\\"repository\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("#suite-form")) && Boolean(document.querySelector("#testcase-form"))', 'repository')
  await evaluate(client, `(() => {
    const form = document.querySelector("#suite-form");
    form.elements.name.value = "Smoke Suite";
    form.requestSubmit();
    return true;
  })()`)
  await waitFor(client, 'document.body.innerText.includes("Smoke Suite")', 'created suite')
  await evaluate(client, `(() => {
    const form = document.querySelector("#testcase-form");
    form.elements.title.value = "Smoke Test Case";
    form.elements.steps.value = "Run smoke flow.";
    form.elements.expected.value = "Smoke flow works.";
    form.requestSubmit();
    return true;
  })()`)
  await waitFor(client, 'document.body.innerText.includes("Smoke Test Case")', 'created test case')

  await evaluate(client, 'document.querySelector("[data-view=\\"plans\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("#plan-form")) && Boolean(document.querySelector("#plan-test-form"))', 'plans')
  await evaluate(client, `(() => {
    const form = document.querySelector("#plan-form");
    form.elements.name.value = "Smoke Plan";
    form.requestSubmit();
    return true;
  })()`)
  await waitFor(client, 'document.body.innerText.includes("Smoke Plan")', 'created plan')
  await evaluate(client, `(() => {
    const form = document.querySelector("#plan-test-form");
    const testOption = Array.from(form.elements.testCaseId.options).find((option) => option.text.includes("Smoke Test Case"));
    if (testOption) form.elements.testCaseId.value = testOption.value;
    form.requestSubmit();
    return Boolean(testOption);
  })()`)
  await waitFor(client, 'document.body.innerText.includes("Test case added to plan")', 'test added to plan')

  await evaluate(client, 'document.querySelector("[data-view=\\"execution\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("#execution-form"))', 'execution board')
  await evaluate(client, `(() => {
    const form = document.querySelector("#execution-form");
    const testOption = Array.from(form.elements.testCaseId.options).find((option) => option.text.includes("Smoke Test Case"));
    if (testOption) form.elements.testCaseId.value = testOption.value;
    form.elements.assignee.value = "Smoke QA";
    form.elements.evidence.value = "Smoke execution evidence";
    form.requestSubmit();
    return Boolean(testOption);
  })()`)
  await waitFor(client, 'document.body.innerText.includes("Execution created")', 'created execution')
  await evaluate(client, `(() => {
    const select = document.querySelector(".execution-status");
    select.value = "Passed";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`)
  await waitFor(client, 'document.body.innerText.includes("Execution status updated locally")', 'execution status update')
  await evaluate(client, 'document.querySelector("[data-view=\\"traceability\\"]").click()')
  await waitFor(client, 'document.body.innerText.includes("Requirement Traceability Matrix")', 'coverage')
  await evaluate(client, 'document.querySelector("[data-view=\\"reports\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("#report-form"))', 'reports')
  await evaluate(client, 'document.querySelector("#report-form").requestSubmit()')
  await waitFor(client, 'document.querySelector("textarea")?.value.includes("Demo-only: yes")', 'report preview')

  await evaluate(client, 'document.querySelector("[data-view=\\"repository\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("[data-object-id=\\"TC-001\\"]"))', 'clickable test case id')
  await evaluate(client, 'document.querySelector("[data-object-id=\\"TC-001\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("#testcase-detail-form")) && document.body.innerText.includes("Linked Records")', 'test case detail')
  await evaluate(client, `(() => {
    const form = document.querySelector("#testcase-detail-form");
    form.elements.title.value = "Catalog search returns workshop results - smoke edited";
    form.elements.status.value = "Needs Review";
    form.elements.steps.value = "Search for an active workshop keyword, then inspect detail ranking.";
    form.requestSubmit();
    return true;
  })()`)
  await waitFor(client, 'document.body.innerText.includes("Test case detail saved") && document.body.innerText.includes("smoke edited")', 'edited test case detail')
  await evaluate(client, `(() => {
    const form = document.querySelector("#testcase-plan-link-form");
    form.elements.planId.value = "TP-LS-V1";
    form.requestSubmit();
    return true;
  })()`)
  await waitFor(client, 'document.body.innerText.includes("Test case added to plan")', 'test case detail plan membership')
  await evaluate(client, 'document.querySelector("[data-object-id=\\"REQ-001\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("#requirement-detail-form")) && document.body.innerText.includes("Requirement Traceability")', 'linked requirement detail')
  await evaluate(client, 'document.querySelector("[data-object-id=\\"TP-2026-05\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("#plan-detail-form")) && document.body.innerText.includes("Plan Scope")', 'linked plan detail')
  await evaluate(client, `(() => {
    const form = document.querySelector("#plan-detail-test-form");
    form.elements.testCaseId.value = "TC-005";
    form.requestSubmit();
    return true;
  })()`)
  await waitFor(client, 'document.body.innerText.includes("Test case added to plan") && document.body.innerText.includes("TC-005")', 'plan detail add test')
  await evaluate(client, 'document.querySelector("[data-object-id=\\"EX-001\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("#execution-detail-form")) && document.body.innerText.includes("Execution Context")', 'linked execution detail')
  await evaluate(client, `(() => {
    const form = document.querySelector("#execution-defect-form");
    form.elements.title.value = "Smoke linked defect from execution detail";
    form.elements.severity.value = "High";
    form.requestSubmit();
    return true;
  })()`)
  await waitFor(client, 'document.body.innerText.includes("Defect link created locally") && document.body.innerText.includes("Smoke linked defect from execution detail")', 'execution detail defect link')
  await client.send('Page.reload')
  await waitFor(client, 'Boolean(document.querySelector("#execution-detail-form")) && document.body.innerText.includes("EX-001")', 'object route persistence')
  await client.send('Page.navigate', { url: `${appUrl}#${encodeURIComponent('object:test-case:TC-001:repository')}` })
  await waitFor(client, 'Boolean(document.querySelector("#testcase-detail-form")) && document.body.innerText.includes("TC-001")', 'direct hash object route')

  const screenshot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(resolve(resourcesDir, 'tms-browser-smoke.png'), Buffer.from(screenshot.data, 'base64'))
  console.log(`TMS browser smoke passed for ${appUrl}`)
} finally {
  client?.close()
  chrome.kill()
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 500))
  await rm(profileDir, { recursive: true, force: true }).catch(() => {})
}
