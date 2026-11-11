import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const dist = resolve(appRoot, 'dist')

await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })
await cp(resolve(appRoot, 'public'), dist, { recursive: true })

console.log(`Built static prototype at ${dist}`)
