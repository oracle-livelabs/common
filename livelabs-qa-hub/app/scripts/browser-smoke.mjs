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

  const checks = await evaluate(client, `({
    overview: document.querySelector('h1')?.textContent === 'Overview',
    primaryPages: document.querySelectorAll('nav[aria-label="Primary"] [data-view]').length === 6,
    operationsRemoved: !document.querySelector('[data-view="operations"]'),
    sourceTable: Boolean(document.querySelector('[data-table="source-summary"]'))
  })`)
  await evaluate(client, 'document.querySelector("[data-view=\\"jenkins\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("[data-table=\\"run-history\\"]"))', 'run history')
  await client.send('Page.reload')
  await waitFor(client, 'Boolean(document.querySelector("[data-table=\\"run-history\\"]"))', 'restored report route')
  await evaluate(client, 'document.querySelector("[data-view=\\"automation\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("#run-request-form"))', 'run request preview')
  const executionDisabled = await evaluate(client, 'Boolean(document.querySelector("#run-request-form .primary-button[disabled]"))')
  await evaluate(client, 'document.querySelector("[data-view=\\"on-call\\"]").click()')
  await waitFor(client, 'Boolean(document.querySelector("[data-on-call-load=\\"synthetic\\"]"))', 'on-call connection page')
  await evaluate(client, 'document.querySelector("#logout-button").click()')
  await waitFor(client, 'Boolean(document.querySelector("#login-form"))', 'signed out')
  if (Object.values(checks).some(value => !value) || !executionDisabled) throw new Error('Workspace navigation or connection boundary check failed.')
  console.log('Browser smoke passed for ' + appUrl)
} finally {
  client?.close()
  await removeProfileWhenReleased(chrome, profileDir)
}
