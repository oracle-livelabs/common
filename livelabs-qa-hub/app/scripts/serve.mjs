import { createReadStream } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { containedFile, readReports, readFramework, readRepositories, validRunId } from './local-data.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback
const root = resolve(appRoot, option('--root', 'public'))
const port = Number(option('--port', process.env.PORT || 4192))
const automationRoot = resolve(appRoot, '../../qa-automation')
const reposRoot = resolve(appRoot, '../../..')
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.md': 'text/plain', '.ttf': 'font/ttf', '.png': 'image/png' }
let repositoryCache
let repositoryCacheAt = 0

const server = createServer(async (request, response) => {
  const expectedHost = '127.0.0.1:' + port
  const origin = 'http://' + expectedHost
  // This development reader has no production identity boundary. Keep it loopback-only.
  if (request.headers.host !== expectedHost || (request.headers.origin && request.headers.origin !== origin) || request.headers['sec-fetch-site'] === 'cross-site') {
    response.writeHead(403).end('Local access only')
    return
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end('Read-only preview')
    return
  }
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  const sendJson = (status, data) => {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
    response.end(request.method === 'HEAD' ? undefined : JSON.stringify(data))
  }
  try {
    const url = new URL(request.url || '/', origin)
    if (url.pathname.startsWith('/api/')) {
      let data
      if (url.pathname === '/api/local/reports') data = await readReports(automationRoot)
      else if (url.pathname === '/api/local/framework') data = await readFramework(automationRoot)
      else if (url.pathname === '/api/local/repositories') {
        if (!repositoryCache || Date.now() - repositoryCacheAt > 60000) {
          repositoryCache = await readRepositories(reposRoot)
          repositoryCacheAt = Date.now()
        }
        data = repositoryCache
      } else return sendJson(404, { availability: 'UNAVAILABLE', reason: 'Endpoint is not configured.' })
      return sendJson(200, data)
    }
    let filePath
    const reportMatch = url.pathname.match(/^\/local-reports\/runs\/([a-zA-Z0-9_-]+)\/summary\.html$/)
    if (reportMatch && validRunId(reportMatch[1])) {
      filePath = await containedFile(resolve(automationRoot, 'reports'), 'runs/' + reportMatch[1] + '/summary.html')
      response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'")
    } else {
      filePath = await containedFile(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)))
    }
    response.writeHead(200, { 'Content-Type': (types[extname(filePath)] || 'application/octet-stream') + (['.ttf', '.png'].includes(extname(filePath)) ? '' : '; charset=utf-8') })
    if (request.method === 'HEAD') response.end()
    else createReadStream(filePath).on('error', () => response.destroy()).pipe(response)
  } catch {
    if (!response.headersSent) sendJson(request.url?.startsWith('/api/') ? 503 : 404, { availability: 'UNAVAILABLE', reason: 'Local source is missing or unreadable.' })
  }
})

server.listen(port, '127.0.0.1', () => console.log('LiveLabs QA Hub: http://127.0.0.1:' + port))
