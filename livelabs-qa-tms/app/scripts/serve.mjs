import { createReadStream, existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const portArgIndex = process.argv.indexOf('--port')
const port = Number(portArgIndex > -1 ? process.argv[portArgIndex + 1] : process.env.PORT || 4193)
const root = resolve(appRoot, 'public')
const types = new Map([['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.mjs', 'text/javascript; charset=utf-8'], ['.ttf', 'font/ttf']])

createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`)
  const requested = url.pathname === '/' ? '/index.html' : url.pathname
  const filePath = normalize(join(root, requested))
  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Not found')
    return
  }
  response.writeHead(200, { 'content-type': types.get(extname(filePath)) || 'application/octet-stream' })
  createReadStream(filePath).pipe(response)
}).listen(port, '127.0.0.1', () => {
  console.log(`LiveLabs TMS prototype: http://127.0.0.1:${port}`)
})
