import { mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const projectRoot = resolve(appRoot, '..')
const resourcesDir = resolve(projectRoot, 'resources')
const appPort = Number(process.env.APP_PORT || 4192)
const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9333)
const appUrl = `http://127.0.0.1:${appPort}`

function findChrome() {
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean)

  const found = candidates.find((candidate) => existsSync(candidate))
  if (!found) {
    throw new Error('Chrome or Edge executable not found for browser smoke test.')
  }
  return found
}

async function waitForJson(url, attempts = 80) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return response.json()
      }
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
    if (this.ws.readyState === WebSocket.OPEN) {
      return
    }

    await new Promise((resolveOpen, rejectOpen) => {
      this.ws.addEventListener('open', resolveOpen, { once: true })
      this.ws.addEventListener('error', rejectOpen, { once: true })
    })

    this.ws.addEventListener('message', (event) => {
      const payload = JSON.parse(event.data)
      if (!payload.id || !this.pending.has(payload.id)) {
        return
      }
      const { resolvePending, rejectPending } = this.pending.get(payload.id)
      this.pending.delete(payload.id)
      if (payload.error) {
        rejectPending(new Error(payload.error.message))
      } else {
        resolvePending(payload.result)
      }
    })
  }

  send(method, params = {}) {
    const id = this.nextId
    this.nextId += 1
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolvePending, rejectPending) => {
      this.pending.set(id, { resolvePending, rejectPending })
    })
  }

  close() {
    this.ws.close()
  }
}

async function evaluate(client, expression, awaitPromise = true) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true
  })

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Browser evaluation failed.')
  }

  return result.result.value
}

async function waitFor(client, expression, label) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ok = await evaluate(client, expression)
    if (ok) {
      return
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100))
  }

  throw new Error(`Timed out waiting for ${label}`)
}

async function removeProfileWhenReleased(chromeProcess, profilePath) {
  chromeProcess.kill()
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 750))

  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      await rm(profilePath, { recursive: true, force: true })
      return
    } catch (error) {
      if (error.code !== 'EBUSY') {
        throw error
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250))
    }
  }
}

const chromePath = findChrome()
const profileDir = resolve(appRoot, '.chrome-smoke-profile')
await rm(profileDir, { recursive: true, force: true })
await mkdir(profileDir, { recursive: true })
await mkdir(resourcesDir, { recursive: true })

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profileDir}`,
  'about:blank'
], { stdio: 'ignore' })

let client

try {
  await waitForJson(`http://127.0.0.1:${debugPort}/json/version`)
  const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${appUrl}`, { method: 'PUT' }).then((response) => response.json())

  client = new Cdp(target.webSocketDebuggerUrl)
  await client.open()
  await client.send('Page.enable')
  await client.send('Runtime.enable')
  await client.send('Page.navigate', { url: appUrl })
  await waitFor(client, 'document.readyState === "complete" && Boolean(document.querySelector("#login-form"))', 'login form')
  await evaluate(client, 'localStorage.clear(); true')
  await client.send('Page.reload')
  await waitFor(client, 'document.readyState === "complete" && Boolean(document.querySelector("#login-form"))', 'login form after storage reset')

  const loginVisible = await evaluate(client, 'Boolean(document.querySelector("#login-form"))')
  if (!loginVisible) {
    throw new Error('Login form was not visible.')
  }

  await evaluate(client, 'document.querySelector("#login-form").requestSubmit()')
  await waitFor(client, 'Boolean(document.querySelector(".app-shell"))', 'admin shell')

  const adminChecks = await evaluate(client, `({
    commandCenter: document.body.innerText.includes("Command Center"),
    actionQueue: document.body.innerText.includes("Action Queue"),
    sourceFreshness: document.body.innerText.includes("Recent Evidence"),
    accountFormAbsentBeforeNavigation: !document.querySelector("#user-form")
  })`)

  await evaluate(client, 'document.querySelector("[data-view=\\"admin-console\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("#user-form"))', 'admin user form')
  const adminAccountChecks = await evaluate(client, `({
    createAccount: document.body.innerText.includes("Create Account"),
    userFormPresent: Boolean(document.querySelector("#user-form")),
    auditEvents: document.body.innerText.includes("Audit Events"),
    resetDemo: Boolean(document.querySelector("#reset-demo"))
  })`)

  await evaluate(client, 'document.querySelector("[data-view=\\"operations\\"]").click()')
  await waitFor(client, 'document.body.innerText.includes("One entry point for active QA work") && document.querySelectorAll(".operation-group").length >= 4', 'operations hub')
  const operationsChecks = await evaluate(client, `({
    groupedBands: document.body.innerText.toLowerCase().includes("monitor and triage") && document.body.innerText.toLowerCase().includes("evidence and automation") && document.body.innerText.toLowerCase().includes("domain qa"),
    compactRows: document.querySelectorAll(".operation-row").length >= 8,
    summaryVisible: Boolean(document.querySelector(".operations-summary"))
  })`)
  await evaluate(client, 'document.querySelector("[data-view=\\"qa-watchdog\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("#watchdog-form")) && Boolean(document.querySelector(".operations-chrome"))', 'watchdog form')
  const watchdogChromeChecks = await evaluate(client, `({
    breadcrumb: document.body.innerText.includes("QA Operations") && document.body.innerText.includes("QA Watchdog"),
    backButton: Array.from(document.querySelectorAll(".operations-chrome button")).some((button) => button.innerText.includes("Back to QA Operations")),
    nextButton: Array.from(document.querySelectorAll(".operations-chrome button")).some((button) => button.innerText.includes("Next: Health Monitor"))
  })`)
  await evaluate(client, `(() => {
    const form = document.querySelector("#watchdog-form");
    form.elements.title.value = "Headless smoke alert";
    form.elements.owner.value = "Smoke QA";
    form.elements.nextAction.value = "Browser smoke created this local demo alert.";
    form.requestSubmit();
    return true;
  })()`)
  await waitFor(client, 'document.body.innerText.includes("Headless smoke alert")', 'created watchdog event')
  await evaluate(client, `(() => {
    const button = Array.from(document.querySelectorAll("[data-alert-open]"))
      .find((item) => item.closest("tr")?.innerText.includes("Headless smoke alert"));
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return Boolean(button);
  })()`)
  await waitFor(client, 'Boolean(document.querySelector(".drawer"))', 'alert detail drawer')
  await evaluate(client, 'document.querySelector("#close-drawer").click()')
  await waitFor(client, '!document.querySelector(".drawer")', 'closed smoke alert drawer')
  await evaluate(client, `(() => {
    const button = Array.from(document.querySelectorAll("[data-alert-open]"))
      .find((item) => item.closest("tr")?.innerText.includes("Catalog smoke check recovered"));
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return Boolean(button);
  })()`)
  await waitFor(client, 'Boolean(document.querySelector(".drawer")) && document.body.innerText.includes("Linked TMS Objects")', 'seeded alert detail drawer')
  const alertTmsChecks = await evaluate(client, `({
    drawerHasTmsLinks: Boolean(document.querySelector(".drawer .tms-link-pill[href*='4193']")),
    drawerHasObjectHash: Boolean(document.querySelector(".drawer .tms-link-pill[href*='object%3A']"))
  })`)

  await evaluate(client, `(() => {
    const next = Array.from(document.querySelectorAll(".operations-chrome button")).find((button) => button.innerText.includes("Next: Health Monitor"));
    next.click();
    return true;
  })()`)
  await waitFor(client, 'document.body.innerText.includes("Source-aware health checks") && document.body.innerText.includes("Previous: QA Watchdog")', 'next sibling navigation')
  await evaluate(client, `(() => {
    const back = Array.from(document.querySelectorAll(".operations-chrome button")).find((button) => button.innerText.includes("Back to QA Operations"));
    back.click();
    return true;
  })()`)
  await waitFor(client, 'document.querySelectorAll(".operation-group").length >= 4 && document.body.innerText.includes("Suggested Next Actions")', 'back to operations hub')

  await evaluate(client, 'document.querySelector("[data-view=\\"operations\\"]").click()')
  await waitFor(client, 'document.body.innerText.includes("Health Monitor")', 'operations hub health launcher')
  await evaluate(client, 'document.querySelector("[data-view=\\"health-monitor\\"]").click()')
  await waitFor(client, 'document.body.innerText.includes("Health Checks") && document.body.innerText.includes("Source-aware health checks")', 'health monitor')

  await client.send('Page.reload')
  await waitFor(client, 'Boolean(document.querySelector(".app-shell")) && document.body.innerText.includes("Health Monitor")', 'session and route persistence after reload')
  const persistenceChecks = await evaluate(client, `({
    stayedSignedIn: Boolean(document.querySelector(".app-shell")),
    routePersisted: document.body.innerText.includes("Source-aware health checks")
  })`)

  const screenshot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(resolve(resourcesDir, 'browser-smoke-admin.png'), Buffer.from(screenshot.data, 'base64'))

  await evaluate(client, 'document.querySelector("[data-view=\\"github-intake\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("#github-form")) && document.body.innerText.includes("PR And Issue Queue") && Boolean(document.querySelector(".tms-link-pill[href*=\\"4193\\"]"))', 'github intake')
  await evaluate(client, `(() => {
    const form = document.querySelector("#github-form");
    form.elements.title.value = "Headless smoke PR";
    form.elements.signal.value = "Browser smoke created this local GitHub intake record.";
    form.requestSubmit();
    return true;
  })()`)
  await waitFor(client, 'document.body.innerText.includes("Headless smoke PR")', 'created github intake record')

  await evaluate(client, 'document.querySelector("[data-view=\\"knowledge-base\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("#knowledge-form")) && document.body.innerText.includes("Source intake and reusable QA decisions")', 'knowledge base')
  await evaluate(client, `(() => {
    const form = document.querySelector("#knowledge-form");
    form.elements.title.value = "Headless smoke source";
    form.elements.link.value = "https://example.test/livelabs/source";
    form.elements.summary.value = "Browser smoke created this local QA knowledge note.";
    form.requestSubmit();
    return true;
  })()`)
  await waitFor(client, 'document.body.innerText.includes("Headless smoke source")', 'created knowledge note')

  await evaluate(client, 'document.querySelector("[data-view=\\"test-management\\"]").click()')
  await waitFor(client, 'document.body.innerText.includes("LiveLabs QA Test Management") && document.body.innerText.includes("Open LiveLabs QA TMS") && Boolean(document.querySelector("a[href^=\\"http://127.0.0.1:4193\\"]"))', 'test management link')

  await evaluate(client, 'document.querySelector("[data-view=\\"reports\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("#report-form"))', 'report form')
  await evaluate(client, 'document.querySelector("#report-form").requestSubmit()')
  await waitFor(client, 'document.querySelector(".report-preview")?.value.includes("Demo-only: yes")', 'report preview')

  await evaluate(client, 'document.querySelector("#logout-button").click()')
  await waitFor(client, 'Boolean(document.querySelector("#login-form"))', 'login form after logout')
  await evaluate(client, `(() => {
    const form = document.querySelector("#login-form");
    form.elements.email.value = "user@livelabs.qa";
    form.elements.password.value = "user123";
    form.requestSubmit();
    return true;
  })()`)
  await waitFor(client, 'Boolean(document.querySelector(".app-shell"))', 'user shell')
  await evaluate(client, 'document.querySelector("[data-view=\\"admin-console\\"]").click()')
  await waitFor(client, 'document.body.innerText.includes("Permission Summary")', 'user permission summary')

  const userChecks = await evaluate(client, `({
    permissionSummary: document.body.innerText.includes("Permission Summary"),
    createAccountAbsent: !document.body.innerText.includes("Create Account"),
    userFormAbsent: !document.querySelector("#user-form"),
    resetAbsent: !document.querySelector("#reset-demo")
  })`)

  const failures = []
  if (!adminChecks.commandCenter) failures.push('Admin command center was missing.')
  if (!adminChecks.actionQueue) failures.push('Admin action queue was missing.')
  if (!adminChecks.sourceFreshness) failures.push('Admin evidence section was missing.')
  if (!operationsChecks.groupedBands) failures.push('Operations grouped bands were missing.')
  if (!operationsChecks.compactRows) failures.push('Operations compact rows were missing.')
  if (!operationsChecks.summaryVisible) failures.push('Operations summary was missing.')
  if (!watchdogChromeChecks.breadcrumb) failures.push('Operations breadcrumb was missing.')
  if (!watchdogChromeChecks.backButton) failures.push('Operations back button was missing.')
  if (!watchdogChromeChecks.nextButton) failures.push('Operations next sibling button was missing.')
  if (!alertTmsChecks.drawerHasTmsLinks) failures.push('Alert drawer TMS links were missing.')
  if (!alertTmsChecks.drawerHasObjectHash) failures.push('Alert drawer TMS object route was missing.')
  if (!adminAccountChecks.createAccount) failures.push('Admin account creation affordance was missing.')
  if (!adminAccountChecks.userFormPresent) failures.push('Admin user form was missing.')
  if (!adminAccountChecks.auditEvents) failures.push('Admin audit events were missing.')
  if (!adminAccountChecks.resetDemo) failures.push('Admin reset demo control was missing.')
  if (!persistenceChecks.stayedSignedIn) failures.push('Session did not persist after reload.')
  if (!persistenceChecks.routePersisted) failures.push('Route did not persist after reload.')
  if (!userChecks.permissionSummary) failures.push('User permission summary was missing.')
  if (!userChecks.createAccountAbsent) failures.push('User could see create account affordance.')
  if (!userChecks.userFormAbsent) failures.push('User account form was present.')
  if (!userChecks.resetAbsent) failures.push('User could see reset demo control.')

  if (failures.length) {
    throw new Error(failures.join('\n'))
  }

  console.log(`Browser smoke passed for ${appUrl}`)
  console.log(`Screenshot: ${resolve(resourcesDir, 'browser-smoke-admin.png')}`)
} finally {
  client?.close()
  await removeProfileWhenReleased(chrome, profileDir)
}
