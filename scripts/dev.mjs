import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js')

const children = []
let shuttingDown = false

function pipeLines(stream, label, writer) {
  let buffer = ''
  stream.on('data', (chunk) => {
    buffer += chunk.toString()
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.trim().length > 0) {
        writer.write(`[${label}] ${line}\n`)
      }
    }
  })
  stream.on('end', () => {
    if (buffer.trim().length > 0) {
      writer.write(`[${label}] ${buffer}\n`)
    }
  })
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM')
    }
  }
  setTimeout(() => process.exit(code), 250).unref()
}

function launch(label, args) {
  const child = spawn(process.execPath, args, {
    cwd: rootDir,
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  pipeLines(child.stdout, label, process.stdout)
  pipeLines(child.stderr, label, process.stderr)

  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      console.error(`[${label}] exited (${signal || code || 0}). Stopping ScholarFund dev environment...`)
      shutdown(code || 1)
    }
  })

  children.push(child)
  return child
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

console.log('Starting ScholarFund full-stack development environment...')
launch('api', [path.join(rootDir, 'server', 'index.cjs')])
launch('web', [viteBin, '--host', '0.0.0.0'])
