import { createReadStream } from 'node:fs'
import { createServer } from 'node:http'
import { extname, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { containedFile } from '../../../livelabs-qa-hub/app/scripts/local-data.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../public')
const index = process.argv.indexOf('--port'), port = Number(index >= 0 ? process.argv[index + 1] : 4193)
let hubAvailable = false
try {
  const response = await fetch('http://127.0.0.1:4192/', { signal: AbortSignal.timeout(2000) })
  hubAvailable = response.ok && (await response.text()).includes('workspace.mjs')
} catch {}
if (!hubAvailable) {
  const { startHubServer } = await import('../../../livelabs-qa-hub/app/scripts/serve.mjs')
  startHubServer(4192).on('error', error => {
    if (error.code === 'EADDRINUSE') console.log('QA Hub is already listening on port 4192; using the shared entry point.')
    else { console.error(error.message); process.exitCode = 1 }
  })
}
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.ttf': 'font/ttf', '.png': 'image/png' }
createServer(async (request, response) => {
  if (request.headers.host !== `127.0.0.1:${port}`) return response.writeHead(403).end('Local access only')
  if (!['GET', 'HEAD'].includes(request.method)) return response.writeHead(405).end('Read-only server')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  try {
    const url = new URL(request.url, `http://127.0.0.1:${port}`)
    const path = await containedFile(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)))
    response.writeHead(200, { 'Content-Type': (types[extname(path)] || 'application/octet-stream') + '; charset=utf-8' })
    if (request.method === 'HEAD') response.end()
    else createReadStream(path).on('error', () => response.destroy()).pipe(response)
  } catch { response.writeHead(404).end('Not found') }
}).listen(port, '127.0.0.1', () => console.log(`TMS entry: http://127.0.0.1:${port} → QA Hub Tests on port 4192; legacy data: /legacy.html`))
